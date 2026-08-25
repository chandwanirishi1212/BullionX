from __future__ import annotations

import re
import time
from dataclasses import dataclass
from urllib.parse import urljoin, urlparse

import requests
from bs4 import BeautifulSoup


AIB_BASE_URL = "https://allindiabullion.com"
AIB_DIRECTORY_URL = f"{AIB_BASE_URL}/gold-rate"


@dataclass(frozen=True)
class DiscoveredCity:
    slug: str
    name: str
    state: str
    source_url: str


def _label(slug: str) -> str:
    return re.sub(r"\s+", " ", slug.replace("-", " ")).strip().title()


def _city_from_href(href: str) -> DiscoveredCity | None:
    path = urlparse(href).path.strip("/").split("/")
    if len(path) != 3 or path[0] != "gold-rate":
        return None
    state_slug, city_slug = path[1], path[2]
    # Keep the original Ahmedabad identifier for backwards compatibility;
    # namespace every other city so names such as Hyderabad can coexist.
    public_slug = "ahmedabad" if (state_slug, city_slug) == ("gujarat", "ahmedabad") else f"{state_slug}--{city_slug}"
    return DiscoveredCity(
        slug=public_slug,
        name=_label(city_slug),
        state=_label(state_slug),
        source_url=urljoin(AIB_BASE_URL, "/".join(path)),
    )


def _links_from_html(html: bytes | str) -> list[DiscoveredCity]:
    soup = BeautifulSoup(html, "html.parser")
    cities: dict[tuple[str, str], DiscoveredCity] = {}
    for anchor in soup.select("a[href]"):
        city = _city_from_href(anchor.get("href", ""))
        if city:
            state_slug = city.source_url.rstrip("/").split("/")[-2]
            cities[(state_slug, city.slug)] = city
    return list(cities.values())


def discover_aib_cities(
    directory_url: str = AIB_DIRECTORY_URL,
    timeout: int = 20,
    delay_seconds: float = 0.25,
) -> list[DiscoveredCity]:
    """Discover every city URL from AIB's public sitemap index.

    Sitemap XML is the canonical catalog and avoids crawling all city pages
    just to discover their URLs. Only the sitemap index and state sitemaps are
    requested here; price pages are fetched separately by the controlled sync.
    """
    session = requests.Session()
    headers = {"User-Agent": "BullionX/1.0 (public city catalog reader)", "Accept": "application/xml,text/xml"}
    sitemap_url = urljoin(directory_url, "/sitemap.xml")
    index_response = session.get(sitemap_url, headers=headers, timeout=timeout)
    index_response.raise_for_status()
    sitemap_urls = re.findall(r"<loc>\s*(https?://[^<]+/sitemap/[^<]+\.xml)\s*</loc>", index_response.text)
    if not sitemap_urls:
        # Small fallback for deployments where the sitemap index is unavailable.
        directory_response = session.get(directory_url, headers={**headers, "Accept": "text/html"}, timeout=timeout)
        directory_response.raise_for_status()
        return sorted(_links_from_html(directory_response.content), key=lambda city: (city.state, city.name))

    discovered: dict[tuple[str, str], DiscoveredCity] = {}
    for index, url in enumerate(sitemap_urls):
        response = session.get(url, headers=headers, timeout=timeout)
        response.raise_for_status()
        for href in re.findall(r"<loc>\s*(https?://[^<]+)\s*</loc>", response.text):
            city = _city_from_href(href)
            if not city:
                continue
            state_slug = city.source_url.rstrip("/").split("/")[-2]
            discovered[(state_slug, city.slug)] = city
        if delay_seconds and index < len(sitemap_urls) - 1:
            time.sleep(delay_seconds)
    return sorted(discovered.values(), key=lambda city: (city.state, city.name))
