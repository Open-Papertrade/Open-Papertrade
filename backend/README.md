# Paper Trading Backend

Django REST Framework API for fetching real-time stock and crypto prices.

## Features

- **Dual Provider Strategy**: Finnhub (primary) + Yahoo Finance (fallback)
- **Automatic Fallback**: If Finnhub fails or rate-limits, automatically uses Yahoo Finance
- **In-Memory Caching**: 1-minute cache to reduce API calls
- **RESTful API**: Clean JSON responses with metadata

## Quick Start

```bash
# Navigate to backend directory
cd backend

# Activate virtual environment
source venv/bin/activate

# Set up environment variables (optional - works without Finnhub key)
cp .env.example .env
# Edit .env and add your FINNHUB_API_KEY

# Run migrations
python manage.py migrate

# Start development server
python manage.py runserver 8000
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/` | GET | API root with endpoint list |
| `/api/stocks/quote/{symbol}/` | GET | Get single stock quote |
| `/api/stocks/quotes/` | POST | Get multiple quotes (bulk) |
| `/api/stocks/search/?q={query}` | GET | Search for symbols |
| `/api/stocks/profile/{symbol}/` | GET | Get company profile |
| `/api/stocks/popular/` | GET | Get popular US stocks |
| `/api/stocks/crypto/` | GET | Get popular cryptocurrencies |
| `/api/stocks/status/` | GET | Check provider status |
| `/api/stocks/cache/clear/` | POST | Clear quote cache |

## Example Responses

### Single Quote
```bash
curl http://localhost:8000/api/stocks/quote/AAPL/
```
```json
{
  "data": {
    "symbol": "AAPL",
    "price": 178.72,
    "change": 4.08,
    "changePercent": 2.34,
    "high": 180.50,
    "low": 176.20,
    "open": 177.00,
    "previousClose": 174.64,
    "volume": 52340000,
    "timestamp": "2024-01-15T16:00:00",
    "name": "Apple Inc.",
    "provider": "finnhub"
  },
  "success": true,
  "primaryUsed": true,
  "errors": [],
  "cached": false
}
```

### Bulk Quotes
```bash
curl -X POST http://localhost:8000/api/stocks/quotes/ \
  -H "Content-Type: application/json" \
  -d '{"symbols": ["AAPL", "GOOGL", "MSFT"]}'
```

### Provider Status
```bash
curl http://localhost:8000/api/stocks/status/
```
```json
{
  "primary": { "name": "finnhub", "available": true },
  "fallback": { "name": "yahoo", "available": true },
  "cacheSize": 5
}
```

## Configuration

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `FINNHUB_API_KEY` | Finnhub API key ([get free key](https://finnhub.io/)) | No (uses Yahoo fallback) |
| `SECRET_KEY` | Django secret key | Yes (for production) |
| `DEBUG` | Enable debug mode | No (default: True) |
| `CORS_ALLOWED_ORIGINS` | Frontend URLs for CORS | No (default: localhost:3000) |

### Getting a Finnhub API Key

1. Go to [finnhub.io](https://finnhub.io/)
2. Sign up for a free account
3. Copy your API key from the dashboard
4. Add it to your `.env` file

**Free tier limits:** 60 API calls/minute, real-time US stock data

## Project Structure

```
backend/
├── config/              # Django project settings
│   ├── settings.py
│   ├── urls.py
│   └── wsgi.py
├── stocks/              # Stock API app
│   ├── services/        # Stock data providers
│   │   ├── base_provider.py
│   │   ├── finnhub_provider.py
│   │   ├── yahoo_provider.py
│   │   └── stock_service.py
│   ├── views.py         # API endpoints
│   ├── serializers.py   # DRF serializers
│   └── urls.py          # URL routing
├── .env.example         # Environment template
├── requirements.txt     # Python dependencies
└── manage.py
```

## Provider Details

### Finnhub (Primary)
- Real-time US stock data
- 60 calls/minute on free tier
- Requires API key
- Best for: Real-time quotes, symbol search

### Yahoo Finance (Fallback)
- Near real-time global data
- No API key required
- Unofficial API (may have rate limits)
- Best for: Backup, crypto prices, international stocks

## Development

```bash
# Run tests
python manage.py test

# Create superuser for admin
python manage.py createsuperuser

# Access admin at http://localhost:8000/admin/
```
