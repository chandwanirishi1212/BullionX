import { Database, Download, LineChart, Table2 } from 'lucide-react'
import type { City, HistoryResponse, RatesResponse } from '../types'
import { downloadCsv } from '../utils/export'
import { CityComparison } from './CityComparison'
import { CityPulse } from './CityPulse'
import { MarketChart } from './MarketChart'
import { PriceCard } from './PriceCard'
import { RateTable } from './RateTable'

type Props = {
  cities: City[]
  selectedCity: string
  onCity: (slug: string) => void
  rates: RatesResponse | null
  history: HistoryResponse | null
  range: string
  onRange: (range: string) => void
  loading: boolean
}

export function MarketDataDashboard({ cities, selectedCity, onCity, rates, history, range, onRange, loading }: Props) {
  const liveCities = cities.filter((city) => city.has_data).length

  function exportRates() {
    if (!rates) return
    downloadCsv(`bullionx-${selectedCity}-rates.csv`, Object.entries(rates.metrics).map(([key, metric]) => ({
      city: rates.city,
      product: rates.product_labels[key] || key,
      current: metric.current,
      previous: metric.previous,
      change: metric.change,
      change_percent: metric.change_percent,
      timestamp: rates.timestamp,
      source: rates.source,
    })))
  }

  function exportHistory() {
    if (!history?.points.length) return
    downloadCsv(`bullionx-${selectedCity}-${range.toLowerCase()}-history.csv`, history.points.map((point) => ({ city: history.city, ...point, source: history.source })))
  }

  return <div className="dashboard-view market-data-view">
    <div className="dashboard-intro"><div><span className="section-kicker">DATA TERMINAL</span><h2>Every reference rate, in one place.</h2><p>Explore the selected city's live products, historical context, and source coverage.</p></div><div className="dashboard-intro-actions"><span className="dashboard-source"><Database size={14} /> {rates?.source || 'Waiting for source'}</span><div className="export-actions"><button className="export-button" onClick={exportRates} disabled={!rates}><Download size={13} /> Rates CSV</button><button className="export-button" onClick={exportHistory} disabled={!history?.points.length}><Download size={13} /> History CSV</button></div></div></div>
    <div className="coverage-strip"><div><span className="coverage-value">{cities.length || '—'}</span><small>cities catalogued</small></div><div><span className="coverage-value gold-text">{liveCities || '—'}</span><small>with AIB snapshots</small></div><div><span className="coverage-value silver-text">{cities.length ? cities.length - liveCities : '—'}</span><small>using context fallback</small></div><div><span className="coverage-value">{history?.points.length || 0}</span><small>history points shown</small></div></div>
    <section className="section-block dashboard-section"><div className="section-header"><div><span className="section-kicker">LIVE SNAPSHOT</span><h2>{rates?.city || 'Selected city'} price board</h2></div><span className="section-context"><LineChart size={14} /> Source-labelled data</span></div><div className="price-grid">{loading && !rates ? <><PriceSkeleton /><PriceSkeleton /><PriceSkeleton /><PriceSkeleton /></> : <><PriceCard label="24K GOLD" unit="/ 10g" metric={rates?.metrics.gold_24k_10g} timestamp={rates?.timestamp ?? null} freshness={rates?.freshness ?? 'UNAVAILABLE'} accent="gold" icon="Au" /><PriceCard label="22K GOLD" unit="/ 10g" metric={rates?.metrics.gold_22k_10g} timestamp={rates?.timestamp ?? null} freshness={rates?.freshness ?? 'UNAVAILABLE'} accent="amber" icon="22" /><PriceCard label="999 GOLD + GST" unit="/ 10g" metric={rates?.metrics.gold_999_with_gst} timestamp={rates?.timestamp ?? null} freshness={rates?.freshness ?? 'UNAVAILABLE'} accent="gst" icon="GST" /><PriceCard label="SILVER 999" unit="/ kg" metric={rates?.metrics.silver_999_kg} timestamp={rates?.timestamp ?? null} freshness={rates?.freshness ?? 'UNAVAILABLE'} accent="silver" icon="Ag" /></>}</div></section>
    <div className="market-data-layout"><MarketChart history={history} range={range} onRange={onRange} loading={loading} /><section className="panel data-guide-panel"><div className="dashboard-panel-title"><span className="section-kicker">HOW TO READ IT</span><h2>Data guide</h2><Table2 size={17} /></div><div className="data-guide-list"><div><span className="guide-mark gold" /><div><strong>Gold reference</strong><small>24K and 22K gold are shown per 10 grams.</small></div></div><div><span className="guide-mark gold" /><div><strong>999 gold + GST</strong><small>Tax-inclusive 999 gold reference per 10 grams.</small></div></div><div><span className="guide-mark silver" /><div><strong>Silver reference</strong><small>999 silver is shown per kilogram.</small></div></div><div><span className="guide-mark live" /><div><strong>Source status</strong><small>Green means a verified city snapshot is available.</small></div></div></div><div className="data-guide-note">{rates?.source_note || 'Rates are indicative reference values. Retail invoices may differ.'}</div></section></div>
    <RateTable rates={rates} />
    <CityComparison cities={cities} selectedCity={selectedCity} onCity={onCity} />
    <CityPulse cities={cities} selectedCity={selectedCity} onCity={onCity} />
  </div>
}

function PriceSkeleton() { return <div className="price-card skeleton-card"><div className="skeleton-line short" /><div className="skeleton-line" /><div className="skeleton-line large" /><div className="skeleton-line short" /></div> }
