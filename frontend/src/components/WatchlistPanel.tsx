import { useEffect, useRef, useState } from 'react'
import { BellRing, Check, Plus, Trash2 } from 'lucide-react'
import type { City, RatesResponse } from '../types'
import { api } from '../services/api'
import { formatINR, formatSignedPercent } from '../utils/format'

type Props = { cities: City[]; selectedCity: string; rates: RatesResponse | null; onCity: (slug: string) => void }
type AlertMetric = 'gold_24k_10g' | 'gold_999_with_gst'
type AlertConfig = { enabled: boolean; metric: AlertMetric; direction: 'above' | 'below'; value: number }

const defaultWatchlist = ['ahmedabad', 'delhi--delhi', 'maharashtra--mumbai']
const defaultAlert: AlertConfig = { enabled: false, metric: 'gold_24k_10g', direction: 'above', value: 0 }

export function WatchlistPanel({ cities, selectedCity, rates, onCity }: Props) {
  const [watchlist, setWatchlist] = useState<string[]>(() => readList('bullionx-watchlist', defaultWatchlist))
  const [quotes, setQuotes] = useState<Record<string, RatesResponse>>({})
  const [adding, setAdding] = useState('')
  const [alert, setAlert] = useState<AlertConfig>(() => readAlert())
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>(() => typeof Notification === 'undefined' ? 'denied' : Notification.permission)
  const notificationSent = useRef(false)

  useEffect(() => { if (!watchlist.includes(selectedCity)) setWatchlist((current) => [selectedCity, ...current].slice(0, 5)) }, [selectedCity, watchlist])
  useEffect(() => { localStorage.setItem('bullionx-watchlist', JSON.stringify(watchlist)) }, [watchlist])
  useEffect(() => { localStorage.setItem('bullionx-alert', JSON.stringify(alert)) }, [alert])
  useEffect(() => {
    let cancelled = false
    const slugs = watchlist.filter((slug) => cities.some((city) => city.slug === slug))
    void Promise.all(slugs.map(async (slug) => { try { return [slug, await api.rates(slug)] as const } catch { return [slug, null] as const } })).then((entries) => {
      if (!cancelled) setQuotes(Object.fromEntries(entries.filter((entry): entry is readonly [string, RatesResponse] => Boolean(entry[1]))))
    })
    return () => { cancelled = true }
  }, [cities, watchlist])

  const availableToAdd = cities.filter((city) => city.has_data && !watchlist.includes(city.slug))
  const selectedMetric = rates?.metrics[alert.metric]?.current ?? null
  const metricLabel = alert.metric === 'gold_999_with_gst' ? '999 gold + GST' : '24K gold'
  const triggered = alert.enabled && selectedMetric !== null && alert.value > 0 && (alert.direction === 'above' ? selectedMetric >= alert.value : selectedMetric <= alert.value)

  useEffect(() => {
    if (!triggered) { notificationSent.current = false; return }
    if (notificationSent.current || notificationPermission !== 'granted') return
    notificationSent.current = true
    new Notification(`BullionX: ${metricLabel} alert`, { body: `${rates?.city || 'Selected city'} is ${alert.direction} ₹${Math.round(alert.value).toLocaleString('en-IN')}.` })
  }, [alert.direction, alert.value, metricLabel, notificationPermission, rates?.city, triggered])

  function addCity() { if (adding) { setWatchlist((current) => [...current, adding].slice(0, 5)); setAdding('') } }

  async function toggleAlert() {
    if (!alert.enabled && typeof Notification !== 'undefined' && notificationPermission === 'default') {
      const permission = await Notification.requestPermission()
      setNotificationPermission(permission)
    }
    setAlert((current) => ({ ...current, enabled: !current.enabled }))
  }

  return <section className="panel watchlist-panel"><div className="dashboard-panel-title"><span className="section-kicker">WATCHLIST & ALERTS</span><h2>Stay ahead of a move</h2><BellRing size={17} /></div><div className="watchlist-layout"><div><p className="watchlist-subtitle">Keep the markets you check most often one click away.</p><div className="watchlist-add"><select value={adding} onChange={(event) => setAdding(event.target.value)} aria-label="Add a city to watchlist"><option value="">Add a city</option>{availableToAdd.map((city) => <option value={city.slug} key={city.slug}>{city.name}, {city.state}</option>)}</select><button onClick={addCity} disabled={!adding} aria-label="Add city"><Plus size={14} /></button></div><div className="watchlist-items">{watchlist.map((slug) => { const city = cities.find((item) => item.slug === slug); const quote = quotes[slug]; const metric = quote?.metrics.gold_24k_10g; if (!city) return null; return <div className={`watchlist-item ${selectedCity === slug ? 'selected' : ''}`} key={slug}><button onClick={() => onCity(slug)}><span className="watchlist-city-dot" /><span><strong>{city.name}</strong><small>{city.state}</small></span><b>{formatINR(metric?.current)}</b><em>{formatSignedPercent(metric?.change_percent)}</em></button><button className="watchlist-remove" onClick={() => setWatchlist((current) => current.filter((item) => item !== slug))} aria-label={`Remove ${city.name}`}><Trash2 size={13} /></button></div> })}</div></div><div className="alert-editor"><span className="section-kicker">PRICE ALERT · {rates?.city || 'SELECTED CITY'}</span><h3>Notify me when price is</h3><label className="alert-type"><span>Track</span><select value={alert.metric} onChange={(event) => setAlert((current) => ({ ...current, metric: event.target.value as AlertMetric }))}><option value="gold_24k_10g">24K gold / 10g</option><option value="gold_999_with_gst">999 gold + GST / 10g</option></select></label><div className="alert-controls"><select value={alert.direction} onChange={(event) => setAlert((current) => ({ ...current, direction: event.target.value as AlertConfig['direction'] }))}><option value="above">Above</option><option value="below">Below</option></select><input type="number" min="0" value={alert.value || ''} placeholder="Target / 10g" onChange={(event) => setAlert((current) => ({ ...current, value: Number(event.target.value) }))} /></div><button className={`alert-save ${alert.enabled ? 'enabled' : ''}`} onClick={() => void toggleAlert()}>{alert.enabled ? <><Check size={14} /> Alert active</> : <><BellRing size={14} /> Enable alert</>}</button>{alert.enabled && <span className={`alert-state ${triggered ? 'triggered' : ''}`}>{triggered ? `Target reached for ${metricLabel}.` : `Watching ${metricLabel} locally in this browser.`}{notificationPermission === 'granted' ? ' Browser notifications are on.' : notificationPermission === 'denied' ? ' Browser notifications are blocked; in-app status remains active.' : ''}</span>}</div></div></section>
}

function readList(key: string, fallback: string[]) {
  try { const value = JSON.parse(localStorage.getItem(key) || 'null'); return Array.isArray(value) ? value as string[] : fallback } catch { return fallback }
}

function readAlert(): AlertConfig {
  try { return { ...defaultAlert, ...(JSON.parse(localStorage.getItem('bullionx-alert') || 'null') || {}) } }
  catch { return defaultAlert }
}
