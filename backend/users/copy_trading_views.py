"""
API views for copy trading and social follow features.
"""

from datetime import timedelta
from decimal import Decimal

from django.utils import timezone
from django.db.models import Count, Sum
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status

from .views import get_user
from .models import (
    UserProfile, Trade, Holding, TraderFollow, CopyRelationship, CopyTrade,
)
from .copy_trading_service import (
    mirror_portfolio, process_pending_copy_trades, get_copy_performance,
)


DELAY_MAP = {'NONE': timedelta(0), '1H': timedelta(hours=1), '6H': timedelta(hours=6), '24H': timedelta(hours=24)}


class CopyTradingDashboardView(APIView):
    """GET /api/users/copy-trading/ — dashboard with active relationships, pending trades, stats."""

    def get(self, request):
        user = get_user(request)

        # Process any pending trades
        process_pending_copy_trades(user)

        # Active copy relationships
        relationships = CopyRelationship.objects.filter(copier=user).exclude(
            status=CopyRelationship.STOPPED
        ).select_related('leader')

        rel_data = []
        for rel in relationships:
            ct_stats = CopyTrade.objects.filter(copy_relationship=rel).aggregate(
                total=Count('id'),
                executed=Count('id', filter=CopyTrade.objects.filter(status=CopyTrade.EXECUTED).query.where),
            )
            # Simpler aggregation
            total_ct = CopyTrade.objects.filter(copy_relationship=rel).count()
            executed_ct = CopyTrade.objects.filter(copy_relationship=rel, status=CopyTrade.EXECUTED).count()
            failed_ct = CopyTrade.objects.filter(copy_relationship=rel, status=CopyTrade.FAILED).count()
            pending_ct = CopyTrade.objects.filter(copy_relationship=rel, status=CopyTrade.PENDING).count()

            invested = float(rel.allocated_funds - rel.remaining_funds)
            d = rel.to_dict()
            d['stats'] = {
                'totalCopyTrades': total_ct,
                'executed': executed_ct,
                'failed': failed_ct,
                'pending': pending_ct,
                'invested': invested,
            }
            rel_data.append(d)

        # Who you follow
        following = TraderFollow.objects.filter(follower=user).select_related('leader')
        following_list = [f.to_dict() for f in following]

        # Follower count
        follower_count = TraderFollow.objects.filter(leader=user).count()
        copier_count = CopyRelationship.objects.filter(leader=user, status=CopyRelationship.ACTIVE).count()

        return Response({
            'relationships': rel_data,
            'following': following_list,
            'followerCount': follower_count,
            'copierCount': copier_count,
        })


class FollowTraderView(APIView):
    """POST/DELETE /api/users/copy-trading/follow/<username>/ — follow/unfollow a trader."""

    def post(self, request, username):
        user = get_user(request)
        try:
            leader = UserProfile.objects.get(username=username)
        except UserProfile.DoesNotExist:
            return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)

        if leader.id == user.id:
            return Response({'error': 'Cannot follow yourself'}, status=status.HTTP_400_BAD_REQUEST)

        delay = request.data.get('feedDelay', '1H')
        follow, created = TraderFollow.objects.get_or_create(
            follower=user, leader=leader,
            defaults={'feed_delay': delay}
        )
        if not created:
            return Response({'error': 'Already following'}, status=status.HTTP_400_BAD_REQUEST)

        return Response({'follow': follow.to_dict()}, status=status.HTTP_201_CREATED)

    def delete(self, request, username):
        user = get_user(request)
        deleted, _ = TraderFollow.objects.filter(follower=user, leader__username=username).delete()
        if deleted == 0:
            return Response({'error': 'Not following this user'}, status=status.HTTP_404_NOT_FOUND)
        return Response({'success': True})


