import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react'
import type { PriceMetric, Freshness } from '../types'
import { formatINR, formatSignedINR, formatSignedPercent, formatTimestamp } from '../utils/format'
import { FreshnessBadge } from './FreshnessBadge'

type Props = { label: string; unit: string; metric?: PriceMetric; timestamp: string | null; freshness: Freshness; accent: 'gold' | 'amber' | 'silver' | 'gst'; icon: string }

export function PriceCard({ label, unit, metric, timestamp, freshness, accent, icon }: Props) {
  const change = metric?.change ?? null
  const positive = change !== null && change > 0
  const negative = change !== null && change < 0
  const Trend = positive ? ArrowUpRight : negative ? ArrowDownRight : Minus
  return (
    <article className={`price-card card-${accent}`}>
      <div className="price-card-top"><span className="metal-icon">{icon}</span><FreshnessBadge status={freshness} /></div>
      <div className="price-card-label">{label}</div>
      <div className="price-value">{formatINR(metric?.current)} <small>{unit}</small></div>
      <div className="price-card-bottom">
        <span className={`change ${positive ? 'positive' : negative ? 'negative' : ''}`}><Trend size={15} /> {formatSignedINR(change)} <small>({formatSignedPercent(metric?.change_percent)})</small></span>
        <span className="updated-mini">Updated {formatTimestamp(timestamp)}</span>
      </div>
    </article>
  )
}
