from django.urls import path

from . import views

app_name = 'filings'

urlpatterns = [
    path('health/', views.health, name='health'),
    path('companies/', views.companies, name='companies'),
    path('filings/', views.filings, name='list'),
    path('filings/<int:filing_id>/', views.delete_filing, name='delete-filing'),
    path('search/', views.search_view, name='search'),
    path('ask/', views.ask, name='ask'),
    path('ingest/', views.ingest_url, name='ingest'),
    path('ingest/jobs/', views.ingest_jobs, name='ingest-jobs'),
    path('ingest/status/<int:job_id>/', views.ingest_status, name='ingest-status'),
]
