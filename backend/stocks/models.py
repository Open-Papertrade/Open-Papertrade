"""
Models for stock data (optional persistent caching).

Currently using in-memory caching in StockService.
These models can be used for persistent caching if needed.
"""

from django.db import models


class StockCache(models.Model):
    """
    Optional: Persistent cache for stock quotes.
    Use this if you need quotes to persist across server restarts.
    """
    symbol = models.CharField(max_length=20, primary_key=True)
    price = models.DecimalField(max_digits=20, decimal_places=6)
    change = models.DecimalField(max_digits=20, decimal_places=6)
    change_percent = models.DecimalField(max_digits=10, decimal_places=4)
    high = models.DecimalField(max_digits=20, decimal_places=6)
    low = models.DecimalField(max_digits=20, decimal_places=6)
    open_price = models.DecimalField(max_digits=20, decimal_places=6)
    previous_close = models.DecimalField(max_digits=20, decimal_places=6)
    volume = models.BigIntegerField(null=True, blank=True)
    name = models.CharField(max_length=200, blank=True)
    provider = models.CharField(max_length=50)
    cached_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'stock_cache'
        verbose_name = 'Stock Cache'
        verbose_name_plural = 'Stock Cache'

    def __str__(self):
        return f"{self.symbol}: ${self.price}"


class CompanyProfile(models.Model):
    """
    Optional: Cache for company profile data.
    """
    symbol = models.CharField(max_length=20, primary_key=True)
    name = models.CharField(max_length=200)
    country = models.CharField(max_length=100, blank=True)
    exchange = models.CharField(max_length=100, blank=True)
    industry = models.CharField(max_length=200, blank=True)
    sector = models.CharField(max_length=200, blank=True)
    logo_url = models.URLField(blank=True)
    website = models.URLField(blank=True)
    market_cap = models.BigIntegerField(null=True, blank=True)
    description = models.TextField(blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'company_profiles'
        verbose_name = 'Company Profile'
        verbose_name_plural = 'Company Profiles'

    def __str__(self):
        return f"{self.symbol}: {self.name}"
