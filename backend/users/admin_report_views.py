"""
Admin report endpoints for previewing any user's reports.
Requires the requesting user to have is_admin=True.
"""

from django.utils import timezone
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import UserProfile
from .views import get_user
from .report_views import (
    compute_weekly_report,
    compute_monthly_report,
    compute_yearly_report,
)


def _get_admin_and_target(request, username):
    """Authenticate the requesting user, verify admin, and look up the target user.

    Returns (admin_user, target_user, error_response).
    If error_response is not None, return it immediately.
    """
    admin_user = get_user(request)

    if not admin_user.is_admin:
        return None, None, Response(
            {'error': 'Admin access required'}, status=403
        )

    try:
        target_user = UserProfile.objects.get(username=username)
    except UserProfile.DoesNotExist:
        return None, None, Response(
            {'error': f'User "{username}" not found'}, status=404
        )

    return admin_user, target_user, None


class AdminWeeklyReportView(APIView):
    """GET /api/users/admin/reports/weekly/<username>/"""

    def get(self, request, username):
        _, target_user, err = _get_admin_and_target(request, username)
        if err:
            return err

        data = compute_weekly_report(target_user)
        if data is None:
            return Response({'empty': True, 'message': 'No trades this week', 'targetUser': username})

        data['targetUser'] = username
        return Response(data)


class AdminMonthlyReportView(APIView):
    """GET /api/users/admin/reports/monthly/<username>/?year=&month="""

    def get(self, request, username):
        _, target_user, err = _get_admin_and_target(request, username)
        if err:
            return err

        now = timezone.now()
        year = int(request.query_params.get('year', now.year))
        month = int(request.query_params.get('month', now.month))

        data = compute_monthly_report(target_user, year, month)
        if data is None:
            return Response({'empty': True, 'message': 'No trades this month', 'targetUser': username})

        data['targetUser'] = username
        return Response(data)


class AdminYearlyReportView(APIView):
    """GET /api/users/admin/reports/yearly/<username>/?year="""

    def get(self, request, username):
        _, target_user, err = _get_admin_and_target(request, username)
        if err:
            return err

        now = timezone.now()
        year = int(request.query_params.get('year', now.year))

        data = compute_yearly_report(target_user, year)
        if data is None:
            return Response({'empty': True, 'message': 'No trades this year', 'targetUser': username})

        data['targetUser'] = username
        return Response(data)
