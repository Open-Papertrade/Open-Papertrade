"""
Copy trading business logic.
Handles dispatching, executing, and processing copy trades.
"""

from __future__ import annotations

import logging
from datetime import timedelta
from decimal import Decimal, ROUND_DOWN

from django.db import transaction
from django.utils import timezone

from .models import (
    UserProfile, Trade, Holding, CopyRelationship, CopyTrade, TraderFollow,
)

logger = logging.getLogger(__name__)

DELAY_MAP = {
    'NONE': timedelta(0),
    '1H': timedelta(hours=1),
    '6H': timedelta(hours=6),
    '24H': timedelta(hours=24),
}


def dispatch_copy_trades(source_trade: Trade):
    """
    Called after a leader executes a trade.
    Creates CopyTrade records for all active copiers.
    Immediate copies are executed inline; delayed copies are saved as PENDING.
    """
    relationships = CopyRelationship.objects.filter(
        leader=source_trade.user,
        status=CopyRelationship.ACTIVE,
    ).select_related('copier')

    if not relationships.exists():
        return

    for rel in relationships:
        # Skip sell copies if disabled
        if source_trade.trade_type == 'SELL' and not rel.copy_sells:
            continue

        delay = DELAY_MAP.get(rel.trade_delay, timedelta(0))
        scheduled_at = source_trade.executed_at + delay

        # Calculate copy shares
        copy_shares = _calculate_copy_shares(rel, source_trade)
        if copy_shares <= 0:
            continue

        copy_trade = CopyTrade.objects.create(
            copy_relationship=rel,
            source_trade=source_trade,
            status=CopyTrade.PENDING,
            scheduled_at=scheduled_at,
            source_symbol=source_trade.symbol,
            source_trade_type=source_trade.trade_type,
            source_shares=source_trade.shares,
            source_price=source_trade.price,
            copy_shares=copy_shares,
        )

        # Execute immediately if no delay
        if delay == timedelta(0):
            execute_copy_trade(copy_trade)


def execute_copy_trade(copy_trade: CopyTrade):
    """
    Execute a single copy trade on the copier's account.
    """
    rel = copy_trade.copy_relationship
    copier = rel.copier
    symbol = copy_trade.source_symbol
    trade_type = copy_trade.source_trade_type
    shares = copy_trade.copy_shares
    price = copy_trade.source_price  # use source price for paper trading

    try:
        with transaction.atomic():
            # Refresh for concurrency
            copier.refresh_from_db()
            rel.refresh_from_db()

            if rel.status != CopyRelationship.ACTIVE:
                _fail_copy(copy_trade, 'Relationship no longer active')
                return

            if trade_type == 'BUY':
                total = shares * price

                # Check allocated funds
                if total > rel.remaining_funds:
                    _fail_copy(copy_trade, 'Insufficient allocated funds')
                    return

                # Check copier buying power
                if total > copier.buying_power:
                    _fail_copy(copy_trade, 'Insufficient buying power')
                    return

                # Execute buy
                copier.buying_power -= total
                rel.remaining_funds -= total
                copier.save(update_fields=['buying_power'])
                rel.save(update_fields=['remaining_funds'])

                # Update or create holding
                holding, created = Holding.objects.get_or_create(
                    user=copier, symbol=symbol,
                    defaults={
                        'name': copy_trade.source_trade.name if copy_trade.source_trade else symbol,
                        'shares': Decimal('0'),
                        'avg_cost': Decimal('0'),
                        'currency': copy_trade.source_trade.currency if copy_trade.source_trade else 'USD',
                    }
                )
                if not created:
                    current_value = holding.shares * holding.avg_cost
                    new_value = current_value + total
                    new_shares = holding.shares + shares
                    holding.avg_cost = new_value / new_shares if new_shares > 0 else Decimal('0')
                    holding.shares = new_shares
                else:
                    holding.shares = shares
                    holding.avg_cost = price
                holding.save()

                # Create trade record
                trade = Trade.objects.create(
                    user=copier,
                    symbol=symbol,
                    name=copy_trade.source_trade.name if copy_trade.source_trade else symbol,
                    trade_type='BUY',
                    shares=shares,
                    price=price,
                    total=total,
                    currency=copy_trade.source_trade.currency if copy_trade.source_trade else 'USD',
                )

                _complete_copy(copy_trade, trade, price)

            elif trade_type == 'SELL':
                # Check if copier holds this stock
                try:
                    holding = Holding.objects.get(user=copier, symbol=symbol)
                except Holding.DoesNotExist:
                    _skip_copy(copy_trade, 'No holding to sell')
                    return

                # Sell what we can
                actual_shares = min(shares, holding.shares)
                if actual_shares <= 0:
                    _skip_copy(copy_trade, 'No shares available to sell')
                    return

                total = actual_shares * price

                copier.buying_power += total
                rel.remaining_funds += total
                copier.save(update_fields=['buying_power'])
                rel.save(update_fields=['remaining_funds'])

                holding.shares -= actual_shares
                if holding.shares <= 0:
                    holding.delete()
                else:
                    holding.save()

                trade = Trade.objects.create(
                    user=copier,
                    symbol=symbol,
                    name=holding.name,
                    trade_type='SELL',
                    shares=actual_shares,
                    price=price,
                    total=total,
                    currency=holding.currency,
                )

                copy_trade.copy_shares = actual_shares
                _complete_copy(copy_trade, trade, price)

    except Exception as e:
        logger.exception(f'Copy trade execution failed: {e}')
        _fail_copy(copy_trade, str(e)[:200])


