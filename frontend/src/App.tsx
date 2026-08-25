import { useCallback, useEffect, useState } from 'react'
import { AlertTriangle, ArrowRight, MapPin, ShieldCheck } from 'lucide-react'
import { Calculators } from './components/Calculators'
import { CityPulse } from './components/CityPulse'
import { InsightsDashboard } from './components/InsightsDashboard'
import { InsightCard } from './components/InsightCard'
import { MarketChart } from './components/MarketChart'
import { MarketDataDashboard } from './components/MarketDataDashboard'
import { MarketSummary } from './components/MarketSummary'
import { PortfolioDashboard } from './components/PortfolioDashboard'
import { PriceCard } from './components/PriceCard'
import { RateTable } from './components/RateTable'
import { Sidebar } from './components/Sidebar'
import { Topbar } from './components/Topbar'
import { WatchlistPanel } from './components/WatchlistPanel'
import type { City, HealthResponse, HistoryResponse, IntelligenceResponse, RatesResponse, SummaryResponse } from './types'
import { api } from './services/api'
import { formatTimestamp } from './utils/format'

type AppView = 'overview' | 'market' | 'calculators' | 'portfolio' | 'insights'
const validViews: AppView[] = ['overview', 'market', 'calculators', 'portfolio', 'insights']

function App() {
  const [cities, setCities] = useState<City[]>([])
  const [selectedCity, setSelectedCity] = useState(() => new URLSearchParams(window.location.search).get('city') || localStorage.getItem('bullionx-city') || 'ahmedabad')
  const [rates, setRates] = useState<RatesResponse | null>(null)
  const [summary, setSummary] = useState<SummaryResponse | null>(null)
  const [history, setHistory] = useState<HistoryResponse | null>(null)
  const [intelligence, setIntelligence] = useState<IntelligenceResponse | null>(null)
  const [health, setHealth] = useState<HealthResponse | null>(null)
  const [range, setRange] = useState('1M')
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')
  const [menuOpen, setMenuOpen] = useState(false)
  const [dark, setDark] = useState(() => {
    const savedTheme = localStorage.getItem('bullionx-theme-mode')
    return savedTheme ? savedTheme === 'midnight' : true
  })
  const [activeView, setActiveView] = useState<AppView>(() => {
    const savedView = localStorage.getItem('bullionx-view') as AppView | null
    return savedView && validViews.includes(savedView) ? savedView : 'overview'
  })

  const loadMarket = useCallback(async (showRefresh = false) => {
    setLoading(true)
    if (showRefresh) setRefreshing(true)
    setError('')
    try {
      void api.health().then(setHealth).catch(() => setHealth(null))
      const nextCities = await api.cities()
      setCities(nextCities)
      const city = nextCities.some((item) => item.slug === selectedCity) ? selectedCity : 'ahmedabad'
      if (city !== selectedCity) {
        setSelectedCity(city)
        localStorage.setItem('bullionx-city', city)
        syncCityUrl(city)
      }
      if (showRefresh) await api.refresh(city)
      const [ratesResult, summaryResult, historyResult, intelligenceResult] = await Promise.allSettled([
        api.rates(city), api.summary(city), api.history(range, city), api.intelligence(city),
      ])
      if (ratesResult.status === 'rejected') throw ratesResult.reason
      setRates(ratesResult.value)
      if (summaryResult.status === 'fulfilled') setSummary(summaryResult.value)
      if (historyResult.status === 'fulfilled') setHistory(historyResult.value)
      if (intelligenceResult.status === 'fulfilled') setIntelligence(intelligenceResult.value)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to reach the BullionX API.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [range, selectedCity])

  useEffect(() => { void loadMarket() }, [loadMarket])
  useEffect(() => {
    const refreshTimer = window.setInterval(() => {
      if (document.visibilityState === 'visible') void loadMarket()
    }, 5 * 60 * 1000)
    return () => window.clearInterval(refreshTimer)
  }, [loadMarket])
  useEffect(() => {
    document.documentElement.dataset.theme = dark ? 'dark' : 'light'
    localStorage.setItem('bullionx-theme-mode', dark ? 'midnight' : 'day')
  }, [dark])

  function changeCity(city: string) {
    runViewTransition(() => {
      setSelectedCity(city)
      localStorage.setItem('bullionx-city', city)
      syncCityUrl(city)
      setMenuOpen(false)
    })
  }

  function navigate(view: string) {
    if (!validViews.includes(view as AppView)) return
    runViewTransition(() => {
      setActiveView(view as AppView)
      localStorage.setItem('bullionx-view', view)
      setMenuOpen(false)
    })
  }

  const unavailable = Boolean(error && !rates)
  const sourceTimestamp = rates?.timestamp ?? summary?.timestamp
  const selected = cities.find((city) => city.slug === selectedCity)
  const displayedCity = rates?.city || selected?.name || 'Ahmedabad'
  const displayedState = rates?.state || selected?.state || 'Gujarat'
  const pageCopy = {
    overview: { eyebrow: 'MARKET OVERVIEW', title: <>Good evening, <span>{displayedCity}.</span></>, description: 'Track the pulse of your local bullion market.' },
    market: { eyebrow: 'MARKET DATA', title: <>The market, <span>unfiltered.</span></>, description: 'Compare products, history, and source coverage for {city}.' },
    calculators: { eyebrow: 'CALCULATORS', title: <>Make the rate <span>actionable.</span></>, description: 'Estimate your next purchase using the latest {city} reference rate.' },
    portfolio: { eyebrow: 'PORTFOLIO', title: <>Your metals, <span>your view.</span></>, description: 'Keep a private local view of your holdings.' },
    insights: { eyebrow: 'AI INSIGHTS', title: <>Signal <span>over noise.</span></>, description: 'Understand the observed trend before forming an opinion.' },
  }[activeView]
  const description = pageCopy.description.replace('{city}', displayedCity)

  return <div className="app-shell">
    <Sidebar open={menuOpen} cities={cities} selectedCity={selectedCity} onCity={changeCity} activeView={activeView} onNavigate={navigate} />
    {menuOpen && <div className="mobile-overlay" onClick={() => setMenuOpen(false)} />}
    <main className="main-content">
      <Topbar dark={dark} refreshing={refreshing} loading={loading} onTheme={() => setDark((value) => !value)} onRefresh={() => void loadMarket(true)} onMenu={() => setMenuOpen(true)} />
      <div className={`page-body ${loading ? 'is-refreshing' : ''}`}>
        <section className="hero-row workspace-hero"><div><div className="breadcrumb"><MapPin size={13} /> India <ArrowRight size={12} /> {displayedState} <ArrowRight size={12} /> <strong>{displayedCity}</strong></div><span className="section-kicker">{pageCopy.eyebrow}</span><h1>{pageCopy.title}</h1><p>{description}</p></div><div className="hero-meta"><div className="verified"><ShieldCheck size={16} /><span>{health?.status === 'degraded' ? 'Feed needs attention' : 'Verified reference feed'}<small>{rates?.source || health?.data.latest_source || 'All India Bullion'}</small></span></div><div className="hero-updated">As of {formatTimestamp(sourceTimestamp)}</div></div></section>
        {error && <div className="error-banner"><AlertTriangle size={17} /><span>{unavailable ? 'The BullionX API is unavailable. Start the backend to load live city prices.' : error}</span><button onClick={() => void loadMarket(true)}>Retry</button></div>}

        {activeView === 'overview' && <OverviewDashboard cities={cities} selectedCity={selectedCity} onCity={changeCity} rates={rates} summary={summary} history={history} intelligence={intelligence} range={range} onRange={setRange} loading={loading} />}
        {activeView === 'market' && <MarketDataDashboard cities={cities} selectedCity={selectedCity} onCity={changeCity} rates={rates} history={history} range={range} onRange={setRange} loading={loading} />}
        {activeView === 'calculators' && <div className="dashboard-view calculators-view"><div className="calculator-context"><span className="context-symbol">Au</span><div><strong>{displayedCity} 24K reference</strong><small>{formatTimestamp(rates?.timestamp)} · {rates?.source || 'Waiting for source'}</small></div><b>{rates?.metrics.gold_24k_10g.current ? `₹${Math.round(rates.metrics.gold_24k_10g.current).toLocaleString('en-IN')}` : 'Unavailable'}</b></div><Calculators gold24k={rates?.metrics.gold_24k_10g.current ?? null} /></div>}
        {activeView === 'portfolio' && <PortfolioDashboard rates={rates} />}
        {activeView === 'insights' && <InsightsDashboard intelligence={intelligence} rates={rates} loading={loading} />}

        <footer className="page-footer"><span>Copyright 2026 BullionX</span><span>Data sourced from All India Bullion and IBJA - indicative reference rates only</span><span className={`footer-status ${health?.status === 'degraded' ? 'is-degraded' : ''}`}><i /> {health?.status === 'degraded' ? 'Data needs attention' : health ? 'Systems operational' : 'Checking systems'}</span></footer>
      </div>
    </main>
  </div>
}

function syncCityUrl(city: string) {
  const url = new URL(window.location.href)
  url.searchParams.set('city', city)
  window.history.replaceState({}, '', url)
}

function runViewTransition(update: () => void) {
  const transitionDocument = document as Document & { startViewTransition?: (callback: () => void) => unknown }
  if (transitionDocument.startViewTransition) transitionDocument.startViewTransition(update)
  else update()
}

type OverviewProps = { cities: City[]; selectedCity: string; onCity: (slug: string) => void; rates: RatesResponse | null; summary: SummaryResponse | null; history: HistoryResponse | null; intelligence: IntelligenceResponse | null; range: string; onRange: (range: string) => void; loading: boolean }

function OverviewDashboard({ cities, selectedCity, onCity, rates, summary, history, intelligence, range, onRange, loading }: OverviewProps) {
  return <div className="dashboard-view overview-view">
    <section className="section-block"><div className="section-header"><div><span className="section-kicker">LIVE PRICES</span><h2>{rates?.city || 'Selected city'} rates</h2></div></div><div className="price-grid">{loading && !rates ? <><PriceSkeleton /><PriceSkeleton /><PriceSkeleton /><PriceSkeleton /></> : <><PriceCard label="24K GOLD" unit="/ 10g" metric={rates?.metrics.gold_24k_10g} timestamp={rates?.timestamp ?? null} freshness={rates?.freshness ?? 'UNAVAILABLE'} accent="gold" icon="Au" /><PriceCard label="22K GOLD" unit="/ 10g" metric={rates?.metrics.gold_22k_10g} timestamp={rates?.timestamp ?? null} freshness={rates?.freshness ?? 'UNAVAILABLE'} accent="amber" icon="22" /><PriceCard label="999 GOLD + GST" unit="/ 10g" metric={rates?.metrics.gold_999_with_gst} timestamp={rates?.timestamp ?? null} freshness={rates?.freshness ?? 'UNAVAILABLE'} accent="gst" icon="GST" /><PriceCard label="SILVER 999" unit="/ kg" metric={rates?.metrics.silver_999_kg} timestamp={rates?.timestamp ?? null} freshness={rates?.freshness ?? 'UNAVAILABLE'} accent="silver" icon="Ag" /></>}</div></section>
    <CityPulse cities={cities} selectedCity={selectedCity} onCity={onCity} />
    <WatchlistPanel cities={cities} selectedCity={selectedCity} rates={rates} onCity={onCity} />
    <div className="two-col"><MarketSummary summary={summary} /><MarketChart history={history} range={range} onRange={onRange} loading={loading} /></div>
    <RateTable rates={rates} />
    <Calculators gold24k={rates?.metrics.gold_24k_10g.current ?? null} />
    <div className="overview-insight"><OverviewInsight intelligence={intelligence} loading={loading} /></div>
  </div>
}

function OverviewInsight({ intelligence, loading }: { intelligence: IntelligenceResponse | null; loading: boolean }) {
  return <InsightCard intelligence={intelligence} loading={loading} />
}

function PriceSkeleton() { return <div className="price-card skeleton-card"><div className="skeleton-line short" /><div className="skeleton-line" /><div className="skeleton-line large" /><div className="skeleton-line short" /></div> }

export default App
