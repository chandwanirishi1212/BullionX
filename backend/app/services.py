from __future__ import annotations

import time as time_module
from datetime import datetime, time, timedelta
from zoneinfo import ZoneInfo

from sqlalchemy import desc, select
from sqlalchemy.orm import Session

from .config import settings
from .models import BenchmarkSnapshot, City, PriceSnapshot, ScraperRun
from .scraper.aib import PRICE_FIELDS, ScrapedPrices, scrape_city
from .scraper.catalog import discover_aib_cities
from .scraper.ibja import scrape_ibja_history


IST = ZoneInfo("Asia/Kolkata")
SOURCE = "All India Bullion"
BENCHMARK_SOURCE = "India Bullion and Jewellers Association (IBJA)"
CITY_SLUG = "ahmedabad"


def as_ist(timestamp: datetime | None) -> datetime | None:
    if timestamp is None:
        return None
    return (timestamp.replace(tzinfo=IST) if timestamp.tzinfo is None else timestamp).astimezone(IST)


def ensure_seed_city(db: Session) -> City:
    city = db.scalar(select(City).where(City.slug == CITY_SLUG))
    if city:
        return city
    city = City(
        slug=CITY_SLUG,
        name="Ahmedabad",
        state="Gujarat",
        source_url=settings.aib_ahmedabad_url,
        enabled=True,
    )
    db.add(city)
    db.commit()
    db.refresh(city)
    return city


def sync_city_catalog(db: Session) -> int:
    """Discover and upsert all city URLs AIB publishes."""
    discovered = discover_aib_cities(
        settings.aib_directory_url,
        timeout=settings.scrape_timeout_seconds,
        delay_seconds=settings.city_scrape_delay_seconds,
    )
    for item in discovered:
        city = db.scalar(select(City).where(City.slug == item.slug))
        if city is None:
            city = City(slug=item.slug, name=item.name, state=item.state, source_url=item.source_url, enabled=True)
            db.add(city)
        else:
            city.name = item.name
            city.state = item.state
            city.source_url = item.source_url
            city.enabled = True
    db.commit()
    return len(discovered)


def _snapshot_kwargs(city: City, scraped: ScrapedPrices) -> dict:
    return {
        "city_id": city.id,
        "city": scraped.city,
        "state": scraped.state,
        "timestamp": scraped.timestamp,
        "source": scraped.source,
        **{field: getattr(scraped, field) for field in PRICE_FIELDS},
    }


def run_city_scrape(db: Session, city: City) -> ScraperRun:
    run = ScraperRun(city=city.name, status="running", started_at=datetime.now(IST))
    db.add(run)
    db.commit()
    try:
        scraped = scrape_city(city.source_url, city.name, city.state, settings.scrape_timeout_seconds)
        existing = db.scalar(
            select(PriceSnapshot).where(
                PriceSnapshot.city_id == city.id,
                PriceSnapshot.timestamp == scraped.timestamp,
            )
        )
        if not existing:
            db.add(PriceSnapshot(**_snapshot_kwargs(city, scraped)))
            run.records_saved = 1
        run.status = "success"
        run.finished_at = datetime.now(IST)
        run.error = None
        db.commit()
    except Exception as exc:  # preserve the last valid snapshot on all scrape errors
        db.rollback()
        run = db.get(ScraperRun, run.id) or run
        run.status = "failed"
        run.finished_at = datetime.now(IST)
        run.error = str(exc)[:2000]
        run.records_saved = 0
        db.add(run)
        db.commit()
    return run


def run_scrape(db: Session) -> ScraperRun:
    return run_city_scrape(db, ensure_seed_city(db))


def scrape_city_batch(db: Session, offset: int, batch_size: int) -> tuple[int, int]:
    cities = list(
        db.scalars(
            select(City)
            .where(City.enabled.is_(True))
            .order_by(City.id)
            .offset(offset)
            .limit(batch_size)
        )
    )
    if not cities:
        return 0, 0
    successes = 0
    for index, city in enumerate(cities):
        run = run_city_scrape(db, city)
        successes += int(run.status == "success")
        if settings.city_scrape_delay_seconds and index < len(cities) - 1:
            time_module.sleep(settings.city_scrape_delay_seconds)
    next_offset = offset + len(cities)
    return successes, (0 if next_offset >= offset + len(cities) and len(cities) < batch_size else next_offset)


def ingest_ibja_history(db: Session) -> int:
    """Import public IBJA daily closing benchmarks without touching AIB city snapshots."""
    points = scrape_ibja_history(timeout=settings.scrape_timeout_seconds)
    inserted = 0
    for point in points:
        exists = db.scalar(select(BenchmarkSnapshot).where(BenchmarkSnapshot.timestamp == point.timestamp))
        if exists:
            continue
        db.add(BenchmarkSnapshot(
            timestamp=point.timestamp,
            gold_999_10g=point.gold_999_10g,
            gold_916_10g=point.gold_916_10g,
            silver_999_kg=point.silver_999_kg,
            source=point.source,
        ))
        inserted += 1
    db.commit()
    return inserted


