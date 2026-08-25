import { ArrowDown, ArrowUp, CalendarDays, CircleDollarSign, Clock3, Database, TrendingUp } from 'lucide-react'
import type { SummaryResponse } from '../types'
import { formatINR, formatSignedINR, formatSignedPercent, formatTimestamp } from '../utils/format'
import { FreshnessBadge } from './FreshnessBadge'

export function MarketSummary({ summary }: { summary: SummaryResponse | null }) {
  const movement = summary?.daily_movement ?? null
  return (
    <section className="panel summary-panel">
      <div className="panel-heading"><div><span className="section-kicker">SESSION SNAPSHOT</span><h2>Today's market summary</h2></div><FreshnessBadge status={summary?.freshness ?? 'UNAVAILABLE'} /></div>
      <div className="summary-main"><div className="summary-rate"><span className="muted-label">24K GOLD / 10G</span><strong>{formatINR(summary?.current_rate)}</strong><span className={`change ${movement !== null && movement < 0 ? 'negative' : 'positive'}`}>{movement !== null && movement < 0 ? <ArrowDown size={14} /> : <ArrowUp size={14} />} {formatSignedINR(movement)} <small>({formatSignedPercent(summary?.daily_movement_percent)}) today</small></span></div><div className="session-rule" /><div className="summary-meta"><div><span><TrendingUp size={14} /> High</span><strong>{formatINR(summary?.daily_high)}</strong></div><div><span><ArrowDown size={14} /> Low</span><strong>{formatINR(summary?.daily_low)}</strong></div></div></div>
      <div className="summary-details"><div><Clock3 size={15} /><span>Last updated</span><strong>{formatTimestamp(summary?.timestamp)}</strong></div><div><CalendarDays size={15} /><span>Snapshots today</span><strong>{summary?.snapshot_count ?? 0}</strong></div><div><Database size={15} /><span>Source</span><strong>{summary?.source ?? 'All India Bullion'}</strong></div></div>
      <div className="summary-note"><CircleDollarSign size={15} /> Reference metal rates only. Jewellery invoices may add making charges, wastage and GST.</div>
    </section>
  )
}

