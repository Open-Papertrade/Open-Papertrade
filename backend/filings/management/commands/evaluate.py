from __future__ import annotations

import json
from pathlib import Path

from django.core.management.base import BaseCommand

from filings.services.retrieval import RetrievalFilters, dense_search, search
from filings.services.qa import answer_question
from filings.evals.metrics import compute_retrieval, summarize_answers
from filings.evals.judge import judge_answer


DATA_DIR = Path(__file__).resolve().parents[2] / 'evals' / 'data'


class Command(BaseCommand):
    help = 'Run retrieval + answer evals and print a report.'

    def add_arguments(self, parser):
        parser.add_argument('--retrieval-only', action='store_true')
        parser.add_argument('--answers-only', action='store_true')
        parser.add_argument('--top-k', type=int, default=10)
        parser.add_argument('--hybrid', action='store_true')
        parser.add_argument('--rerank', action='store_true')
        parser.add_argument('--judge-provider', default=None)
        parser.add_argument('--out', default=None,
                            help='Optional path to write full JSON report')

    def handle(self, *args, **opts):
        report = {'config': {
            'top_k': opts['top_k'],
            'hybrid': opts['hybrid'],
            'rerank': opts['rerank'],
        }}

        if not opts['answers_only']:
            report['retrieval'] = self._run_retrieval(opts)
        if not opts['retrieval_only']:
            report['answers'] = self._run_answers(opts)

        self.stdout.write('\n=== SUMMARY ===')
        self.stdout.write(json.dumps(report, indent=2))

        if opts['out']:
            Path(opts['out']).write_text(json.dumps(report, indent=2))
            self.stdout.write(self.style.SUCCESS(f'Wrote {opts["out"]}'))

    def _run_retrieval(self, opts):
        data = json.loads((DATA_DIR / 'retrieval_gold.json').read_text())
        items = data['items']
        hits_per_q = []
        detail = []

        for it in items:
            filters = RetrievalFilters(tickers=it.get('tickers'))
            if opts['hybrid'] or opts['rerank']:
                results = search(
                    it['question'], top_k=opts['top_k'], filters=filters,
                    use_hybrid=opts['hybrid'], use_rerank=opts['rerank'],
                )
            else:
                results = dense_search(it['question'], top_k=opts['top_k'], filters=filters)

            required = [s.lower() for s in it['must_contain_any']]
            hits = [
                any(req in r.text.lower() for req in required)
                for r in results
            ]
            hits_per_q.append(hits)
            detail.append({
                'id': it['id'],
                'first_hit_rank': next((i + 1 for i, h in enumerate(hits) if h), None),
                'top1_snippet': (results[0].text[:180] + '…') if results else None,
            })

        metrics = compute_retrieval(hits_per_q, ks=[1, 3, 5, 10])
        return {
            'metrics': {
                'recall_at_k': metrics.recall_at_k,
                'mrr': round(metrics.mrr, 4),
                'hits': metrics.hits,
                'total': metrics.total,
            },
            'per_question': detail,
        }

    def _run_answers(self, opts):
        data = json.loads((DATA_DIR / 'answers_gold.json').read_text())
        items = data['items']
        judgements = []
        per_q = []

        for it in items:
            filters = RetrievalFilters(tickers=it.get('tickers'))
            qa = answer_question(
                it['question'],
                filters=filters,
                top_k=6,
                use_hybrid=opts['hybrid'],
                use_rerank=opts['rerank'],
            )
            sources_text = '\n\n'.join(
                f'[S{i+1}] {r.text[:1200]}'
                for i, r in enumerate(qa.retrieved[:6])
            )
            judgement = judge_answer(
                it['question'],
                it['criteria'],
                it['should_decline'],
                qa.answer,
                sources_text,
                provider_name=opts.get('judge_provider'),
            )

            refusal_correct = (it['should_decline'] and qa.declined) or \
                              (not it['should_decline'] and not qa.declined)
            judgement['refusal_correct'] = refusal_correct
            judgement['had_citations'] = bool(qa.citations)
            judgements.append(judgement)

            per_q.append({
                'id': it['id'],
                'question': it['question'],
                'declined': qa.declined,
                'should_decline': it['should_decline'],
                'refusal_correct': refusal_correct,
                'faithful': judgement.get('faithful'),
                'relevant': judgement.get('relevant'),
                'reason': judgement.get('reason'),
                'answer': qa.answer[:400],
            })

        summary = summarize_answers(judgements)
        return {
            'metrics': {
                'faithfulness': round(summary.faithfulness, 4),
                'relevance': round(summary.relevance, 4),
                'refusal_accuracy': round(summary.refusal_accuracy, 4),
                'citation_rate': round(summary.citation_rate, 4),
                'total': summary.total,
            },
            'per_question': per_q,
        }
