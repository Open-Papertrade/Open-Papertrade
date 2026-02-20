"""
Seed default achievements.
"""

from django.core.management.base import BaseCommand
from users.models import Achievement


class Command(BaseCommand):
    help = 'Seed default achievements'

    def handle(self, *args, **options):
        achievements = [
            {
                'id': 'first_trade',
                'name': 'First Trade',
                'description': 'Execute your first trade',
                'icon': '🎯',
                'requirement_type': 'trades_count',
                'requirement_value': 1,
            },
            {
                'id': 'trader_10',
                'name': 'Active Trader',
                'description': 'Execute 10 trades',
                'icon': '📈',
                'requirement_type': 'trades_count',
                'requirement_value': 10,
            },
            {
                'id': 'trader_50',
                'name': 'Seasoned Trader',
                'description': 'Execute 50 trades',
                'icon': '🏆',
                'requirement_type': 'trades_count',
                'requirement_value': 50,
            },
            {
                'id': 'trader_100',
                'name': 'Trading Expert',
                'description': 'Execute 100 trades',
                'icon': '💎',
                'requirement_type': 'trades_count',
                'requirement_value': 100,
            },
            {
                'id': 'profit_1000',
                'name': 'First Milestone',
                'description': 'Earn $1,000 in profits',
                'icon': '💰',
                'requirement_type': 'profit_amount',
                'requirement_value': 1000,
            },
            {
                'id': 'profit_10000',
                'name': 'Big Earner',
                'description': 'Earn $10,000 in profits',
                'icon': '🤑',
                'requirement_type': 'profit_amount',
                'requirement_value': 10000,
            },
            {
                'id': 'diversified_5',
                'name': 'Diversified',
                'description': 'Hold 5 different stocks',
                'icon': '🎨',
                'requirement_type': 'holdings_count',
                'requirement_value': 5,
            },
            {
                'id': 'diversified_10',
                'name': 'Well Diversified',
                'description': 'Hold 10 different stocks',
                'icon': '🌈',
                'requirement_type': 'holdings_count',
                'requirement_value': 10,
            },
            {
                'id': 'watchlist_10',
                'name': 'Market Watcher',
                'description': 'Add 10 stocks to watchlist',
                'icon': '👀',
                'requirement_type': 'watchlist_count',
                'requirement_value': 10,
            },
            {
                'id': 'early_adopter',
                'name': 'Early Adopter',
                'description': 'Join during beta period',
                'icon': '🚀',
                'requirement_type': 'special',
                'requirement_value': 1,
            },
        ]

        created_count = 0
        updated_count = 0

        for ach_data in achievements:
            ach, created = Achievement.objects.update_or_create(
                id=ach_data['id'],
                defaults=ach_data
            )
            if created:
                created_count += 1
            else:
                updated_count += 1

        self.stdout.write(
            self.style.SUCCESS(
                f'Achievements seeded: {created_count} created, {updated_count} updated'
            )
        )
