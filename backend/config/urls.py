"""
URL configuration for paper-trading backend.
"""

from django.contrib import admin
from django.urls import path, include
from django.http import JsonResponse
from django.conf import settings
from django.conf.urls.static import static


def api_root(request):
    """API root endpoint with available endpoints."""
    return JsonResponse({
        "name": "Paper Trading API",
        "version": "1.0.0",
        "endpoints": {
            "stocks": "/api/stocks/",
            "users": "/api/users/",
            "admin": "/admin/",
        },
        "stock_endpoints": {
            "quote": "/api/stocks/quote/{symbol}/",
            "bulk_quotes": "/api/stocks/quotes/",
            "search": "/api/stocks/search/?q={query}",
            "profile": "/api/stocks/profile/{symbol}/",
            "popular": "/api/stocks/popular/",
            "crypto": "/api/stocks/crypto/",
            "status": "/api/stocks/status/",
        },
        "user_endpoints": {
            "profile": "/api/users/profile/",
            "settings": "/api/users/settings/",
            "stats": "/api/users/stats/",
            "achievements": "/api/users/achievements/",
            "holdings": "/api/users/holdings/",
            "trades": "/api/users/trades/",
            "execute_trade": "/api/users/trades/execute/",
            "watchlist": "/api/users/watchlist/",
            "alerts": "/api/users/alerts/",
            "reset": "/api/users/reset/",
        }
    })


from users.auth_views import SignupView, LoginView, RefreshTokenView, VerifyEmailView, ResendVerificationView, LogoutView, MeView, TwoFactorLoginVerifyView
from users.security_views import ForgotPasswordView, ResetPasswordView
from users.models import SiteSettings


def maintenance_status(request):
    """Public endpoint to check maintenance mode status."""
    site = SiteSettings.load()
    links = {}
    if site.contact_email:
        links['email'] = site.contact_email
    if site.contact_github:
        links['github'] = site.contact_github
    if site.contact_twitter:
        links['twitter'] = site.contact_twitter
    if site.contact_discord:
        links['discord'] = site.contact_discord
    return JsonResponse({
        'enabled': site.maintenance_mode,
        'message': site.maintenance_message,
        'links': links,
    })


urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/maintenance-status/', maintenance_status, name='maintenance-status'),
    path('api/', api_root, name='api-root'),
    path('api/stocks/', include('stocks.urls', namespace='stocks')),
    path('api/users/', include('users.urls', namespace='users')),
    path('api/auth/signup/', SignupView.as_view(), name='auth-signup'),
    path('api/auth/login/', LoginView.as_view(), name='auth-login'),
    path('api/auth/refresh/', RefreshTokenView.as_view(), name='auth-refresh'),
    path('api/auth/verify-email/', VerifyEmailView.as_view(), name='auth-verify-email'),
    path('api/auth/resend-verification/', ResendVerificationView.as_view(), name='auth-resend-verification'),
    path('api/auth/logout/', LogoutView.as_view(), name='auth-logout'),
    path('api/auth/me/', MeView.as_view(), name='auth-me'),
    path('api/auth/2fa/verify/', TwoFactorLoginVerifyView.as_view(), name='auth-2fa-verify'),
    path('api/auth/forgot-password/', ForgotPasswordView.as_view(), name='auth-forgot-password'),
    path('api/auth/reset-password/', ResetPasswordView.as_view(), name='auth-reset-password'),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
