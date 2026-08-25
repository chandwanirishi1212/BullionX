import { useEffect, useMemo, useState } from 'react'
import { ArrowDownRight, ArrowUpRight, GitCompareArrows, Minus } from 'lucide-react'
import type { City, RatesResponse } from '../types'
import { api } from '../services/api'
import { formatINR, formatSignedINR, formatSignedPercent } from '../utils/format'

type Props = { cities: City[]; selectedCity: string; onCity: (slug: string) => void }

const defaults = ['ahmedabad', 'delhi--delhi', 'maharashtra--mumbai']

export function CityComparison({ cities, selectedCity, onCity }: Props) {
  const options = useMemo(() => cities.filter((city) => city.has_data), [cities])
  const [comparison, setComparison] = useState<string[]>([selectedCity, ...defaults.filter((slug) => slug !== selectedCity)].slice(0, 3))
  const [quotes, setQuotes] = useState<Record<string, RatesResponse>>({})
  const [loading, setLoading] = useState(false)
  useEffect(() => { setComparison((current) => [selectedCity, ...current.filter((slug) => slug !== selectedCity)].slice(0, 3)) }, [selectedCity])
  useEffect(() => {
    let cancelled = false
    const validSlugs = comparison.filter((slug) => options.some((city) => city.slug === slug))
    if (!validSlugs.length) return undefined
    setLoading(true)
    void Promise.all(validSlugs.map(async (slug) => {
      try { return [slug, await api.rates(slug)] as const } catch { return [slug, null] as const }
    })).then((entries) => {
      if (!cancelled) setQuotes((current) => ({ ...current, ...Object.fromEntries(entries.filter((entry): entry is readonly [string, RatesResponse] => Boolean(entry[1]))) }))
    }).finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [comparison, options])
  const values = comparison.map((slug) => quotes[slug]?.metrics.gold_24k_10g.current ?? null).filter((value): value is number => value !== null)
  const high = Math.max(...values, 0)
  const low = values.length ? Math.min(...values) : 0
  const spread = high && low ? high - low : null
  function changeSlot(index: number, slug: string) { setComparison((current) => current.map((item, itemIndex) => itemIndex === index ? slug : item)) }
  return <section className="panel city-comparison-panel"><div className="dashboard-panel-title"><span className="section-kicker">CITY COMPARISON</span><h2>Where is the spread?</h2><GitCompareArrows size={17} /></div><p className="comparison-subtitle">Compare 24K gold across selected markets. Click a card to make it your active city.</p><div className="comparison-controls">{[0, 1, 2].map((index) => <select key={index} value={comparison[index] || ''} onChange={(event) => changeSlot(index, event.target.value)} aria-label={`Comparison city ${index + 1}`}><option value="">Choose city</option>{options.map((city) => <option value={city.slug} key={city.slug}>{city.name}, {city.state}</option>)}</select>)}</div>{loading && !values.length ? <div className="comparison-loading"><span className="loader" /> Loading city quotes</div> : <div className="comparison-grid">{comparison.map((slug) => { const city = cities.find((item) => item.slug === slug); const quote = quotes[slug]; const metric = quote?.metrics.gold_24k_10g; const value = metric?.current ?? null; const change = metric?.change_percent ?? null; const positive = (change ?? 0) > 0; const negative = (change ?? 0) < 0; return <button className={`comparison-card ${slug === selectedCity ? 'selected' : ''}`} key={slug} onClick={() => city && onCity(city.slug)}><div className="comparison-card-top"><span>{city?.name || 'Choose city'}</span>{value !== null && <span className={`comparison-move ${positive ? 'positive' : negative ? 'negative' : ''}`}>{positive ? <ArrowUpRight size={12} /> : negative ? <ArrowDownRight size={12} /> : <Minus size={12} />}{formatSignedPercent(change)}</span>}</div><strong>{formatINR(value)}</strong><div className="comparison-bar"><i style={{ width: `${value && high ? Math.max(8, (value / high) * 100) : 0}%` }} /></div><small>{city?.state || 'Add a city above'}</small></button> })}</div>}<div className="comparison-footer"><span>Market spread<strong>{formatINR(spread)}</strong></span><span>Highest reference<strong>{formatINR(high || null)}</strong></span><span>Lowest reference<strong>{formatINR(low || null)}</strong></span></div></section>
}
