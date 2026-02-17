"""
Custom JWT authentication that reads tokens from HttpOnly cookies.
"""

from django.conf import settings
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken

from .models import UserProfile


class CookieJWTAuthentication(JWTAuthentication):
    """
    Reads the access_token from an HttpOnly cookie.
    Falls back to the Authorization header for non-browser clients.
    """

    def authenticate(self, request):
        # Try cookie first
        raw_token = request.COOKIES.get(settings.JWT_COOKIE_ACCESS_NAME)
        if raw_token:
            try:
                validated_token = self.get_validated_token(raw_token)
                return self.get_user(validated_token), validated_token
            except InvalidToken:
                # Expired/invalid cookie — treat as unauthenticated
                # (don't raise; let permission classes decide)
                return None

        # Fall back to Authorization header
        return super().authenticate(request)

    def get_user(self, validated_token):
        """Resolve user_id claim to a UserProfile instance."""
        user_id = validated_token.get('user_id')
        if not user_id:
            raise InvalidToken('Token contained no user_id claim')

        try:
            return UserProfile.objects.get(id=user_id)
        except UserProfile.DoesNotExist:
            raise InvalidToken('User not found')
