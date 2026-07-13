from __future__ import annotations

import logging
import threading
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone

from django.db import close_old_connections

from ..models import IngestJob
from .ingest import ingest_from_url


logger = logging.getLogger(__name__)

_executor: ThreadPoolExecutor | None = None
_executor_lock = threading.Lock()


def _get_executor() -> ThreadPoolExecutor:
    global _executor
    if _executor is None:
        with _executor_lock:
            if _executor is None:
                _executor = ThreadPoolExecutor(max_workers=1, thread_name_prefix='filings-ingest')
    return _executor


def _run_job(job_id: int) -> None:
    close_old_connections()
    job = IngestJob.objects.filter(id=job_id).first()
    if job is None:
        return

    job.status = 'running'
    job.started_at = datetime.now(timezone.utc)
    job.progress = 'starting'
    job.save(update_fields=['status', 'started_at', 'progress'])

    def _on_progress(msg: str):
        IngestJob.objects.filter(id=job_id).update(progress=msg[:128])

    try:
        result = ingest_from_url(job.url, on_progress=_on_progress)
    except Exception as exc:
        logger.exception('IngestJob %s failed', job_id)
        IngestJob.objects.filter(id=job_id).update(
            status='failed',
            error=str(exc)[:2000],
            finished_at=datetime.now(timezone.utc),
        )
        close_old_connections()
        return

    IngestJob.objects.filter(id=job_id).update(
        status='success',
        filing_id=result.filing_id,
        section_count=result.section_count,
        chunk_count=result.chunk_count,
        progress='done',
        finished_at=datetime.now(timezone.utc),
    )
    close_old_connections()


def enqueue(job: IngestJob) -> None:
    _get_executor().submit(_run_job, job.id)
