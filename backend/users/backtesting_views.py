"""
API views for strategy backtesting.
"""

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status

from .views import get_user
from .backtesting import run_backtest
from .models import Backtest, Strategy


# ── Runners ──────────────────────────────────────────────────────

class RunBacktestView(APIView):
    """POST /api/users/backtesting/run/ — execute a backtest against historical data.

    Optionally persists the result to the DB (default: yes) and returns the saved
    Backtest id so the frontend can navigate to /backtesting/results/<id>.
    """

    def post(self, request):
        user = get_user(request)

        config = request.data.get("config")
        symbol = request.data.get("symbol")
        start_date = request.data.get("start_date")
        end_date = request.data.get("end_date")
        initial_capital = request.data.get("initial_capital", 100000)
        strategy_id = request.data.get("strategy_id")
        strategy_name = request.data.get("strategy_name") or "Untitled Strategy"
        save = request.data.get("save", True)

        if not config or not symbol or not start_date or not end_date:
            return Response(
                {"error": "config, symbol, start_date, and end_date are required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not isinstance(config.get("indicators"), list):
            return Response({"error": "config.indicators must be a list"}, status=status.HTTP_400_BAD_REQUEST)
        if not config.get("entryConditions", {}).get("rules"):
            return Response({"error": "At least one entry condition is required"}, status=status.HTTP_400_BAD_REQUEST)
        if not config.get("exitConditions", {}).get("rules"):
            return Response({"error": "At least one exit condition is required"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            initial_capital = float(initial_capital)
        except (TypeError, ValueError):
            initial_capital = 100000

        results = run_backtest(
            strategy_config=config,
            symbol=symbol.upper(),
            start_date=start_date,
            end_date=end_date,
            initial_capital=initial_capital,
        )

        if "error" in results:
            return Response({"error": results["error"]}, status=status.HTTP_400_BAD_REQUEST)

        saved_id = None
        if save and user:
            strategy_ref = None
            if strategy_id:
                strategy_ref = Strategy.objects.filter(id=strategy_id, owner=user).first()
            bt = Backtest.objects.create(
                owner=user,
                strategy=strategy_ref,
                strategy_name=strategy_name,
                symbol=symbol.upper(),
                start_date=start_date,
                end_date=end_date,
                initial_capital=initial_capital,
                config_snapshot=config,
                results=results,
            )
            saved_id = str(bt.id)

        return Response({"results": results, "id": saved_id})


class BacktestCompareView(APIView):
    """POST /api/users/backtesting/compare/ — compare backtest vs manual trades."""

    def post(self, request):
        user = get_user(request)

        config = request.data.get("config")
        symbol = request.data.get("symbol")
        start_date = request.data.get("start_date")
        end_date = request.data.get("end_date")
        initial_capital = request.data.get("initial_capital", 100000)
        manual_trades = request.data.get("manual_trades", [])

        if not config or not symbol or not start_date or not end_date:
            return Response(
                {"error": "config, symbol, start_date, and end_date are required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            initial_capital = float(initial_capital)
        except (TypeError, ValueError):
            initial_capital = 100000

        backtest_results = run_backtest(
            strategy_config=config,
            symbol=symbol.upper(),
            start_date=start_date,
            end_date=end_date,
            initial_capital=initial_capital,
        )

        if "error" in backtest_results:
            return Response({"error": backtest_results["error"]}, status=status.HTTP_400_BAD_REQUEST)

        ec = backtest_results.get("equityCurve", [])

        manual_equity = []
        manual_list = []
        cash = initial_capital
        for pt in ec:
            manual_equity.append({
                "date": pt["date"],
                "equity": round(cash, 2),
                "drawdown": 0,
                "drawdownPercent": 0,
            })

        strat_return_pct = backtest_results.get("statistics", {}).get("totalReturnPercent", 0)
        strat_trades = backtest_results.get("statistics", {}).get("totalTrades", 0)

        return Response({
            "comparison": {
                "backtest": {
                    "equityCurve": backtest_results.get("equityCurve", []),
                    "statistics": backtest_results.get("statistics", {}),
                    "trades": backtest_results.get("trades", []),
                },
                "manual": {
                    "equityCurve": manual_equity,
                    "statistics": {
                        "totalReturnPercent": 0,
                        "totalTrades": len(manual_trades),
                    },
                    "trades": manual_list,
                },
            }
        })


# ── Strategies CRUD ──────────────────────────────────────────────

def _require_user(request):
    user = get_user(request)
    if not user:
        return None, Response({"error": "authentication required"}, status=status.HTTP_401_UNAUTHORIZED)
    return user, None


class StrategyListView(APIView):
    """GET/POST /api/users/backtesting/strategies/"""

    def get(self, request):
        user, err = _require_user(request)
        if err: return err
        strategies = Strategy.objects.filter(owner=user)
        return Response([s.to_dict() for s in strategies])

    def post(self, request):
        """Create a new strategy, or update an existing one when `id` is provided."""
        user, err = _require_user(request)
        if err: return err

        name = (request.data.get("name") or "").strip()
        description = request.data.get("description") or ""
        config = request.data.get("config") or {}
        strategy_id = request.data.get("id")

        if not name:
            return Response({"error": "name is required"}, status=status.HTTP_400_BAD_REQUEST)

        if strategy_id:
            strategy = Strategy.objects.filter(id=strategy_id, owner=user).first()
            if not strategy:
                return Response({"error": "strategy not found"}, status=status.HTTP_404_NOT_FOUND)
            strategy.name = name
            strategy.description = description
            strategy.config = config
            strategy.save()
        else:
            strategy = Strategy.objects.create(
                owner=user, name=name, description=description, config=config,
            )
        return Response(strategy.to_dict(), status=status.HTTP_200_OK if strategy_id else status.HTTP_201_CREATED)


class StrategyDetailView(APIView):
    """GET/DELETE /api/users/backtesting/strategies/<id>/"""

    def get(self, request, strategy_id):
        user, err = _require_user(request)
        if err: return err
        strategy = Strategy.objects.filter(id=strategy_id, owner=user).first()
        if not strategy:
            return Response({"error": "strategy not found"}, status=status.HTTP_404_NOT_FOUND)
        return Response(strategy.to_dict())

    def delete(self, request, strategy_id):
        user, err = _require_user(request)
        if err: return err
        deleted, _ = Strategy.objects.filter(id=strategy_id, owner=user).delete()
        if not deleted:
            return Response({"error": "strategy not found"}, status=status.HTTP_404_NOT_FOUND)
        return Response({"deleted": True})


# ── Backtests CRUD ───────────────────────────────────────────────

class BacktestListView(APIView):
    """GET /api/users/backtesting/backtests/ — list mine (summary only, without full results)."""

    def get(self, request):
        user, err = _require_user(request)
        if err: return err
        include_results = request.query_params.get("full") == "1"
        qs = Backtest.objects.filter(owner=user)
        if include_results:
            return Response([b.to_dict() for b in qs])
        # Compact list — omit the heavy `results` and `config_snapshot` for perf.
        rows = []
        for b in qs:
            stats = (b.results or {}).get("statistics", {})
            rows.append({
                "id": str(b.id),
                "strategy_id": str(b.strategy_id) if b.strategy_id else None,
                "strategy_name": b.strategy_name,
                "symbol": b.symbol,
                "start_date": b.start_date,
                "end_date": b.end_date,
                "initial_capital": float(b.initial_capital),
                "created_at": b.created_at.isoformat(),
                "summary_stats": {
                    "totalReturnPercent": stats.get("totalReturnPercent"),
                    "winRate": stats.get("winRate"),
                    "sharpeRatio": stats.get("sharpeRatio"),
                    "maxDrawdownPercent": stats.get("maxDrawdownPercent"),
                    "totalTrades": stats.get("totalTrades"),
                },
            })
        return Response(rows)


class BacktestDetailView(APIView):
    """GET/DELETE /api/users/backtesting/backtests/<id>/"""

    def get(self, request, backtest_id):
        user, err = _require_user(request)
        if err: return err
        bt = Backtest.objects.filter(id=backtest_id, owner=user).first()
        if not bt:
            return Response({"error": "backtest not found"}, status=status.HTTP_404_NOT_FOUND)
        return Response(bt.to_dict())

    def delete(self, request, backtest_id):
        user, err = _require_user(request)
        if err: return err
        deleted, _ = Backtest.objects.filter(id=backtest_id, owner=user).delete()
        if not deleted:
            return Response({"error": "backtest not found"}, status=status.HTTP_404_NOT_FOUND)
        return Response({"deleted": True})
