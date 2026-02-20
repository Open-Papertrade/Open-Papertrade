"""
User API views for paper trading app.
"""

from django.shortcuts import get_object_or_404
from django.db.models import Sum, Count, F
from django.db import transaction
from django.utils import timezone
from django.conf import settings as django_settings
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser
from rest_framework import status
from decimal import Decimal

from .models import (
    UserProfile, UserSettings, Achievement, UserAchievement,
    Trade, Holding, Watchlist, PriceAlert, LimitOrder, Friendship, Transfer
)
from django.db.models import Q
from .market_hours import is_market_open, is_symbol_valid_for_market
from .storage import upload_avatar, delete_avatar
from .achievement_service import check_achievements
from .xp_service import award_trade_xp, award_achievement_xp, get_rank_info
from stocks.services import CurrencyExchangeService


from rest_framework.exceptions import NotAuthenticated


def get_user(request):
    """Get user from DRF auth (cookie JWT) or Authorization header. Raises 401 if not authenticated."""
    # Try DRF-authenticated user first (set by CookieJWTAuthentication)
    if hasattr(request, 'user') and isinstance(request.user, UserProfile):
        return request.user

    # Fall back to Authorization header (manual parse for non-DRF paths)
    auth_header = request.headers.get('Authorization', '')
    if auth_header.startswith('Bearer '):
        try:
            from rest_framework_simplejwt.tokens import AccessToken
            token = AccessToken(auth_header.split(' ')[1])
            user_id = token.get('user_id')
            if user_id:
                return get_object_or_404(UserProfile, id=user_id)
        except Exception:
            pass

    raise NotAuthenticated('Authentication required')


class UserProfileView(APIView):
    """Get and update user profile."""

    def get(self, request):
        user = get_user(request)

        # Ensure settings exist
        if not hasattr(user, 'settings'):
            UserSettings.objects.create(user=user)

        return Response({
            'profile': user.to_dict(),
            'settings': user.settings.to_dict(),
        })

    def patch(self, request):
        import re
        user = get_user(request)
        data = request.data

        # Update allowed fields
        if 'name' in data:
            user.name = data['name']
        if 'email' in data:
            user.email = data['email']
        if 'avatarUrl' in data:
            user.avatar_url = data['avatarUrl']
        if 'username' in data:
            new_username = data['username'].strip().lower()
            if new_username != user.username:
                if not re.match(r'^[a-z0-9](?:[a-z0-9-]{1,28}[a-z0-9])?$', new_username):
                    return Response(
                        {'error': 'Username must be 3-30 characters, lowercase letters, numbers, and hyphens. Cannot start or end with a hyphen.'},
                        status=status.HTTP_400_BAD_REQUEST
                    )
                if UserProfile.objects.filter(username=new_username).exclude(id=user.id).exists():
                    return Response(
                        {'error': 'This username is already taken'},
                        status=status.HTTP_400_BAD_REQUEST
                    )
                user.username = new_username

        user.save()
        return Response(user.to_dict())


