"""
URL routes for user API endpoints.
"""

from django.urls import path
from . import views
from . import security_views
from . import report_views
from . import admin_report_views

app_name = 'users'

urlpatterns = [
    # Profile
    path('profile/', views.UserProfileView.as_view(), name='profile'),
    path('profile/avatar/', views.AvatarUploadView.as_view(), name='avatar-upload'),
    path('profile/<str:username>/public/', views.PublicProfileView.as_view(), name='public-profile'),

    # Settings
    path('settings/', views.UserSettingsView.as_view(), name='settings'),

    # Stats
    path('stats/', views.UserStatsView.as_view(), name='stats'),

    # Reports
    path('reports/weekly/', report_views.WeeklyReportView.as_view(), name='report-weekly'),
    path('reports/monthly/', report_views.MonthlyReportView.as_view(), name='report-monthly'),
    path('reports/yearly/', report_views.YearlyReportView.as_view(), name='report-yearly'),

    # Admin Reports
    path('admin/reports/weekly/<str:username>/', admin_report_views.AdminWeeklyReportView.as_view(), name='admin-report-weekly'),
    path('admin/reports/monthly/<str:username>/', admin_report_views.AdminMonthlyReportView.as_view(), name='admin-report-monthly'),
    path('admin/reports/yearly/<str:username>/', admin_report_views.AdminYearlyReportView.as_view(), name='admin-report-yearly'),

    # Achievements
    path('achievements/', views.AchievementsView.as_view(), name='achievements'),

    # Holdings
    path('holdings/', views.HoldingsView.as_view(), name='holdings'),

    # Trades
    path('trades/', views.TradesView.as_view(), name='trades'),
    path('trades/execute/', views.ExecuteTradeView.as_view(), name='execute-trade'),

    # Limit Orders
    path('orders/', views.LimitOrdersView.as_view(), name='limit-orders'),
    path('orders/<uuid:order_id>/cancel/', views.CancelLimitOrderView.as_view(), name='cancel-limit-order'),
    path('orders/<uuid:order_id>/fill/', views.FillLimitOrderView.as_view(), name='fill-limit-order'),

    # Watchlist
    path('watchlist/', views.WatchlistView.as_view(), name='watchlist'),
    path('watchlist/<str:symbol>/star/', views.WatchlistStarView.as_view(), name='watchlist-star'),

    # Price alerts
    path('alerts/', views.PriceAlertsView.as_view(), name='alerts'),

    # Friends
    path('friends/', views.FriendsListView.as_view(), name='friends-list'),
    path('friends/request/<str:username>/', views.SendFriendRequestView.as_view(), name='send-friend-request'),
    path('friends/<uuid:friendship_id>/respond/', views.RespondFriendRequestView.as_view(), name='respond-friend-request'),
    path('friends/<uuid:friendship_id>/', views.RemoveFriendView.as_view(), name='remove-friend'),
    path('friends/status/<str:username>/', views.FriendshipStatusView.as_view(), name='friendship-status'),

    # Leaderboard
    path('leaderboard/', views.LeaderboardView.as_view(), name='leaderboard'),

    # Reset
    path('reset/', views.ResetAccountView.as_view(), name='reset'),

    # Transfers
    path('transfer/', views.TransferFundsView.as_view(), name='transfer-funds'),
    path('transfers/', views.TransferHistoryView.as_view(), name='transfer-history'),

    # Exchange rates
    path('exchange-rates/', views.ExchangeRatesView.as_view(), name='exchange-rates'),

    # Theme
    path('theme/', views.UpdateThemeView.as_view(), name='theme'),

    # Currency
    path('currency/', views.UpdateCurrencyView.as_view(), name='currency'),

    # Market
    path('market/', views.UpdateMarketView.as_view(), name='market'),

    # Security
    path('password/change/', security_views.ChangePasswordView.as_view(), name='password-change'),
    path('2fa/setup/', security_views.TwoFactorSetupView.as_view(), name='2fa-setup'),
    path('2fa/verify/', security_views.TwoFactorVerifyView.as_view(), name='2fa-verify'),
    path('2fa/disable/', security_views.TwoFactorDisableView.as_view(), name='2fa-disable'),
    path('api-keys/', security_views.APIKeyListCreateView.as_view(), name='api-keys'),
    path('api-keys/<uuid:key_id>/', security_views.APIKeyRevokeView.as_view(), name='api-key-revoke'),
]
