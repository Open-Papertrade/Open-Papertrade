"""
Seed a full cast of demo users so you can record videos of the
Copy Trading, Leaderboard, and Friends features.

Usage:
    python manage.py seed_demo_cast

Idempotent — safe to re-run. Only touches users whose usernames match the
predefined DEMO cast below; real users are never modified.
"""

import random
from decimal import Decimal
from datetime import timedelta

from django.core.management.base import BaseCommand
from django.utils import timezone

from users.models import (
    UserProfile, UserSettings, Trade, Holding, Friendship, Watchlist,
    TraderFollow, CopyRelationship, CopyTrade,
)


PASSWORD = 'Demo@2026'          # single password across the whole cast

# Realistic stock universe — same tickers the leaderboard/copy pages will show.
STOCKS = [
    ('AAPL',  'Apple Inc.',                  189.50),
    ('MSFT',  'Microsoft Corporation',       415.30),
    ('GOOGL', 'Alphabet Inc.',               175.80),
    ('AMZN',  'Amazon.com Inc.',             186.40),
    ('NVDA',  'NVIDIA Corporation',          870.50),
    ('TSLA',  'Tesla Inc.',                  195.60),
    ('META',  'Meta Platforms Inc.',         510.20),
    ('JPM',   'JPMorgan Chase & Co.',        198.70),
    ('NFLX',  'Netflix Inc.',                625.80),
    ('AMD',   'Advanced Micro Devices',      175.40),
    ('COIN',  'Coinbase Global Inc.',        235.70),
    ('SHOP',  'Shopify Inc.',                 89.40),
    ('BTC-USD', 'Bitcoin',                 97500.00),
    ('ETH-USD', 'Ethereum',                 3350.00),
]


