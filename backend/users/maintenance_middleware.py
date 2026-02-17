"""
Maintenance mode middleware.

When maintenance_mode is enabled in SiteSettings, returns 503 JSON for all
API requests except exempt paths (admin panel, auth endpoints, maintenance status).
"""

import json

from django.http import JsonResponse

from .models import SiteSettings

# Paths that are always accessible during maintenance
EXEMPT_PREFIXES = (
    '/admin/',
    '/static/',
    '/media/',
    '/api/maintenance-status/',
    '/api/auth/login/',
    '/api/auth/logout/',
    '/api/auth/me/',
    '/api/auth/refresh/',
    '/api/auth/2fa/verify/',
    '/api/auth/forgot-password/',
    '/api/auth/reset-password/',
)


class MaintenanceMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if self._is_exempt(request.path):
            return self.get_response(request)

        settings = SiteSettings.load()
        if settings.maintenance_mode:
            return JsonResponse(
                {
                    'maintenance': True,
                    'message': settings.maintenance_message,
                },
                status=503,
            )

        return self.get_response(request)

    def _is_exempt(self, path):
        return any(path.startswith(prefix) for prefix in EXEMPT_PREFIXES)
