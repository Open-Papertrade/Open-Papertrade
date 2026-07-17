# Copy Trading

<p align="center"><sub><strong>🎬 Demo: Copy Trading</strong> — placeholder (recording coming soon)</sub></p>

## What it is

Follow other traders on the platform and automatically mirror their trades in your virtual account. The social-learning layer of the app — you learn from what more experienced traders actually do, not what they say.

## What you can do

* **Browse traders** — discoverable leader accounts ranked by return, win rate, and volume.
* **Follow / unfollow** any trader.
* **Mirror trades** — when a followed trader places a trade, a proportional trade fires in your account.
* **Configure your relationship** — set a copy percentage (e.g. mirror at 50% of the leader's position sizing), max exposure per position, or blacklist symbols.
* **Track performance** — see how the copy relationship is contributing to your P/L.

## How to use it

### Following a trader

1. Sidebar → **Copy Trading** → **Leaders**.
2. Pick a trader — profile card shows stats: return, win rate, trade count, most-traded sectors.
3. Click **Follow**.
4. Configure the relationship:
   * **Copy percentage** — how much of the leader's position size to mirror. 100% = same dollar amount; 50% = half.
   * **Max exposure** — cap on how much of your portfolio can be tied to one symbol.
   * **Symbol blacklist** — optionally exclude specific tickers.

### What happens next

Once you're following someone, every new trade they place triggers a mirror trade in your account. You'll see:

* A notification in your dropdown.
* The trade in your **History** with a "Copied from `<username>`" tag.
* Updated holdings and P/L.

### Managing relationships

Sidebar → **Copy Trading** → **My Follows**. From here:

* Pause / resume a relationship.
* Adjust copy percentage.
* Unfollow.
* See per-relationship contribution to your P/L.

## Under the hood

* **Data model**: `CopyRelationship` + `CopyTrade` in `backend/users/models.py`.
* **Sync**: when a leader places a trade (via `POST /api/users/trades/execute/`), a signal fanned out to all their followers, creating mirrored trades.
* **Consistency**: mirrored trades are atomic — if a follower's buying power is insufficient, the mirror is skipped and logged (not queued).

## Related

* [Paper Trading](paper-trading.md) — the underlying execution layer.
* [Leaderboard & Friends](social.md) — find traders to follow.
* [AI Coach](ai-coach.md) — see how your copy-relationships affect your behavioral patterns.
