from __future__ import annotations

import re
from dataclasses import dataclass
from datetime import datetime
from zoneinfo import ZoneInfo

import requests
from bs4 import BeautifulSoup


IST = ZoneInfo("Asia/Kolkata")
SOURCE_NAME = "All India Bullion"


class ScrapeError(RuntimeError):
    """Raised when an AIB response cannot be trusted as a price snapshot."""


@dataclass(frozen=True)
class ScrapedPrices:
    city: str
    state: str
    source_url: str
    timestamp: datetime
    gold_24k_10g: float
    gold_22k_10g: float
    silver_999_kg: float
    retail_995_gold: float
    rtgs_995_gold: float
    gold_995_with_gst: float
    retail_999_gold: float
    rtgs_999_gold: float
    gold_999_with_gst: float
    retail_999_silver: float
    rtgs_999_silver: float
    silver_999_with_gst: float
    source: str = SOURCE_NAME


PRICE_FIELDS = (
    "gold_24k_10g",
    "gold_22k_10g",
    "silver_999_kg",
    "retail_995_gold",
    "rtgs_995_gold",
    "gold_995_with_gst",
    "retail_999_gold",
    "rtgs_999_gold",
    "gold_999_with_gst",
    "retail_999_silver",
    "rtgs_999_silver",
    "silver_999_with_gst",
)


def _normalise_text(soup: BeautifulSoup) -> str:
    # Keep the entire rendered text in one line. Labels on AIB are split across
    # headings/spans, so a whitespace-normalised string is more stable than CSS selectors.
    return re.sub(r"\s+", " ", soup.get_text(" ", strip=True))


def _price_after(text: str, label: str, *, occurrence: int = 1) -> float:
    pattern = rf"{label}\s*[:\-]?\s*(?:₹|INR)?\s*([\d,]+(?:\.\d+)?)"
    matches = re.findall(pattern, text, flags=re.IGNORECASE)
    if len(matches) < occurrence:
        raise ScrapeError(f"Could not find price for {label}")
    raw = matches[occurrence - 1].replace(",", "")
    value = float(raw)
    if value <= 0:
        raise ScrapeError(f"Invalid non-positive price for {label}")
    return value


def _timestamp_from(text: str) -> datetime:
    patterns = (
        r"(?:On|Feed update:|Rate snapshot:)\s+(\d{1,2} [A-Za-z]+ \d{4} at \d{1,2}:\d{2}(?::\d{2})? IST)",
        r"(\d{1,2} [A-Za-z]+ \d{4} at \d{1,2}:\d{2}(?::\d{2})? IST)",
    )
    for pattern in patterns:
        match = re.search(pattern, text, flags=re.IGNORECASE)
        if not match:
            continue
        value = match.group(1)
        for fmt in ("%d %B %Y at %H:%M:%S IST", "%d %B %Y at %H:%M IST"):
            try:
                return datetime.strptime(value, fmt).replace(tzinfo=IST)
            except ValueError:
                pass
    return datetime.now(IST)


def validate_prices(values: dict[str, float]) -> None:
    missing = [field for field in PRICE_FIELDS if values.get(field) is None]
    invalid = [field for field in PRICE_FIELDS if values.get(field) is not None and values[field] <= 0]
    if missing:
        raise ScrapeError(f"Missing required prices: {', '.join(missing)}")
    if invalid:
        raise ScrapeError(f"Invalid required prices: {', '.join(invalid)}")


def scrape_city(url: str, city: str, state: str, timeout: int = 20) -> ScrapedPrices:
    """Fetch one public AIB city page and return a validated real snapshot."""
    try:
        response = requests.get(
            url,
            headers={
                "User-Agent": "BullionX/1.0 (+https://allindiabullion.com; public price reader)",
                "Accept": "text/html,application/xhtml+xml",
            },
            timeout=timeout,
        )
        response.raise_for_status()
    except requests.RequestException as exc:
        raise ScrapeError(f"AIB request failed: {exc}") from exc

    soup = BeautifulSoup(response.content, "html.parser")
    text = _normalise_text(soup)
    values = {
        "gold_24k_10g": _price_after(text, r"24K Gold"),
        "gold_22k_10g": _price_after(text, r"22K Gold"),
        "silver_999_kg": _price_after(text, r"Silver", occurrence=1),
        "retail_995_gold": _price_after(text, r"RETAIL 995 GOLD"),
        "rtgs_995_gold": _price_after(text, r"RTGS 995 GOLD"),
        "gold_995_with_gst": _price_after(text, r"995 WITH GST GOLD"),
        "retail_999_gold": _price_after(text, r"RETAIL 999 GOLD"),
        "rtgs_999_gold": _price_after(text, r"RTGS 999 GOLD"),
        "gold_999_with_gst": _price_after(text, r"999 WITH GST GOLD"),
        "retail_999_silver": _price_after(text, r"RETAIL 999 SILVER"),
        "rtgs_999_silver": _price_after(text, r"RTGS 999 SILVER"),
        "silver_999_with_gst": _price_after(text, r"999 WITH GST SILVER"),
    }
    validate_prices(values)
    return ScrapedPrices(
        city=city,
        state=state,
        source_url=url,
        timestamp=_timestamp_from(text),
        **values,
    )