class AvatarUploadView(APIView):
    """Upload a profile avatar image."""
    parser_classes = [MultiPartParser]

    ALLOWED_TYPES = {'image/jpeg', 'image/png', 'image/webp', 'image/gif'}
    MAX_SIZE = 5 * 1024 * 1024  # 5MB

    def post(self, request):
        user = get_user(request)
        file = request.FILES.get('avatar')

        if not file:
            return Response(
                {'error': 'No image file provided'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if file.content_type not in self.ALLOWED_TYPES:
            return Response(
                {'error': 'Invalid file type. Use JPEG, PNG, WebP, or GIF'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if file.size > self.MAX_SIZE:
            return Response(
                {'error': 'File too large. Maximum size is 5MB'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Delete old avatar if it exists
        delete_avatar(user.avatar_url)

        # Upload new avatar
        avatar_value = upload_avatar(file)
        user.avatar_url = avatar_value
        user.save(update_fields=['avatar_url'])

        if avatar_value.startswith('http'):
            avatar_url = avatar_value
        else:
            avatar_url = request.build_absolute_uri(f'{django_settings.MEDIA_URL}{avatar_value}')

        return Response({
            'avatarUrl': avatar_url,
        })

    def delete(self, request):
        user = get_user(request)

        if user.avatar_url:
            delete_avatar(user.avatar_url)
            user.avatar_url = ''
            user.save(update_fields=['avatar_url'])

        return Response({'success': True})


class UserSettingsView(APIView):
    """Get and update user settings."""

    def get(self, request):
        user = get_user(request)

        if not hasattr(user, 'settings'):
            UserSettings.objects.create(user=user)

        return Response(user.settings.to_dict())

    def patch(self, request):
        user = get_user(request)
        data = request.data

        if not hasattr(user, 'settings'):
            settings = UserSettings.objects.create(user=user)
        else:
            settings = user.settings

        # Update notification settings
        if 'notifications' in data:
            notif = data['notifications']
            if 'priceAlerts' in notif:
                settings.notify_price_alerts = notif['priceAlerts']
            if 'tradeConfirmations' in notif:
                settings.notify_trade_confirmations = notif['tradeConfirmations']
            if 'weeklyReport' in notif:
                settings.notify_weekly_report = notif['weeklyReport']
            if 'marketNews' in notif:
                settings.notify_market_news = notif['marketNews']

        # Update trading preferences
        if 'preferences' in data:
            prefs = data['preferences']
            if 'defaultOrderType' in prefs:
                settings.default_order_type = prefs['defaultOrderType']
            if 'confirmTrades' in prefs:
                settings.confirm_trades = prefs['confirmTrades']
            if 'showProfitLoss' in prefs:
                settings.show_profit_loss = prefs['showProfitLoss']
            if 'compactMode' in prefs:
                settings.compact_mode = prefs['compactMode']

        # Update display settings
        if 'display' in data:
            disp = data['display']
            if 'theme' in disp:
                settings.theme = disp['theme']
            if 'currency' in disp:
                settings.currency = disp['currency']
            if 'market' in disp:
                settings.market = disp['market']

        settings.save()
        return Response(settings.to_dict())


class UserStatsView(APIView):
    """Get user trading statistics."""

    def get(self, request):
        user = get_user(request)

        # Calculate stats
        trades = Trade.objects.filter(user=user)
        holdings = Holding.objects.filter(user=user)

        total_trades = trades.count()

        # Calculate total invested (cost basis of current holdings)
        total_invested = sum(
            float(h.shares) * float(h.avg_cost) for h in holdings
        )

        # Win rate: compare each SELL's price against the avg_cost of the BUY trades for that symbol
        sell_trades = trades.filter(trade_type='SELL')
        winning_sells = 0
        for sell in sell_trades:
            # Find the average buy price for this symbol from buy trades before this sell
            buy_trades_for_symbol = trades.filter(
                trade_type='BUY',
                symbol=sell.symbol,
                executed_at__lte=sell.executed_at,
            )
            if buy_trades_for_symbol.exists():
                total_buy_cost = sum(float(t.price) * float(t.shares) for t in buy_trades_for_symbol)
                total_buy_shares = sum(float(t.shares) for t in buy_trades_for_symbol)
                avg_buy_price = total_buy_cost / total_buy_shares if total_buy_shares > 0 else 0
                if float(sell.price) > avg_buy_price:
                    winning_sells += 1

        total_sells = sell_trades.count()
        win_rate = (winning_sells / total_sells * 100) if total_sells > 0 else 0

        return Response({
            'totalTrades': total_trades,
            'totalInvested': round(total_invested, 2),
            'buyingPower': float(user.buying_power),
            'initialBalance': float(user.initial_balance),
            'holdingsCount': holdings.count(),
            'winRate': round(win_rate, 1),
            'memberSince': user.created_at.isoformat(),
            'rank': get_rank_info(user),
        })


class AchievementsView(APIView):
    """Get user achievements."""

    def get(self, request):
        user = get_user(request)

        # Get all achievements and user's unlocked ones
        all_achievements = Achievement.objects.all()
        user_achievements = UserAchievement.objects.filter(user=user).select_related('achievement')
        unlocked_ids = set(ua.achievement_id for ua in user_achievements)

        achievements = []
        for ach in all_achievements:
            achievements.append({
                **ach.to_dict(),
                'unlocked': ach.id in unlocked_ids,
                'unlockedAt': next(
                    (ua.unlocked_at.isoformat() for ua in user_achievements if ua.achievement_id == ach.id),
                    None
                )
            })

        return Response({
            'achievements': achievements,
            'unlockedCount': len(unlocked_ids),
            'totalCount': len(all_achievements),
        })


class HoldingsView(APIView):
    """Get and manage user holdings."""

    def get(self, request):
        user = get_user(request)
        holdings = Holding.objects.filter(user=user)
        return Response([h.to_dict() for h in holdings])


class TradesView(APIView):
    """Get user trade history."""

    def get(self, request):
        user = get_user(request)
        limit = int(request.query_params.get('limit', 50))
        trades = Trade.objects.filter(user=user)[:limit]
        return Response([t.to_dict() for t in trades])


class ExecuteTradeView(APIView):
    """Execute a buy or sell trade."""

    @transaction.atomic
    def post(self, request):
        user = get_user(request)
        data = request.data

        symbol = data.get('symbol', '').upper()
        name = data.get('name', symbol)
        trade_type = data.get('type', '').upper()
        shares = Decimal(str(data.get('shares', 0)))
        price = Decimal(str(data.get('price', 0)))
        currency = data.get('currency', 'USD')

        if not symbol or trade_type not in ['BUY', 'SELL'] or shares <= 0 or price <= 0:
            return Response(
                {'error': 'Invalid trade parameters'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Enforce market hours (crypto is exempt)
        user_market = user.settings.market if hasattr(user, 'settings') else 'US'
        market_status = is_market_open(user_market, symbol)
        if not market_status['is_open']:
            return Response(
                {'error': market_status['reason'], 'marketClosed': True},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Validate symbol belongs to user's market (BUY only — allow SELL to liquidate cross-market holdings)
        if trade_type == 'BUY':
            valid, market_error = is_symbol_valid_for_market(symbol, user_market)
            if not valid:
                return Response(
                    {'error': market_error},
                    status=status.HTTP_400_BAD_REQUEST
                )

        total = shares * price

        if trade_type == 'BUY':
            # Check buying power
            if total > user.buying_power:
                return Response(
                    {'error': 'Insufficient buying power'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Deduct from buying power
            user.buying_power -= total
            user.save()

            # Update or create holding
            holding, created = Holding.objects.get_or_create(
                user=user,
                symbol=symbol,
                defaults={'name': name, 'shares': 0, 'avg_cost': 0, 'currency': currency}
            )

            if not created:
                # Calculate new average cost
                current_value = holding.shares * holding.avg_cost
                new_value = current_value + total
                new_shares = holding.shares + shares
                holding.avg_cost = new_value / new_shares
                holding.shares = new_shares
            else:
                holding.shares = shares
                holding.avg_cost = price
                holding.name = name

            holding.save()

        else:  # SELL
            # Check if user has enough shares
            try:
                holding = Holding.objects.get(user=user, symbol=symbol)
            except Holding.DoesNotExist:
                return Response(
                    {'error': f'No holdings for {symbol}'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            if shares > holding.shares:
                return Response(
                    {'error': 'Insufficient shares'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Add to buying power
            user.buying_power += total
            user.save()

            # Update holding
            holding.shares -= shares
            if holding.shares == 0:
                holding.delete()
            else:
                holding.save()

        # Create trade record
        trade = Trade.objects.create(
            user=user,
            symbol=symbol,
            name=name,
            trade_type=trade_type,
            shares=shares,
            price=price,
            total=total,
            currency=currency,
        )

        # Check for newly unlocked achievements
        new_achievements = check_achievements(user)

        # Award XP
        sell_price = float(price) if trade_type == 'SELL' else None
        avg_buy_price = None
        if trade_type == 'SELL':
            # Get avg buy price from buy trades for this symbol
            buy_trades = Trade.objects.filter(user=user, symbol=symbol, trade_type='BUY')
            if buy_trades.exists():
                total_cost = sum(float(t.price) * float(t.shares) for t in buy_trades)
                total_shares = sum(float(t.shares) for t in buy_trades)
                avg_buy_price = total_cost / total_shares if total_shares > 0 else 0
        award_trade_xp(user, trade_type, sell_price=sell_price, avg_buy_price=avg_buy_price)
        award_achievement_xp(user, new_achievements)

        # Refresh user from DB to get updated XP
        user.refresh_from_db()

        response_data = {
            'trade': trade.to_dict(),
            'buyingPower': float(user.buying_power),
            'xp': user.xp,
            'level': user.level,
            'rank': user.rank,
        }
        if new_achievements:
            response_data['newAchievements'] = new_achievements

        return Response(response_data, status=status.HTTP_201_CREATED)


class WatchlistView(APIView):
    """Get and manage user watchlist."""

    def get(self, request):
        user = get_user(request)
        items = Watchlist.objects.filter(user=user).order_by('-starred', '-added_at')
        return Response([{
            'symbol': w.symbol,
            'name': w.name,
            'starred': w.starred,
            'addedAt': w.added_at.isoformat(),
        } for w in items])

    def post(self, request):
        user = get_user(request)
        symbol = request.data.get('symbol', '').upper()
        name = request.data.get('name', symbol)

        if not symbol:
            return Response({'error': 'Symbol required'}, status=status.HTTP_400_BAD_REQUEST)

        item, created = Watchlist.objects.get_or_create(
            user=user,
            symbol=symbol,
            defaults={'name': name}
        )

        if not created:
            return Response({'error': 'Already in watchlist'}, status=status.HTTP_400_BAD_REQUEST)

        # Check for newly unlocked achievements
        new_achievements = check_achievements(user)

        response_data = {
            'symbol': item.symbol,
            'name': item.name,
            'starred': item.starred,
        }
        if new_achievements:
            response_data['newAchievements'] = new_achievements

        return Response(response_data, status=status.HTTP_201_CREATED)

    def delete(self, request):
        user = get_user(request)
        symbol = request.query_params.get('symbol', '').upper()

        deleted, _ = Watchlist.objects.filter(user=user, symbol=symbol).delete()

        if deleted == 0:
            return Response({'error': 'Not in watchlist'}, status=status.HTTP_404_NOT_FOUND)

        return Response({'success': True})


class WatchlistStarView(APIView):
    """Toggle star status for watchlist item."""

    def post(self, request, symbol):
        user = get_user(request)

        try:
            item = Watchlist.objects.get(user=user, symbol=symbol.upper())
            item.starred = not item.starred
            item.save()
            return Response({'starred': item.starred})
        except Watchlist.DoesNotExist:
            return Response({'error': 'Not in watchlist'}, status=status.HTTP_404_NOT_FOUND)


class PriceAlertsView(APIView):
    """Get and manage price alerts."""

    def get(self, request):
        user = get_user(request)
        alerts = PriceAlert.objects.filter(user=user).order_by('-created_at')
        return Response([a.to_dict() for a in alerts])

    def post(self, request):
        user = get_user(request)
        data = request.data

        alert = PriceAlert.objects.create(
            user=user,
            symbol=data.get('symbol', '').upper(),
            condition=data.get('condition', 'above'),
            target_price=Decimal(str(data.get('targetPrice', 0))),
        )

        return Response(alert.to_dict(), status=status.HTTP_201_CREATED)

    def delete(self, request):
        user = get_user(request)
        alert_id = request.query_params.get('id')

        deleted, _ = PriceAlert.objects.filter(user=user, id=alert_id).delete()

        if deleted == 0:
            return Response({'error': 'Alert not found'}, status=status.HTTP_404_NOT_FOUND)

        return Response({'success': True})


class ResetAccountView(APIView):
    """Reset user account to initial state with 30-day cooldown."""

    RESET_COOLDOWN_DAYS = 30

    @transaction.atomic
    def post(self, request):
        user = get_user(request)

        # Check cooldown - prevent abuse
        if user.last_reset_at:
            days_since_reset = (timezone.now() - user.last_reset_at).days
            if days_since_reset < self.RESET_COOLDOWN_DAYS:
                days_remaining = self.RESET_COOLDOWN_DAYS - days_since_reset
                return Response(
                    {'error': f'Account can only be reset once every {self.RESET_COOLDOWN_DAYS} days. Try again in {days_remaining} day{"s" if days_remaining != 1 else ""}.'},
                    status=status.HTTP_429_TOO_MANY_REQUESTS
                )

        # Delete all trades, holdings, watchlist, alerts, limit orders
        Trade.objects.filter(user=user).delete()
        Holding.objects.filter(user=user).delete()
        Watchlist.objects.filter(user=user).delete()
        PriceAlert.objects.filter(user=user).delete()
        LimitOrder.objects.filter(user=user).delete()
        UserAchievement.objects.filter(user=user).delete()

        # Reset buying power and XP
        user.buying_power = user.initial_balance
        user.xp = 0
        user.rank = 'Retail Trader'
        user.level = 1
        user.last_reset_at = timezone.now()
        user.save()

        return Response({
            'success': True,
            'buyingPower': float(user.buying_power),
        })


class LimitOrdersView(APIView):
    """Get and create limit orders."""

    def get(self, request):
        user = get_user(request)
        status_filter = request.query_params.get('status', 'PENDING')
        orders = LimitOrder.objects.filter(user=user, status=status_filter)
        return Response([o.to_dict() for o in orders])

    @transaction.atomic
    def post(self, request):
        user = get_user(request)
        data = request.data

        symbol = data.get('symbol', '').upper()
        name = data.get('name', symbol)
        trade_type = data.get('type', '').upper()
        shares = Decimal(str(data.get('shares', 0)))
        limit_price = Decimal(str(data.get('limitPrice', 0)))
        currency = data.get('currency', 'USD')

        if not symbol or trade_type not in ['BUY', 'SELL'] or shares <= 0 or limit_price <= 0:
            return Response(
                {'error': 'Invalid order parameters'},
                status=status.HTTP_400_BAD_REQUEST
            )

        total = shares * limit_price

        if trade_type == 'BUY':
            if total > user.buying_power:
                return Response(
                    {'error': 'Insufficient buying power'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            # Reserve buying power
            user.buying_power -= total
            user.save()
        else:
            # Validate user has enough shares
            try:
                holding = Holding.objects.get(user=user, symbol=symbol)
            except Holding.DoesNotExist:
                return Response(
                    {'error': f'No holdings for {symbol}'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            if shares > holding.shares:
                return Response(
                    {'error': 'Insufficient shares'},
                    status=status.HTTP_400_BAD_REQUEST
                )

        order = LimitOrder.objects.create(
            user=user,
            symbol=symbol,
            name=name,
            trade_type=trade_type,
            shares=shares,
            limit_price=limit_price,
            currency=currency,
        )

        return Response({
            'order': order.to_dict(),
            'buyingPower': float(user.buying_power),
        }, status=status.HTTP_201_CREATED)


class CancelLimitOrderView(APIView):
    """Cancel a pending limit order."""

    @transaction.atomic
    def delete(self, request, order_id):
        user = get_user(request)

        try:
            order = LimitOrder.objects.get(id=order_id, user=user, status='PENDING')
        except LimitOrder.DoesNotExist:
            return Response(
                {'error': 'Order not found or not pending'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Refund buying power for BUY orders
        if order.trade_type == 'BUY':
            user.buying_power += order.shares * order.limit_price
            user.save()

        order.status = 'CANCELLED'
        order.save()

        return Response({
            'success': True,
            'buyingPower': float(user.buying_power),
        })


class FillLimitOrderView(APIView):
    """Fill a limit order when price condition is met."""

    @transaction.atomic
    def post(self, request, order_id):
        user = get_user(request)
        current_price = Decimal(str(request.data.get('currentPrice', 0)))

        if current_price <= 0:
            return Response(
                {'error': 'Invalid current price'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            order = LimitOrder.objects.get(id=order_id, user=user, status='PENDING')
        except LimitOrder.DoesNotExist:
            return Response(
                {'error': 'Order not found or not pending'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Re-validate price condition
        if order.trade_type == 'BUY' and current_price > order.limit_price:
            return Response(
                {'error': 'Price condition not met for BUY'},
                status=status.HTTP_400_BAD_REQUEST
            )
        if order.trade_type == 'SELL' and current_price < order.limit_price:
            return Response(
                {'error': 'Price condition not met for SELL'},
                status=status.HTTP_400_BAD_REQUEST
            )

        total = order.shares * current_price

        if order.trade_type == 'BUY':
            # Buying power was already reserved; create/update holding
            holding, created = Holding.objects.get_or_create(
                user=user,
                symbol=order.symbol,
                defaults={'name': order.name, 'shares': 0, 'avg_cost': 0, 'currency': order.currency}
            )

            if not created:
                current_value = holding.shares * holding.avg_cost
                new_value = current_value + (order.shares * current_price)
                new_shares = holding.shares + order.shares
                holding.avg_cost = new_value / new_shares
                holding.shares = new_shares
            else:
                holding.shares = order.shares
                holding.avg_cost = current_price
                holding.name = order.name

            holding.save()

            # Refund the difference if filled at a better price than reserved
            reserved = order.shares * order.limit_price
            actual = order.shares * current_price
            if actual < reserved:
                user.buying_power += (reserved - actual)
                user.save()
        else:
            # SELL: re-validate shares still exist
            try:
                holding = Holding.objects.get(user=user, symbol=order.symbol)
            except Holding.DoesNotExist:
                order.status = 'CANCELLED'
                order.save()
                return Response(
                    {'error': f'No holdings for {order.symbol}'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            if order.shares > holding.shares:
                order.status = 'CANCELLED'
                order.save()
                return Response(
                    {'error': 'Insufficient shares'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Credit buying power
            user.buying_power += total
            user.save()

            # Update holding
            holding.shares -= order.shares
            if holding.shares == 0:
                holding.delete()
            else:
                holding.save()

        # Create trade record
        trade = Trade.objects.create(
            user=user,
            symbol=order.symbol,
            name=order.name,
            trade_type=order.trade_type,
            shares=order.shares,
            price=current_price,
            total=total,
            currency=order.currency,
        )

        # Mark order as filled
        order.status = 'FILLED'
        order.filled_at = timezone.now()
        order.save()

        # Check for newly unlocked achievements
        new_achievements = check_achievements(user)

        # Award XP
        sell_price = float(current_price) if order.trade_type == 'SELL' else None
        avg_buy_price = None
        if order.trade_type == 'SELL':
            buy_trades = Trade.objects.filter(user=user, symbol=order.symbol, trade_type='BUY')
            if buy_trades.exists():
                total_cost = sum(float(t.price) * float(t.shares) for t in buy_trades)
                total_shares = sum(float(t.shares) for t in buy_trades)
                avg_buy_price = total_cost / total_shares if total_shares > 0 else 0
        award_trade_xp(user, order.trade_type, sell_price=sell_price, avg_buy_price=avg_buy_price)
        award_achievement_xp(user, new_achievements)

        user.refresh_from_db()

        response_data = {
            'trade': trade.to_dict(),
            'order': order.to_dict(),
            'buyingPower': float(user.buying_power),
            'xp': user.xp,
            'level': user.level,
            'rank': user.rank,
        }
        if new_achievements:
            response_data['newAchievements'] = new_achievements

        return Response(response_data, status=status.HTTP_201_CREATED)


class TransferFundsView(APIView):
    """Transfer virtual funds to a friend with real-time currency conversion."""

    @transaction.atomic
    def post(self, request):
        user = get_user(request)
        to_username = request.data.get('to_username', '').strip()
        amount = request.data.get('amount', 0)

        try:
            amount = Decimal(str(amount))
        except Exception:
            return Response({'error': 'Invalid amount'}, status=status.HTTP_400_BAD_REQUEST)

        if amount <= 0:
            return Response({'error': 'Amount must be positive'}, status=status.HTTP_400_BAD_REQUEST)

        if not to_username:
            return Response({'error': 'Recipient username is required'}, status=status.HTTP_400_BAD_REQUEST)

        # Can't transfer to yourself
        if user.username == to_username:
            return Response({'error': 'Cannot transfer funds to yourself'}, status=status.HTTP_400_BAD_REQUEST)

        # Find recipient
        try:
            recipient = UserProfile.objects.get(username=to_username)
        except UserProfile.DoesNotExist:
            return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)

        # Check they are accepted friends
        is_friend = Friendship.objects.filter(
            Q(from_user=user, to_user=recipient) | Q(from_user=recipient, to_user=user),
            status='accepted',
        ).exists()
        if not is_friend:
            return Response({'error': 'You can only transfer funds to accepted friends'}, status=status.HTTP_403_FORBIDDEN)

        # Get sender's and recipient's currencies
        sender_currency = 'USD'
        if hasattr(user, 'settings'):
            sender_currency = user.settings.currency or 'USD'

        recipient_currency = 'USD'
        if hasattr(recipient, 'settings'):
            recipient_currency = recipient.settings.currency or 'USD'

        # Check sufficient buying power (amount is in sender's currency)
        if amount > user.buying_power:
            return Response({'error': 'Insufficient buying power'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            # Convert from sender's currency to recipient's currency
            recipient_amount = CurrencyExchangeService.convert(amount, sender_currency, recipient_currency)
        except Exception:
            return Response({'error': 'Currency conversion failed'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        # Deduct from sender in sender's currency
        user.buying_power -= amount
        user.save()

        # Add to recipient in recipient's currency
        recipient.buying_power += recipient_amount
        recipient.save()

        # Store USD equivalent for record-keeping
        try:
            usd_amount = CurrencyExchangeService.convert(amount, sender_currency, 'USD')
        except Exception:
            usd_amount = amount  # fallback

        # Record transfer
        transfer = Transfer.objects.create(
            from_user=user,
            to_user=recipient,
            amount=usd_amount,
            display_amount=amount,
            currency=sender_currency,
            recipient_currency=recipient_currency,
            recipient_display_amount=recipient_amount,
        )

        return Response({
            'success': True,
            'transfer': transfer.to_dict(),
            'buyingPower': float(user.buying_power),
        })


class TransferHistoryView(APIView):
    """Get transfer history for the authenticated user."""

    def get(self, request):
        user = get_user(request)
        transfers = Transfer.objects.filter(
            Q(from_user=user) | Q(to_user=user)
        ).order_by('-created_at')[:50]
        return Response([t.to_dict() for t in transfers])


class ExchangeRatesView(APIView):
    """Get current exchange rates and status."""

    def get(self, request):
        rates = CurrencyExchangeService.get_rates()
        status_info = CurrencyExchangeService.get_status()
        return Response({
            'rates': rates,
            'status': status_info,
        })

    def post(self, request):
        """Manually refresh exchange rates (admin only)."""
        if not request.user.is_staff:
            return Response({'error': 'Admin only'}, status=status.HTTP_403_FORBIDDEN)

        CurrencyExchangeService.clear_cache()
        rates = CurrencyExchangeService.get_rates()
        status_info = CurrencyExchangeService.get_status()

        return Response({
            'success': True,
            'message': 'Exchange rates refreshed',
            'rates': rates,
            'status': status_info,
        })


class UpdateThemeView(APIView):
    """Update user's theme preference."""

    def post(self, request):
        user = get_user(request)
        theme = request.data.get('theme', 'DARK').upper()

        if theme not in ['DARK', 'LIGHT', 'AUTO']:
            return Response({'error': 'Invalid theme'}, status=status.HTTP_400_BAD_REQUEST)

        if not hasattr(user, 'settings'):
            settings = UserSettings.objects.create(user=user)
        else:
            settings = user.settings

        settings.theme = theme
        settings.save()

        return Response({
            'success': True,
            'theme': settings.theme,
        })


class UpdateMarketView(APIView):
    """Update user's preferred market."""

    MARKETS = {
        'US': {
            'name': 'United States',
            'exchanges': ['NASDAQ', 'NYSE', 'AMEX'],
            'defaultCurrency': 'USD',
        },
        'IN': {
            'name': 'India',
            'exchanges': ['NSE', 'BSE'],
            'defaultCurrency': 'INR',
        },
    }

    def get(self, request):
        """Get available markets."""
        return Response({
            'markets': [
                {'code': code, **info}
                for code, info in self.MARKETS.items()
            ]
        })

    def post(self, request):
        """Update user's market preference."""
        user = get_user(request)
        market = request.data.get('market', 'US').upper()

        if market not in self.MARKETS:
            return Response(
                {'error': f'Invalid market. Valid options: {", ".join(self.MARKETS.keys())}'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if not hasattr(user, 'settings'):
            settings = UserSettings.objects.create(user=user)
        else:
            settings = user.settings

        settings.market = market
        settings.save()

        return Response({
            'success': True,
            'market': settings.market,
            'marketInfo': self.MARKETS[market],
        })


class UpdateCurrencyView(APIView):
    """Update user's preferred trading currency."""

    # Exchange rates relative to USD (approximate)
    EXCHANGE_RATES = {
        'USD': 1.0,
        'EUR': 0.92,
        'GBP': 0.79,
        'INR': 83.12,
        'JPY': 149.50,
        'CAD': 1.36,
        'AUD': 1.53,
        'CHF': 0.88,
        'CNY': 7.24,
        'SGD': 1.34,
    }

    CURRENCY_SYMBOLS = {
        'USD': '$',
        'EUR': '€',
        'GBP': '£',
        'INR': '₹',
        'JPY': '¥',
        'CAD': 'C$',
        'AUD': 'A$',
        'CHF': 'CHF',
        'CNY': '¥',
        'SGD': 'S$',
    }

    def get(self, request):
        """Get available currencies and exchange rates."""
        return Response({
            'currencies': [
                {'code': code, 'name': name, 'symbol': self.CURRENCY_SYMBOLS.get(code, code), 'rate': self.EXCHANGE_RATES.get(code, 1.0)}
                for code, name in [
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
                ]
            ],
            'exchangeRates': self.EXCHANGE_RATES,
            'symbols': self.CURRENCY_SYMBOLS,
        })

    def post(self, request):
        """Update user's currency preference."""
        user = get_user(request)
        currency = request.data.get('currency', 'USD').upper()

        valid_currencies = list(self.EXCHANGE_RATES.keys())
        if currency not in valid_currencies:
            return Response(
                {'error': f'Invalid currency. Valid options: {", ".join(valid_currencies)}'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if not hasattr(user, 'settings'):
            settings = UserSettings.objects.create(user=user)
        else:
            settings = user.settings

        settings.currency = currency
        settings.save()

        return Response({
            'success': True,
            'currency': settings.currency,
            'symbol': self.CURRENCY_SYMBOLS.get(currency, currency),
            'exchangeRate': self.EXCHANGE_RATES.get(currency, 1.0),
        })


def compute_trader_stats(user):
    """Compute trading stats for a user. Returns dict with portfolioReturn, realizedProfit, totalTrades, winRate."""
    trades = Trade.objects.filter(user=user)
    holdings = Holding.objects.filter(user=user)
    total_trades = trades.count()

    total_invested = sum(float(h.shares) * float(h.avg_cost) for h in holdings)

    # Realized profit from sells
    realized_profit = 0
    sell_trades = trades.filter(trade_type='SELL')
    winning_sells = 0
    total_sells = sell_trades.count()

    for sell in sell_trades:
        buy_trades_for_symbol = trades.filter(
            trade_type='BUY', symbol=sell.symbol,
            executed_at__lte=sell.executed_at,
        )
        if buy_trades_for_symbol.exists():
            total_buy_cost = sum(float(t.price) * float(t.shares) for t in buy_trades_for_symbol)
            total_buy_shares = sum(float(t.shares) for t in buy_trades_for_symbol)
            avg_buy_price = total_buy_cost / total_buy_shares if total_buy_shares > 0 else 0
            realized_profit += (float(sell.price) - avg_buy_price) * float(sell.shares)
            if float(sell.price) > avg_buy_price:
                winning_sells += 1

    # Portfolio return %
    initial = float(user.initial_balance) if user.initial_balance > 0 else 100000
    net_worth = float(user.buying_power) + total_invested
    portfolio_return = ((net_worth - initial) / initial) * 100

    win_rate = (winning_sells / total_sells * 100) if total_sells > 0 else 0

    return {
        'portfolioReturn': round(portfolio_return, 2),
        'realizedProfit': round(realized_profit, 2),
        'totalTrades': total_trades,
        'winRate': round(win_rate, 1),
    }


class LeaderboardView(APIView):
    """Public leaderboard endpoint. Auth is optional (allows friend-scoped queries)."""
    permission_classes = []

    def get(self, request):
        sort_by = request.query_params.get('sort', 'portfolio_return')
        limit = min(int(request.query_params.get('limit', 50)), 100)
        scope = request.query_params.get('scope', 'global')

        # Get current user if authenticated
        current_user_id = None
        current_user = None
        try:
            current_user = get_user(request)
            current_user_id = str(current_user.id)
        except Exception:
            pass

        # Get users based on scope
        if scope == 'friends' and current_user:
            friend_ids = set()
            friendships = Friendship.objects.filter(
                Q(from_user=current_user) | Q(to_user=current_user),
                status='accepted',
            )
            for f in friendships:
                friend_ids.add(f.to_user_id if f.from_user_id == current_user.id else f.from_user_id)
            friend_ids.add(current_user.id)
            users = UserProfile.objects.filter(id__in=friend_ids)
        else:
            users = UserProfile.objects.all()
        entries = []

        for user in users:
            stats = compute_trader_stats(user)
            if stats['totalTrades'] == 0:
                continue

            entries.append({
                'userId': str(user.id),
                'name': user.name,
                'username': user.username,
                'initials': user.initials,
                'avatarUrl': f'/media/{user.avatar_url}' if user.avatar_url and not user.avatar_url.startswith(('http://', 'https://')) else (user.avatar_url or None),
                'level': user.level,
                'rank': user.rank,
                'xp': user.xp,
                **stats,
                'isCurrentUser': str(user.id) == current_user_id,
            })

        # Sort
        sort_keys = {
            'portfolio_return': lambda e: e['portfolioReturn'],
            'realized_profit': lambda e: e['realizedProfit'],
            'total_trades': lambda e: e['totalTrades'],
            'win_rate': lambda e: e['winRate'],
            'xp': lambda e: e['xp'],
        }
        sort_fn = sort_keys.get(sort_by, sort_keys['portfolio_return'])
        entries.sort(key=sort_fn, reverse=True)

        # Add position numbers
        for i, entry in enumerate(entries):
            entry['position'] = i + 1

        total_traders = len(entries)
        entries = entries[:limit]

        return Response({
            'leaderboard': entries,
            'totalTraders': total_traders,
        })


class PublicProfileView(APIView):
    """Public profile endpoint — no auth required."""
    authentication_classes = []
    permission_classes = []

    def get(self, request, username):
        try:
            user = UserProfile.objects.get(username=username)
        except UserProfile.DoesNotExist:
            return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)

        stats = compute_trader_stats(user)

        # Get achievements
        all_achievements = Achievement.objects.all()
        user_achievements = UserAchievement.objects.filter(user=user).select_related('achievement')
        unlocked_ids = set(ua.achievement_id for ua in user_achievements)

        achievements = []
        for ach in all_achievements:
            achievements.append({
                **ach.to_dict(),
                'unlocked': ach.id in unlocked_ids,
                'unlockedAt': next(
                    (ua.unlocked_at.isoformat() for ua in user_achievements if ua.achievement_id == ach.id),
                    None
                ),
            })

        return Response({
            'username': user.username,
            'name': user.name,
            'initials': user.initials,
            'avatarUrl': f'/media/{user.avatar_url}' if user.avatar_url and not user.avatar_url.startswith(('http://', 'https://')) else (user.avatar_url or None),
            'level': user.level,
            'rank': user.rank,
            'xp': user.xp,
            **stats,
            'memberSince': user.created_at.isoformat(),
            'achievements': achievements,
        })


class FriendsListView(APIView):
    """Get friends list with stats, plus pending requests."""

    def get(self, request):
        user = get_user(request)

        # Accepted friendships
        accepted = Friendship.objects.filter(
            Q(from_user=user) | Q(to_user=user),
            status='accepted',
        ).select_related('from_user', 'to_user')

        friends = []
        for f in accepted:
            friend_user = f.to_user if f.from_user_id == user.id else f.from_user
            stats = compute_trader_stats(friend_user)
            friends.append({
                'friendshipId': str(f.id),
                'username': friend_user.username,
                'name': friend_user.name,
                'initials': friend_user.initials,
                'avatarUrl': f'/media/{friend_user.avatar_url}' if friend_user.avatar_url and not friend_user.avatar_url.startswith(('http://', 'https://')) else (friend_user.avatar_url or None),
                'level': friend_user.level,
                'rank': friend_user.rank,
                **stats,
            })

        # Pending incoming
        pending_incoming = Friendship.objects.filter(
            to_user=user, status='pending',
        ).select_related('from_user')
        incoming = [{
            'friendshipId': str(f.id),
            'username': f.from_user.username,
            'name': f.from_user.name,
            'initials': f.from_user.initials,
            'avatarUrl': f'/media/{f.from_user.avatar_url}' if f.from_user.avatar_url and not f.from_user.avatar_url.startswith(('http://', 'https://')) else (f.from_user.avatar_url or None),
            'level': f.from_user.level,
            'rank': f.from_user.rank,
            'createdAt': f.created_at.isoformat(),
        } for f in pending_incoming]

        # Pending outgoing
        pending_outgoing = Friendship.objects.filter(
            from_user=user, status='pending',
        ).select_related('to_user')
        outgoing = [{
            'friendshipId': str(f.id),
            'username': f.to_user.username,
            'name': f.to_user.name,
            'initials': f.to_user.initials,
            'avatarUrl': f'/media/{f.to_user.avatar_url}' if f.to_user.avatar_url and not f.to_user.avatar_url.startswith(('http://', 'https://')) else (f.to_user.avatar_url or None),
            'level': f.to_user.level,
            'rank': f.to_user.rank,
            'createdAt': f.created_at.isoformat(),
        } for f in pending_outgoing]

        return Response({
            'friends': friends,
            'pendingIncoming': incoming,
            'pendingOutgoing': outgoing,
        })


class SendFriendRequestView(APIView):
    """Send a friend request to another user."""

    def post(self, request, username):
        user = get_user(request)

        # Can't friend yourself
        if user.username == username:
            return Response({'error': 'Cannot send friend request to yourself'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            target = UserProfile.objects.get(username=username)
        except UserProfile.DoesNotExist:
            return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)

        # Check for existing friendship in either direction
        existing = Friendship.objects.filter(
            Q(from_user=user, to_user=target) | Q(from_user=target, to_user=user)
        ).first()

        if existing:
            if existing.status == 'accepted':
                return Response({'error': 'Already friends'}, status=status.HTTP_400_BAD_REQUEST)
            if existing.from_user_id == user.id and existing.status == 'pending':
                return Response({'error': 'Friend request already sent'}, status=status.HTTP_400_BAD_REQUEST)
            # Auto-accept: target had a pending request to us
            if existing.from_user_id == target.id and existing.status == 'pending':
                existing.status = 'accepted'
                existing.save()
                return Response({'status': 'accepted', 'friendshipId': str(existing.id)})

        friendship = Friendship.objects.create(from_user=user, to_user=target)
        return Response({'status': 'pending', 'friendshipId': str(friendship.id)}, status=status.HTTP_201_CREATED)


class RespondFriendRequestView(APIView):
    """Accept or reject a friend request."""

    def post(self, request, friendship_id):
        user = get_user(request)
        action = request.data.get('action')

        if action not in ('accept', 'reject'):
            return Response({'error': 'Action must be accept or reject'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            friendship = Friendship.objects.get(id=friendship_id, to_user=user, status='pending')
        except Friendship.DoesNotExist:
            return Response({'error': 'Friend request not found'}, status=status.HTTP_404_NOT_FOUND)

        if action == 'accept':
            friendship.status = 'accepted'
            friendship.save()
            return Response({'success': True, 'status': 'accepted'})
        else:
            friendship.delete()
            return Response({'success': True, 'status': 'rejected'})


class RemoveFriendView(APIView):
    """Remove a friend or cancel a pending request."""

    def delete(self, request, friendship_id):
        user = get_user(request)

        try:
            friendship = Friendship.objects.get(
                Q(from_user=user) | Q(to_user=user),
                id=friendship_id,
            )
        except Friendship.DoesNotExist:
            return Response({'error': 'Friendship not found'}, status=status.HTTP_404_NOT_FOUND)

        friendship.delete()
        return Response({'success': True})


class FriendshipStatusView(APIView):
    """Get friendship status between current user and target username."""

    def get(self, request, username):
        user = get_user(request)

        if user.username == username:
            return Response({'status': 'self'})

        try:
            target = UserProfile.objects.get(username=username)
        except UserProfile.DoesNotExist:
            return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)

        friendship = Friendship.objects.filter(
            Q(from_user=user, to_user=target) | Q(from_user=target, to_user=user)
        ).first()

        if not friendship:
            return Response({'status': 'none'})

        if friendship.status == 'accepted':
            return Response({
                'status': 'accepted',
                'friendshipId': str(friendship.id),
            })

        # Pending
        direction = 'outgoing' if friendship.from_user_id == user.id else 'incoming'
        return Response({
            'status': 'pending',
            'direction': direction,
            'friendshipId': str(friendship.id),
        })
