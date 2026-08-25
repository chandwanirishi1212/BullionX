from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))

from app.database import SessionLocal, init_db  # noqa: E402
from app.services import run_scrape  # noqa: E402


if __name__ == "__main__":
    init_db()
    db = SessionLocal()
    try:
        run = run_scrape(db)
        print(f"Ahmedabad scrape: {run.status}; records saved: {run.records_saved}")
        if run.error:
            print(f"Error: {run.error}")
        raise SystemExit(0 if run.status == "success" else 1)
    finally:
        db.close()

