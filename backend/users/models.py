"""
User models for paper trading app.
"""

import re
import random
import string

from django.db import models
from django.contrib.auth.hashers import make_password, check_password as django_check_password
from django.core.validators import RegexValidator
from django.utils import timezone
import uuid


class SiteSettings(models.Model):
    """Singleton model for site-wide settings including SMTP configuration."""

    class Meta:
        db_table = 'site_settings'
        verbose_name = 'Site Settings'
        verbose_name_plural = 'Site Settings'

    # Email verification toggle
    email_verification_enabled = models.BooleanField(
        default=False,
        help_text='When enabled, new users must verify their email before logging in.'
    )

    # SMTP settings
    smtp_host = models.CharField(max_length=255, blank=True, default='', help_text='e.g. smtp.gmail.com')
    smtp_port = models.PositiveIntegerField(default=587, help_text='Common ports: 587 (TLS), 465 (SSL), 25')
    smtp_username = models.CharField(max_length=255, blank=True, default='')
    smtp_password = models.CharField(max_length=255, blank=True, default='')
    smtp_use_tls = models.BooleanField(default=True, help_text='Use TLS encryption (recommended for port 587)')
    smtp_use_ssl = models.BooleanField(default=False, help_text='Use SSL encryption (for port 465)')
    smtp_from_email = models.EmailField(blank=True, default='', help_text='From address for outgoing emails')
    smtp_from_name = models.CharField(max_length=100, blank=True, default='Open Papertrade')

    # Maintenance mode
    maintenance_mode = models.BooleanField(
        default=False,
        help_text='When enabled, all users see a maintenance page instead of the app.'
    )
    maintenance_message = models.CharField(
        max_length=500, blank=True,
        default='We are currently undergoing scheduled maintenance. Please check back soon.',
        help_text='Message displayed to users during maintenance.'
    )

    # Contact / social links (shown on maintenance page)
    contact_email = models.EmailField(blank=True, default='', help_text='Support email shown during maintenance')
    contact_github = models.URLField(blank=True, default='', help_text='GitHub repository URL')
    contact_twitter = models.URLField(blank=True, default='', help_text='Twitter / X profile URL')
    contact_discord = models.URLField(blank=True, default='', help_text='Discord invite URL')

    # Frontend URL for verification links
    frontend_url = models.URLField(default='http://localhost:3000', help_text='Frontend URL for email verification links')

    # New user defaults
    default_buying_power = models.DecimalField(
        max_digits=20, decimal_places=2, default=100000.00,
        help_text='Fallback starting buying power when no currency-specific default is set.'
    )
    currency_buying_power = models.JSONField(
        default=dict, blank=True,
        help_text='Per-currency starting buying power, e.g. {"USD": 100000, "INR": 1000000, "EUR": 50000}'
    )

    # Admin-managed exchange rates (fallback when API is unavailable)
    exchange_rates = models.JSONField(
        default=dict, blank=True,
        help_text='Admin-set exchange rates vs USD, e.g. {"EUR": 0.84, "INR": 90.55, "GBP": 0.73}. Used when live API is unavailable.'
    )

    def __str__(self):
        return 'Site Settings'

    def get_buying_power(self, currency='USD'):
        """Return the starting buying power for a given currency."""
        if self.currency_buying_power and currency in self.currency_buying_power:
            return self.currency_buying_power[currency]
        return float(self.default_buying_power)

    def save(self, *args, **kwargs):
        # Ensure only one instance exists
        self.pk = 1
        super().save(*args, **kwargs)

    @classmethod
    def load(cls):
        """Load the singleton instance, creating with defaults if needed."""
        obj, _ = cls.objects.get_or_create(pk=1)
        return obj


USERNAME_VALIDATOR = RegexValidator(
    regex=r'^[a-z0-9](?:[a-z0-9-]{1,28}[a-z0-9])?$',
    message='Username must be 3-30 characters, lowercase alphanumeric and hyphens, cannot start or end with a hyphen.',
)


def generate_username(name):
    """Generate a username from a display name. Appends random suffix if taken."""
    slug = re.sub(r'[^a-z0-9]+', '-', name.lower()).strip('-')
    if len(slug) < 3:
        slug = slug + '-user'
    slug = slug[:26]  # leave room for suffix

    if not UserProfile.objects.filter(username=slug).exists():
        return slug

    for _ in range(10):
        suffix = ''.join(random.choices(string.ascii_lowercase + string.digits, k=4))
        candidate = f"{slug}-{suffix}"[:30]
        if not UserProfile.objects.filter(username=candidate).exists():
            return candidate

    # Extremely unlikely fallback
    return f"{slug}-{uuid.uuid4().hex[:4]}"[:30]


