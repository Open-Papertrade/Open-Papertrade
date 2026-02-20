"""
Create a demo user with populated trades, holdings, watchlist, alerts, achievements, and friends.
Usage: python manage.py seed_demo_user
"""

import random
from decimal import Decimal
from datetime import timedelta
from django.core.management.base import BaseCommand
from django.utils import timezone
from users.models import (
    UserProfile, UserSettings, Achievement, UserAchievement,
    Trade, Holding, Watchlist, PriceAlert, Friendship, LimitOrder,
)


# Realistic stock data: (symbol, name, ~current price)
STOCKS = [
    ('AAPL', 'Apple Inc.', 189.50),
    ('MSFT', 'Microsoft Corporation', 415.30),
    ('GOOGL', 'Alphabet Inc.', 175.80),
    ('AMZN', 'Amazon.com Inc.', 186.40),
    ('NVDA', 'NVIDIA Corporation', 870.50),
    ('TSLA', 'Tesla Inc.', 195.60),
    ('META', 'Meta Platforms Inc.', 510.20),
    ('JPM', 'JPMorgan Chase & Co.', 198.70),
    ('V', 'Visa Inc.', 280.10),
    ('WMT', 'Walmart Inc.', 172.90),
    ('NFLX', 'Netflix Inc.', 625.80),
    ('DIS', 'Walt Disney Co.', 112.30),
    ('AMD', 'Advanced Micro Devices', 175.40),
    ('PYPL', 'PayPal Holdings Inc.', 65.20),
    ('COIN', 'Coinbase Global Inc.', 235.70),
]

CRYPTO = [
    ('BTC-USD', 'Bitcoin', 97500.00),
    ('ETH-USD', 'Ethereum', 3350.00),
    ('SOL-USD', 'Solana', 195.00),
]

WATCHLIST_EXTRAS = [
    ('BA', 'Boeing Co.'),
    ('INTC', 'Intel Corporation'),
    ('UBER', 'Uber Technologies'),
    ('SPOT', 'Spotify Technology'),
    ('SQ', 'Block Inc.'),
    ('PLTR', 'Palantir Technologies'),
    ('RIVN', 'Rivian Automotive'),
    ('SOFI', 'SoFi Technologies'),
    ('SNOW', 'Snowflake Inc.'),
    ('CRM', 'Salesforce Inc.'),
]


