# Leaderboard & Friends

<p align="center"><sub><strong>🎬 Demo: Leaderboard &#x26; Friends</strong> — placeholder (recording coming soon)</sub></p>

## What it is

The social layer of the app — a global leaderboard, a friends graph, and a lightweight gamification system (XP, ranks, achievements) that rewards consistent trading behavior.

## Leaderboard

Sidebar → **Leaderboard**.

Global rankings across:

* **Return %** — total portfolio return since account creation.
* **Win rate** — % of profitable trades.
* **Trade count** — most active traders.
* **XP** — accumulated experience points from achievements.

Filter by time window (week / month / all-time) or by cohort (your friends only).

Click any username → see their public profile, holdings summary (if public), and follow them.

## Friends

Sidebar → **Friends**.

* **Search** for other users by username or email.
* **Send a friend request** → the other user accepts.
* **See friends' recent activity** — their trades, achievements unlocked, patterns.
* **Compare portfolios side-by-side** — head-to-head equity curves.

## Achievements & XP

Trading behavior earns XP. Sample achievements:

| Achievement    | Trigger                              |
| -------------- | ------------------------------------ |
| First Trade    | Place any trade                      |
| Diversified    | Hold 10+ symbols across 3+ sectors   |
| Contrarian     | Buy after 5% market drop             |
| Winning Streak | 5 profitable trades in a row         |
| Filings Reader | Ask 10 questions in Filings Research |

XP accumulates → **Rank** progresses through named tiers (Novice → Analyst → Trader → Portfolio Manager → …).

Achievement unlocks trigger a toast notification and a persistent badge on your profile.

## Under the hood

* **Models**: `Achievement`, `UserAchievement`, `Friendship`, `LeaderboardEntry` — all in `backend/users/models.py`.
* **XP calculation**: real-time; every completed trade or achievement dispatch updates XP.
* **Privacy**: leaderboard rankings show usernames only; holdings are hidden unless the user explicitly makes their profile public in **Account → Privacy**.

## Related

* [Copy Trading](copy-trading.md) — the leaderboard is where you find traders to follow.
* [Paper Trading](paper-trading.md) — the underlying trading system these ranks aggregate.
