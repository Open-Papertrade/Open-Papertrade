"""
Serializers for stock API endpoints.
"""

from rest_framework import serializers


class StockQuoteSerializer(serializers.Serializer):
    """Serializer for stock quote data."""
    symbol = serializers.CharField()
    price = serializers.FloatField()
    change = serializers.FloatField()
    changePercent = serializers.FloatField()
    high = serializers.FloatField()
    low = serializers.FloatField()
    open = serializers.FloatField()
    previousClose = serializers.FloatField()
    volume = serializers.IntegerField(allow_null=True)
    timestamp = serializers.DateTimeField(allow_null=True)
    name = serializers.CharField(allow_null=True)
    provider = serializers.CharField()


class StockServiceResultSerializer(serializers.Serializer):
    """Serializer for stock service result."""
    data = StockQuoteSerializer(allow_null=True)
    success = serializers.BooleanField()
    primaryUsed = serializers.BooleanField()
    errors = serializers.ListField(child=serializers.DictField())
    cached = serializers.BooleanField()


class SymbolSearchResultSerializer(serializers.Serializer):
    """Serializer for symbol search results."""
    symbol = serializers.CharField()
    name = serializers.CharField()
    type = serializers.CharField(required=False)
    exchange = serializers.CharField(required=False)
    provider = serializers.CharField()


class CompanyProfileSerializer(serializers.Serializer):
    """Serializer for company profile data."""
    symbol = serializers.CharField()
    name = serializers.CharField()
    country = serializers.CharField(required=False, allow_blank=True)
    exchange = serializers.CharField(required=False, allow_blank=True)
    industry = serializers.CharField(required=False, allow_blank=True)
    sector = serializers.CharField(required=False, allow_blank=True)
    logo = serializers.CharField(required=False, allow_blank=True)
    weburl = serializers.CharField(required=False, allow_blank=True)
    marketCap = serializers.FloatField(required=False)
    description = serializers.CharField(required=False, allow_blank=True)


class ProviderStatusSerializer(serializers.Serializer):
    """Serializer for provider status."""
    name = serializers.CharField()
    available = serializers.BooleanField()


class ServiceStatusSerializer(serializers.Serializer):
    """Serializer for overall service status."""
    provider = ProviderStatusSerializer()
    finnhubMarketStatus = ProviderStatusSerializer()
    cacheSize = serializers.IntegerField()


class BulkQuoteRequestSerializer(serializers.Serializer):
    """Serializer for bulk quote requests."""
    symbols = serializers.ListField(
        child=serializers.CharField(max_length=20, allow_blank=True),
        max_length=50,
        help_text="List of stock symbols (max 50)"
    )
    skipCache = serializers.BooleanField(default=False, required=False)