def freshness(timestamp: datetime | None) -> str:
    if timestamp is None:
        return "UNAVAILABLE"
    current = timestamp if timestamp.tzinfo else timestamp.replace(tzinfo=IST)
    age = datetime.now(IST) - current.astimezone(IST)
    if age <= timedelta(minutes=30):
        return "LIVE"
    if age <= timedelta(hours=2):
        return "RECENT"
    return "STALE"


def latest_snapshots(db: Session, city_id: int, limit: int = 2) -> list[PriceSnapshot]:
    return list(
        db.scalars(
            select(PriceSnapshot)
            .where(PriceSnapshot.city_id == city_id)
            .order_by(desc(PriceSnapshot.timestamp))
            .limit(limit)
        )
    )


def metric(current: PriceSnapshot | None, previous: PriceSnapshot | None, field: str) -> dict:
    current_value = float(getattr(current, field)) if current else None
    previous_value = float(getattr(previous, field)) if previous else None
    change = current_value - previous_value if current_value is not None and previous_value is not None else None
    percent = (change / previous_value * 100) if change is not None and previous_value else None
    return {
        "current": current_value,
        "previous": previous_value,
        "change": change,
        "change_percent": percent,
    }


def benchmark_metric(current: BenchmarkSnapshot | None, previous: BenchmarkSnapshot | None, field: str) -> dict:
    benchmark_fields = {
        "gold_24k_10g": "gold_999_10g",
        "gold_22k_10g": "gold_916_10g",
        "silver_999_kg": "silver_999_kg",
    }
    benchmark_field = benchmark_fields.get(field)
    current_value = float(getattr(current, benchmark_field)) if current and benchmark_field else None
    previous_value = float(getattr(previous, benchmark_field)) if previous and benchmark_field else None
    change = current_value - previous_value if current_value is not None and previous_value is not None else None
    percent = (change / previous_value * 100) if change is not None and previous_value else None
    return {"current": current_value, "previous": previous_value, "change": change, "change_percent": percent}


def get_city(db: Session, slug: str = CITY_SLUG) -> City | None:
    return db.scalar(select(City).where(City.slug == slug))


def get_rates(db: Session, slug: str = CITY_SLUG) -> dict:
    city = get_city(db, slug)
    snapshots = latest_snapshots(db, city.id) if city else []
    current, previous = (snapshots + [None, None])[:2]
    labels = {
        "gold_24k_10g": "24K Gold / 10g",
        "gold_22k_10g": "22K Gold / 10g",
        "silver_999_kg": "Silver 999 / kg",
        "retail_995_gold": "Retail 995 Gold",
        "rtgs_995_gold": "RTGS 995 Gold",
        "gold_995_with_gst": "995 Gold with GST",
        "retail_999_gold": "Retail 999 Gold",
        "rtgs_999_gold": "RTGS 999 Gold",
        "gold_999_with_gst": "999 Gold with GST",
        "retail_999_silver": "Retail 999 Silver",
        "rtgs_999_silver": "RTGS 999 Silver",
        "silver_999_with_gst": "999 Silver with GST",
    }
    source = current.source if current else SOURCE
    source_note = f"{city.name if city else 'City'} snapshots from All India Bullion."
    if current is None:
        benchmarks = list(db.scalars(select(BenchmarkSnapshot).order_by(desc(BenchmarkSnapshot.timestamp)).limit(2)))
        benchmark_current, benchmark_previous = (benchmarks + [None, None])[:2]
        if benchmark_current is not None:
            source = BENCHMARK_SOURCE
            source_note = f"No verified AIB snapshot for {city.name if city else 'this city'}; showing national IBJA context, not a city retail rate."
            current_timestamp = benchmark_current.timestamp
            metrics = {field: benchmark_metric(benchmark_current, benchmark_previous, field) for field in PRICE_FIELDS}
        else:
            current_timestamp = None
            metrics = {field: metric(current, previous, field) for field in PRICE_FIELDS}
    else:
        current_timestamp = current.timestamp
        metrics = {field: metric(current, previous, field) for field in PRICE_FIELDS}
    return {
        "city": city.name if city else "Ahmedabad",
        "state": city.state if city else "Gujarat",
        "source": source,
        "source_note": source_note,
        "timestamp": as_ist(current_timestamp),
        "freshness": freshness(current_timestamp),
        "metrics": metrics,
        "product_labels": labels,
    }