class UserProfile(models.Model):
    """User profile model."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100)
    username = models.CharField(
        max_length=30, unique=True, blank=True, default='',
        validators=[USERNAME_VALIDATOR],
        help_text='Unique username (3-30 chars, lowercase alphanumeric and hyphens)',
    )
    email = models.EmailField(unique=True)
    password = models.CharField(max_length=128, default='')
    avatar_url = models.CharField(max_length=500, blank=True, default='')

    # Email verification
    is_email_verified = models.BooleanField(default=False)
    email_verification_token = models.CharField(max_length=64, blank=True, default='')
    email_verification_sent_at = models.DateTimeField(blank=True, null=True)

    # Account info
    buying_power = models.DecimalField(max_digits=20, decimal_places=2, default=100000.00)
    initial_balance = models.DecimalField(max_digits=20, decimal_places=2, default=100000.00)

    # Timestamps
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    # Plan
    plan = models.CharField(max_length=20, default='FREE', choices=[
        ('FREE', 'Free'),
        ('PRO', 'Pro'),
        ('PREMIUM', 'Premium'),
    ])

    # Admin
    is_admin = models.BooleanField(default=False)

    # Security - Password
    password_changed_at = models.DateTimeField(blank=True, null=True)
    password_reset_token = models.CharField(max_length=64, blank=True, default='')
    password_reset_sent_at = models.DateTimeField(blank=True, null=True)

    # Security - 2FA
    totp_secret = models.CharField(max_length=255, blank=True, default='')
    is_2fa_enabled = models.BooleanField(default=False)
    backup_codes = models.JSONField(default=list, blank=True)

    # XP & Rank
    xp = models.PositiveIntegerField(default=0)
    rank = models.CharField(max_length=30, default='Retail Trader')
    level = models.PositiveIntegerField(default=1)

    # Reset tracking (prevent abuse)
    last_reset_at = models.DateTimeField(blank=True, null=True)

    @property
    def is_authenticated(self):
        """Required by DRF when used as request.user."""
        return True

    class Meta:
        db_table = 'user_profiles'

    def __str__(self):
        return f"{self.name} ({self.email})"

    def set_password(self, raw_password):
        self.password = make_password(raw_password)

    def check_password(self, raw_password):
        return django_check_password(raw_password, self.password)

    @property
    def initials(self):
        """Get user initials from name."""
        parts = self.name.split()
        if len(parts) >= 2:
            return f"{parts[0][0]}{parts[1][0]}".upper()
        return self.name[:2].upper() if self.name else "??"

    def to_dict(self):
        return {
            "id": str(self.id),
            "name": self.name,
            "username": self.username,
            "email": self.email,
            "initials": self.initials,
            "avatarUrl": f'/media/{self.avatar_url}' if self.avatar_url and not self.avatar_url.startswith(('http://', 'https://')) else (self.avatar_url or None),
            "buyingPower": float(self.buying_power),
            "initialBalance": float(self.initial_balance),
            "plan": self.plan,
            "passwordChangedAt": self.password_changed_at.isoformat() if self.password_changed_at else None,
            "is2faEnabled": self.is_2fa_enabled,
            "xp": self.xp,
            "rank": self.rank,
            "level": self.level,
            "isAdmin": self.is_admin,
            "createdAt": self.created_at.isoformat(),
            "updatedAt": self.updated_at.isoformat(),
        }


class UserSettings(models.Model):
    """User settings and preferences."""
    user = models.OneToOneField(UserProfile, on_delete=models.CASCADE, related_name='settings')

    # Notification settings
    notify_price_alerts = models.BooleanField(default=True)
    notify_trade_confirmations = models.BooleanField(default=True)
    notify_weekly_report = models.BooleanField(default=False)
    notify_market_news = models.BooleanField(default=True)

    # Trading preferences
    default_order_type = models.CharField(max_length=10, default='MARKET', choices=[
        ('MARKET', 'Market'),
        ('LIMIT', 'Limit'),
    ])
    confirm_trades = models.BooleanField(default=True)
    show_profit_loss = models.BooleanField(default=True)
    compact_mode = models.BooleanField(default=False)

    # Display preferences
    theme = models.CharField(max_length=10, default='DARK', choices=[
        ('DARK', 'Dark'),
        ('LIGHT', 'Light'),
        ('AUTO', 'Auto'),
    ])
    currency = models.CharField(max_length=3, default='USD', choices=[
        ('USD', 'US Dollar'),
        ('EUR', 'Euro'),
        ('GBP', 'British Pound'),
        ('INR', 'Indian Rupee'),
        ('JPY', 'Japanese Yen'),
        ('CAD', 'Canadian Dollar'),
        ('AUD', 'Australian Dollar'),
        ('CHF', 'Swiss Franc'),
        ('CNY', 'Chinese Yuan'),
        ('SGD', 'Singapore Dollar'),
    ])

    # Market preference
    market = models.CharField(max_length=10, default='US', choices=[
        ('US', 'United States'),
        ('IN', 'India (NSE/BSE)'),
    ])

    class Meta:
        db_table = 'user_settings'

    def to_dict(self):
        return {
            "notifications": {
                "priceAlerts": self.notify_price_alerts,
                "tradeConfirmations": self.notify_trade_confirmations,
                "weeklyReport": self.notify_weekly_report,
                "marketNews": self.notify_market_news,
            },
            "preferences": {
                "defaultOrderType": self.default_order_type,
                "confirmTrades": self.confirm_trades,
                "showProfitLoss": self.show_profit_loss,
                "compactMode": self.compact_mode,
            },
            "display": {
                "theme": self.theme,
                "currency": self.currency,
                "market": self.market,
            }
        }


class Achievement(models.Model):
    """Achievement definitions."""
    id = models.CharField(max_length=50, primary_key=True)
    name = models.CharField(max_length=100)
    description = models.TextField()
    icon = models.CharField(max_length=10)  # Emoji
    requirement_type = models.CharField(max_length=50)  # e.g., 'trades_count', 'profit_amount'
    requirement_value = models.IntegerField()

    class Meta:
        db_table = 'achievements'

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "description": self.description,
            "icon": self.icon,
        }


class UserAchievement(models.Model):
    """User's unlocked achievements."""
    user = models.ForeignKey(UserProfile, on_delete=models.CASCADE, related_name='achievements')
    achievement = models.ForeignKey(Achievement, on_delete=models.CASCADE)
    unlocked_at = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = 'user_achievements'
        unique_together = ['user', 'achievement']


