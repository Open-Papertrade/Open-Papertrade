from django.db.models import Count
from rest_framework.decorators import api_view, permission_classes, throttle_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle

from .models import Company, Filing, IngestJob
from .serializers import CompanySerializer, FilingSerializer
from .services.retrieval import RetrievalFilters, search
from .services.qa import answer_question
from .services.agent import run_agent
from .services.llm import available_providers
from .services import edgar
from .services.ingest_worker import enqueue as enqueue_ingest


class IngestThrottle(AnonRateThrottle):
    scope = 'filings_ingest'
    rate = '10/hour'


@api_view(['GET'])
@permission_classes([AllowAny])
def health(request):
    return Response({
        'status': 'ok',
        'companies': Company.objects.count(),
        'filings': Filing.objects.count(),
        'llm_providers': available_providers(),
    })


@api_view(['GET'])
@permission_classes([AllowAny])
def companies(request):
    qs = Company.objects.annotate(filings_count=Count('filings')).order_by('ticker')
    return Response(CompanySerializer(qs, many=True).data)


@api_view(['GET'])
@permission_classes([AllowAny])
def filings(request):
    qs = (
        Filing.objects
        .select_related('company')
        .annotate(chunk_count=Count('chunks', distinct=True),
                  section_count=Count('sections', distinct=True))
        .order_by('-ingested_at')
    )
    ticker = request.GET.get('ticker')
    if ticker:
        qs = qs.filter(company__ticker=ticker.upper())
    return Response(FilingSerializer(qs, many=True).data)


@api_view(['DELETE'])
@permission_classes([AllowAny])
def delete_filing(request, filing_id: int):
    filing = Filing.objects.select_related('company').filter(id=filing_id).first()
    if filing is None:
        return Response({'error': 'filing not found'}, status=404)

    company_id = filing.company_id
    company_ticker = filing.company.ticker

    # Remove the ingestion-job trail — otherwise the "Add a filing by URL" list
    # keeps showing a ✓ for a filing that no longer exists.
    IngestJob.objects.filter(filing_id=filing_id).delete()

    filing.delete()  # cascades to Section + Chunk

    remaining = Filing.objects.filter(company_id=company_id).count()
    if remaining == 0:
        Company.objects.filter(id=company_id).delete()

    try:
        from .services.bm25 import invalidate_cache
        invalidate_cache()
    except Exception:
        pass

    return Response({
        'deleted': True,
        'filing_id': filing_id,
        'company_ticker': company_ticker,
        'company_removed': remaining == 0,
    })


def _parse_filters(request) -> RetrievalFilters:
    body = request.data if request.method == 'POST' else {}
    tickers = request.GET.getlist('ticker') or body.get('tickers') or None
    sections = request.GET.getlist('section') or body.get('sections') or None
    years_raw = request.GET.getlist('year') or body.get('fiscal_years') or None
    years = None
    if years_raw:
        try:
            years = [int(y) for y in years_raw]
        except (TypeError, ValueError):
            years = None
    return RetrievalFilters(
        tickers=[t.upper() for t in tickers] if tickers else None,
        section_names=sections or None,
        fiscal_years=years,
    )


def _bool_param(request, name: str, default: bool = False) -> bool:
    raw = request.GET.get(name)
    if raw is not None:
        return raw.lower() in {'1', 'true', 'yes', 'on'}
    if request.method == 'POST':
        return bool(request.data.get(name, default))
    return default


@api_view(['GET', 'POST'])
@permission_classes([AllowAny])
def search_view(request):
    query = request.GET.get('q') or (request.data.get('query') if request.method == 'POST' else None)
    if not query:
        return Response({'error': 'query is required'}, status=400)

    body = request.data if request.method == 'POST' else {}
    top_k = int(request.GET.get('top_k') or body.get('top_k') or 10)
    hybrid = _bool_param(request, 'hybrid', False)
    rerank = _bool_param(request, 'rerank', False)

    results = search(
        query, top_k=top_k, filters=_parse_filters(request),
        use_hybrid=hybrid, use_rerank=rerank,
    )
    return Response({
        'query': query,
        'count': len(results),
        'results': [
            {
                'chunk_id': r.chunk_id,
                'company_ticker': r.company_ticker,
                'filing_form': r.filing_form,
                'filing_date': r.filing_date,
                'section_name': r.section_name,
                'snippet': r.text[:400],
                'source_url': r.source_url,
                'dense_score': r.dense_score,
                'sparse_score': r.sparse_score,
                'rerank_score': r.rerank_score,
                'fused_score': r.fused_score,
                'final_score': r.final_score,
            }
            for r in results
        ]
    })


