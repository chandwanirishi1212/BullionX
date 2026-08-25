from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))

from app.database import init_db, SessionLocal  # noqa: E402
from app.services import ensure_seed_city  # noqa: E402


if __name__ == "__main__":
    init_db()
    db = SessionLocal()
    try:
        city = ensure_seed_city(db)
        print(f"Initialized BullionX database with {city.name}, {city.state}.")
    finally:
        db.close()

