"""
API views for the AI Trade Coach feature.
"""

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status

from .views import get_user
from .models import Trade, Holding
from .coaching.analyzer import analyze_trade, analyze_portfolio
from .coaching.patterns import detect_patterns
from .coaching.scoring import compute_trading_score
from .coaching.tips import generate_tips
from .coaching import llm


def _get_trade_dicts(user) -> list[dict]:
    """Get all trades as plain dicts with python datetime objects."""
    trades = Trade.objects.filter(user=user).order_by("executed_at")
    return [
        {
            "id": str(t.id),
            "symbol": t.symbol,
            "name": t.name,
            "trade_type": t.trade_type,
            "shares": t.shares,
            "price": t.price,
            "total": t.total,
            "currency": t.currency,
            "executed_at": t.executed_at,
        }
        for t in trades
    ]


def _get_holding_dicts(user) -> list[dict]:
    holdings = Holding.objects.filter(user=user)
    return [
        {
            "symbol": h.symbol,
            "name": h.name,
            "shares": h.shares,
            "avg_cost": h.avg_cost,
            "currency": h.currency,
        }
        for h in holdings
    ]


def _build_llm_context(user, trades, holdings, portfolio, patterns, scores) -> dict:
    """Build context dict for LLM calls."""
    recent = sorted(trades, key=lambda t: t["executed_at"], reverse=True)[:10]
    return {
        "portfolio": portfolio,
        "patterns": patterns,
        "scores": scores,
        "recentTrades": [
            {**t, "executed_at": str(t["executed_at"])} for t in recent
        ],
        "holdings": holdings,
    }


class CoachDashboardView(APIView):
    """GET /api/users/coaching/dashboard/ — full coaching dashboard data."""

    def get(self, request):
        user = get_user(request)
        trades = _get_trade_dicts(user)
        holdings = _get_holding_dicts(user)

        portfolio = analyze_portfolio(
            trades, holdings,
            float(user.buying_power), float(user.initial_balance)
        )
        patterns = detect_patterns(trades, holdings, float(user.buying_power))
        scores = compute_trading_score(
            trades, holdings, patterns,
            float(user.buying_power), float(user.initial_balance)
        )
        tips = generate_tips(portfolio, patterns, scores)

        return Response({
            "portfolio": portfolio,
            "patterns": patterns,
            "scores": scores,
            "tips": tips,
            "llmAvailable": llm.is_available(),
            "model": llm.get_model() if llm.is_available() else None,
        })


class CoachTradeReviewView(APIView):
    """GET /api/users/coaching/trade/<trade_id>/ — post-trade analysis."""

    def get(self, request, trade_id):
        user = get_user(request)
        trades = _get_trade_dicts(user)
        holdings = _get_holding_dicts(user)

        trade_dict = next((t for t in trades if t["id"] == str(trade_id)), None)
        if not trade_dict:
            return Response({"error": "Trade not found"}, status=status.HTTP_404_NOT_FOUND)

        analysis = analyze_trade(trade_dict, trades, holdings)

        # Optionally get LLM review
        llm_review = None
        if llm.is_available() and request.query_params.get("llm") == "true":
            portfolio = analyze_portfolio(
                trades, holdings,
                float(user.buying_power), float(user.initial_balance)
            )
            patterns = detect_patterns(trades, holdings, float(user.buying_power))
            scores = compute_trading_score(
                trades, holdings, patterns,
                float(user.buying_power), float(user.initial_balance)
            )
            context = _build_llm_context(user, trades, holdings, portfolio, patterns, scores)
            llm_result = llm.generate_trade_review(analysis, context)
            if not llm_result.get("error"):
                llm_review = llm_result["response"]

        return Response({
            "analysis": analysis,
            "llmReview": llm_review,
        })


class CoachPatternsView(APIView):
    """GET /api/users/coaching/patterns/ — detected behavioral patterns."""

    def get(self, request):
        user = get_user(request)
        trades = _get_trade_dicts(user)
        holdings = _get_holding_dicts(user)
        patterns = detect_patterns(trades, holdings, float(user.buying_power))
        return Response({"patterns": patterns})


class CoachScoreView(APIView):
    """GET /api/users/coaching/score/ — trading behavior score."""

    def get(self, request):
        user = get_user(request)
        trades = _get_trade_dicts(user)
        holdings = _get_holding_dicts(user)
        patterns = detect_patterns(trades, holdings, float(user.buying_power))
        scores = compute_trading_score(
            trades, holdings, patterns,
            float(user.buying_power), float(user.initial_balance)
        )
        return Response({"scores": scores})


class CoachTipsView(APIView):
    """GET /api/users/coaching/tips/ — personalized tips."""

    def get(self, request):
        user = get_user(request)
        trades = _get_trade_dicts(user)
        holdings = _get_holding_dicts(user)
        portfolio = analyze_portfolio(
            trades, holdings,
            float(user.buying_power), float(user.initial_balance)
        )
        patterns = detect_patterns(trades, holdings, float(user.buying_power))
        scores = compute_trading_score(
            trades, holdings, patterns,
            float(user.buying_power), float(user.initial_balance)
        )
        tips = generate_tips(portfolio, patterns, scores)
        return Response({"tips": tips})


class CoachChatView(APIView):
    """POST /api/users/coaching/chat/ — chat with AI coach via OpenRouter."""

    def post(self, request):
        user = get_user(request)

        if not llm.is_available():
            return Response(
                {"error": "AI coaching is not configured. Set OPENROUTER_API_KEY in your environment."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        message = request.data.get("message", "").strip()
        if not message:
            return Response({"error": "Message is required"}, status=status.HTTP_400_BAD_REQUEST)

        conversation = request.data.get("conversation", [])

        # Build context
        trades = _get_trade_dicts(user)
        holdings = _get_holding_dicts(user)
        portfolio = analyze_portfolio(
            trades, holdings,
            float(user.buying_power), float(user.initial_balance)
        )
        patterns = detect_patterns(trades, holdings, float(user.buying_power))
        scores = compute_trading_score(
            trades, holdings, patterns,
            float(user.buying_power), float(user.initial_balance)
        )
        context = _build_llm_context(user, trades, holdings, portfolio, patterns, scores)

        result = llm.generate_coaching_response(message, context, conversation)

        if result.get("error"):
            return Response({"error": result["error"]}, status=status.HTTP_502_BAD_GATEWAY)

        return Response({
            "response": result["response"],
            "model": result["model"],
            "tokensUsed": result["tokens_used"],
        })


class CoachSessionView(APIView):
    """GET /api/users/coaching/session/ — full AI coaching session summary."""

    def get(self, request):
        user = get_user(request)

        if not llm.is_available():
            return Response(
                {"error": "AI coaching is not configured. Set OPENROUTER_API_KEY."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        trades = _get_trade_dicts(user)
        holdings = _get_holding_dicts(user)
        portfolio = analyze_portfolio(
            trades, holdings,
            float(user.buying_power), float(user.initial_balance)
        )
        patterns = detect_patterns(trades, holdings, float(user.buying_power))
        scores = compute_trading_score(
            trades, holdings, patterns,
            float(user.buying_power), float(user.initial_balance)
        )
        context = _build_llm_context(user, trades, holdings, portfolio, patterns, scores)

        result = llm.generate_session_summary(context)

        if result.get("error"):
            return Response({"error": result["error"]}, status=status.HTTP_502_BAD_GATEWAY)

        return Response({
            "summary": result["response"],
            "model": result["model"],
            "tokensUsed": result["tokens_used"],
        })