class StartCopyTradingView(APIView):
    """POST /api/users/copy-trading/copy/<username>/ — start copy trading."""

    def post(self, request, username):
        user = get_user(request)
        try:
            leader = UserProfile.objects.get(username=username)
        except UserProfile.DoesNotExist:
            return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)

        if leader.id == user.id:
            return Response({'error': 'Cannot copy yourself'}, status=status.HTTP_400_BAD_REQUEST)

        # Check circular
        if CopyRelationship.objects.filter(copier=leader, leader=user, status=CopyRelationship.ACTIVE).exists():
            return Response({'error': 'Circular copy trading is not allowed'}, status=status.HTTP_400_BAD_REQUEST)

        allocated = Decimal(str(request.data.get('allocatedFunds', 0)))
        if allocated <= 0:
            return Response({'error': 'allocatedFunds must be positive'}, status=status.HTTP_400_BAD_REQUEST)
        if allocated > user.buying_power:
            return Response({'error': 'Insufficient buying power'}, status=status.HTTP_400_BAD_REQUEST)

        delay = request.data.get('tradeDelay', 'NONE')
        proportional = request.data.get('proportionalSizing', True)
        max_pct = Decimal(str(request.data.get('maxTradePercent', 25)))
        copy_sells = request.data.get('copySells', True)

        rel, created = CopyRelationship.objects.get_or_create(
            copier=user, leader=leader,
            defaults={
                'allocated_funds': allocated,
                'remaining_funds': allocated,
                'trade_delay': delay,
                'proportional_sizing': proportional,
                'max_trade_percent': max_pct,
                'copy_sells': copy_sells,
            }
        )
        if not created:
            if rel.status == CopyRelationship.ACTIVE:
                return Response({'error': 'Already copying this trader'}, status=status.HTTP_400_BAD_REQUEST)
            # Reactivate
            rel.status = CopyRelationship.ACTIVE
            rel.allocated_funds = allocated
            rel.remaining_funds = allocated
            rel.trade_delay = delay
            rel.proportional_sizing = proportional
            rel.max_trade_percent = max_pct
            rel.copy_sells = copy_sells
            rel.stopped_at = None
            rel.save()

        # Ensure follow exists
        TraderFollow.objects.get_or_create(follower=user, leader=leader)

        # Deduct from buying power
        user.buying_power -= allocated
        user.save(update_fields=['buying_power'])

        return Response({'relationship': rel.to_dict()}, status=status.HTTP_201_CREATED)


class UpdateCopyRelationshipView(APIView):
    """PATCH /api/users/copy-trading/copy/<uuid:relationship_id>/ — update settings."""

    def patch(self, request, relationship_id):
        user = get_user(request)
        try:
            rel = CopyRelationship.objects.get(id=relationship_id, copier=user)
        except CopyRelationship.DoesNotExist:
            return Response({'error': 'Relationship not found'}, status=status.HTTP_404_NOT_FOUND)

        data = request.data
        if 'status' in data:
            if data['status'] == 'PAUSED':
                rel.status = CopyRelationship.PAUSED
            elif data['status'] == 'ACTIVE':
                rel.status = CopyRelationship.ACTIVE
        if 'tradeDelay' in data:
            rel.trade_delay = data['tradeDelay']
        if 'proportionalSizing' in data:
            rel.proportional_sizing = data['proportionalSizing']
        if 'maxTradePercent' in data:
            rel.max_trade_percent = Decimal(str(data['maxTradePercent']))
        if 'copySells' in data:
            rel.copy_sells = data['copySells']

        rel.save()
        return Response({'relationship': rel.to_dict()})


class StopCopyTradingView(APIView):
    """DELETE /api/users/copy-trading/copy/<uuid:relationship_id>/ — stop copy trading."""

    def delete(self, request, relationship_id):
        user = get_user(request)
        try:
            rel = CopyRelationship.objects.get(id=relationship_id, copier=user)
        except CopyRelationship.DoesNotExist:
            return Response({'error': 'Relationship not found'}, status=status.HTTP_404_NOT_FOUND)

        rel.status = CopyRelationship.STOPPED
        rel.stopped_at = timezone.now()
        rel.save()

        # Return remaining funds to buying power
        if rel.remaining_funds > 0:
            user.buying_power += rel.remaining_funds
            user.save(update_fields=['buying_power'])

        return Response({
            'success': True,
            'fundsReturned': float(rel.remaining_funds),
            'buyingPower': float(user.buying_power),
        })