def mirror_portfolio(copier: UserProfile, leader: UserProfile, allocated_funds: Decimal, trade_delay: str = 'NONE') -> dict:
    """
    One-click mirror: replicate leader's entire current portfolio.
    Returns dict with relationship and list of executed copy trades.
    """
    with transaction.atomic():
        copier.refresh_from_db()

        if allocated_funds > copier.buying_power:
            return {'error': 'Insufficient buying power'}

        # Create or update relationship
        rel, created = CopyRelationship.objects.get_or_create(
            copier=copier, leader=leader,
            defaults={
                'allocated_funds': allocated_funds,
                'remaining_funds': allocated_funds,
                'trade_delay': trade_delay,
            }
        )
        if not created:
            if rel.status == CopyRelationship.ACTIVE:
                return {'error': 'Already copying this trader'}
            # Reactivate
            rel.status = CopyRelationship.ACTIVE
            rel.allocated_funds = allocated_funds
            rel.remaining_funds = allocated_funds
            rel.trade_delay = trade_delay
            rel.stopped_at = None
            rel.save()

        # Ensure follow exists
        TraderFollow.objects.get_or_create(follower=copier, leader=leader)

        # Get leader's holdings
        leader_holdings = Holding.objects.filter(user=leader)
        if not leader_holdings.exists():
            return {'relationship': rel.to_dict(), 'trades': [], 'message': 'Leader has no holdings to mirror'}

        leader_portfolio_value = sum(h.shares * h.avg_cost for h in leader_holdings)
        if leader_portfolio_value <= 0:
            return {'relationship': rel.to_dict(), 'trades': [], 'message': 'Leader portfolio value is zero'}

        executed = []
        remaining = allocated_funds

        for h in leader_holdings:
            # Proportional allocation
            weight = (h.shares * h.avg_cost) / leader_portfolio_value
            alloc = allocated_funds * weight
            shares = (alloc / h.avg_cost).quantize(Decimal('1'), rounding=ROUND_DOWN)

            if shares <= 0:
                continue

            total = shares * h.avg_cost
            if total > remaining or total > copier.buying_power:
                continue

            # Execute buy
            copier.buying_power -= total
            remaining -= total

            copier_holding, hcreated = Holding.objects.get_or_create(
                user=copier, symbol=h.symbol,
                defaults={'name': h.name, 'shares': Decimal('0'), 'avg_cost': Decimal('0'), 'currency': h.currency}
            )
            if not hcreated:
                cv = copier_holding.shares * copier_holding.avg_cost
                nv = cv + total
                ns = copier_holding.shares + shares
                copier_holding.avg_cost = nv / ns if ns > 0 else Decimal('0')
                copier_holding.shares = ns
            else:
                copier_holding.shares = shares
                copier_holding.avg_cost = h.avg_cost
            copier_holding.save()

            trade = Trade.objects.create(
                user=copier, symbol=h.symbol, name=h.name,
                trade_type='BUY', shares=shares, price=h.avg_cost,
                total=total, currency=h.currency,
            )

            CopyTrade.objects.create(
                copy_relationship=rel,
                source_trade=None,
                executed_trade=trade,
                status=CopyTrade.EXECUTED,
                scheduled_at=timezone.now(),
                executed_at=timezone.now(),
                source_symbol=h.symbol,
                source_trade_type='BUY',
                source_shares=h.shares,
                source_price=h.avg_cost,
                copy_shares=shares,
                copy_price=h.avg_cost,
            )
            executed.append(trade)

        copier.save(update_fields=['buying_power'])
        rel.remaining_funds = remaining
        rel.save(update_fields=['remaining_funds'])

        return {
            'relationship': rel.to_dict(),
            'trades': [{'symbol': t.symbol, 'shares': float(t.shares), 'price': float(t.price)} for t in executed],
            'mirrored': len(executed),
        }


