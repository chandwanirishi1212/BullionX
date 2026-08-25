from __future__ import annotations

from . import state as scheduler_state
from ..database import SessionLocal
from ..config import settings
from ..services import ingest_ibja_history, run_scrape, scrape_city_batch


def scrape_ahmedabad_job() -> None:
    db = SessionLocal()
    try:
        run = run_scrape(db)
        scheduler_state.last_run = {
            "status": run.status,
            "finished_at": run.finished_at.isoformat() if run.finished_at else None,
            "records_saved": run.records_saved,
            "error": run.error,
        }
    finally:
        db.close()


def ingest_ibja_history_job() -> None:
    from . import state as scheduler_state

    db = SessionLocal()
    try:
        inserted = ingest_ibja_history(db)
        scheduler_state.last_history_run = {"status": "success", "records_saved": inserted}
    except Exception as exc:
        # Benchmark failure must never affect the AIB feed or remove existing history.
        scheduler_state.last_history_run = {"status": "failed", "records_saved": 0, "error": str(exc)[:1000]}
    finally:
        db.close()


def scrape_city_batch_job() -> None:
    db = SessionLocal()
    try:
        successes, next_offset = scrape_city_batch(db, scheduler_state.city_batch_offset, settings.city_batch_size)
        scheduler_state.city_batch_offset = next_offset
        scheduler_state.last_city_batch = {
            "status": "success",
            "successes": successes,
            "batch_size": settings.city_batch_size,
            "next_offset": next_offset,
        }
    except Exception as exc:
        scheduler_state.last_city_batch = {"status": "failed", "error": str(exc)[:1000]}
    finally:
        db.close()
