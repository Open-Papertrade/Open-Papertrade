"""
Django settings for paper-trading backend.
"""

import os
from pathlib import Path
from datetime import timedelta
from dotenv import load_dotenv

load_dotenv()

BASE_DIR = Path(__file__).resolve().parent.parent

SECRET_KEY = os.getenv('SECRET_KEY', 'django-insecure-dev-key')

DEBUG = os.getenv('DEBUG', 'True').lower() == 'true'

ALLOWED_HOSTS = os.getenv('ALLOWED_HOSTS', 'localhost,127.0.0.1').split(',')

INSTALLED_APPS = [
    'unfold',
    'unfold.contrib.filters',
    'unfold.contrib.forms',
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    # Third party
    'rest_framework',
    'corsheaders',
    # Local
    'stocks',
    'users',
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'users.maintenance_middleware.MaintenanceMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    # CsrfViewMiddleware removed: using SameSite=Lax cookies + CORS for CSRF protection
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'config.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'config.wsgi.application'

import dj_database_url

if DEBUG:
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.sqlite3',
            'NAME': BASE_DIR / 'db.sqlite3',
        }
    }
else:
    DATABASE_URL = os.getenv('DATABASE_URL')
    if not DATABASE_URL:
        raise ValueError(
            'DATABASE_URL environment variable is required when DEBUG=False. '
            'Set it to your Supabase PostgreSQL connection string.'
        )
    DATABASES = {
        'default': dj_database_url.parse(
            DATABASE_URL,
            conn_max_age=600,
            conn_health_checks=True,
        )
    }

AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_TZ = True

STATIC_URL = 'static/'
STATICFILES_DIRS = [BASE_DIR / 'static']

MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'

# Supabase Storage (used when DEBUG=False)
SUPABASE_URL = os.getenv('SUPABASE_URL', '')
SUPABASE_SERVICE_ROLE_KEY = os.getenv('SUPABASE_SERVICE_ROLE_KEY', '')
SUPABASE_STORAGE_BUCKET = os.getenv('SUPABASE_STORAGE_BUCKET', 'avatars')

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# CORS Settings
CORS_ALLOWED_ORIGINS = os.getenv('CORS_ALLOWED_ORIGINS', 'http://localhost:3000').split(',')
CORS_ALLOW_CREDENTIALS = True
CORS_ALLOW_HEADERS = [
    'accept',
    'authorization',
    'content-type',
    'origin',
    'x-user-id',
]

# REST Framework Settings
REST_FRAMEWORK = {
    'DEFAULT_RENDERER_CLASSES': [
        'rest_framework.renderers.JSONRenderer',
    ],
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'users.authentication.CookieJWTAuthentication',
    ],
    'DEFAULT_THROTTLE_CLASSES': [
        'rest_framework.throttling.AnonRateThrottle',
    ],
    'DEFAULT_THROTTLE_RATES': {
        'anon': '100/minute',
    }
}

# JWT Settings
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=30),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
    'ROTATE_REFRESH_TOKENS': True,
    'USER_ID_FIELD': 'id',
    'USER_ID_CLAIM': 'user_id',
}

# JWT Cookie Settings
JWT_COOKIE_SECURE = not DEBUG
JWT_COOKIE_ACCESS_NAME = 'access_token'
JWT_COOKIE_REFRESH_NAME = 'refresh_token'
JWT_COOKIE_AUTH_ACTIVE_NAME = 'auth_active'
JWT_COOKIE_ACCESS_MAX_AGE = 1800       # 30 minutes
JWT_COOKIE_REFRESH_MAX_AGE = 604800    # 7 days
JWT_COOKIE_AUTH_ACTIVE_MAX_AGE = 604800  # 7 days
JWT_COOKIE_ACCESS_PATH = '/api'
JWT_COOKIE_REFRESH_PATH = '/api/auth'
JWT_COOKIE_SAMESITE = 'Lax'

CSRF_TRUSTED_ORIGINS = CORS_ALLOWED_ORIGINS

# Stock API Settings
FINNHUB_API_KEY = os.getenv('FINNHUB_API_KEY', '')

# Currency Exchange API Settings
OPEN_EXCHANGE_API_KEY = os.getenv('OPEN_EXCHANGE_API_KEY', '')
EXCHANGERATE_API_KEY = os.getenv('EXCHANGERATE_API_KEY', '')

# Cache settings for stock prices (in seconds)
STOCK_CACHE_TTL = 60  # 1 minute cache

# Unfold Admin Configuration
from django.templatetags.static import static
from django.urls import reverse_lazy

UNFOLD = {
    "SITE_TITLE": "Open Papertrade",
    "SITE_HEADER": "Open Papertrade",
    "SITE_LOGO": lambda request: "/static/img/logo.png",
    "SHOW_HISTORY": True,
    "SHOW_VIEW_ON_SITE": False,
    "COLORS": {
        "primary": {
            "50": "#fff7ed",
            "100": "#ffedd5",
            "200": "#fed7aa",
            "300": "#fdba74",
            "400": "#fb923c",
            "500": "#FF5C00",
            "600": "#ea580c",
            "700": "#c2410c",
            "800": "#9a3412",
            "900": "#7c2d12",
            "950": "#431407",
        },
    },
    "SIDEBAR": {
        "show_search": True,
        "show_all_applications": True,
        "navigation": [
            {
                "title": "Dashboard",
                "separator": True,
                "items": [
                    {
                        "title": "Dashboard",
                        "icon": "dashboard",
                        "link": reverse_lazy("admin:index"),
                    },
                ],
            },
            {
                "title": "Users",
                "separator": True,
                "items": [
                    {
                        "title": "User Profiles",
                        "icon": "person",
                        "link": reverse_lazy("admin:users_userprofile_changelist"),
                    },
                    {
                        "title": "User Settings",
                        "icon": "settings",
                        "link": reverse_lazy("admin:users_usersettings_changelist"),
                    },
                    {
                        "title": "Achievements",
                        "icon": "emoji_events",
                        "link": reverse_lazy("admin:users_achievement_changelist"),
                    },
                ],
            },
            {
                "title": "Trading",
                "separator": True,
                "items": [
                    {
                        "title": "Trades",
                        "icon": "swap_horiz",
                        "link": reverse_lazy("admin:users_trade_changelist"),
                    },
                    {
                        "title": "Holdings",
                        "icon": "account_balance_wallet",
                        "link": reverse_lazy("admin:users_holding_changelist"),
                    },
                    {
                        "title": "Watchlist",
                        "icon": "visibility",
                        "link": reverse_lazy("admin:users_watchlist_changelist"),
                    },
                    {
                        "title": "Price Alerts",
                        "icon": "notifications",
                        "link": reverse_lazy("admin:users_pricealert_changelist"),
                    },
                ],
            },
            {
                "title": "Configuration",
                "separator": True,
                "items": [
                    {
                        "title": "Site Settings",
                        "icon": "tune",
                        "link": reverse_lazy("admin:users_sitesettings_changelist"),
                    },
                ],
            },
        ],
    },
}
