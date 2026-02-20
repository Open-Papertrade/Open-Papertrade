"""
Add username field to UserProfile.
- First adds the field as nullable (blank=True, default='')
- Then populates existing users with slugified names
- Then adds unique constraint
"""

import re
import random
import string

from django.db import migrations, models
import django.core.validators


def populate_usernames(apps, schema_editor):
    """Generate usernames for existing users from their display names."""
    UserProfile = apps.get_model('users', 'UserProfile')
    used = set(UserProfile.objects.exclude(username='').values_list('username', flat=True))

    for user in UserProfile.objects.filter(username=''):
        slug = re.sub(r'[^a-z0-9]+', '-', user.name.lower()).strip('-')
        if len(slug) < 3:
            slug = slug + '-user'
        slug = slug[:26]

        candidate = slug
        while candidate in used:
            suffix = ''.join(random.choices(string.ascii_lowercase + string.digits, k=4))
            candidate = f"{slug}-{suffix}"[:30]

        user.username = candidate
        user.save(update_fields=['username'])
        used.add(candidate)


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0012_alter_userprofile_rank'),
    ]

    operations = [
        # Step 1: Add the field, allow blank initially (no unique constraint yet)
        migrations.AddField(
            model_name='userprofile',
            name='username',
            field=models.CharField(
                blank=True,
                default='',
                help_text='Unique username (3-30 chars, lowercase alphanumeric and hyphens)',
                max_length=30,
                validators=[django.core.validators.RegexValidator(
                    regex=r'^[a-z0-9](?:[a-z0-9-]{1,28}[a-z0-9])?$',
                    message='Username must be 3-30 characters, lowercase alphanumeric and hyphens, cannot start or end with a hyphen.',
                )],
            ),
        ),
        # Step 2: Populate existing users
        migrations.RunPython(populate_usernames, migrations.RunPython.noop),
        # Step 3: Add unique constraint
        migrations.AlterField(
            model_name='userprofile',
            name='username',
            field=models.CharField(
                blank=True,
                default='',
                help_text='Unique username (3-30 chars, lowercase alphanumeric and hyphens)',
                max_length=30,
                unique=True,
                validators=[django.core.validators.RegexValidator(
                    regex=r'^[a-z0-9](?:[a-z0-9-]{1,28}[a-z0-9])?$',
                    message='Username must be 3-30 characters, lowercase alphanumeric and hyphens, cannot start or end with a hyphen.',
                )],
            ),
        ),
    ]