class Command(BaseCommand):
    help = 'Create a demo user with realistic populated data for product demos'

    def add_arguments(self, parser):
        parser.add_argument('--email', default='demo@papertrading.com', help='Demo user email')
        parser.add_argument('--password', default='demo1234', help='Demo user password')
        parser.add_argument('--name', default='Alex Thompson', help='Demo user name')
        parser.add_argument('--username', default='alex-thompson', help='Demo user username')
        parser.add_argument('--friend', action='store_true', help='Also create a friend user')

    def handle(self, *args, **options):
        now = timezone.now()

        # Clean up existing demo user
        UserProfile.objects.filter(email=options['email']).delete()
        UserProfile.objects.filter(username=options['username']).delete()

        # Create demo user
        user = UserProfile(
            name=options['name'],
            username=options['username'],
            email=options['email'],
            is_email_verified=True,
            buying_power=Decimal('34250.75'),
            initial_balance=Decimal('100000.00'),
            plan='PRO',
            xp=2750,
            rank='Day Trader',
            level=7,
            created_at=now - timedelta(days=45),
        )
        user.set_password(options['password'])
        user.save()

        # Settings
        UserSettings.objects.create(
            user=user,
            theme='DARK',
            currency='USD',
            default_order_type='MARKET',
            notify_price_alerts=True,
            notify_trade_confirmations=True,
            notify_weekly_report=True,
            confirm_trades=True,
            show_profit_loss=True,
        )

        # --- Generate trades over the past 45 days ---
        all_trades = []

        # Holdings we want the user to end up with
        target_holdings = [
            ('AAPL', 'Apple Inc.', 25, 178.30),
            ('NVDA', 'NVIDIA Corporation', 15, 780.20),
            ('MSFT', 'Microsoft Corporation', 20, 398.50),
            ('GOOGL', 'Alphabet Inc.', 30, 165.40),
            ('AMZN', 'Amazon.com Inc.', 18, 178.90),
            ('META', 'Meta Platforms Inc.', 10, 475.60),
            ('BTC-USD', 'Bitcoin', Decimal('0.15'), 92500.00),
            ('ETH-USD', 'Ethereum', Decimal('2.5'), 3150.00),
        ]

        # Create BUY trades for current holdings
        for symbol, name, shares, avg_cost in target_holdings:
            shares = Decimal(str(shares))
            price = Decimal(str(avg_cost))
            # Split into 1-3 buy orders spread over time
            num_buys = random.randint(1, 3)
            remaining = shares
            for i in range(num_buys):
                if i == num_buys - 1:
                    buy_shares = remaining
                else:
                    buy_shares = (shares / num_buys).quantize(Decimal('0.00000001'))
                    remaining -= buy_shares

                buy_price = price * Decimal(str(random.uniform(0.95, 1.05)))
                buy_price = buy_price.quantize(Decimal('0.01'))
                total = (buy_shares * buy_price).quantize(Decimal('0.01'))

                trade_date = now - timedelta(
                    days=random.randint(3, 40),
                    hours=random.randint(9, 15),
                    minutes=random.randint(0, 59),
                )

                all_trades.append(Trade(
                    user=user, symbol=symbol, name=name,
                    trade_type='BUY', shares=buy_shares,
                    price=buy_price, total=total,
                    currency='USD', executed_at=trade_date,
                ))

        # Create some completed (sold) trades for history
        sold_trades = [
            ('TSLA', 'Tesla Inc.', 12, 188.50, 205.30),
            ('NFLX', 'Netflix Inc.', 8, 580.20, 628.90),
            ('JPM', 'JPMorgan Chase & Co.', 15, 185.40, 199.20),
            ('V', 'Visa Inc.', 10, 265.80, 281.50),
            ('AMD', 'Advanced Micro Devices', 20, 160.30, 178.90),
            ('SOL-USD', 'Solana', Decimal('25'), 165.00, 198.50),
        ]

        for symbol, name, shares, buy_price, sell_price in sold_trades:
            shares = Decimal(str(shares))
            bp = Decimal(str(buy_price))
            sp = Decimal(str(sell_price))

            buy_date = now - timedelta(days=random.randint(20, 40), hours=random.randint(9, 15))
            sell_date = buy_date + timedelta(days=random.randint(5, 15), hours=random.randint(0, 5))

            all_trades.append(Trade(
                user=user, symbol=symbol, name=name,
                trade_type='BUY', shares=shares,
                price=bp, total=(shares * bp).quantize(Decimal('0.01')),
                currency='USD', executed_at=buy_date,
            ))
            all_trades.append(Trade(
                user=user, symbol=symbol, name=name,
                trade_type='SELL', shares=shares,
                price=sp, total=(shares * sp).quantize(Decimal('0.01')),
                currency='USD', executed_at=sell_date,
            ))

        Trade.objects.bulk_create(all_trades)
        self.stdout.write(f'  Created {len(all_trades)} trades')

        # --- Holdings ---
        holdings = []
        for symbol, name, shares, avg_cost in target_holdings:
            holdings.append(Holding(
                user=user, symbol=symbol, name=name,
                shares=Decimal(str(shares)),
                avg_cost=Decimal(str(avg_cost)),
                currency='USD',
            ))
        Holding.objects.bulk_create(holdings)
        self.stdout.write(f'  Created {len(holdings)} holdings')

        # --- Watchlist ---
        watchlist_items = []
        # Add current holdings to watchlist
        for symbol, name, _, _ in target_holdings[:5]:
            watchlist_items.append(Watchlist(
                user=user, symbol=symbol, name=name,
                starred=random.choice([True, False]),
                added_at=now - timedelta(days=random.randint(1, 40)),
            ))
        # Add extra stocks
        for symbol, name in WATCHLIST_EXTRAS:
            watchlist_items.append(Watchlist(
                user=user, symbol=symbol, name=name,
                starred=random.choice([True, True, False]),
                added_at=now - timedelta(days=random.randint(1, 30)),
            ))
        Watchlist.objects.bulk_create(watchlist_items)
        self.stdout.write(f'  Created {len(watchlist_items)} watchlist items')

        # --- Price Alerts ---
        alerts = [
            PriceAlert(user=user, symbol='AAPL', condition='above', target_price=Decimal('200.00'), enabled=True),
            PriceAlert(user=user, symbol='NVDA', condition='above', target_price=Decimal('950.00'), enabled=True),
            PriceAlert(user=user, symbol='TSLA', condition='below', target_price=Decimal('180.00'), enabled=True),
            PriceAlert(user=user, symbol='BTC-USD', condition='above', target_price=Decimal('100000.00'), enabled=True),
            PriceAlert(user=user, symbol='GOOGL', condition='below', target_price=Decimal('160.00'), enabled=True),
            PriceAlert(user=user, symbol='META', condition='above', target_price=Decimal('550.00'), enabled=True),
        ]
        PriceAlert.objects.bulk_create(alerts)
        self.stdout.write(f'  Created {len(alerts)} price alerts')

        # --- Limit Orders ---
        limit_orders = [
            LimitOrder(
                user=user, symbol='DIS', name='Walt Disney Co.',
                trade_type='BUY', shares=Decimal('20'),
                limit_price=Decimal('105.00'), currency='USD', status='PENDING',
            ),
            LimitOrder(
                user=user, symbol='PYPL', name='PayPal Holdings Inc.',
                trade_type='BUY', shares=Decimal('30'),
                limit_price=Decimal('60.00'), currency='USD', status='PENDING',
            ),
        ]
        LimitOrder.objects.bulk_create(limit_orders)
        self.stdout.write(f'  Created {len(limit_orders)} limit orders')

        # --- Achievements ---
        achievement_ids = ['first_trade', 'trader_10', 'profit_1000', 'diversified_5', 'watchlist_10', 'early_adopter']
        existing = Achievement.objects.filter(id__in=achievement_ids)
        user_achievements = []
        for ach in existing:
            user_achievements.append(UserAchievement(
                user=user, achievement=ach,
                unlocked_at=now - timedelta(days=random.randint(1, 40)),
            ))
        if user_achievements:
            UserAchievement.objects.bulk_create(user_achievements)
        self.stdout.write(f'  Unlocked {len(user_achievements)} achievements')

        # --- Friend user ---
        if options['friend']:
            self._create_friend(user, now)

        self.stdout.write(self.style.SUCCESS(
            f'\nDemo user created!\n'
            f'  Email:    {options["email"]}\n'
            f'  Password: {options["password"]}\n'
            f'  Username: {options["username"]}\n'
            f'  Plan:     PRO\n'
            f'  Balance:  $34,250.75 / $100,000.00\n'
            f'  Trades:   {len(all_trades)}\n'
            f'  Holdings: {len(holdings)}\n'
            f'  Level:    7 (Day Trader)\n'
        ))

    def _create_friend(self, demo_user, now):
        """Create a friend user and establish friendship."""
        UserProfile.objects.filter(email='sarah@papertrading.com').delete()
        UserProfile.objects.filter(username='sarah-chen').delete()

        friend = UserProfile(
            name='Sarah Chen',
            username='sarah-chen',
            email='sarah@papertrading.com',
            is_email_verified=True,
            buying_power=Decimal('52180.40'),
            initial_balance=Decimal('100000.00'),
            plan='FREE',
            xp=1200,
            rank='Swing Trader',
            level=4,
            created_at=now - timedelta(days=30),
        )
        friend.set_password('demo1234')
        friend.save()

        UserSettings.objects.create(
            user=friend, theme='DARK', currency='USD',
            default_order_type='MARKET',
        )

        # Add some holdings for the friend
        friend_holdings = [
            Holding(user=friend, symbol='AAPL', name='Apple Inc.', shares=Decimal('15'), avg_cost=Decimal('182.50'), currency='USD'),
            Holding(user=friend, symbol='TSLA', name='Tesla Inc.', shares=Decimal('10'), avg_cost=Decimal('192.30'), currency='USD'),
            Holding(user=friend, symbol='COIN', name='Coinbase Global Inc.', shares=Decimal('12'), avg_cost=Decimal('210.80'), currency='USD'),
        ]
        Holding.objects.bulk_create(friend_holdings)

        # Create accepted friendship
        Friendship.objects.create(
            from_user=demo_user, to_user=friend,
            status='accepted',
            created_at=now - timedelta(days=20),
        )

        self.stdout.write(f'  Created friend: sarah-chen (sarah@papertrading.com / demo1234)')
