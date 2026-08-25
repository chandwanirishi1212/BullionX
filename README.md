# BullionX

BullionX is an India-focused gold and silver price intelligence MVP. It discovers the public city directory from [All India Bullion](https://allindiabullion.com/gold-rate), validates product fields from each city page, stores immutable snapshots in SQLite, and serves them to a React dashboard through FastAPI.

## Stack

- Backend: Python, FastAPI, SQLAlchemy, SQLite, BeautifulSoup, requests, APScheduler
- Frontend: React, TypeScript, Vite, Tailwind CSS, Recharts, Lucide

## Run locally

### Backend

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r backend\requirements.txt
python scripts\init_db.py
python scripts\run_scraper.py
python scripts\import_history.py
python scripts\sync_all_cities.py
python -m uvicorn app.main:app --app-dir backend --reload --port 8000
```

The API is available at http://localhost:8000 and its interactive documentation is at http://localhost:8000/docs.

### Frontend

```powershell
cd frontend
npm install
npm run dev
```

The dashboard is available at http://localhost:5173. Set `VITE_API_URL` if the backend is hosted somewhere else.

### One-command deployment

With Docker installed, run `docker compose up --build`. The application is then available at http://localhost:8080, with the API reverse-proxied through the same origin and the SQLite database persisted in a named volume. The first startup performs an initial Ahmedabad scrape; later updates are handled by the scheduler.

For Render, use the included `render.yaml` Blueprint, or set Python `3.13.11`, build command `pip install -r backend/requirements.txt`, and start command `python scripts/init_db.py && (python scripts/run_scraper.py || true) && uvicorn app.main:app --app-dir backend --host 0.0.0.0 --port $PORT`. Set `PYTHON_VERSION=3.13.11`, `ENABLE_SCHEDULER=true`, and `CORS_ORIGINS` to the deployed frontend URL. The initial startup scrape populates the first rates, and the backend creates the SQLite directory automatically on startup.

## API

- `GET /api/health`
- `GET /api/cities`
- `GET /api/rates/ahmedabad`
- `GET /api/history/ahmedabad?range=1D`
- `GET /api/summary/ahmedabad`
- `GET /api/intelligence/ahmedabad`

City slugs are returned by `/api/cities`; Ahmedabad keeps the short slug `ahmedabad`, while other cities are namespaced as `state--city` (for example, `gujarat--surat`). The city selector uses this catalog directly.

`SCRAPE_INTERVAL_MINUTES`, `SCRAPE_TIMEOUT_SECONDS`, `CITY_SCRAPE_DELAY_SECONDS`, `CITY_BATCH_SIZE`, `ENABLE_SCHEDULER`, and `CORS_ORIGINS` can be set in `backend/.env`. The scheduler only scrapes on its configured interval; it does not run on a page view. It also refreshes the public IBJA daily benchmark history once per day and works through the city catalog in controlled batches.

The `/api/health` endpoint reports database connectivity, latest snapshot time/source, scraper success or failure, and city coverage. CI runs backend tests and the frontend production build on every push and pull request.

## Data integrity

The scraper does not bypass access controls and makes a normal public HTTP request. Every required field must be present and positive before a snapshot is written. Failed runs are recorded in `scraper_runs`, and the last valid snapshot remains available. Longer-range charts and AI intelligence can use the public IBJA daily benchmark table when there are not yet enough AIB city snapshots; the UI labels that national benchmark clearly and never presents it as a city retail quote. Intelligence uses transparent trend, momentum, realized-volatility, and linear-forecast calculations with an explicit confidence level. No historical values or AI forecasts are fabricated.

## Current limitations

- AIB source markup or availability can change; scraper failures are surfaced as `STALE`/`UNAVAILABLE` rather than silently replaced.
- Intraday ranges remain empty until the scheduler has collected multiple AIB snapshots in the selected range; longer ranges show clearly labeled IBJA benchmark context in the meantime.
- Portfolio, alerts, and city comparison remain future product surfaces.