class Trade(models.Model):
    """User trades/transactions."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(UserProfile, on_delete=models.CASCADE, related_name='trades')

    symbol = models.CharField(max_length=20)
    name = models.CharField(max_length=200, blank=True)
    trade_type = models.CharField(max_length=4, choices=[('BUY', 'Buy'), ('SELL', 'Sell')])
    shares = models.DecimalField(max_digits=20, decimal_places=8)
    price = models.DecimalField(max_digits=20, decimal_places=6)
    total = models.DecimalField(max_digits=20, decimal_places=2)
    currency = models.CharField(max_length=3, default='USD', help_text='Currency the price/total are denominated in')

    executed_at = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = 'trades'
        ordering = ['-executed_at']

    def to_dict(self):
        return {
            "id": str(self.id),
            "symbol": self.symbol,
            "name": self.name,
            "type": self.trade_type,
            "shares": float(self.shares),
            "price": float(self.price),
            "total": float(self.total),
            "currency": self.currency,
            "executedAt": self.executed_at.isoformat(),
        }


class Holding(models.Model):
    """User's current holdings."""
    user = models.ForeignKey(UserProfile, on_delete=models.CASCADE, related_name='holdings')
    symbol = models.CharField(max_length=20)
    name = models.CharField(max_length=200, blank=True)
    shares = models.DecimalField(max_digits=20, decimal_places=8)
    avg_cost = models.DecimalField(max_digits=20, decimal_places=6)
    currency = models.CharField(max_length=3, default='USD', help_text='Currency the avg_cost is denominated in')

    class Meta:
        db_table = 'holdings'
        unique_together = ['user', 'symbol']

    def to_dict(self):
        return {
            "symbol": self.symbol,
            "name": self.name,
            "shares": float(self.shares),
            "avgCost": float(self.avg_cost),
            "currency": self.currency,
        }


class Watchlist(models.Model):
    """User's watchlist items."""
    user = models.ForeignKey(UserProfile, on_delete=models.CASCADE, related_name='watchlist')
    symbol = models.CharField(max_length=20)
    name = models.CharField(max_length=200, blank=True)
    starred = models.BooleanField(default=False)
    added_at = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = 'watchlist'
        unique_together = ['user', 'symbol']


