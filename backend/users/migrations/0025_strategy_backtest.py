from decimal import Decimal
import uuid

import django.db.models.deletion
import django.utils.timezone
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0024_copyrelationship_copytrade_traderfollow'),
    ]

    operations = [
        migrations.CreateModel(
            name='Strategy',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('name', models.CharField(max_length=200)),
                ('description', models.TextField(blank=True, default='')),
                ('config', models.JSONField(default=dict, help_text='indicators, entryConditions, exitConditions, positionSizing, etc.')),
                ('is_public', models.BooleanField(default=False)),
                ('created_at', models.DateTimeField(default=django.utils.timezone.now)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('owner', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='strategies', to='users.userprofile')),
            ],
            options={
                'db_table': 'backtest_strategies',
                'ordering': ['-updated_at'],
            },
        ),
        migrations.CreateModel(
            name='Backtest',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('strategy_name', models.CharField(help_text='snapshot of strategy name at run time', max_length=200)),
                ('symbol', models.CharField(max_length=32)),
                ('start_date', models.CharField(max_length=10)),
                ('end_date', models.CharField(max_length=10)),
                ('initial_capital', models.DecimalField(decimal_places=2, default=Decimal('100000.00'), max_digits=20)),
                ('config_snapshot', models.JSONField(default=dict, help_text='the strategy config as it was when this backtest ran')),
                ('results', models.JSONField(default=dict, help_text='equityCurve, trades, statistics, monthlyReturns, etc.')),
                ('created_at', models.DateTimeField(default=django.utils.timezone.now)),
                ('owner', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='backtests', to='users.userprofile')),
                ('strategy', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='backtests', to='users.strategy')),
            ],
            options={
                'db_table': 'backtests',
                'ordering': ['-created_at'],
            },
        ),
    ]
