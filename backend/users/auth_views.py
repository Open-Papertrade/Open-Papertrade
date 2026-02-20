"""
Authentication views for paper trading app.
"""

from django.conf import settings
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken
from django.utils import timezone

from .models import UserProfile, UserSettings, SiteSettings, generate_username
from .email_service import send_verification_email, generate_verification_token
from .achievement_service import award_special_achievement


def get_tokens_for_user(user):
    """Generate JWT tokens with user_id claim for a UserProfile."""
    refresh = RefreshToken()
    refresh['user_id'] = str(user.id)
    return {
        'access': str(refresh.access_token),
        'refresh': str(refresh),
    }


def set_auth_cookies(response, tokens):
    """Set HttpOnly JWT cookies on the response."""
    response.set_cookie(
        settings.JWT_COOKIE_ACCESS_NAME,
        tokens['access'],
        max_age=settings.JWT_COOKIE_ACCESS_MAX_AGE,
        path=settings.JWT_COOKIE_ACCESS_PATH,
        httponly=True,
        secure=settings.JWT_COOKIE_SECURE,
        samesite=settings.JWT_COOKIE_SAMESITE,
    )
    response.set_cookie(
        settings.JWT_COOKIE_REFRESH_NAME,
        tokens['refresh'],
        max_age=settings.JWT_COOKIE_REFRESH_MAX_AGE,
        path=settings.JWT_COOKIE_REFRESH_PATH,
        httponly=True,
        secure=settings.JWT_COOKIE_SECURE,
        samesite=settings.JWT_COOKIE_SAMESITE,
    )
    response.set_cookie(
        settings.JWT_COOKIE_AUTH_ACTIVE_NAME,
        '1',
        max_age=settings.JWT_COOKIE_AUTH_ACTIVE_MAX_AGE,
        path='/',
        httponly=False,  # JS-readable for route protection
        secure=settings.JWT_COOKIE_SECURE,
        samesite=settings.JWT_COOKIE_SAMESITE,
    )
    return response


def clear_auth_cookies(response):
    """Delete all auth cookies from the response."""
    response.delete_cookie(
        settings.JWT_COOKIE_ACCESS_NAME,
        path=settings.JWT_COOKIE_ACCESS_PATH,
    )
    response.delete_cookie(
        settings.JWT_COOKIE_REFRESH_NAME,
        path=settings.JWT_COOKIE_REFRESH_PATH,
    )
    response.delete_cookie(
        settings.JWT_COOKIE_AUTH_ACTIVE_NAME,
        path='/',
    )
    return response