def _llm_error_response(exc: Exception):
    """Translate provider SDK errors into a friendly 502 payload
    and log the full traceback server-side for debugging."""
    import logging
    logging.getLogger('filings').exception('LLM provider error in /ask/')

    msg = str(exc) or exc.__class__.__name__
    first_line = next((l.strip() for l in msg.splitlines() if l.strip()), msg)
    return Response(
        {
            'error': 'llm_provider_error',
            'exception_type': exc.__class__.__name__,
            'detail': first_line[:800],
            'hint': (
                "Check LLM_PROVIDER and the corresponding *_API_KEY / *_MODEL in "
                "backend/.env. For OpenRouter, verify the model slug at "
                "https://openrouter.ai/models — free slugs are rotated frequently."
            ),
        },
        status=502,
    )


@api_view(['POST'])
@permission_classes([AllowAny])
def ask(request):
    question = (request.data.get('question') or '').strip()
    if not question:
        return Response({'error': 'question is required'}, status=400)

    use_agent = bool(request.data.get('agent'))
    provider = request.data.get('provider') or None
    model = request.data.get('model') or None
    hybrid = bool(request.data.get('hybrid', True))
    rerank = bool(request.data.get('rerank', True))

    try:
        if use_agent:
            res = run_agent(
                question, provider_name=provider, model=model,
                use_hybrid=hybrid, use_rerank=rerank,
            )
            return Response(res.to_dict())

        filters = _parse_filters(request)
        res = answer_question(
            question, filters=filters, provider_name=provider, model=model,
            use_hybrid=hybrid, use_rerank=rerank,
        )
        return Response(res.to_dict())
    except Exception as exc:
        return _llm_error_response(exc)


def _serialize_job(job: IngestJob) -> dict:
    return {
        'id': job.id,
        'url': job.url,
        'status': job.status,
        'progress': job.progress,
        'error': job.error,
        'section_count': job.section_count,
        'chunk_count': job.chunk_count,
        'created_at': job.created_at.isoformat() if job.created_at else None,
        'started_at': job.started_at.isoformat() if job.started_at else None,
        'finished_at': job.finished_at.isoformat() if job.finished_at else None,
        'filing': (
            {
                'id': job.filing.id,
                'company_ticker': job.filing.company.ticker,
                'company_name': job.filing.company.name,
                'form_type': job.filing.form_type,
                'filed_date': job.filing.filed_date.isoformat(),
                'source_url': job.filing.source_url,
            }
            if job.filing_id else None
        ),
    }


@api_view(['POST'])
@permission_classes([AllowAny])
@throttle_classes([IngestThrottle])
def ingest_url(request):
    url = (request.data.get('url') or '').strip()
    if not url:
        return Response({'error': 'url is required'}, status=400)

    try:
        edgar.parse_sec_url(url)
    except ValueError as exc:
        return Response({'error': str(exc)}, status=400)

    existing = IngestJob.objects.filter(
        url=url, status__in=('pending', 'running')
    ).first()
    if existing:
        return Response(_serialize_job(existing), status=202)

    job = IngestJob.objects.create(url=url, status='pending')
    enqueue_ingest(job)
    return Response(_serialize_job(job), status=202)


@api_view(['GET'])
@permission_classes([AllowAny])
def ingest_status(request, job_id: int):
    job = (
        IngestJob.objects
        .select_related('filing__company')
        .filter(id=job_id)
        .first()
    )
    if job is None:
        return Response({'error': 'job not found'}, status=404)
    return Response(_serialize_job(job))


@api_view(['GET'])
@permission_classes([AllowAny])
def ingest_jobs(request):
    limit = min(int(request.GET.get('limit', 20)), 100)
    # Hide orphaned success jobs (Filing was deleted → filing_id went NULL under
    # SET_NULL). They're historical artifacts that still show a ✓ in the UI.
    qs = (
        IngestJob.objects
        .select_related('filing__company')
        .exclude(status='success', filing__isnull=True)
        [:limit]
    )
    return Response([_serialize_job(j) for j in qs])
