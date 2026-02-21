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



## Contributing

We welcome contributors of all levels.  
Fork. Build. Improve. Open a PR.

--- 

## 💰 Funding & Sponsorship

This project is independently developed and maintained.

To keep the paper-trading app running smoothly, we rely on server infrastructure for hosting, real-time data handling, and performance monitoring. Server deployment and maintenance costs are ongoing.

### Sponsor Server Deployment

If you are interested in sponsoring server infrastructure (hosting, cloud services, or deployment costs), please reach out directly:

📩 **mymadhavyadav07@gmail.com**

Your support will help ensure:
- Reliable uptime
- Faster execution and performance
- Scalable infrastructure
- Continued development and improvements

Thank you for helping support open financial education and trading simulation tools.

---
## 📜 License

This project is licensed under the **GNU Affero General Public License v3.0 (AGPL-3.0)**.  

Below is a summary of what the license allows and requires:

| Action | Allowed? | Notes |
|--------|-----------|-------|
| **Use** | ✅ Yes | Use the software freely for personal, educational, or commercial purposes. |
| **Modify** | ✅ Yes | Modify the code for your own use. |
| **Distribute** | ✅ Yes | Share your modified or unmodified version **if you also provide the source code** under AGPL-3.0. |
| **Sell / Commercial use** | ✅ Yes | Selling or commercial use is allowed, but **AGPL requires that your modifications remain open source**. |
| **Host as SaaS / Network Use** | ✅ Yes | If you run a modified version on a server or provide it over a network, you **must make the modified source code available to users**. |
| **Private internal use** | ✅ Yes | You can use it internally without sharing code. |
| **Remove license / make proprietary** | ❌ No | You cannot relicense AGPL code as closed-source or proprietary. |
| **Warranty / Liability** | ⚠️ None | Software is provided “as-is,” without warranty. You are responsible for your use. |

For the full legal text, see the [GNU AGPLv3 License](https://www.gnu.org/licenses/agpl-3.0.html).



---

## Disclaimer

For educational and research purposes only.  
Not financial advice.

---

<p align="center">
Made with ❤ in India.
</p>
