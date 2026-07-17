# Installation

Complete setup takes about **15 minutes** end-to-end. You'll open **two terminals** — one for the backend, one for the frontend — and leave both running while you use the app.

## Step 1 — Clone the repository

```bash
git clone https://github.com/<your-org>/Open-Papertrade.git
cd Open-Papertrade
```

## Step 2 — Backend (Terminal 1)

### 2.1 Create a virtual environment

```bash
cd backend
python -m venv .venv
source .venv/bin/activate           # macOS / Linux
# .\.venv\Scripts\activate           # Windows PowerShell
```

Your prompt should now show `(.venv)`.

### 2.2 Install dependencies

```bash
pip install -r requirements.txt
```

Takes 3–5 minutes on first run (Django, DRF, sentence-transformers, torch, etc.).

### 2.3 Configure `.env`

```bash
cp .env.example .env
```

Open `backend/.env` in your editor. **The minimum required fields:**

```bash
# --- Django ---
DEBUG=True
SECRET_KEY=change-this-to-a-long-random-string
ALLOWED_HOSTS=localhost,127.0.0.1
CORS_ALLOWED_ORIGINS=http://localhost:3000

# --- SEC EDGAR (mandatory for Filings feature) ---
SEC_EDGAR_USER_AGENT=Your Name (your-email@example.com)

# --- LLM provider ---
LLM_PROVIDER=openrouter
OPENROUTER_API_KEY=sk-or-v1-<your-key-here>
OPENROUTER_MODEL=anthropic/claude-3.5-sonnet
```

{% hint style="warning" %}
The `SEC_EDGAR_USER_AGENT` is not optional — SEC blocks generic user-agents. Use a real email so if you get flagged, they can contact you instead of banning your IP.
{% endhint %}

See [LLM Providers → Overview](../llm-providers/overview.md) for other provider options.

### 2.4 Create the database

```bash
python manage.py makemigrations
python manage.py migrate
python manage.py createsuperuser    # optional — for /admin/ access
```

### 2.5 Start the backend

```bash
python manage.py runserver
```

Expected:

```
Starting development server at http://127.0.0.1:8000/
```

**Leave this terminal running.**

## Step 3 — Frontend (Terminal 2)

### 3.1 Install dependencies

```bash
cd frontend-ui
npm install
```

Takes 1–3 minutes.

### 3.2 Configure `.env.local`

```bash
cp .env.example .env.local
```

Default contents are correct for local dev:

```bash
NEXT_PUBLIC_API_URL=http://localhost:8000/api
```

### 3.3 Start the frontend

```bash
npm run dev
```

Expected:

```
- Local:   http://localhost:3000
- ready started server on 0.0.0.0:3000
```

**Leave this terminal running too.**

## Step 4 — Verify

Open **[http://localhost:3000](http://localhost:3000)** — you should see the Open Papertrade dashboard.

Health check from a new terminal:

```bash
curl http://localhost:8000/api/filings/health/
```

You should see JSON with your configured provider:

```json
{"status":"ok","companies":0,"filings":0,"llm_providers":["openrouter"]}
```

If `"llm_providers"` is empty, your API key wasn't loaded — recheck `.env` and restart the server.

{% hint style="success" %}
Everything's up. Next: [First Run](first-run.md) walks you through creating an account, adding a filing, and asking your first cited question.
{% endhint %}
