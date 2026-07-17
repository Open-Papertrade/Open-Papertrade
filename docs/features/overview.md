# Features Overview

<p align="center">
  <img src="../.gitbook/assets/demo-placeholder.svg" alt="Feature tour — demo video coming soon" width="720" />
</p>
<p align="center"><sub><strong>🎬 Feature tour</strong> — placeholder (recording coming soon)</sub></p>

Open Papertrade ships eight major surfaces. Each has its own page with a demo video, screenshots, and how-to notes.

## Trading

<table data-view="cards">
<thead>
  <tr>
    <th></th>
    <th></th>
    <th data-hidden data-card-target data-type="content-ref"></th>
  </tr>
</thead>
<tbody>
  <tr>
    <td><strong>Paper Trading</strong></td>
    <td>Virtual portfolios, market/limit orders, holdings, transaction history, and price alerts — all on real market data.</td>
    <td><a href="paper-trading.md">paper-trading.md</a></td>
  </tr>
  <tr>
    <td><strong>Charts &amp; Technical Analysis</strong></td>
    <td>Interactive TradingView-style charts with technical indicators and pattern detection.</td>
    <td><a href="charts.md">charts.md</a></td>
  </tr>
  <tr>
    <td><strong>Backtesting</strong></td>
    <td>Build, run, and analyze trading strategies against historical market data. Performance metrics + trade log.</td>
    <td><a href="backtesting.md">backtesting.md</a></td>
  </tr>
</tbody>
</table>

## AI

<table data-view="cards">
<thead>
  <tr>
    <th></th>
    <th></th>
    <th data-hidden data-card-target data-type="content-ref"></th>
  </tr>
</thead>
<tbody>
  <tr>
    <td><strong>AI Coach</strong></td>
    <td>LLM-driven behavioral analysis over your own trade history — risk scoring, patterns, tips, and an interactive chat.</td>
    <td><a href="ai-coach.md">ai-coach.md</a></td>
  </tr>
  <tr>
    <td><strong>Filings Research Analyst</strong></td>
    <td>Agentic RAG over SEC 10-K, 10-Q, 8-K filings. Every claim cites its source. Refuses when the corpus doesn't support the answer.</td>
    <td><a href="filings-research.md">filings-research.md</a></td>
  </tr>
</tbody>
</table>

## Social

<table data-view="cards">
<thead>
  <tr>
    <th></th>
    <th></th>
    <th data-hidden data-card-target data-type="content-ref"></th>
  </tr>
</thead>
<tbody>
  <tr>
    <td><strong>Copy Trading</strong></td>
    <td>Follow leader accounts, mirror their trades, manage relationships.</td>
    <td><a href="copy-trading.md">copy-trading.md</a></td>
  </tr>
  <tr>
    <td><strong>Leaderboard &amp; Friends</strong></td>
    <td>Global rankings by return, XP, and achievements. Add friends and compare portfolios.</td>
    <td><a href="social.md">social.md</a></td>
  </tr>
</tbody>
</table>

## Design principles across features

| Principle | Applied to |
|---|---|
| **Refusal over hallucination** | AI Coach, Filings Analyst — both have explicit "I don't know" paths |
| **Provider-agnostic LLM** | All AI features share one interface — swap providers with one env var |
| **Real market data** | Paper Trading, Charts, Backtesting — Finnhub + Yahoo Finance fallback |
| **Traceable outputs** | Filings — every citation links to a specific char range in the source |
| **Local-first** | Everything runs on your laptop — no cloud dependencies for dev |
