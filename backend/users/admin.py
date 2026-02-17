from django.contrib import admin
from django.http import HttpResponseRedirect
from django.contrib import messages
from django.shortcuts import get_object_or_404
from django.template.response import TemplateResponse
from django.urls import path, reverse
from django.utils import timezone
from django.utils.html import format_html
from unfold.admin import ModelAdmin
from unfold.decorators import display, action
from .models import (
    UserProfile, UserSettings, Achievement, UserAchievement,
    Trade, Holding, Watchlist, PriceAlert, SiteSettings, APIKey, LimitOrder
)
from .email_service import send_test_email
from .report_views import compute_weekly_report, compute_monthly_report, compute_yearly_report

CURRENCY_SYMBOLS = {
    'USD': '$', 'EUR': '€', 'GBP': '£', 'INR': '₹',
    'JPY': '¥', 'CAD': 'C$', 'AUD': 'A$', 'CHF': 'CHF',
    'CNY': '¥', 'SGD': 'S$',
}

def _fmt(amount, currency='USD'):
    """Format amount with the correct currency symbol."""
    sym = CURRENCY_SYMBOLS.get(currency, currency)
    return f"{sym}{amount:,.2f}"


@admin.register(SiteSettings)
class SiteSettingsAdmin(ModelAdmin):
    list_display = ['__str__', 'display_maintenance', 'display_email_status', 'display_smtp_host', 'display_buying_power']
    fieldsets = [
        ("Maintenance Mode", {
            "fields": ["maintenance_mode", "maintenance_message", "contact_email", "contact_github", "contact_twitter", "contact_discord"],
            "description": "Enable maintenance mode to take the site offline. All users will see a maintenance page. Contact links are displayed on the maintenance page.",
        }),
        ("Email Verification", {
            "fields": ["email_verification_enabled"],
            "description": "Toggle whether new users must verify their email address before logging in.",
        }),
        ("New User Defaults", {
            "fields": ["default_buying_power", "currency_buying_power"],
            "description": "Configure starting balance for newly registered users. Set per-currency amounts or a fallback default.",
        }),
        ("Exchange Rates", {
            "fields": ["exchange_rates"],
            "description": 'Fallback exchange rates vs USD used when live API is unavailable. Format: {"EUR": 0.84, "INR": 90.55, "GBP": 0.73, "JPY": 152.70, "CAD": 1.36, "AUD": 1.41, "CHF": 0.77, "CNY": 6.91, "SGD": 1.26}. Leave empty to use hardcoded defaults.',
        }),
        ("SMTP Configuration", {
            "fields": [
                "smtp_host", "smtp_port", "smtp_username", "smtp_password",
                "smtp_use_tls", "smtp_use_ssl", "smtp_from_email", "smtp_from_name",
            ],
            "description": "Configure your SMTP server for sending emails. Common providers: Gmail (smtp.gmail.com:587), SendGrid (smtp.sendgrid.net:587), Mailgun, Amazon SES.",
        }),
        ("Frontend", {
            "fields": ["frontend_url"],
            "description": "The base URL of the frontend app, used for building email verification links.",
        }),
    ]
    actions_detail = ['send_test_email_action']

    def has_add_permission(self, request):
        # Only allow one instance
        return not SiteSettings.objects.exists()

    def has_delete_permission(self, request, obj=None):
        return False

    @display(description="Maintenance", label={"ON": "danger", "OFF": "success"})
    def display_maintenance(self, obj):
        return "ON" if obj.maintenance_mode else "OFF"

    @display(description="Email Verification", label={"Enabled": "success", "Disabled": "info"})
    def display_email_status(self, obj):
        return "Enabled" if obj.email_verification_enabled else "Disabled"

    @display(description="SMTP Host")
    def display_smtp_host(self, obj):
        return obj.smtp_host or "Not configured"

    @display(description="Default Balance")
    def display_buying_power(self, obj):
        return f"{obj.default_buying_power:,.0f}"

    @action(description="Send Test Email", url_path="send-test-email")
    def send_test_email_action(self, request, object_id):
        obj = self.get_object(request, object_id)
        if not obj.smtp_from_email:
            messages.error(request, "Cannot send test email: SMTP 'from email' is not configured.")
            return HttpResponseRedirect(request.META.get('HTTP_REFERER', '/admin/'))

        # Send test email to the SMTP from address itself
        to_email = obj.smtp_from_email
        success, error = send_test_email(to_email)

        if success:
            messages.success(request, f"Test email sent successfully to {to_email}!")
        else:
            messages.error(request, f"Failed to send test email: {error}")

        return HttpResponseRedirect(request.META.get('HTTP_REFERER', '/admin/'))


