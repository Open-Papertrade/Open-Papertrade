"""
Avatar storage abstraction.

DEBUG=True:  local filesystem (media/avatars/)
DEBUG=False: Supabase Storage bucket
"""

import os
import uuid
import logging
from django.conf import settings

logger = logging.getLogger(__name__)

_supabase_client = None


def _get_supabase_client():
    """Lazy-initialize Supabase client singleton."""
    global _supabase_client
    if _supabase_client is None:
        from supabase import create_client
        _supabase_client = create_client(
            settings.SUPABASE_URL,
            settings.SUPABASE_SERVICE_ROLE_KEY,
        )
    return _supabase_client


def upload_avatar(file):
    """
    Upload an avatar file.

    Returns:
        str: relative path (DEBUG) or full Supabase public URL (production)
    """
    ext = file.name.rsplit('.', 1)[-1].lower() if '.' in file.name else 'jpg'
    filename = f'{uuid.uuid4().hex}.{ext}'

    if settings.DEBUG:
        filepath = os.path.join('avatars', filename)
        full_path = os.path.join(settings.MEDIA_ROOT, filepath)
        os.makedirs(os.path.dirname(full_path), exist_ok=True)
        with open(full_path, 'wb') as dest:
            for chunk in file.chunks():
                dest.write(chunk)
        return filepath

    # Production: upload to Supabase Storage
    client = _get_supabase_client()
    storage_path = f'avatars/{filename}'
    file_bytes = file.read()
    client.storage.from_(settings.SUPABASE_STORAGE_BUCKET).upload(
        storage_path,
        file_bytes,
        file_options={'content-type': file.content_type},
    )
    public_url = client.storage.from_(settings.SUPABASE_STORAGE_BUCKET).get_public_url(storage_path)
    return public_url


def delete_avatar(avatar_url):
    """
    Delete an avatar by its stored value.

    Args:
        avatar_url: relative path (local) or full Supabase URL
    """
    if not avatar_url:
        return

    if settings.DEBUG:
        full_path = os.path.join(settings.MEDIA_ROOT, avatar_url)
        if os.path.isfile(full_path):
            os.remove(full_path)
        return

    # Production: delete from Supabase Storage
    # URL format: https://xxx.supabase.co/storage/v1/object/public/{bucket}/{path}
    try:
        client = _get_supabase_client()
        marker = f'/storage/v1/object/public/{settings.SUPABASE_STORAGE_BUCKET}/'
        if marker in avatar_url:
            storage_path = avatar_url.split(marker, 1)[1]
            client.storage.from_(settings.SUPABASE_STORAGE_BUCKET).remove([storage_path])
    except Exception as e:
        logger.warning('Failed to delete avatar from Supabase Storage: %s', e)


def get_avatar_url(avatar_url):
    """
    Convert stored avatar value to a frontend-usable URL.

    Args:
        avatar_url: relative path or full URL

    Returns:
        str: URL suitable for the frontend, or empty string
    """
    if not avatar_url:
        return ''
    if avatar_url.startswith('http'):
        return avatar_url
    return f'/media/{avatar_url}'