class PriceAlert(models.Model):
    """User's price alerts."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(UserProfile, on_delete=models.CASCADE, related_name='alerts')
    symbol = models.CharField(max_length=20)
    condition = models.CharField(max_length=10, choices=[('above', 'Above'), ('below', 'Below')])
    target_price = models.DecimalField(max_digits=20, decimal_places=6)
    enabled = models.BooleanField(default=True)
    triggered = models.BooleanField(default=False)
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = 'price_alerts'

    def to_dict(self):
        return {
            "id": str(self.id),
            "symbol": self.symbol,
            "condition": self.condition,
            "targetPrice": float(self.target_price),
            "enabled": self.enabled,
            "triggered": self.triggered,
        }


class Friendship(models.Model):
    """Friend relationships between users."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    from_user = models.ForeignKey(UserProfile, on_delete=models.CASCADE, related_name='friendships_sent')
    to_user = models.ForeignKey(UserProfile, on_delete=models.CASCADE, related_name='friendships_received')
    status = models.CharField(max_length=10, default='pending', choices=[
        ('pending', 'Pending'),
        ('accepted', 'Accepted'),
        ('rejected', 'Rejected'),
    ])
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'friendships'
        unique_together = ['from_user', 'to_user']

    def __str__(self):
        return f"{self.from_user.username} -> {self.to_user.username} ({self.status})"

    def _user_summary(self, user):
        return {
            'username': user.username,
            'name': user.name,
            'initials': user.initials,
            'avatarUrl': f'/media/{user.avatar_url}' if user.avatar_url and not user.avatar_url.startswith(('http://', 'https://')) else (user.avatar_url or None),
            'level': user.level,
            'rank': user.rank,
        }

    def to_dict(self):
        return {
            'id': str(self.id),
            'fromUser': self._user_summary(self.from_user),
            'toUser': self._user_summary(self.to_user),
            'status': self.status,
            'createdAt': self.created_at.isoformat(),
        }


class LimitOrder(models.Model):
    """Limit orders that execute when price conditions are met."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(UserProfile, on_delete=models.CASCADE, related_name='limit_orders')
    symbol = models.CharField(max_length=20)
    name = models.CharField(max_length=200, blank=True)
    trade_type = models.CharField(max_length=4, choices=[('BUY', 'Buy'), ('SELL', 'Sell')])
    shares = models.DecimalField(max_digits=20, decimal_places=8)
    limit_price = models.DecimalField(max_digits=20, decimal_places=6)
    currency = models.CharField(max_length=3, default='USD')
    status = models.CharField(max_length=10, default='PENDING', choices=[
        ('PENDING', 'Pending'), ('FILLED', 'Filled'),
        ('CANCELLED', 'Cancelled'), ('EXPIRED', 'Expired'),
    ])
    created_at = models.DateTimeField(default=timezone.now)
    filled_at = models.DateTimeField(null=True, blank=True)
    expires_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'limit_orders'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.trade_type} {self.shares} {self.symbol} @ {self.limit_price}"

    def to_dict(self):
        return {
            "id": str(self.id),
            "type": self.trade_type,
            "orderType": "LIMIT",
            "symbol": self.symbol,
            "name": self.name,
            "shares": float(self.shares),
            "price": float(self.limit_price),
            "currency": self.currency,
            "status": self.status,
            "createdAt": self.created_at.isoformat(),
            "filledAt": self.filled_at.isoformat() if self.filled_at else None,
            "expiresAt": self.expires_at.isoformat() if self.expires_at else None,
        }


class Transfer(models.Model):
    """Peer-to-peer virtual fund transfers between friends."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    from_user = models.ForeignKey(UserProfile, on_delete=models.CASCADE, related_name='transfers_sent')
    to_user = models.ForeignKey(UserProfile, on_delete=models.CASCADE, related_name='transfers_received')
    amount = models.DecimalField(max_digits=20, decimal_places=2, help_text='Amount in USD')
    display_amount = models.DecimalField(max_digits=20, decimal_places=2, help_text='Amount in sender currency')
    currency = models.CharField(max_length=3, default='USD', help_text='Sender currency code')
    recipient_currency = models.CharField(max_length=3, default='USD', help_text='Recipient currency code')
    recipient_display_amount = models.DecimalField(max_digits=20, decimal_places=2, default=0, help_text='Amount displayed in recipient currency')
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = 'transfers'
        ordering = ['-created_at']

    def to_dict(self):
        return {
            'id': str(self.id),
            'fromUser': self.from_user.username,
            'toUser': self.to_user.username,
            'amountUSD': float(self.amount),  # Actual USD value transferred
            'senderDisplayAmount': float(self.display_amount),  # What sender entered
            'senderCurrency': self.currency,  # Sender's currency code
            'recipientDisplayAmount': float(self.recipient_display_amount),  # What recipient sees
            'recipientCurrency': self.recipient_currency,  # Recipient's currency code
            'createdAt': self.created_at.isoformat(),
        }


class APIKey(models.Model):
    """API key for programmatic access."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(UserProfile, on_delete=models.CASCADE, related_name='api_keys')
    name = models.CharField(max_length=100)
    key_prefix = models.CharField(max_length=8)
    key_hash = models.CharField(max_length=128)
    is_active = models.BooleanField(default=True)
    last_used_at = models.DateTimeField(blank=True, null=True)
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = 'api_keys'
        ordering = ['-created_at']

    def to_dict(self):
        return {
            "id": str(self.id),
            "name": self.name,
            "keyPrefix": self.key_prefix,
            "isActive": self.is_active,
            "lastUsedAt": self.last_used_at.isoformat() if self.last_used_at else None,
            "createdAt": self.created_at.isoformat(),
        }
