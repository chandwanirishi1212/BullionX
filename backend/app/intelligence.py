from __future__ import annotations

from datetime import datetime, timedelta
from math import sqrt
from statistics import mean, pstdev
from zoneinfo import ZoneInfo

from sqlalchemy import desc, select
from sqlalchemy.orm import Session

from .models import BenchmarkSnapshot, City, PriceSnapshot
from .services import as_ist


IST = ZoneInfo("Asia/Kolkata")
IBJA_SOURCE = "India Bullion and Jewellers Association (IBJA)"
AIB_SOURCE = "All India Bullion"
GST_RATE = 0.03


def _change_percent(current: float, previous: float) -> float | None:
    return (current - previous) / previous * 100 if previous else None


def _linear_forecast(values: list[float]) -> tuple[float, float, float]:
    x = list(range(len(values)))
    x_mean = mean(x)
    y_mean = mean(values)
    denominator = sum((item - x_mean) ** 2 for item in x)
    slope = sum((item - x_mean) * (value - y_mean) for item, value in zip(x, values)) / denominator if denominator else 0
    intercept = y_mean - slope * x_mean
    predicted = intercept + slope * len(values)
    residuals = [value - (intercept + slope * item) for item, value in zip(x, values)]
    residual_std = sqrt(mean([residual * residual for residual in residuals])) if residuals else 0
    return predicted, slope, residual_std


def _trend(values: list[float]) -> tuple[str, float, str]:
    predicted, slope, _ = _linear_forecast(values)
    baseline = mean(values) or 1
    score = max(-100.0, min(100.0, slope / baseline * 1000))
    if score > 0.18:
        label = "Bullish"
        description = "The observed series is rising across the selected window."
    elif score < -0.18:
        label = "Bearish"
        description = "The observed series is falling across the selected window."
    else:
        label = "Neutral"
        description = "The observed series is broadly range-bound across the selected window."
    return label, score, description


def get_intelligence(db: Session, slug: str) -> dict:
    city = db.scalar(select(City).where(City.slug == slug))
    if not city:
        return {"city": "Unknown", "status": "UNAVAILABLE"}

    since = datetime.now(IST) - timedelta(days=365)
    aib_points = list(
        db.scalars(
            select(PriceSnapshot)
            .where(PriceSnapshot.city_id == city.id, PriceSnapshot.timestamp >= since)
            .order_by(PriceSnapshot.timestamp)
        )
    )
    source = AIB_SOURCE
    source_note = "Calculated from city snapshots published by All India Bullion." if len(aib_points) >= 3 else "Using national IBJA benchmark history until this city has enough AIB snapshots; 999 gold + GST is derived at 3%."
    if len(aib_points) >= 3:
        points = [(
            as_ist(item.timestamp),
            float(item.gold_24k_10g),
            float(item.silver_999_kg),
            float(item.gold_999_with_gst),
        ) for item in aib_points]
    else:
        benchmark_points = list(
            db.scalars(select(BenchmarkSnapshot).where(BenchmarkSnapshot.timestamp >= since).order_by(BenchmarkSnapshot.timestamp))
        )
        points = [(
            as_ist(item.timestamp),
            float(item.gold_999_10g),
            float(item.silver_999_kg),
            float(item.gold_999_10g) * (1 + GST_RATE),
        ) for item in benchmark_points]
        source = IBJA_SOURCE

    if len(points) < 3:
        return {
            "city": city.name,
            "source": source,
            "source_note": source_note,
            "status": "INSUFFICIENT_DATA",
            "generated_at": datetime.now(IST),
            "data_points": len(points),
            "trend": {"label": "Unavailable", "score": None, "description": "Not enough historical data for a reliable market signal."},
            "momentum": {"gold_change": None, "gold_change_percent": None, "silver_change": None, "silver_change_percent": None},
            "volatility": {"gold_percent": None, "silver_percent": None, "window_points": len(points)},
            "forecast": None,
            "summary": "Not enough historical data for a reliable forecast.",
            "method": "Transparent statistical analysis; no generated prediction is shown without enough observations.",
        }

    gold = [point[1] for point in points]
    silver = [point[2] for point in points]
    gold_999_with_gst = [point[3] for point in points]
    gold_returns = [(gold[index] / gold[index - 1] - 1) * 100 for index in range(1, len(gold)) if gold[index - 1]]
    silver_returns = [(silver[index] / silver[index - 1] - 1) * 100 for index in range(1, len(silver)) if silver[index - 1]]
    gold_999_with_gst_returns = [
        (gold_999_with_gst[index] / gold_999_with_gst[index - 1] - 1) * 100
        for index in range(1, len(gold_999_with_gst))
        if gold_999_with_gst[index - 1]
    ]
    trend_label, trend_score, trend_description = _trend(gold)
    gold_forecast, _, gold_residual = _linear_forecast(gold)
    margin = max(gold_residual * 1.96, abs(gold_forecast) * (pstdev(gold_returns) / 100 if len(gold_returns) > 1 else 0.005))
    gold_999_with_gst_forecast, _, gold_999_with_gst_residual = _linear_forecast(gold_999_with_gst)
    gold_999_with_gst_margin = max(
        gold_999_with_gst_residual * 1.96,
        abs(gold_999_with_gst_forecast) * (
            pstdev(gold_999_with_gst_returns) / 100 if len(gold_999_with_gst_returns) > 1 else 0.005
        ),
    )
    confidence = "low" if len(points) < 5 else "medium" if len(points) < 12 else "high"
    return {
        "city": city.name,
        "source": source,
        "source_note": source_note,
        "status": "READY",
        "generated_at": datetime.now(IST),
        "data_points": len(points),
        "trend": {"label": trend_label, "score": round(trend_score, 3), "description": trend_description},
        "momentum": {
            "gold_change": gold[-1] - gold[-2],
            "gold_change_percent": _change_percent(gold[-1], gold[-2]),
            "silver_change": silver[-1] - silver[-2],
            "silver_change_percent": _change_percent(silver[-1], silver[-2]),
        },
        "volatility": {
            "gold_percent": pstdev(gold_returns) if len(gold_returns) > 1 else 0.0,
            "silver_percent": pstdev(silver_returns) if len(silver_returns) > 1 else 0.0,
            "window_points": len(points),
        },
        "forecast": {
            "horizon": "next daily observation",
            "gold_24k_10g": gold_forecast,
            "lower_bound": max(0.0, gold_forecast - margin),
            "upper_bound": gold_forecast + margin,
            "confidence": confidence,
            "gold_999_with_gst_10g": gold_999_with_gst_forecast,
            "gold_999_with_gst_lower_bound": max(0.0, gold_999_with_gst_forecast - gold_999_with_gst_margin),
            "gold_999_with_gst_upper_bound": gold_999_with_gst_forecast + gold_999_with_gst_margin,
        },
        "summary": f"{city.name} gold is {trend_label.lower()} across {len(points)} observed points. {trend_description}",
        "method": "Transparent linear trend, return momentum, and realized volatility; this is an indicative model, not financial advice.",
    }
