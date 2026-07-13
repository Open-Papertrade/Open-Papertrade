from django.contrib import admin
from unfold.admin import ModelAdmin

from .models import Company, Filing, Section, Chunk, IngestJob


@admin.register(Company)
class CompanyAdmin(ModelAdmin):
    list_display = ('ticker', 'name', 'cik', 'created_at')
    search_fields = ('ticker', 'name', 'cik')


@admin.register(Filing)
class FilingAdmin(ModelAdmin):
    list_display = ('company', 'form_type', 'filed_date', 'fiscal_year', 'ingested_at')
    list_filter = ('form_type', 'fiscal_year', 'company')
    search_fields = ('company__ticker', 'accession_number')
    date_hierarchy = 'filed_date'


@admin.register(Section)
class SectionAdmin(ModelAdmin):
    list_display = ('filing', 'name', 'order')
    list_filter = ('name',)
    search_fields = ('filing__company__ticker', 'name')


@admin.register(Chunk)
class ChunkAdmin(ModelAdmin):
    list_display = ('id', 'company', 'filing', 'section', 'order', 'token_count', 'embedding_model')
    list_filter = ('company', 'embedding_model')
    search_fields = ('text',)
    readonly_fields = ('embedding', 'embedding_dim', 'created_at')


@admin.register(IngestJob)
class IngestJobAdmin(ModelAdmin):
    list_display = ('id', 'status', 'url', 'progress', 'chunk_count', 'created_at', 'finished_at')
    list_filter = ('status',)
    search_fields = ('url', 'error')
    readonly_fields = ('created_at', 'started_at', 'finished_at', 'filing')
