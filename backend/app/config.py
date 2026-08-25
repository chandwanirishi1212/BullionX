from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path

from dotenv import load_dotenv


BACKEND_DIR = Path(__file__).resolve().parents[1]
PROJECT_DIR = BACKEND_DIR.parent
load_dotenv(BACKEND_DIR / ".env")


def _as_bool(value: str | None, default: bool = False) -> bool:
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


@dataclass(frozen=True)
class Settings:
    database_url: str = os.getenv("DATABASE_URL", f"sqlite:///{PROJECT_DIR / 'data' / 'bullionx.db'}")
    aib_ahmedabad_url: str = os.getenv(
        "AIB_AHMEDABAD_URL",
        "https://allindiabullion.com/gold-rate/gujarat/ahmedabad",
    )
    aib_directory_url: str = os.getenv("AIB_DIRECTORY_URL", "https://allindiabullion.com/gold-rate")
    scrape_interval_minutes: int = int(os.getenv("SCRAPE_INTERVAL_MINUTES", "60"))
    scrape_timeout_seconds: int = int(os.getenv("SCRAPE_TIMEOUT_SECONDS", "20"))
    city_scrape_delay_seconds: float = float(os.getenv("CITY_SCRAPE_DELAY_SECONDS", "0.35"))
    city_batch_size: int = int(os.getenv("CITY_BATCH_SIZE", "12"))
    enable_scheduler: bool = _as_bool(os.getenv("ENABLE_SCHEDULER"), True)
    cors_origins: tuple[str, ...] = tuple(
        origin.strip()
        for origin in os.getenv("CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173").split(",")
        if origin.strip()
    )


settings = Settings()
