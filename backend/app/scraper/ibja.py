from __future__ import annotations

import re
from dataclasses import dataclass
from datetime import date, datetime, time
from zoneinfo import ZoneInfo

import requests
from bs4 import BeautifulSoup


IST = ZoneInfo("Asia/Kolkata")
IBJA_SOURCE = "India Bullion and Jewellers Association (IBJA)"
IBJA_URL = "https://ibjarates.com/"


class IBJAScrapeError(RuntimeError):
    pass


@dataclass(frozen=True)
class BenchmarkPrice:
    timestamp: datetime
    gold_999_10g: float
    gold_916_10g: float
    silver_999_kg: float
    source: str = IBJA_SOURCE


def _number(value: str) -> float:
    cleaned = re.sub(r"[^0-9.]", "", value)
    parsed = float(cleaned)
    if parsed <= 0:
        raise IBJAScrapeError(f"Invalid benchmark value: {value}")
    return parsed


def _row_values(table) -> list[BenchmarkPrice]:
    points: list[BenchmarkPrice] = []
    for row in table.select("tr"):
        cells = [re.sub(r"\s+", " ", cell.get_text(" ", strip=True)) for cell in row.select("th, td")]
        if len(cells) < 8 or not re.fullmatch(r"\d{2}/\d{2}/\d{4}", cells[0]):
            continue
        try:
            day, month, year = (int(part) for part in cells[0].split("/"))
            timestamp = datetime.combine(date(year, month, day), time(18, 0), tzinfo=IST)
            points.append(BenchmarkPrice(
                timestamp=timestamp,
                gold_999_10g=_number(cells[1]),
                gold_916_10g=_number(cells[3]),
                silver_999_kg=_number(cells[6]),
            ))
        except (ValueError, IndexError) as exc:
            raise IBJAScrapeError(f"Malformed IBJA historical row: {cells}") from exc
    return points


def scrape_ibja_history(url: str = IBJA_URL, timeout: int = 20) -> list[BenchmarkPrice]:
    try:
        response = requests.get(
            url,
            headers={"User-Agent": "BullionX/1.0 (public benchmark history reader)", "Accept": "text/html"},
            timeout=timeout,
        )
        response.raise_for_status()
    except requests.RequestException as exc:
        raise IBJAScrapeError(f"IBJA request failed: {exc}") from exc

    soup = BeautifulSoup(response.content, "html.parser")
    tables = soup.select("table.table-striped")
    if not tables:
        raise IBJAScrapeError("IBJA historical tables were not found")

    # IBJA exposes separate AM and PM tables. Prefer PM/closing values when
    # both are available, then fall back to AM for holidays/partial tables.
    sessions = [_row_values(table) for table in tables[:2]]
    merged: dict[datetime, BenchmarkPrice] = {}
    for points in sessions:
        for point in points:
            merged[point.timestamp] = point
    if len(sessions) > 1:
        for point in sessions[1]:
            merged[point.timestamp] = point
    result = sorted(merged.values(), key=lambda point: point.timestamp)
    if not result:
        raise IBJAScrapeError("IBJA historical tables contained no dated rows")
    return result