# The full cast. Each entry drives one UserProfile + settings + trades + holdings.
# The list is ordered from LOWEST rank to HIGHEST (used for leaderboard variety).
CAST = [
    {
        'username': 'sarah-hodl',
        'name': 'Sarah Kim',
        'email': 'sarah@demo.papertrade.app',
        'xp': 850, 'buying_power': Decimal('91230.10'),
        'created_days_ago': 20,
        'holdings': [
            ('AAPL', '10', '178.20'),
            ('BTC-USD', '0.05', '93400.00'),
        ],
        'sold': [],
    },
    {
        'username': 'sam-growth',
        'name': 'Sam Rodriguez',
        'email': 'sam@demo.papertrade.app',
        'xp': 2400, 'buying_power': Decimal('58940.55'),
        'created_days_ago': 45,
        'holdings': [
            ('NVDA', '8', '820.10'),
            ('MSFT', '15', '405.30'),
            ('SHOP', '30', '86.20'),
        ],
        'sold': [('TSLA', '10', '188.00', '196.40')],
    },
    {
        'username': 'demo',
        'name': 'Demo User',
        'email': 'demo@demo.papertrade.app',
        'xp': 4200, 'buying_power': Decimal('22450.75'),
        'created_days_ago': 90,
        'holdings': [
            ('AAPL', '40', '178.30'),
            ('NVDA', '20', '780.20'),
            ('MSFT', '25', '398.50'),
            ('GOOGL', '35', '165.40'),
            ('META', '12', '475.60'),
            ('ETH-USD', '3', '3120.00'),
        ],
        'sold': [
            ('TSLA', '15', '188.50', '205.30'),
            ('NFLX', '8', '580.20', '628.90'),
        ],
    },
    {
        'username': 'chris-options',
        'name': 'Chris Nakamura',
        'email': 'chris@demo.papertrade.app',
        'xp': 5100, 'buying_power': Decimal('18320.60'),
        'created_days_ago': 110,
        'holdings': [
            ('AMD', '50', '160.30'),
            ('COIN', '18', '210.80'),
            ('META', '9', '485.90'),
            ('JPM', '22', '190.10'),
        ],
        'sold': [('NFLX', '5', '575.00', '620.10')],
    },
    {
        'username': 'jenny-trades',
        'name': 'Jenny Park',
        'email': 'jenny@demo.papertrade.app',
        'xp': 6800, 'buying_power': Decimal('34120.85'),
        'created_days_ago': 130,
        'holdings': [
            ('AAPL', '30', '176.10'),
            ('TSLA', '18', '192.30'),
            ('SHOP', '55', '82.90'),
            ('BTC-USD', '0.25', '92100.00'),
        ],
        'sold': [
            ('AMZN', '12', '175.00', '188.60'),
            ('AMD', '25', '158.00', '174.90'),
        ],
    },
    {
        'username': 'alex-swing',
        'name': 'Alex Thompson',
        'email': 'alex@demo.papertrade.app',
        'xp': 9500, 'buying_power': Decimal('45780.30'),
        'created_days_ago': 180,
        'holdings': [
            ('NVDA', '45', '765.40'),
            ('AAPL', '80', '172.50'),
            ('AMZN', '40', '178.90'),
            ('MSFT', '35', '395.80'),
        ],
        'sold': [
            ('TSLA', '30', '182.00', '208.40'),
            ('META', '15', '470.00', '515.80'),
            ('COIN', '20', '215.00', '245.30'),
        ],
    },
    {
        'username': 'maria-pro',
        'name': 'Maria Martinez',
        'email': 'maria@demo.papertrade.app',
        'xp': 12800, 'buying_power': Decimal('67940.20'),
        'created_days_ago': 220,
        'holdings': [
            ('NVDA', '80', '710.30'),
            ('AAPL', '150', '168.90'),
            ('MSFT', '60', '385.20'),
            ('GOOGL', '90', '158.60'),
            ('META', '30', '458.10'),
            ('BTC-USD', '0.8', '88500.00'),
        ],
        'sold': [
            ('TSLA', '50', '175.00', '212.60'),
            ('NFLX', '20', '565.00', '628.90'),
            ('AMD', '60', '155.00', '178.90'),
            ('COIN', '25', '205.00', '250.10'),
        ],
    },
    {
        'username': 'leo-daytrade',
        'name': 'Leo Kowalski',
        'email': 'leo@demo.papertrade.app',
        'xp': 15200, 'buying_power': Decimal('82150.90'),
        'created_days_ago': 260,
        'holdings': [
            ('NVDA', '100', '695.20'),
            ('AAPL', '200', '165.30'),
            ('AMZN', '75', '172.60'),
            ('AMD', '120', '148.90'),
            ('MSFT', '80', '380.10'),
        ],
        'sold': [
            ('TSLA', '80', '170.00', '218.30'),
            ('META', '40', '450.20', '525.10'),
            ('JPM', '50', '183.00', '201.90'),
            ('COIN', '35', '198.60', '253.40'),
            ('NFLX', '25', '555.00', '635.20'),
        ],
    },
]


# Copy-trading relationships. Format: (copier, leader, allocated_funds)
COPY_RELATIONS = [
    ('demo',           'maria-pro',    Decimal('10000.00')),
    ('demo',           'alex-swing',   Decimal('5000.00')),
    ('sam-growth',     'demo',         Decimal('3000.00')),  # demo is also a leader
    ('sam-growth',     'maria-pro',    Decimal('8000.00')),
    ('chris-options',  'leo-daytrade', Decimal('12000.00')),
    ('jenny-trades',   'maria-pro',    Decimal('4000.00')),
    ('sarah-hodl',     'maria-pro',    Decimal('2000.00')),
]


# Social follows (TraderFollow — lighter than CopyRelationship, just for the feed)
FOLLOWS = [
    ('demo',          'leo-daytrade'),
    ('demo',          'maria-pro'),
    ('demo',          'alex-swing'),
    ('jenny-trades',  'demo'),
    ('chris-options', 'demo'),
    ('sam-growth',    'demo'),
    ('sarah-hodl',    'demo'),
]


