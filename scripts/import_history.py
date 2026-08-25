from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))

from app.database import SessionLocal, init_db  # noqa: E402
from app.services import ingest_ibja_history  # noqa: E402


if __name__ == "__main__":
    init_db()
    db = SessionLocal()
    try:
        inserted = ingest_ibja_history(db)
        print(f"IBJA benchmark history imported; new snapshots: {inserted}")
    finally:
        db.close()