@method_decorator(csrf_exempt, name='dispatch')
class SignupView(APIView):
    """Create a new user account."""
    authentication_classes = []
    permission_classes = []

    def post(self, request):
        import re
        data = request.data
        name = data.get('name', '').strip()
        email = data.get('email', '').strip().lower()
        password = data.get('password', '')
        username = data.get('username', '').strip().lower()
        currency = data.get('currency', 'USD').strip().upper()

        if not name or not email or not password:
            return Response(
                {'error': 'Name, email, and password are required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if len(password) < 8:
            return Response(
                {'error': 'Password must be at least 8 characters'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Validate username if provided
        if username:
            if not re.match(r'^[a-z0-9](?:[a-z0-9-]{1,28}[a-z0-9])?$', username):
                return Response(
                    {'error': 'Username must be 3-30 characters, lowercase letters, numbers, and hyphens. Cannot start or end with a hyphen.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            if UserProfile.objects.filter(username=username).exists():
                return Response(
                    {'error': 'This username is already taken'},
                    status=status.HTTP_400_BAD_REQUEST
                )

        if UserProfile.objects.filter(email=email).exists():
            return Response(
                {'error': 'An account with this email already exists'},
                status=status.HTTP_400_BAD_REQUEST
            )

        site_settings = SiteSettings.load()
        verification_required = site_settings.email_verification_enabled

        # Auto-generate username if not provided
        if not username:
            username = generate_username(name)

        user = UserProfile(name=name, username=username, email=email)
        user.set_password(password)
        buying_power = site_settings.get_buying_power(currency)
        user.buying_power = buying_power
        user.initial_balance = buying_power

        if verification_required:
            user.is_email_verified = False
        else:
            # No verification required, mark as verified immediately
            user.is_email_verified = True

        user.save()
        UserSettings.objects.create(user=user, currency=currency)
        award_special_achievement(user, 'early_adopter')

        if verification_required:
            success, error = send_verification_email(user)

            if not success:
                return Response({
                    'email_verification_required': True,
                    'email_sent': False,
                    'message': 'Account created but we could not send the verification email. Please try resending.',
                    'user': {'email': user.email},
                }, status=status.HTTP_201_CREATED)

            return Response({
                'email_verification_required': True,
                'email_sent': True,
                'message': 'Account created. Please check your email to verify your account.',
                'user': {'email': user.email},
            }, status=status.HTTP_201_CREATED)

        # No verification needed - set cookies and return user
        tokens = get_tokens_for_user(user)
        response = Response({
            'email_verification_required': False,
            'user': user.to_dict(),
        }, status=status.HTTP_201_CREATED)
        return set_auth_cookies(response, tokens)


@method_decorator(csrf_exempt, name='dispatch')
class LoginView(APIView):
    """Authenticate and return JWT tokens via HttpOnly cookies."""
    authentication_classes = []
    permission_classes = []

    def post(self, request):
        data = request.data
        email = data.get('email', '').strip().lower()
        password = data.get('password', '')

        if not email or not password:
            return Response(
                {'error': 'Email and password are required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            user = UserProfile.objects.get(email=email)
        except UserProfile.DoesNotExist:
            return Response(
                {'error': 'Invalid email or password'},
                status=status.HTTP_401_UNAUTHORIZED
            )

        if not user.password or not user.check_password(password):
            return Response(
                {'error': 'Invalid email or password'},
                status=status.HTTP_401_UNAUTHORIZED
            )

        # Check email verification if enabled
        site_settings = SiteSettings.load()
        if site_settings.email_verification_enabled and not user.is_email_verified:
            return Response(
                {
                    'error': 'Please verify your email before logging in.',
                    'email_not_verified': True,
                    'email': user.email,
                },
                status=status.HTTP_403_FORBIDDEN
            )

        # Check if 2FA is enabled
        if user.is_2fa_enabled:
            # Issue a temporary token with short lifetime
            temp_refresh = RefreshToken()
            temp_refresh['user_id'] = str(user.id)
            temp_refresh['is_2fa_pending'] = True
            temp_refresh.set_exp(lifetime=timezone.timedelta(minutes=5))
            temp_access = temp_refresh.access_token
            temp_access.set_exp(lifetime=timezone.timedelta(minutes=5))
            return Response({
                '2fa_required': True,
                'temp_token': str(temp_access),
            })

        tokens = get_tokens_for_user(user)
        response = Response({
            'user': user.to_dict(),
        })
        return set_auth_cookies(response, tokens)


@method_decorator(csrf_exempt, name='dispatch')
class RefreshTokenView(APIView):
    """Refresh an access token using the refresh cookie."""
    authentication_classes = []
    permission_classes = []

    def post(self, request):
        # Read refresh token from cookie
        refresh_token = request.COOKIES.get(settings.JWT_COOKIE_REFRESH_NAME)

        if not refresh_token:
            return Response(
                {'error': 'Refresh token is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            token = RefreshToken(refresh_token)
            new_tokens = {
                'access': str(token.access_token),
                'refresh': str(token),  # rotated refresh token
            }
            response = Response({'success': True})
            return set_auth_cookies(response, new_tokens)
        except Exception:
            response = Response(
                {'error': 'Invalid or expired refresh token'},
                status=status.HTTP_401_UNAUTHORIZED
            )
            return clear_auth_cookies(response)


@method_decorator(csrf_exempt, name='dispatch')
class VerifyEmailView(APIView):
    """Verify a user's email address using the token from the verification link."""
    authentication_classes = []
    permission_classes = []

    def post(self, request):
        token = request.data.get('token', '').strip()

        if not token:
            return Response(
                {'error': 'Verification token is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            user = UserProfile.objects.get(email_verification_token=token)
        except UserProfile.DoesNotExist:
            return Response(
                {'error': 'Invalid or expired verification token'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if user.is_email_verified:
            # Already verified - set cookies so they can log in
            tokens = get_tokens_for_user(user)
            response = Response({
                'message': 'Email already verified',
                'user': user.to_dict(),
            })
            return set_auth_cookies(response, tokens)

        # Mark as verified
        user.is_email_verified = True
        user.email_verification_token = ''
        user.save(update_fields=['is_email_verified', 'email_verification_token'])

        # Set cookies so the user is logged in automatically
        tokens = get_tokens_for_user(user)
        response = Response({
            'message': 'Email verified successfully',
            'user': user.to_dict(),
        })
        return set_auth_cookies(response, tokens)


@method_decorator(csrf_exempt, name='dispatch')
class ResendVerificationView(APIView):
    """Resend the verification email."""
    authentication_classes = []
    permission_classes = []

    def post(self, request):
        email = request.data.get('email', '').strip().lower()

        if not email:
            return Response(
                {'error': 'Email is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            user = UserProfile.objects.get(email=email)
        except UserProfile.DoesNotExist:
            # Don't reveal whether the email exists
            return Response({
                'message': 'If an account exists with this email, a verification email has been sent.',
            })

        if user.is_email_verified:
            return Response({
                'message': 'Email is already verified. You can log in.',
            })

        # Rate limit: don't resend if last email was sent less than 60 seconds ago
        if user.email_verification_sent_at:
            elapsed = (timezone.now() - user.email_verification_sent_at).total_seconds()
            if elapsed < 60:
                return Response(
                    {'error': f'Please wait {int(60 - elapsed)} seconds before requesting another email.'},
                    status=status.HTTP_429_TOO_MANY_REQUESTS
                )

        success, error = send_verification_email(user)

        if not success:
            return Response(
                {'error': 'Failed to send verification email. Please try again later.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

        return Response({
            'message': 'Verification email sent. Please check your inbox.',
        })


@method_decorator(csrf_exempt, name='dispatch')
class LogoutView(APIView):
    """Clear all auth cookies."""
    authentication_classes = []
    permission_classes = []

    def post(self, request):
        response = Response({'success': True})
        return clear_auth_cookies(response)


@method_decorator(csrf_exempt, name='dispatch')
class MeView(APIView):
    """Return the current authenticated user, or 401."""

    def get(self, request):
        user = request.user
        if not user or not isinstance(user, UserProfile):
            return Response(
                {'error': 'Not authenticated'},
                status=status.HTTP_401_UNAUTHORIZED
            )
        return Response({'user': user.to_dict()})


@method_decorator(csrf_exempt, name='dispatch')
class TwoFactorLoginVerifyView(APIView):
    """Verify 2FA code during login and issue full auth cookies."""
    authentication_classes = []
    permission_classes = []

    def post(self, request):
        import hashlib
        import pyotp
        from rest_framework_simplejwt.tokens import AccessToken

        temp_token = request.data.get('temp_token', '')
        code = request.data.get('code', '').strip()

        if not temp_token or not code:
            return Response(
                {'error': 'Token and verification code are required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Validate temp token
        try:
            token = AccessToken(temp_token)
            if not token.get('is_2fa_pending'):
                raise ValueError('Not a 2FA pending token')
            user_id = token.get('user_id')
            if not user_id:
                raise ValueError('No user_id in token')
        except Exception:
            return Response(
                {'error': 'Invalid or expired token. Please log in again.'},
                status=status.HTTP_401_UNAUTHORIZED
            )

        try:
            user = UserProfile.objects.get(id=user_id)
        except UserProfile.DoesNotExist:
            return Response(
                {'error': 'User not found'},
                status=status.HTTP_401_UNAUTHORIZED
            )

        # Try TOTP code first (6 digits)
        verified = False
        if len(code) == 6 and code.isdigit():
            totp = pyotp.TOTP(user.totp_secret)
            verified = totp.verify(code, valid_window=1)

        # Try backup code if TOTP didn't match
        if not verified:
            code_hash = hashlib.sha256(code.encode()).hexdigest()
            if code_hash in user.backup_codes:
                # Remove used backup code
                user.backup_codes.remove(code_hash)
                user.save(update_fields=['backup_codes'])
                verified = True

        if not verified:
            return Response(
                {'error': 'Invalid verification code'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Issue full auth cookies
        tokens = get_tokens_for_user(user)
        response = Response({
            'user': user.to_dict(),
        })
        return set_auth_cookies(response, tokens)
