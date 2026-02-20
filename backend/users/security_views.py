"""
Security views for password, 2FA, and API key management.
"""

import hashlib
import secrets
import base64
from datetime import timedelta
from io import BytesIO

import pyotp
import qrcode
from django.utils import timezone
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status

from .models import UserProfile, APIKey
from .views import get_user
from .email_service import generate_verification_token, send_password_reset_email


class ChangePasswordView(APIView):
    """Change the user's password."""

    def post(self, request):
        user = get_user(request)
        current_password = request.data.get('currentPassword', '')
        new_password = request.data.get('newPassword', '')

        if not current_password or not new_password:
            return Response(
                {'error': 'Current password and new password are required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if not user.check_password(current_password):
            return Response(
                {'error': 'Current password is incorrect'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if len(new_password) < 8:
            return Response(
                {'error': 'New password must be at least 8 characters'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if current_password == new_password:
            return Response(
                {'error': 'New password must be different from current password'},
                status=status.HTTP_400_BAD_REQUEST
            )

        user.set_password(new_password)
        user.password_changed_at = timezone.now()
        user.save(update_fields=['password', 'password_changed_at'])

        return Response({
            'success': True,
            'passwordChangedAt': user.password_changed_at.isoformat(),
        })


@method_decorator(csrf_exempt, name='dispatch')
class ForgotPasswordView(APIView):
    """Request a password reset email."""
    authentication_classes = []
    permission_classes = []

    def post(self, request):
        email = request.data.get('email', '').strip().lower()

        if not email:
            return Response(
                {'error': 'Email is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Always return a generic message to avoid email enumeration
        generic_msg = 'If an account exists with this email, a password reset link has been sent.'

        try:
            user = UserProfile.objects.get(email=email)
        except UserProfile.DoesNotExist:
            return Response({'message': generic_msg})

        # Rate limit: don't resend if last email was sent less than 60 seconds ago
        if user.password_reset_sent_at:
            elapsed = (timezone.now() - user.password_reset_sent_at).total_seconds()
            if elapsed < 60:
                return Response(
                    {'error': f'Please wait {int(60 - elapsed)} seconds before requesting another reset email.'},
                    status=status.HTTP_429_TOO_MANY_REQUESTS
                )

        from .models import SiteSettings
        settings = SiteSettings.load()

        token = generate_verification_token()
        user.password_reset_token = token
        user.password_reset_sent_at = timezone.now()
        user.save(update_fields=['password_reset_token', 'password_reset_sent_at'])

        reset_url = f'{settings.frontend_url}/reset-password?token={token}'
        success, error = send_password_reset_email(user, reset_url)

        if not success:
            return Response(
                {'error': 'Failed to send reset email. Please try again later.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

        return Response({'message': generic_msg})


@method_decorator(csrf_exempt, name='dispatch')
class ResetPasswordView(APIView):
    """Reset password using a token from the reset email."""
    authentication_classes = []
    permission_classes = []

    RESET_TOKEN_EXPIRY = timedelta(hours=1)

    def post(self, request):
        token = request.data.get('token', '').strip()
        new_password = request.data.get('password', '')

        if not token or not new_password:
            return Response(
                {'error': 'Token and new password are required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if len(new_password) < 8:
            return Response(
                {'error': 'Password must be at least 8 characters'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            user = UserProfile.objects.get(password_reset_token=token)
        except UserProfile.DoesNotExist:
            return Response(
                {'error': 'Invalid or expired reset token'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Check token expiry (1 hour)
        if user.password_reset_sent_at:
            age = timezone.now() - user.password_reset_sent_at
            if age > self.RESET_TOKEN_EXPIRY:
                # Clear expired token
                user.password_reset_token = ''
                user.save(update_fields=['password_reset_token'])
                return Response(
                    {'error': 'Reset token has expired. Please request a new one.'},
                    status=status.HTTP_400_BAD_REQUEST
                )

        # Set new password and clear token
        user.set_password(new_password)
        user.password_reset_token = ''
        user.password_changed_at = timezone.now()
        user.save(update_fields=['password', 'password_reset_token', 'password_changed_at'])

        return Response({'message': 'Password reset successfully. You can now log in.'})


class TwoFactorSetupView(APIView):
    """Generate TOTP secret and QR code for 2FA setup."""

    def post(self, request):
        user = get_user(request)

        if user.is_2fa_enabled:
            return Response(
                {'error': 'Two-factor authentication is already enabled'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Generate TOTP secret
        secret = pyotp.random_base32()
        user.totp_secret = secret
        user.save(update_fields=['totp_secret'])

        # Generate provisioning URI
        totp = pyotp.TOTP(secret)
        provisioning_uri = totp.provisioning_uri(
            name=user.email,
            issuer_name='Open Papertrade'
        )

        # Generate QR code as base64 PNG
        qr = qrcode.make(provisioning_uri)
        buffer = BytesIO()
        qr.save(buffer, format='PNG')
        qr_base64 = base64.b64encode(buffer.getvalue()).decode('utf-8')

        return Response({
            'secret': secret,
            'qrCode': f'data:image/png;base64,{qr_base64}',
            'provisioningUri': provisioning_uri,
        })


class TwoFactorVerifyView(APIView):
    """Verify TOTP code and enable 2FA."""

    def post(self, request):
        user = get_user(request)
        code = request.data.get('code', '').strip()

        if not code:
            return Response(
                {'error': 'Verification code is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if not user.totp_secret:
            return Response(
                {'error': 'Please start 2FA setup first'},
                status=status.HTTP_400_BAD_REQUEST
            )

        totp = pyotp.TOTP(user.totp_secret)
        if not totp.verify(code, valid_window=1):
            return Response(
                {'error': 'Invalid verification code'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Generate 10 backup codes
        plain_codes = [secrets.token_hex(4) for _ in range(10)]
        hashed_codes = [
            hashlib.sha256(c.encode()).hexdigest() for c in plain_codes
        ]

        user.is_2fa_enabled = True
        user.backup_codes = hashed_codes
        user.save(update_fields=['is_2fa_enabled', 'backup_codes'])

        return Response({
            'success': True,
            'backupCodes': plain_codes,
        })


class TwoFactorDisableView(APIView):
    """Disable 2FA (requires password confirmation)."""

    def post(self, request):
        user = get_user(request)
        password = request.data.get('password', '')

        if not password:
            return Response(
                {'error': 'Password is required to disable 2FA'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if not user.check_password(password):
            return Response(
                {'error': 'Incorrect password'},
                status=status.HTTP_400_BAD_REQUEST
            )

        user.totp_secret = ''
        user.is_2fa_enabled = False
        user.backup_codes = []
        user.save(update_fields=['totp_secret', 'is_2fa_enabled', 'backup_codes'])

        return Response({'success': True})


class APIKeyListCreateView(APIView):
    """List and create API keys."""

    def get(self, request):
        user = get_user(request)
        keys = user.api_keys.filter(is_active=True)
        return Response({
            'keys': [k.to_dict() for k in keys],
        })

    def post(self, request):
        user = get_user(request)
        name = request.data.get('name', '').strip()

        if not name:
            return Response(
                {'error': 'API key name is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Limit to 10 active keys
        active_count = user.api_keys.filter(is_active=True).count()
        if active_count >= 10:
            return Response(
                {'error': 'Maximum of 10 active API keys allowed'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Generate key: opt_ + 40 hex chars
        raw_key = f'opt_{secrets.token_hex(20)}'
        key_prefix = raw_key[:8]
        key_hash = hashlib.sha256(raw_key.encode()).hexdigest()

        api_key = APIKey.objects.create(
            user=user,
            name=name,
            key_prefix=key_prefix,
            key_hash=key_hash,
        )

        result = api_key.to_dict()
        result['fullKey'] = raw_key

        return Response(result, status=status.HTTP_201_CREATED)


class APIKeyRevokeView(APIView):
    """Revoke (soft-delete) an API key."""

    def delete(self, request, key_id):
        user = get_user(request)

        try:
            api_key = user.api_keys.get(id=key_id, is_active=True)
        except APIKey.DoesNotExist:
            return Response(
                {'error': 'API key not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        api_key.is_active = False
        api_key.save(update_fields=['is_active'])

        return Response({'success': True})