def get_summary(db: Session, slug: str = CITY_SLUG) -> dict:
    city = get_city(db, slug)
    latest = latest_snapshots(db, city.id, 1) if city else []
    current = latest[0] if latest else None
    now_ist = datetime.now(IST)
    day_start = datetime.combine(now_ist.date(), time.min, tzinfo=IST)
    today = list(
        db.scalars(
            select(PriceSnapshot)
            .where(PriceSnapshot.city_id == city.id, PriceSnapshot.timestamp >= day_start)
            .order_by(PriceSnapshot.timestamp)
        )
    ) if city else []
    values = [float(snapshot.gold_24k_10g) for snapshot in today]
    first = values[0] if values else None
    current_rate = float(current.gold_24k_10g) if current else None
    movement = current_rate - first if current_rate is not None and first is not None else None
    if current is not None:
        return {
            "city": city.name if city else "Ahmedabad",
            "source": current.source,
            "source_note": f"{city.name if city else 'City'} snapshots from All India Bullion.",
            "timestamp": as_ist(current.timestamp),
            "freshness": freshness(current.timestamp),
            "current_rate": current_rate,
            "daily_high": max(values) if values else None,
            "daily_low": min(values) if values else None,
            "daily_movement": movement,
            "daily_movement_percent": (movement / first * 100) if movement is not None and first else None,
            "snapshot_count": len(today),
        }
    benchmarks = list(db.scalars(select(BenchmarkSnapshot).order_by(desc(BenchmarkSnapshot.timestamp)).limit(2)))
    if benchmarks:
        benchmark_current, benchmark_previous = benchmarks[0], benchmarks[1] if len(benchmarks) > 1 else None
        benchmark_rate = float(benchmark_current.gold_999_10g)
        benchmark_movement = benchmark_rate - float(benchmark_previous.gold_999_10g) if benchmark_previous else None
        return {
            "city": city.name if city else "Ahmedabad",
            "source": BENCHMARK_SOURCE,
            "source_note": f"No verified AIB snapshot for {city.name if city else 'this city'}; showing national IBJA context, not a city retail rate.",
            "timestamp": as_ist(benchmark_current.timestamp),
            "freshness": freshness(benchmark_current.timestamp),
            "current_rate": benchmark_rate,
            "daily_high": benchmark_rate,
            "daily_low": benchmark_rate,
            "daily_movement": benchmark_movement,
            "daily_movement_percent": (benchmark_movement / float(benchmark_previous.gold_999_10g) * 100) if benchmark_movement is not None else None,
            "snapshot_count": 1,
        }
    return {
        "city": city.name if city else "Ahmedabad",
        "source": current.source if current else SOURCE,
        "source_note": f"No verified snapshot is currently available for {city.name if city else 'this city'}.",
        "timestamp": None,
        "freshness": "UNAVAILABLE",
        "current_rate": current_rate,
        "daily_high": max(values) if values else None,
        "daily_low": min(values) if values else None,
        "daily_movement": movement,
        "daily_movement_percent": (movement / first * 100) if movement is not None and first else None,
        "snapshot_count": len(today),
    }


def get_history(db: Session, slug: str, range_name: str) -> dict:
    city = get_city(db, slug)
    durations = {"1H": timedelta(hours=1), "6H": timedelta(hours=6), "1D": timedelta(days=1), "1W": timedelta(days=7), "1M": timedelta(days=30), "3M": timedelta(days=90), "6M": timedelta(days=180), "1Y": timedelta(days=365)}
    range_key = range_name.upper() if range_name.upper() in durations else "1D"
    start = datetime.now(IST) - durations[range_key]
    snapshots = list(
        db.scalars(
            select(PriceSnapshot)
            .where(PriceSnapshot.city_id == city.id, PriceSnapshot.timestamp >= start)
            .order_by(PriceSnapshot.timestamp)
        )
    ) if city else []
    points = [
        {
            "timestamp": as_ist(snapshot.timestamp),
            "gold_24k_10g": float(snapshot.gold_24k_10g),
            "gold_22k_10g": float(snapshot.gold_22k_10g),
            "silver_999_kg": float(snapshot.silver_999_kg),
        }
        for snapshot in snapshots
    ]
    source = SOURCE
    source_note = f"{city.name if city else 'City'} snapshots from All India Bullion."
    # AIB remains the only source for city-level history. For longer ranges,
    # use clearly separated IBJA benchmark history so the dashboard is useful
    # before the local scheduler has collected enough snapshots.
    if len(points) < 2 and range_key in {"1W", "1M", "3M", "6M", "1Y"}:
        benchmark_snapshots = list(
            db.scalars(
                select(BenchmarkSnapshot)
                .where(BenchmarkSnapshot.timestamp >= start)
                .order_by(BenchmarkSnapshot.timestamp)
            )
        )
        if len(benchmark_snapshots) >= 2:
            points = [
                {
                    "timestamp": as_ist(snapshot.timestamp),
                    "gold_24k_10g": float(snapshot.gold_999_10g),
                    "gold_22k_10g": float(snapshot.gold_916_10g),
                    "silver_999_kg": float(snapshot.silver_999_kg),
                }
                for snapshot in benchmark_snapshots
            ]
            source = "India Bullion and Jewellers Association (IBJA)"
            source_note = f"National benchmark history; not a {city.name if city else 'city'} retail rate."
    return {
        "city": city.name if city else "Ahmedabad",
        "range": range_key,
        "source": source,
        "source_note": source_note,
        "points": points,
        "enough_data": len(points) >= 2,
        "message": None if len(points) >= 2 else "Not enough historical data yet.",
    }