# Friendships. Accepted are two-way (both users see each other in Friends).
FRIENDS_ACCEPTED = [
    ('demo',          'jenny-trades'),
    ('demo',          'chris-options'),
    ('jenny-trades',  'chris-options'),
    ('maria-pro',     'leo-daytrade'),
    ('alex-swing',    'maria-pro'),
]

# Pending — one side sees an incoming request in the Friends UI.
FRIENDS_PENDING_INCOMING = [
    ('sarah-hodl',    'demo'),   # sarah -> demo (demo sees incoming)
    ('sam-growth',    'demo'),
]

FRIENDS_PENDING_OUTGOING = [
    ('demo',          'alex-swing'),   # demo -> alex (demo sees outgoing)
]


class Command(BaseCommand):
    help = 'Seed a demo cast of users for recording Copy Trading, Leaderboard, and Friends demos.'

    def add_arguments(self, parser):
        parser.add_argument('--password', default=PASSWORD, help='Password for every seeded user')

    def handle(self, *args, **opts):
        password = opts['password']
        now = timezone.now()
        random.seed(42)  # deterministic output across runs

        usernames = [u['username'] for u in CAST]

        # ── Wipe previous demo cast (idempotent) ──────────────────────
        self.stdout.write('Cleaning up previous demo cast…')
        UserProfile.objects.filter(username__in=usernames).delete()

        # ── Create users ──────────────────────────────────────────────
        users_by_username: dict[str, UserProfile] = {}

        for entry in CAST:
            u = UserProfile(
                username=entry['username'],
                name=entry['name'],
                email=entry['email'],
                is_email_verified=True,
                buying_power=entry['buying_power'],
                initial_balance=Decimal('100000.00'),
                plan='PRO',
                xp=entry['xp'],
                created_at=now - timedelta(days=entry['created_days_ago']),
            )
            level, rank = self._rank_for(entry['xp'])
            u.level = level
            u.rank = rank
            u.set_password(password)
            u.save()
            users_by_username[entry['username']] = u

            UserSettings.objects.create(user=u)

            self._seed_trades_and_holdings(u, entry, now)
            self._seed_watchlist(u, now)

        self.stdout.write(self.style.SUCCESS(f'  Created {len(users_by_username)} users'))

        # ── Follows (TraderFollow) ────────────────────────────────────
        self._create_follows(users_by_username, now)

        # ── Copy relationships + copy trades ──────────────────────────
        self._create_copy_relationships(users_by_username, now)

        # ── Friendships ───────────────────────────────────────────────
        self._create_friendships(users_by_username, now)

        # ── Report ────────────────────────────────────────────────────
        self._print_report(users_by_username, password)

    # -----------------------------------------------------------------
    # helpers
    # -----------------------------------------------------------------

    def _rank_for(self, xp: int) -> tuple[int, str]:
        from users.xp_service import get_rank_for_xp
        return get_rank_for_xp(xp)

    def _seed_trades_and_holdings(self, user, entry, now):
        trades = []
        holdings = []

        # Current holdings (BUY trades that never got sold)
        for symbol, shares, avg_cost in entry['holdings']:
            name = self._name_for(symbol)
            shares_d = Decimal(shares)
            price_d = Decimal(avg_cost)

            # Split into 1-3 buy tranches to look realistic
            n = random.randint(1, 3)
            remaining = shares_d
            for i in range(n):
                if i == n - 1:
                    portion = remaining
                else:
                    portion = (shares_d / n).quantize(Decimal('0.00000001'))
                    remaining -= portion
                buy_price = (price_d * Decimal(str(random.uniform(0.94, 1.06)))).quantize(Decimal('0.01'))
                total = (portion * buy_price).quantize(Decimal('0.01'))
                trades.append(Trade(
                    user=user, symbol=symbol, name=name,
                    trade_type='BUY', shares=portion,
                    price=buy_price, total=total, currency='USD',
                    executed_at=now - timedelta(
                        days=random.randint(3, min(entry['created_days_ago'], 60)),
                        hours=random.randint(9, 15),
                        minutes=random.randint(0, 59),
                    ),
                ))

            holdings.append(Holding(
                user=user, symbol=symbol, name=name,
                shares=shares_d, avg_cost=price_d, currency='USD',
            ))

        # Sold trades — BUY + SELL pair, no residual holding
        for symbol, shares, bp, sp in entry['sold']:
            name = self._name_for(symbol)
            shares_d = Decimal(shares)
            buy_p = Decimal(bp)
            sell_p = Decimal(sp)
            buy_at = now - timedelta(days=random.randint(20, min(entry['created_days_ago'], 90)))
            sell_at = buy_at + timedelta(days=random.randint(3, 20))
            trades.append(Trade(
                user=user, symbol=symbol, name=name,
                trade_type='BUY', shares=shares_d,
                price=buy_p, total=(shares_d * buy_p).quantize(Decimal('0.01')),
                currency='USD', executed_at=buy_at,
            ))
            trades.append(Trade(
                user=user, symbol=symbol, name=name,
                trade_type='SELL', shares=shares_d,
                price=sell_p, total=(shares_d * sell_p).quantize(Decimal('0.01')),
                currency='USD', executed_at=sell_at,
            ))

        Trade.objects.bulk_create(trades)
        Holding.objects.bulk_create(holdings)

    def _seed_watchlist(self, user, now):
        # Pick 4-6 random tickers not necessarily in their holdings
        picks = random.sample(STOCKS, k=random.randint(4, 6))
        items = [
            Watchlist(
                user=user, symbol=s, name=n,
                starred=random.choice([True, False, False]),
                added_at=now - timedelta(days=random.randint(1, 60)),
            )
            for s, n, _ in picks
        ]
        Watchlist.objects.bulk_create(items)

    def _create_follows(self, users, now):
        rows = []
        for f_uname, l_uname in FOLLOWS:
            follower = users.get(f_uname)
            leader = users.get(l_uname)
            if not (follower and leader) or follower.id == leader.id:
                continue
            rows.append(TraderFollow(
                follower=follower, leader=leader,
                feed_delay='1H',
                created_at=now - timedelta(days=random.randint(1, 40)),
            ))
        if rows:
            TraderFollow.objects.bulk_create(rows, ignore_conflicts=True)
        self.stdout.write(f'  Created {len(rows)} follows')

    def _create_copy_relationships(self, users, now):
        rel_count = 0
        copy_trade_count = 0

        for copier_uname, leader_uname, allocated in COPY_RELATIONS:
            copier = users.get(copier_uname)
            leader = users.get(leader_uname)
            if not (copier and leader):
                continue

            # A small amount of the allocated funds is already spent on mirrored trades.
            spent = allocated * Decimal(str(random.uniform(0.25, 0.65)))
            spent = spent.quantize(Decimal('0.01'))
            rel = CopyRelationship.objects.create(
                copier=copier, leader=leader,
                status=CopyRelationship.ACTIVE,
                allocated_funds=allocated,
                remaining_funds=(allocated - spent).quantize(Decimal('0.01')),
                trade_delay='1H',
                proportional_sizing=True,
                max_trade_percent=Decimal('25.00'),
                copy_sells=True,
                created_at=now - timedelta(days=random.randint(10, 60)),
            )
            rel_count += 1

            # Take 3-5 recent leader trades and record CopyTrade rows for them.
            leader_trades = list(
                Trade.objects.filter(user=leader).order_by('-executed_at')[:8]
            )
            picks = leader_trades[: random.randint(3, min(5, len(leader_trades)))]
            for src in picks:
                # Scale copier shares proportionally to allocated funds vs leader trade total.
                factor = Decimal('0.35') if allocated < 6000 else Decimal('0.55')
                copy_shares = (src.shares * factor).quantize(Decimal('0.00000001'))
                copy_price = src.price
                CopyTrade.objects.create(
                    copy_relationship=rel,
                    source_trade=src,
                    executed_trade=None,   # not linking to an actual copier Trade — dashboard just uses source_*
                    status=CopyTrade.EXECUTED,
                    scheduled_at=src.executed_at + timedelta(hours=1),
                    executed_at=src.executed_at + timedelta(hours=1, minutes=random.randint(0, 30)),
                    source_symbol=src.symbol,
                    source_trade_type=src.trade_type,
                    source_shares=src.shares,
                    source_price=src.price,
                    copy_shares=copy_shares,
                    copy_price=copy_price,
                )
                copy_trade_count += 1

        self.stdout.write(f'  Created {rel_count} copy relationships with {copy_trade_count} mirrored trades')

    def _create_friendships(self, users, now):
        created = 0
        for a, b in FRIENDS_ACCEPTED:
            ua, ub = users.get(a), users.get(b)
            if not (ua and ub):
                continue
            Friendship.objects.create(
                from_user=ua, to_user=ub,
                status='accepted',
                created_at=now - timedelta(days=random.randint(5, 40)),
            )
            created += 1

        pending = 0
        for a, b in FRIENDS_PENDING_INCOMING + FRIENDS_PENDING_OUTGOING:
            ua, ub = users.get(a), users.get(b)
            if not (ua and ub):
                continue
            Friendship.objects.create(
                from_user=ua, to_user=ub,
                status='pending',
                created_at=now - timedelta(days=random.randint(1, 5)),
            )
            pending += 1

        self.stdout.write(f'  Created {created} accepted friendships + {pending} pending requests')

    def _name_for(self, symbol: str) -> str:
        for s, n, _ in STOCKS:
            if s == symbol:
                return n
        return symbol

    def _print_report(self, users, password):
        self.stdout.write('')
        self.stdout.write(self.style.SUCCESS('=' * 72))
        self.stdout.write(self.style.SUCCESS('  Demo cast ready. Log in with any of these:'))
        self.stdout.write(self.style.SUCCESS('=' * 72))
        self.stdout.write(f'  Password (all users): {self.style.WARNING(password)}')
        self.stdout.write('')
        self.stdout.write(f'  {"Username":<20} {"Email":<40} {"XP":>7}  Role')
        self.stdout.write(f'  {"-" * 20} {"-" * 40} {"-" * 7}  {"-" * 20}')

        role_map = {
            'demo':          'YOU · main demo',
            'maria-pro':     'Top leader',
            'leo-daytrade':  'Top of leaderboard',
            'alex-swing':    'Leader you follow',
            'chris-options': 'Your friend',
            'jenny-trades':  'Your friend',
            'sarah-hodl':    'Pending request → you',
            'sam-growth':    'Copies your trades',
        }

        # Sort by XP descending so the report reads like the leaderboard
        sorted_cast = sorted(CAST, key=lambda e: -e['xp'])
        for entry in sorted_cast:
            u = users.get(entry['username'])
            if not u:
                continue
            self.stdout.write(
                f'  {u.username:<20} {u.email:<40} {u.xp:>7}  {role_map.get(u.username, "")}'
            )

        self.stdout.write('')
        self.stdout.write('  Suggested demo flow:')
        self.stdout.write('    1. Log in as "demo" to see the fullest view')
        self.stdout.write('       → Leaderboard shows you mid-pack')
        self.stdout.write('       → Copy Trading: you follow 2 leaders')
        self.stdout.write('       → Friends: 2 accepted, 2 incoming, 1 outgoing pending')
        self.stdout.write('    2. Log in as "maria-pro" to see the "leader" perspective')
        self.stdout.write('       → 5 copiers mirroring your trades')
        self.stdout.write('    3. Log in as "leo-daytrade" to top the leaderboard')
        self.stdout.write('')
        self.stdout.write('  To reset: python manage.py seed_demo_cast')
        self.stdout.write(self.style.SUCCESS('=' * 72))