def process_pending_copy_trades(user: UserProfile = None):
    """
    Process all pending copy trades whose scheduled_at has passed.
    If user is provided, only process that user's pending trades.
    """
    qs = CopyTrade.objects.filter(
        status=CopyTrade.PENDING,
        scheduled_at__lte=timezone.now(),
    ).select_related('copy_relationship', 'copy_relationship__copier')

    if user:
        qs = qs.filter(copy_relationship__copier=user)

    count = 0
    for ct in qs:
        execute_copy_trade(ct)
        count += 1

    return count


def get_copy_performance(copier: UserProfile) -> dict:
    """Compare copy trading P&L vs manual trading P&L."""
    # Copy trades P&L
    copy_rels = CopyRelationship.objects.filter(copier=copier)
    copy_pnl = Decimal('0')
    copy_trades_count = 0

    for rel in copy_rels:
        copy_pnl += rel.allocated_funds - rel.remaining_funds  # invested amount
        executed_trades = CopyTrade.objects.filter(
            copy_relationship=rel, status=CopyTrade.EXECUTED
        ).select_related('executed_trade')

        for ct in executed_trades:
            if ct.executed_trade and ct.executed_trade.trade_type == 'SELL' and ct.copy_price:
                # This is a sell — find buy avg for P&L
                copy_pnl += ct.executed_trade.total
            copy_trades_count += 1

    # Manual trades = all trades that are NOT from copy trading
    copy_trade_ids = set(
        CopyTrade.objects.filter(
            copy_relationship__copier=copier, executed_trade__isnull=False
        ).values_list('executed_trade_id', flat=True)
    )
    manual_trades = Trade.objects.filter(user=copier).exclude(id__in=copy_trade_ids)

    manual_sells = manual_trades.filter(trade_type='SELL')
    manual_pnl = Decimal('0')
    for sell in manual_sells:
        buys = manual_trades.filter(symbol=sell.symbol, trade_type='BUY', executed_at__lte=sell.executed_at)
        if buys.exists():
            total_cost = sum(b.price * b.shares for b in buys)
            total_shares = sum(b.shares for b in buys)
            avg_buy = total_cost / total_shares if total_shares > 0 else Decimal('0')
            manual_pnl += (sell.price - avg_buy) * sell.shares

    return {
        'copyTradesCount': copy_trades_count,
        'copyInvested': float(sum(r.allocated_funds - r.remaining_funds for r in copy_rels)),
        'manualTradesCount': manual_trades.count(),
        'manualRealizedPnl': float(manual_pnl),
        'activeRelationships': copy_rels.filter(status=CopyRelationship.ACTIVE).count(),
    }


# ── Helpers ──────────────────────────────────────────────────────

def _calculate_copy_shares(rel: CopyRelationship, source_trade: Trade) -> Decimal:
    """Calculate how many shares the copier should trade."""
    if not rel.proportional_sizing:
        return source_trade.shares

    # Proportional: based on copier's allocated funds vs leader's portfolio value
    leader = rel.leader
    leader_holdings = Holding.objects.filter(user=leader)
    leader_value = sum(h.shares * h.avg_cost for h in leader_holdings) + leader.buying_power
    if leader_value <= 0:
        return Decimal('0')

    ratio = rel.allocated_funds / leader_value
    raw_shares = source_trade.shares * ratio

    # Apply max trade percent cap
    max_amount = rel.remaining_funds * (rel.max_trade_percent / Decimal('100'))
    if raw_shares * source_trade.price > max_amount:
        raw_shares = max_amount / source_trade.price

    return raw_shares.quantize(Decimal('1'), rounding=ROUND_DOWN)


def _complete_copy(ct: CopyTrade, trade: Trade, price: Decimal):
    ct.status = CopyTrade.EXECUTED
    ct.executed_trade = trade
    ct.executed_at = timezone.now()
    ct.copy_price = price
    ct.save()


def _fail_copy(ct: CopyTrade, reason: str):
    ct.status = CopyTrade.FAILED
    ct.failure_reason = reason
    ct.executed_at = timezone.now()
    ct.save()


def _skip_copy(ct: CopyTrade, reason: str):
    ct.status = CopyTrade.SKIPPED
    ct.failure_reason = reason
    ct.executed_at = timezone.now()
    ct.save()
