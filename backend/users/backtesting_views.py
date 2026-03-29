"""
API views for strategy backtesting.
"""

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status

from .views import get_user
from .backtesting import run_backtest


class RunBacktestView(APIView):
    """POST /api/users/backtesting/run/ — execute a backtest against historical data."""

    def post(self, request):
        user = get_user(request)

        config = request.data.get("config")
        symbol = request.data.get("symbol")
        start_date = request.data.get("start_date")
        end_date = request.data.get("end_date")
        initial_capital = request.data.get("initial_capital", 100000)

        if not config or not symbol or not start_date or not end_date:
            return Response(
                {"error": "config, symbol, start_date, and end_date are required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Validate config structure
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

        return Response({"results": results})


class BacktestCompareView(APIView):
    """POST /api/users/backtesting/compare/ — compare backtest vs manual trades."""

    def post(self, request):
        user = get_user(request)

        symbol = request.data.get("symbol")
        start_date = request.data.get("start_date")
        end_date = request.data.get("end_date")
        backtest_results = request.data.get("backtest_results")

        if not symbol or not start_date or not end_date or not backtest_results:
            return Response(
                {"error": "symbol, start_date, end_date, and backtest_results are required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        from .models import Trade

        # Fetch user's actual trades for comparison
        manual_trades = Trade.objects.filter(
            user=user,
            symbol__iexact=symbol,
            executed_at__date__gte=start_date,
            executed_at__date__lte=end_date,
        ).order_by("executed_at")

        manual_list = [
            {
                "date": str(t.executed_at.date()),
                "type": t.trade_type,
                "price": float(t.price),
                "shares": float(t.shares),
            }
            for t in manual_trades
        ]

        # Build manual equity curve from backtest price data
        price_data = backtest_results.get("priceData", [])
        initial_capital = backtest_results.get("statistics", {}).get("totalReturn", 0)
        # Use the same initial capital implied by the backtest equity curve
        ec = backtest_results.get("equityCurve", [])
        init_cap = ec[0]["equity"] if ec else 100000

        cash = init_cap
        shares = 0
        manual_equity = []
        peak = init_cap
        ti = 0

        for bar in price_data:
            while ti < len(manual_list) and manual_list[ti]["date"] <= bar["date"]:
                t = manual_list[ti]
                if t["type"] == "BUY":
                    cash -= t["price"] * t["shares"]
                    shares += t["shares"]
                else:
                    cash += t["price"] * t["shares"]
                    shares -= t["shares"]
                ti += 1

            eq = cash + shares * bar["close"]
            if eq > peak:
                peak = eq
            dd = peak - eq
            manual_equity.append({
                "date": bar["date"],
                "equity": round(eq, 2),
                "drawdown": round(dd, 2),
                "drawdownPercent": round((dd / peak * 100) if peak > 0 else 0, 2),
            })

        final_eq = manual_equity[-1]["equity"] if manual_equity else init_cap
        manual_return = final_eq - init_cap
        manual_return_pct = (manual_return / init_cap * 100) if init_cap > 0 else 0

        # Insights
        strat_return_pct = backtest_results.get("statistics", {}).get("totalReturnPercent", 0)
        strat_trades = backtest_results.get("statistics", {}).get("totalTrades", 0)
        insights = []

        if not manual_list:
            insights.append("You had no manual trades for this symbol during this period.")
        else:
            diff = strat_return_pct - manual_return_pct
            if diff > 1:
                insights.append(f"The strategy outperformed your manual trading by {diff:.1f}%.")
            elif diff < -1:
                insights.append(f"Your manual trading outperformed the strategy by {-diff:.1f}%.")
            else:
                insights.append("The strategy and your manual trading had similar returns.")

            if strat_trades > len(manual_list):
                insights.append(f"The strategy made {strat_trades - len(manual_list)} more trades than you.")
            elif len(manual_list) > strat_trades:
                insights.append(f"You made {len(manual_list) - strat_trades} more trades than the strategy.")

        return Response({
            "comparison": {
                "strategy": {
                    "equityCurve": backtest_results.get("equityCurve", []),
                    "statistics": backtest_results.get("statistics", {}),
                },
                "manual": {
                    "equityCurve": manual_equity,
                    "statistics": {
                        "totalReturn": round(manual_return, 2),
                        "totalReturnPercent": round(manual_return_pct, 2),
                        "totalTrades": len(manual_list),
                    },
                    "trades": manual_list,
                },
                "insights": insights,
            }
        })
