import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('filings', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='IngestJob',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('url', models.URLField(max_length=512)),
                ('status', models.CharField(
                    choices=[('pending', 'Pending'), ('running', 'Running'), ('success', 'Success'), ('failed', 'Failed')],
                    db_index=True, default='pending', max_length=16,
                )),
                ('progress', models.CharField(blank=True, default='', max_length=128)),
                ('error', models.TextField(blank=True, default='')),
                ('chunk_count', models.IntegerField(default=0)),
                ('section_count', models.IntegerField(default=0)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('started_at', models.DateTimeField(blank=True, null=True)),
                ('finished_at', models.DateTimeField(blank=True, null=True)),
                ('filing', models.ForeignKey(
                    blank=True, null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name='ingest_jobs',
                    to='filings.filing',
                )),
            ],
            options={
                'ordering': ['-created_at'],
            },
        ),
    ]
