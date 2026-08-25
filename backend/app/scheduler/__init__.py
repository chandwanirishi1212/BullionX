from apscheduler.schedulers.background import BackgroundScheduler

from ..config import settings


scheduler = BackgroundScheduler(timezone="Asia/Kolkata")


def start_scheduler() -> None:
    if scheduler.running or not settings.enable_scheduler:
        return
    from .jobs import ingest_ibja_history_job, scrape_ahmedabad_job, scrape_city_batch_job

    scheduler.add_job(
        scrape_ahmedabad_job,
        "interval",
        minutes=max(1, settings.scrape_interval_minutes),
        id="aib-ahmedabad",
        replace_existing=True,
        coalesce=True,
        max_instances=1,
    )
    scheduler.add_job(
        ingest_ibja_history_job,
        "interval",
        hours=24,
        id="ibja-history",
        replace_existing=True,
        coalesce=True,
        max_instances=1,
    )
    scheduler.add_job(
        scrape_city_batch_job,
        "interval",
        minutes=max(5, settings.scrape_interval_minutes),
        id="aib-city-batch",
        replace_existing=True,
        coalesce=True,
        max_instances=1,
    )
    scheduler.start()
    scheduler.add_job(ingest_ibja_history_job, "date", run_date=None, id="ibja-history-initial", replace_existing=True)


def stop_scheduler() -> None:
    if scheduler.running:
        scheduler.shutdown(wait=False)
