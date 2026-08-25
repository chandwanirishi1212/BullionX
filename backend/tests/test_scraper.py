import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.scraper.aib import ScrapeError, validate_prices


def test_validate_prices_rejects_missing_fields():
    with pytest.raises(ScrapeError):
        validate_prices({"gold_24k_10g": 100})


def test_validate_prices_rejects_zero_values():
    values = {field: 100.0 for field in __import__("app.scraper.aib", fromlist=["PRICE_FIELDS"]).PRICE_FIELDS}
    values["silver_999_kg"] = 0
    with pytest.raises(ScrapeError):
        validate_prices(values)