@admin.register(UserProfile)
class UserProfileAdmin(ModelAdmin):
    list_display = ['name', 'email', 'display_verified', 'display_buying_power', 'display_plan', 'display_admin', 'display_reports_link', 'created_at']
    search_fields = ['name', 'email', 'username']
    list_filter = ['plan', 'is_email_verified', 'is_2fa_enabled', 'is_admin', 'created_at']
    readonly_fields = ['id', 'created_at', 'updated_at', 'password_changed_at', 'is_2fa_enabled']
    fieldsets = [
        ("Profile", {"fields": ["id", "name", "username", "email", "avatar_url"]}),
        ("Email Verification", {"fields": ["is_email_verified"]}),
        ("Account", {"fields": ["buying_power", "initial_balance", "plan"]}),
        ("Admin", {"fields": ["is_admin"]}),
        ("Security", {"fields": ["password_changed_at", "is_2fa_enabled"]}),
        ("Timestamps", {"fields": ["created_at", "updated_at"]}),
    ]

    def get_urls(self):
        custom_urls = [
            path(
                '<path:object_id>/reports/',
                self.admin_site.admin_view(self.user_reports_view),
                name='users_userprofile_reports',
            ),
        ]
        return custom_urls + super().get_urls()

    def user_reports_view(self, request, object_id):
        """Custom admin view that renders a user's trading reports."""
        target_user = get_object_or_404(UserProfile, pk=object_id)
        now = timezone.now()

        report_type = request.GET.get('type', 'weekly')
        year = int(request.GET.get('year', now.year))
        month = int(request.GET.get('month', now.month))

        report = None
        report_empty = False
        empty_message = ''

        if report_type == 'weekly':
            report = compute_weekly_report(target_user)
            if report is None:
                report_empty = True
                empty_message = 'No trades this week.'
        elif report_type == 'monthly':
            report = compute_monthly_report(target_user, year, month)
            if report is None:
                report_empty = True
                empty_message = f'No trades in {timezone.datetime(year, month, 1).strftime("%B %Y")}.'
        elif report_type == 'yearly':
            report = compute_yearly_report(target_user, year)
            if report is None:
                report_empty = True
                empty_message = f'No trades in {year}.'

        # Compute bar heights for chart rendering
        if report:
            bars = report.get('dailyBars') or report.get('weekBars') or []
            if bars:
                max_abs = max(abs(b['value']) for b in bars) or 1
                for b in bars:
                    b['height'] = max(int(abs(b['value']) / max_abs * 100), 5) if b['value'] != 0 else 5

        # Year/month choices for the filter form
        first_trade = Trade.objects.filter(user=target_user).order_by('executed_at').first()
        start_year = first_trade.executed_at.year if first_trade else now.year
        year_choices = list(range(now.year, start_year - 1, -1))
        month_choices = [
            (1, 'January'), (2, 'February'), (3, 'March'), (4, 'April'),
            (5, 'May'), (6, 'June'), (7, 'July'), (8, 'August'),
            (9, 'September'), (10, 'October'), (11, 'November'), (12, 'December'),
        ]

        tab_choices = [
            ('weekly', 'Weekly'),
            ('monthly', 'Monthly'),
            ('yearly', 'Yearly Wrapped'),
        ]

        # Resolve avatar URL for template
        avatar_url = None
        if target_user.avatar_url:
            if target_user.avatar_url.startswith('http'):
                avatar_url = target_user.avatar_url
            else:
                avatar_url = request.build_absolute_uri(f'/media/{target_user.avatar_url}')

        context = {
            **self.admin_site.each_context(request),
            'title': f'Reports: {target_user.name}',
            'target_user': target_user,
            'avatar_url': avatar_url,
            'report_type': report_type,
            'report': report,
            'report_empty': report_empty,
            'empty_message': empty_message,
            'year': year,
            'month': month,
            'year_choices': year_choices,
            'month_choices': month_choices,
            'tab_choices': tab_choices,
            'opts': self.model._meta,
        }
        return TemplateResponse(request, 'admin/users/user_reports.html', context)

    @display(description="Buying Power", ordering="buying_power")
    def display_buying_power(self, obj):
        try:
            cur = obj.settings.currency
        except UserSettings.DoesNotExist:
            cur = 'USD'
        return _fmt(obj.buying_power, cur)

    @display(description="Plan", label={"FREE": "info", "PRO": "success", "PREMIUM": "warning"})
    def display_plan(self, obj):
        return obj.plan

    @display(description="Verified", boolean=True)
    def display_verified(self, obj):
        return obj.is_email_verified

    @display(description="Admin", boolean=True)
    def display_admin(self, obj):
        return obj.is_admin

    @display(description="Reports")
    def display_reports_link(self, obj):
        url = reverse('admin:users_userprofile_reports', args=[obj.pk])
        return format_html('<a href="{}" style="white-space:nowrap">View Reports</a>', url)


