<p align="center">
  <img src="https://avatars.githubusercontent.com/u/258598073?s=200&v=4" width="160" alt="Open Papertrade Logo" />
</p>

<h1 align="center">Open Papertrade</h1>

<p align="center">
Open-source paper trading infrastructure for learning, testing, and building trading strategies — without financial risk.
</p>

---
<p align="center">
  <img src="demo.gif" width="800"/>
</p>

## About

Open Papertrade is a tool that facilitates paper trading by providing a simulated market environment where users can:

- Execute virtual trades  
- Test strategies in real-time or historical markets  
- Practice risk management  
- Analyze portfolio performance  

All without real financial exposure.
---

## Setup

 ### Backend

 ```bash
 cd backend
 python -m venv venv
 source venv/bin/activate
 pip install -r requirements.txt
 cp .env.example .env
 python manage.py migrate
 python manage.py runserver 8000
 ```

### Frontend

 ```bash
 cd frontend-ui
 npm install
 cp .env.example .env.local
 npm run dev
 ```

 App runs on `localhost:3000`, API on `localhost:8000`.

--- 

### Environment Variables

 **Backend** (`backend/.env`)

 | Variable | Description | Required |
 |----------|-------------|----------|
 | `SECRET_KEY` | Django secret key | Yes |
 | `DEBUG` | Enable debug mode (`True` / `False`) | Yes |
 | `ALLOWED_HOSTS` | Allowed hosts, comma-separated | Yes |
 | `CORS_ALLOWED_ORIGINS` | Frontend URL for CORS | Yes |
 | `FINNHUB_API_KEY` | [Finnhub](https://finnhub.io/) API key for real-time data | No — falls back to Yahoo Finance |
 | `DATABASE_URL` | PostgreSQL connection string | Production only |
 | `SUPABASE_URL` | Supabase project URL | Production only |
 | `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key | Production only |
 | `SUPABASE_STORAGE_BUCKET` | Storage bucket for avatars | Production only |

 **Frontend** (`frontend-ui/.env.local`)

 | Variable | Description | Default |
 |----------|-------------|---------|
 | `NEXT_PUBLIC_API_URL` | Backend API URL | `http://localhost:8000/api` |

---

## Mission

Make trading simulation accessible, open, and developer-friendly.

---

## Contributing

We welcome contributors of all levels.  
Fork. Build. Improve. Open a PR.

---

## Disclaimer

For educational and research purposes only.  
Not financial advice.

---

<p align="center">
Made with ❤ in India.
</p>
