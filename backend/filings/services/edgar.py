from __future__ import annotations

import re
import threading
import time
from dataclasses import dataclass
from typing import Optional
from urllib.parse import unquote, urlparse

import requests
from django.conf import settings


SEC_HOST = 'https://www.sec.gov'
SEC_DATA_HOST = 'https://data.sec.gov'
COMPANY_TICKERS_URL = f'{SEC_HOST}/files/company_tickers.json'

_MIN_INTERVAL_S = 0.11
_last_request_ts = 0.0
_rate_lock = threading.Lock()

_ARCHIVE_PATH_RE = re.compile(
    r'/Archives/edgar/data/(\d+)/(\d+)(?:/([^/?#]+))?',
    re.IGNORECASE,
)


@dataclass
class FilingRef:
    accession_number: str
    form_type: str
    filed_date: str
    period_of_report: Optional[str]
    primary_document: str

    @property
    def accession_nodash(self) -> str:
        return self.accession_number.replace('-', '')


def _headers() -> dict:
    return {
        'User-Agent': settings.SEC_EDGAR_USER_AGENT,
        'Accept-Encoding': 'gzip, deflate',
        'Host': 'www.sec.gov',
    }


def _get(url: str, host_override: Optional[str] = None) -> requests.Response:
    global _last_request_ts
    with _rate_lock:
        delta = time.time() - _last_request_ts
        if delta < _MIN_INTERVAL_S:
            time.sleep(_MIN_INTERVAL_S - delta)

        headers = _headers()
        if host_override:
            headers['Host'] = host_override

        resp = requests.get(url, headers=headers, timeout=30)
        _last_request_ts = time.time()
    resp.raise_for_status()
    return resp


def resolve_ticker(ticker: str) -> tuple[str, str]:
    """Return (cik_padded, company_name) for the given ticker."""
    resp = _get(COMPANY_TICKERS_URL)
    data = resp.json()
    ticker_up = ticker.upper()
    for row in data.values():
        if row.get('ticker', '').upper() == ticker_up:
            cik = str(row['cik_str']).zfill(10)
            return cik, row['title']
    raise ValueError(f'Ticker not found on EDGAR: {ticker!r}')


def list_filings(cik: str, form_type: str = '10-K', limit: int = 5) -> list[FilingRef]:
    url = f'{SEC_DATA_HOST}/submissions/CIK{cik}.json'
    resp = _get(url, host_override='data.sec.gov')
    submissions = resp.json()

    recent = submissions.get('filings', {}).get('recent', {})
    forms = recent.get('form', [])
    accessions = recent.get('accessionNumber', [])
    filed = recent.get('filingDate', [])
    period = recent.get('reportDate', [])
    primary = recent.get('primaryDocument', [])

    out: list[FilingRef] = []
    for i, form in enumerate(forms):
        if form != form_type:
            continue
        out.append(FilingRef(
            accession_number=accessions[i],
            form_type=form,
            filed_date=filed[i],
            period_of_report=period[i] if i < len(period) else None,
            primary_document=primary[i] if i < len(primary) else '',
        ))
        if len(out) >= limit:
            break
    return out


def fetch_filing_html(cik: str, ref: FilingRef) -> str:
    cik_int = str(int(cik))
    url = f'{SEC_HOST}/Archives/edgar/data/{cik_int}/{ref.accession_nodash}/{ref.primary_document}'
    resp = _get(url)
    return resp.text


def filing_source_url(cik: str, ref: FilingRef) -> str:
    cik_int = str(int(cik))
    return f'{SEC_HOST}/Archives/edgar/data/{cik_int}/{ref.accession_nodash}/{ref.primary_document}'


def _accession_with_dashes(nodash: str) -> str:
    if len(nodash) != 18 or not nodash.isdigit():
        raise ValueError(f'Invalid accession number format: {nodash!r}')
    return f'{nodash[:10]}-{nodash[10:12]}-{nodash[12:]}'


@dataclass
class ParsedSecUrl:
    cik: str
    accession_number: str
    primary_document: Optional[str]


def parse_sec_url(url: str) -> ParsedSecUrl:
    """Extract CIK + accession from a SEC filing URL.

    Accepts:
      https://www.sec.gov/Archives/edgar/data/320193/000032019324000123/aapl-20240928.htm
      https://www.sec.gov/ix?doc=/Archives/edgar/data/320193/000032019324000123/aapl-20240928.htm
      https://www.sec.gov/cgi-bin/browse-edgar?...  → rejected
    """
    if not url or 'sec.gov' not in url.lower():
        raise ValueError('URL must be from sec.gov')

    parsed = urlparse(url)
    haystack = unquote(parsed.path)
    if parsed.query:
        haystack = f'{haystack}?{unquote(parsed.query)}'

    m = _ARCHIVE_PATH_RE.search(haystack)
    if not m:
        raise ValueError('URL does not point to an EDGAR filing archive path')

    cik_int, accession_nodash, primary = m.group(1), m.group(2), m.group(3)
    return ParsedSecUrl(
        cik=cik_int.zfill(10),
        accession_number=_accession_with_dashes(accession_nodash),
        primary_document=primary,
    )


def get_submissions(cik: str) -> dict:
    url = f'{SEC_DATA_HOST}/submissions/CIK{cik}.json'
    return _get(url, host_override='data.sec.gov').json()


def get_company_info(cik: str, submissions: Optional[dict] = None) -> tuple[str, str]:
    """Return (ticker, name) for a CIK. Ticker falls back to CIK if none registered."""
    subs = submissions or get_submissions(cik)
    tickers = subs.get('tickers') or []
    ticker = tickers[0].upper() if tickers else f'CIK{int(cik)}'
    name = subs.get('name') or ticker
    return ticker, name


def find_filing_ref(
    cik: str,
    accession_number: str,
    submissions: Optional[dict] = None,
) -> Optional[FilingRef]:
    """Find a filing by accession number in the company's submissions history."""
    subs = submissions or get_submissions(cik)
    recent = subs.get('filings', {}).get('recent', {})
    accessions = recent.get('accessionNumber', [])
    forms = recent.get('form', [])
    filed = recent.get('filingDate', [])
    period = recent.get('reportDate', [])
    primary = recent.get('primaryDocument', [])

    for i, acc in enumerate(accessions):
        if acc == accession_number:
            return FilingRef(
                accession_number=acc,
                form_type=forms[i],
                filed_date=filed[i],
                period_of_report=period[i] if i < len(period) and period[i] else None,
                primary_document=primary[i] if i < len(primary) else '',
            )
    return None
