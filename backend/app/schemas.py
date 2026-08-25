from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict


class CityResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    slug: str
    name: str
    state: str
    source_url: str
    has_data: bool = False
    latest_timestamp: datetime | None = None


class PriceMetric(BaseModel):
    current: float | None
    previous: float | None
    change: float | None
    change_percent: float | None


class RatesResponse(BaseModel):
    city: str
    state: str
    source: str
    source_note: str | None = None
    timestamp: datetime | None
    freshness: str
    metrics: dict[str, PriceMetric]
    product_labels: dict[str, str]


class SummaryResponse(BaseModel):
    city: str
    source: str
    source_note: str | None = None
    timestamp: datetime | None
    freshness: str
    current_rate: float | None
    daily_high: float | None
    daily_low: float | None
    daily_movement: float | None
    daily_movement_percent: float | None
    snapshot_count: int


class TrendResponse(BaseModel):
    label: str
    score: float | None
    description: str


class MomentumResponse(BaseModel):
    gold_change: float | None
    gold_change_percent: float | None
    silver_change: float | None
    silver_change_percent: float | None


class VolatilityResponse(BaseModel):
    gold_percent: float | None
    silver_percent: float | None
    window_points: int


class ForecastResponse(BaseModel):
    horizon: str
    gold_24k_10g: float
    lower_bound: float
    upper_bound: float
    confidence: str
    gold_999_with_gst_10g: float | None = None
    gold_999_with_gst_lower_bound: float | None = None
    gold_999_with_gst_upper_bound: float | None = None


class IntelligenceResponse(BaseModel):
    city: str
    source: str
    source_note: str
    status: str
    generated_at: datetime
    data_points: int
    trend: TrendResponse
    momentum: MomentumResponse
    volatility: VolatilityResponse
    forecast: ForecastResponse | None
    summary: str
    method: str


class HistoryPoint(BaseModel):
    timestamp: datetime
    gold_24k_10g: float
    gold_22k_10g: float
    silver_999_kg: float


class HistoryResponse(BaseModel):
    city: str
    range: str
    source: str
    source_note: str | None = None
    points: list[HistoryPoint]
    enough_data: bool
    message: str | None = None


class HealthResponse(BaseModel):
    status: str
    database: str
    scheduler: str
    last_run: dict[str, Any] | None = None
    data: dict[str, Any]
