import { Activity, LockKeyhole, Sparkles, TrendingDown, TrendingUp } from 'lucide-react'
import type { IntelligenceResponse } from '../types'
import { formatINR, formatSignedPercent } from '../utils/format'

type Props = { intelligence: IntelligenceResponse | null; loading: boolean }

export function InsightCard({ intelligence, loading }: Props) {
  const ready = intelligence?.status === 'READY'
  const rising = (intelligence?.trend.score ?? 0) >= 0
  const TrendIcon = rising ? TrendingUp : TrendingDown
  const forecast = intelligence?.forecast

  return <section className="insight-card"><div className="insight-glow" /><div className="insight-icon"><Sparkles size={18} /></div><div className="insight-copy"><span className="section-kicker">AI MARKET INTELLIGENCE</span><h3>{loading ? 'Reading the market tape.' : ready ? `${intelligence.city}: ${intelligence.trend.label} signal.` : 'Evidence before opinion.'}</h3><p>{loading ? 'Analysing the latest verified observations and benchmark context.' : intelligence?.summary || 'BullionX needs more verified observations before it will show a market signal.'}</p>{ready ? <><div className="insight-metrics"><div className="insight-metric"><TrendIcon size={14} /><span>Trend<strong>{intelligence.trend.label}</strong></span></div><div className="insight-metric"><Activity size={14} /><span>Gold momentum<strong>{formatSignedPercent(intelligence.momentum.gold_change_percent)}</strong></span></div><div className="insight-metric"><span>24K forecast<strong>{formatINR(forecast?.gold_24k_10g)}</strong></span></div><div className="insight-metric"><span>999 + GST<strong>{formatINR(forecast?.gold_999_with_gst_10g)}</strong></span></div><div className="insight-metric"><span>Confidence<strong>{forecast?.confidence}</strong></span></div></div><div className="insight-status"><LockKeyhole size={13} /> {intelligence.data_points} observations · {intelligence.source}</div></> : <div className="insight-status"><LockKeyhole size={13} /> {intelligence?.source_note || 'Not enough historical data for a reliable forecast.'}</div>}<small className="insight-method">{intelligence?.method || 'Transparent trend, momentum and volatility analysis. Indicative only; not financial advice.'}</small></div><span className="coming-soon">{loading ? 'UPDATING' : ready ? 'LIVE MODEL' : 'BUILDING HISTORY'}</span></section>
}
