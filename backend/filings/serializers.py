from rest_framework import serializers

from .models import Company, Filing


class CompanySerializer(serializers.ModelSerializer):
    filings_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Company
        fields = ['id', 'ticker', 'name', 'cik', 'filings_count']


class FilingSerializer(serializers.ModelSerializer):
    company_ticker = serializers.CharField(source='company.ticker', read_only=True)
    company_name = serializers.CharField(source='company.name', read_only=True)
    chunk_count = serializers.IntegerField(read_only=True)
    section_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Filing
        fields = [
            'id', 'company_ticker', 'company_name', 'form_type',
            'accession_number', 'filed_date', 'period_of_report',
            'fiscal_year', 'source_url', 'ingested_at',
            'chunk_count', 'section_count',
        ]
