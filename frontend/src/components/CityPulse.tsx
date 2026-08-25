import { useEffect, useMemo, useState } from 'react'
import { ArrowDownRight, ArrowUpRight, Globe2, Minus, Radio } from 'lucide-react'
import type { City, RatesResponse } from '../types'
import { api } from '../services/api'
import { formatINR, formatSignedPercent } from '../utils/format'

type Props = { cities: City[]; selectedCity: string; onCity: (slug: string) => void }

const featuredSlugs = [
  'ahmedabad',
  'delhi--delhi',
  'maharashtra--mumbai',
  'west-bengal--kolkata',
  'tamil-nadu--chennai',
]

export function CityPulse({ cities, selectedCity, onCity }: Props) {
  const featuredCities = useMemo(() => {
    const slugs = [selectedCity, ...featuredSlugs]
    return slugs
      .map((slug) => cities.find((city) => city.slug === slug))
      .filter((city, index, list): city is City => Boolean(city) && list.findIndex((item) => item?.slug === city?.slug) === index)
      .slice(0, 5)
  }, [cities, selectedCity])
  const [quotes, setQuotes] = useState<Record<string, RatesResponse>>({})
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let cancelled = false
    if (!featuredCities.length) return undefined
    setLoading(true)
    void Promise.all(featuredCities.map(async (city) => {
      try {
        return [city.slug, await api.rates(city.slug)] as const
      } catch {
        return [city.slug, null] as const
      }
    })).then((entries) => {
      if (!cancelled) setQuotes(Object.fromEntries(entries.filter((entry): entry is readonly [string, RatesResponse] => Boolean(entry[1]))))
    }).finally(() => {
      if (!cancelled) setLoading(false)
    })
    return () => { cancelled = true }
  }, [featuredCities])

  return <section className="city-pulse panel">
    <div className="panel-heading city-pulse-heading"><div><span className="section-kicker">CITY PULSE</span><h2>India at a glance</h2><p>Jump between live markets without losing your place.</p></div><span className="city-pulse-count"><Globe2 size={14} /> {cities.length || 679} cities</span></div>
    <div className="city-pulse-grid">
      {!cities.length || (loading && !Object.keys(quotes).length) ? <>{[1, 2, 3, 4, 5].map((item) => <div className="city-pulse-skeleton" key={item}><span /><i /><i /></div>)}</> : featuredCities.map((city) => {
        const quote = quotes[city.slug]
        const metric = quote?.metrics.gold_24k_10g
        const change = metric?.change ?? null
        const positive = change !== null && change > 0
        const negative = change !== null && change < 0
        const Trend = positive ? ArrowUpRight : negative ? ArrowDownRight : Minus
        return <button className={`city-pulse-card ${selectedCity === city.slug ? 'selected' : ''}`} key={city.slug} onClick={() => onCity(city.slug)} aria-pressed={selectedCity === city.slug}>
          <div className="city-pulse-top"><span className="city-initial">{city.name.charAt(0)}</span><span className={`city-data-state ${city.has_data ? 'live' : 'context'}`}><i /> {city.has_data ? 'AIB live' : 'IBJA context'}</span></div>
          <span className="city-pulse-name">{city.name}</span><small>{city.state}</small>
          <strong>{formatINR(metric?.current)}</strong>
          <span className={`city-pulse-change ${positive ? 'positive' : negative ? 'negative' : ''}`}><Trend size={13} /> {formatSignedPercent(metric?.change_percent)}</span>
        </button>
      })}
    </div>
    <div className="city-pulse-footer"><span><Radio size={13} /> Live city switcher</span><small>Rates remain source-labelled and indicative.</small></div>
  </section>
}
