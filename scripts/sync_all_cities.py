from pathlib import Path
import sys
import time

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))

from app.config import settings  # noqa: E402
from app.database import SessionLocal, init_db  # noqa: E402
from app.services import run_city_scrape, sync_city_catalog  # noqa: E402
from app.models import City  # noqa: E402
from sqlalchemy import select  # noqa: E402


if __name__ == "__main__":
    init_db()
    db = SessionLocal()
    try:
        count = sync_city_catalog(db)
        cities = list(db.scalars(select(City).where(City.enabled.is_(True)).order_by(City.state, City.name)))
        print(f"Discovered {count} AIB cities. Scraping sequentially with {settings.city_scrape_delay_seconds}s delay.")
        success = 0
        for index, city in enumerate(cities, start=1):
            run = run_city_scrape(db, city)
            success += int(run.status == "success")
            print(f"[{index}/{len(cities)}] {city.name}, {city.state}: {run.status}")
            if index < len(cities) and settings.city_scrape_delay_seconds:
                time.sleep(settings.city_scrape_delay_seconds)
        print(f"Completed city sync: {success}/{len(cities)} successful snapshots.")
    finally:
        db.close()
