from __future__ import annotations

from datetime import datetime
from decimal import Decimal

from sqlalchemy import DateTime, Float, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .database import Base


class City(Base):
    __tablename__ = "cities"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    slug: Mapped[str] = mapped_column(String(80), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(120))
    state: Mapped[str] = mapped_column(String(120))
    source_url: Mapped[str] = mapped_column(String(500))
    enabled: Mapped[bool] = mapped_column(default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)

    snapshots: Mapped[list["PriceSnapshot"]] = relationship(back_populates="city_record")


class PriceSnapshot(Base):
    __tablename__ = "price_snapshots"
    __table_args__ = (UniqueConstraint("city_id", "timestamp", name="uq_city_snapshot_time"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    city_id: Mapped[int] = mapped_column(ForeignKey("cities.id"), index=True)
    city: Mapped[str] = mapped_column(String(120), index=True)
    state: Mapped[str] = mapped_column(String(120))
    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    gold_24k_10g: Mapped[Decimal] = mapped_column(Float)
    gold_22k_10g: Mapped[Decimal] = mapped_column(Float)
    silver_999_kg: Mapped[Decimal] = mapped_column(Float)
    retail_995_gold: Mapped[Decimal] = mapped_column(Float)
    rtgs_995_gold: Mapped[Decimal] = mapped_column(Float)
    gold_995_with_gst: Mapped[Decimal] = mapped_column(Float)
    retail_999_gold: Mapped[Decimal] = mapped_column(Float)
    rtgs_999_gold: Mapped[Decimal] = mapped_column(Float)
    gold_999_with_gst: Mapped[Decimal] = mapped_column(Float)
    retail_999_silver: Mapped[Decimal] = mapped_column(Float)
    rtgs_999_silver: Mapped[Decimal] = mapped_column(Float)
    silver_999_with_gst: Mapped[Decimal] = mapped_column(Float)
    source: Mapped[str] = mapped_column(String(255))

    city_record: Mapped[City] = relationship(back_populates="snapshots")


class ScraperRun(Base):
    __tablename__ = "scraper_runs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    city: Mapped[str] = mapped_column(String(120), index=True)
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    finished_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    status: Mapped[str] = mapped_column(String(40), index=True)
    records_saved: Mapped[int] = mapped_column(Integer, default=0)
    error: Mapped[str | None] = mapped_column(Text, nullable=True)


class BenchmarkSnapshot(Base):
    __tablename__ = "benchmark_snapshots"
    __table_args__ = (UniqueConstraint("timestamp", name="uq_benchmark_snapshot_time"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    gold_999_10g: Mapped[Decimal] = mapped_column(Float)
    gold_916_10g: Mapped[Decimal] = mapped_column(Float)
    silver_999_kg: Mapped[Decimal] = mapped_column(Float)
    source: Mapped[str] = mapped_column(String(255))
