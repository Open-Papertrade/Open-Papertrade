"""
Management command to process pending copy trades.
Run via cron every 5 minutes: python manage.py process_copy_trades
"""

from django.core.management.base import BaseCommand
from users.copy_trading_service import process_pending_copy_trades


class Command(BaseCommand):
    help = 'Process pending delayed copy trades'

    def handle(self, *args, **options):
        count = process_pending_copy_trades()
        if count > 0:
            self.stdout.write(self.style.SUCCESS(f'Processed {count} pending copy trade(s)'))
        else:
            self.stdout.write('No pending copy trades to process')