@admin.register(UserSettings)
class UserSettingsAdmin(ModelAdmin):
    list_display = ['user', 'theme', 'default_order_type', 'notify_price_alerts']
    list_filter = ['theme', 'default_order_type']
    search_fields = ['user__name', 'user__email']


@admin.register(Achievement)
class AchievementAdmin(ModelAdmin):
    list_display = ['id', 'name', 'icon', 'requirement_type', 'requirement_value']
    search_fields = ['name', 'description']
    list_filter = ['requirement_type']


@admin.register(UserAchievement)
class UserAchievementAdmin(ModelAdmin):
    list_display = ['user', 'achievement', 'unlocked_at']
    list_filter = ['achievement', 'unlocked_at']
    search_fields = ['user__name', 'achievement__name']


@admin.register(Trade)
class TradeAdmin(ModelAdmin):
    list_display = ['user', 'symbol', 'display_trade_type', 'shares', 'display_price', 'display_total', 'currency', 'executed_at']
    list_filter = ['trade_type', 'symbol', 'executed_at']
    search_fields = ['symbol', 'user__name']
    readonly_fields = ['id', 'executed_at']
    date_hierarchy = 'executed_at'

    @display(description="Type", label={"BUY": "success", "SELL": "danger"})
    def display_trade_type(self, obj):
        return obj.trade_type

    @display(description="Price")
    def display_price(self, obj):
        return _fmt(obj.price, obj.currency)

    @display(description="Total")
    def display_total(self, obj):
        return _fmt(obj.total, obj.currency)


@admin.register(Holding)
class HoldingAdmin(ModelAdmin):
    list_display = ['user', 'symbol', 'name', 'shares', 'display_avg_cost', 'display_value', 'currency']
    search_fields = ['symbol', 'user__name', 'name']
    list_filter = ['symbol']

    @display(description="Avg Cost")
    def display_avg_cost(self, obj):
        return _fmt(obj.avg_cost, obj.currency)

    @display(description="Value")
    def display_value(self, obj):
        return _fmt(float(obj.shares) * float(obj.avg_cost), obj.currency)


@admin.register(Watchlist)
class WatchlistAdmin(ModelAdmin):
    list_display = ['user', 'symbol', 'name', 'display_starred', 'added_at']
    list_filter = ['starred', 'added_at']
    search_fields = ['symbol', 'user__name']

    @display(description="Starred", boolean=True)
    def display_starred(self, obj):
        return obj.starred


@admin.register(PriceAlert)
class PriceAlertAdmin(ModelAdmin):
    list_display = ['user', 'symbol', 'condition', 'display_target', 'display_enabled', 'display_triggered']
    list_filter = ['condition', 'enabled', 'triggered']
    search_fields = ['symbol', 'user__name']

    @display(description="Target")
    def display_target(self, obj):
        try:
            cur = obj.user.settings.currency
        except UserSettings.DoesNotExist:
            cur = 'USD'
        return _fmt(obj.target_price, cur)

    @display(description="Enabled", boolean=True)
    def display_enabled(self, obj):
        return obj.enabled

    @display(description="Triggered", boolean=True)
    def display_triggered(self, obj):
        return obj.triggered


@admin.register(APIKey)
class APIKeyAdmin(ModelAdmin):
    list_display = ['user', 'name', 'key_prefix', 'display_active', 'last_used_at', 'created_at']
    list_filter = ['is_active', 'created_at']
    search_fields = ['name', 'user__name', 'user__email', 'key_prefix']
    readonly_fields = ['id', 'key_prefix', 'key_hash', 'created_at']

    @display(description="Active", boolean=True)
    def display_active(self, obj):
        return obj.is_active


@admin.register(LimitOrder)
class LimitOrderAdmin(ModelAdmin):
    list_display = ['user', 'symbol', 'display_trade_type', 'display_status', 'display_limit_price', 'shares', 'created_at']
    list_filter = ['trade_type', 'status', 'created_at']
    search_fields = ['symbol', 'user__name']
    readonly_fields = ['id', 'created_at', 'filled_at']

    @display(description="Type", label={"BUY": "success", "SELL": "danger"})
    def display_trade_type(self, obj):
        return obj.trade_type

    @display(description="Status", label={"PENDING": "info", "FILLED": "success", "CANCELLED": "warning", "EXPIRED": "danger"})
    def display_status(self, obj):
        return obj.status

    @display(description="Limit Price")
    def display_limit_price(self, obj):
        return _fmt(obj.limit_price, obj.currency)
