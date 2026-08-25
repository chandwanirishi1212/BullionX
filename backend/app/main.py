from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import desc, func, select, text
from sqlalchemy.orm import Session

from .config import settings
from .database import SessionLocal, get_db, init_db
from .models import City, PriceSnapshot, ScraperRun
from .schemas import CityResponse, HealthResponse, HistoryResponse, IntelligenceResponse, RatesResponse, SummaryResponse
from . import scheduler
from .scheduler import state as scheduler_state
from .intelligence import get_intelligence
from .services import ensure_seed_city, get_city, get_history, get_rates, get_summary, run_city_scrape, sync_city_catalog


@asynccontextmanager
async def lifespan(_: FastAPI):
    init_db()
    db = SessionLocal()
    try:
        ensure_seed_city(db)
        try:
            sync_city_catalog(db)
        except Exception:
            # A temporary catalog outage must not stop the API or remove its last catalog.
            pass
    finally:
        db.close()
    scheduler.start_scheduler()
    yield
    scheduler.stop_scheduler()


app = FastAPI(title="BullionX API", version="0.1.0", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=list(settings.cors_origins),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def root():
    return {
        "name": "BullionX API",
        "status": "ok",
        "docs": "/docs",
        "health": "/api/health",
        "rates": "/api/rates/ahmedabad",
    }


@app.get("/api/health", response_model=HealthResponse)
def health(db: Session = Depends(get_db)):
    try:
        db.execute(text("SELECT 1"))
        database = "connected"
    except Exception:
        database = "unavailable"
    scheduler_status = "running" if settings.enable_scheduler else "disabled"
    last_run = scheduler_state.last_run or {}
    if scheduler_state.last_history_run:
        last_run = {**last_run, "ibja_history": scheduler_state.last_history_run}
    if scheduler_state.last_city_batch:
        last_run = {**last_run, "city_batch": scheduler_state.last_city_batch}
    latest_snapshot = db.scalar(select(PriceSnapshot).order_by(desc(PriceSnapshot.timestamp)))
    latest_success = db.scalar(
        select(ScraperRun).where(ScraperRun.status == "success").order_by(desc(ScraperRun.finished_at))
    )
    latest_failure = db.scalar(
        select(ScraperRun).where(ScraperRun.status == "failed").order_by(desc(ScraperRun.finished_at))
    )
    city_count = db.scalar(select(func.count(City.id)).where(City.enabled.is_(True))) or 0
    live_city_count = db.scalar(select(func.count(func.distinct(PriceSnapshot.city_id)))) or 0
    return {
        "status": "ok" if database == "connected" else "degraded",
        "database": database,
        "scheduler": scheduler_status,
        "last_run": last_run or None,
        "data": {
            "latest_snapshot": latest_snapshot.timestamp if latest_snapshot else None,
            "latest_source": latest_snapshot.source if latest_snapshot else None,
            "cities_configured": city_count,
            "cities_with_snapshots": live_city_count,
            "last_success": latest_success.finished_at if latest_success else None,
            "last_failure": {
                "finished_at": latest_failure.finished_at,
                "error": latest_failure.error,
            } if latest_failure else None,
        },
    }


@app.get("/api/cities", response_model=list[CityResponse])
def cities(db: Session = Depends(get_db)):
    ensure_seed_city(db)
    city_rows = list(db.scalars(select(City).where(City.enabled.is_(True)).order_by(City.state, City.name)))
    latest_by_city: dict[int, PriceSnapshot] = {}
    for snapshot in db.scalars(select(PriceSnapshot).order_by(desc(PriceSnapshot.timestamp))):
        latest_by_city.setdefault(snapshot.city_id, snapshot)
    return [
        {
            "slug": city.slug,
            "name": city.name,
            "state": city.state,
            "source_url": city.source_url,
            "has_data": city.id in latest_by_city,
            "latest_timestamp": latest_by_city[city.id].timestamp if city.id in latest_by_city else None,
        }
        for city in city_rows
    ]


@app.get("/api/rates/{city_slug}", response_model=RatesResponse)
def rates(city_slug: str, db: Session = Depends(get_db)):
    if not get_city(db, city_slug):
        raise HTTPException(status_code=404, detail="City is not configured")
    return get_rates(db, city_slug)


@app.get("/api/history/{city_slug}", response_model=HistoryResponse)
def history(city_slug: str, range: str = Query("1D", pattern="^(1H|6H|1D|1W|1M|3M|6M|1Y)$"), db: Session = Depends(get_db)):
    if not get_city(db, city_slug):
        raise HTTPException(status_code=404, detail="City is not configured")
    return get_history(db, city_slug, range)


@app.get("/api/summary/{city_slug}", response_model=SummaryResponse)
def summary(city_slug: str, db: Session = Depends(get_db)):
    if not get_city(db, city_slug):
        raise HTTPException(status_code=404, detail="City is not configured")
    return get_summary(db, city_slug)


@app.get("/api/intelligence/{city_slug}", response_model=IntelligenceResponse)
def intelligence(city_slug: str, db: Session = Depends(get_db)):
    if not get_city(db, city_slug):
        raise HTTPException(status_code=404, detail="City is not configured")
    return get_intelligence(db, city_slug)


@app.post("/api/refresh/{city_slug}")
def refresh(city_slug: str, db: Session = Depends(get_db)):
    city = get_city(db, city_slug)
    if not city:
        raise HTTPException(status_code=404, detail="City is not configured")
    run = run_city_scrape(db, city)
    if run.status != "success":
        raise HTTPException(status_code=502, detail=run.error or "The city source could not be refreshed")
    return {
        "status": "success",
        "records_saved": run.records_saved,
        "finished_at": run.finished_at,
    }