class MirrorPortfolioView(APIView):
    """POST /api/users/copy-trading/mirror/<username>/ — one-click mirror."""

    def post(self, request, username):
        user = get_user(request)
        try:
            leader = UserProfile.objects.get(username=username)
        except UserProfile.DoesNotExist:
            return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)

        if leader.id == user.id:
            return Response({'error': 'Cannot mirror yourself'}, status=status.HTTP_400_BAD_REQUEST)

        allocated = Decimal(str(request.data.get('allocatedFunds', 0)))
        delay = request.data.get('tradeDelay', 'NONE')

        if allocated <= 0:
            return Response({'error': 'allocatedFunds must be positive'}, status=status.HTTP_400_BAD_REQUEST)

        result = mirror_portfolio(user, leader, allocated, delay)

        if 'error' in result:
            return Response({'error': result['error']}, status=status.HTTP_400_BAD_REQUEST)

        return Response(result, status=status.HTTP_201_CREATED)


class SocialFeedView(APIView):
    """GET /api/users/copy-trading/feed/ — social feed of followed traders' trades."""

    def get(self, request):
        user = get_user(request)
        limit = int(request.query_params.get('limit', 30))
        offset = int(request.query_params.get('offset', 0))

        follows = TraderFollow.objects.filter(follower=user).select_related('leader')
        if not follows.exists():
            return Response({'feed': [], 'total': 0})

        now = timezone.now()
        feed_items = []

        for follow in follows:
            delay = DELAY_MAP.get(follow.feed_delay, timedelta(hours=1))
            cutoff = now - delay

            trades = Trade.objects.filter(
                user=follow.leader,
                executed_at__lte=cutoff,
            ).order_by('-executed_at')[:50]

            for t in trades:
                feed_items.append({
                    'id': str(t.id),
                    'trader': {
                        'username': follow.leader.username,
                        'name': follow.leader.name,
                        'avatarUrl': follow.leader.avatar_url,
                    },
                    'tradeType': t.trade_type,
                    'symbol': t.symbol,
                    'name': t.name,
                    'shares': float(t.shares),
                    'price': float(t.price),
                    'total': float(t.total),
                    'executedAt': t.executed_at.isoformat(),
                })

        # Sort by time, paginate
        feed_items.sort(key=lambda x: x['executedAt'], reverse=True)
        total = len(feed_items)
        feed_items = feed_items[offset:offset + limit]

        return Response({'feed': feed_items, 'total': total})


class CopyTradeHistoryView(APIView):
    """GET /api/users/copy-trading/history/<uuid:relationship_id>/ — copy trade history."""

    def get(self, request, relationship_id):
        user = get_user(request)
        try:
            rel = CopyRelationship.objects.get(id=relationship_id, copier=user)
        except CopyRelationship.DoesNotExist:
            return Response({'error': 'Not found'}, status=status.HTTP_404_NOT_FOUND)

        trades = CopyTrade.objects.filter(copy_relationship=rel).order_by('-scheduled_at')
        return Response({
            'relationship': rel.to_dict(),
            'trades': [t.to_dict() for t in trades],
        })


class CopyPerformanceView(APIView):
    """GET /api/users/copy-trading/performance/ — compare copy vs manual trading."""

    def get(self, request):
        user = get_user(request)
        perf = get_copy_performance(user)
        return Response({'performance': perf})


class ProcessPendingView(APIView):
    """POST /api/users/copy-trading/process/ — trigger pending copy trade execution."""

    def post(self, request):
        user = get_user(request)
        count = process_pending_copy_trades(user)
        return Response({'processed': count})


class MyFollowersView(APIView):
    """GET /api/users/copy-trading/followers/ — who follows and copies you."""

    def get(self, request):
        user = get_user(request)

        followers = TraderFollow.objects.filter(leader=user).select_related('follower')
        copiers = CopyRelationship.objects.filter(
            leader=user, status=CopyRelationship.ACTIVE
        ).select_related('copier')

        return Response({
            'followers': [f.to_dict() for f in followers],
            'copiers': [c.to_dict() for c in copiers],
        })


class MyFollowingView(APIView):
    """GET /api/users/copy-trading/following/ — who you follow and copy-trade status."""

    def get(self, request):
        user = get_user(request)

        following = TraderFollow.objects.filter(follower=user).select_related('leader')
        copy_rels = {
            str(r.leader_id): r.to_dict()
            for r in CopyRelationship.objects.filter(copier=user).exclude(status=CopyRelationship.STOPPED)
        }

        results = []
        for f in following:
            d = f.to_dict()
            d['copyRelationship'] = copy_rels.get(str(f.leader_id))
            results.append(d)

        return Response({'following': results})
