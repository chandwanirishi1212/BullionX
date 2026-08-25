import { useMemo, useState } from 'react'
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { BarChart3, Info } from 'lucide-react'
import type { HistoryResponse } from '../types'
import { formatChartTime, formatINR } from '../utils/format'

const ranges = ['1H', '6H', '1D', '1W', '1M', '3M', '6M', '1Y']
const metrics = { gold_24k_10g: '24K gold / 10g', gold_22k_10g: '22K gold / 10g', silver_999_kg: '999 silver / kg' } as const

type Props = { history: HistoryResponse | null; range: string; onRange: (range: string) => void; loading: boolean }

export function MarketChart({ history, range, onRange, loading }: Props) {
  const [metric, setMetric] = useState<keyof typeof metrics>('gold_24k_10g')
  const data = useMemo(() => history?.points.map((point) => ({ ...point, label: formatChartTime(point.timestamp) })) ?? [], [history])
  const isBenchmark = history?.source.includes('IBJA') ?? false
  return (
    <section className="panel chart-panel">
      <div className="panel-heading chart-heading"><div><span className="section-kicker">PRICE HISTORY</span><h2>{isBenchmark ? 'India benchmark trend' : `${history?.city || 'City'} bullion trend`}</h2><p>{isBenchmark ? 'IBJA daily close · benchmark context' : metrics[metric]}</p></div><div className="chart-tools"><select aria-label="Chart metric" value={metric} onChange={(event) => setMetric(event.target.value as keyof typeof metrics)}>{Object.entries(metrics).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select><div className="range-tabs">{ranges.map((item) => <button className={range === item ? 'selected' : ''} onClick={() => onRange(item)} key={item}>{item}</button>)}</div><button className="icon-button subtle" aria-label="Chart information"><Info size={16} /></button></div></div>
      <div className="chart-wrap">
        {loading ? <div className="chart-empty"><span className="loader" /> Loading history</div> : !history?.enough_data ? <div className="chart-empty"><span className="empty-chart-icon"><BarChart3 size={25} /></span><strong>Not enough historical data yet.</strong><span>Once real AIB snapshots accumulate, this chart will populate automatically.</span></div> : <ResponsiveContainer width="100%" height="100%"><AreaChart data={data} margin={{ top: 12, right: 4, left: 0, bottom: 0 }}><defs><linearGradient id="goldFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#c69c53" stopOpacity={0.25} /><stop offset="100%" stopColor="#c69c53" stopOpacity={0} /></linearGradient></defs><CartesianGrid strokeDasharray="3 5" vertical={false} stroke="var(--grid)" /><XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: 'var(--muted)', fontSize: 11 }} minTickGap={30} /><YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--muted)', fontSize: 11 }} tickFormatter={(value) => `₹${Math.round(value / 1000)}k`} domain={['auto', 'auto']} width={45} /><Tooltip content={<ChartTooltip metricLabel={metrics[metric]} />} /><Area type="monotone" dataKey={metric} stroke="#c69c53" strokeWidth={2.5} fill="url(#goldFill)" dot={false} activeDot={{ r: 4, fill: '#c69c53', stroke: 'var(--panel)' }} /></AreaChart></ResponsiveContainer>}
      </div>
      <div className="chart-footer"><span><i className="legend-gold" /> {isBenchmark ? 'IBJA benchmark' : metrics[metric]} · {history?.points.length ?? 0} points</span><span className="chart-disclaimer">{history?.source_note ?? 'No interpolated values'}</span></div>
    </section>
  )
}

function ChartTooltip({ active, payload, label, metricLabel }: { active?: boolean; payload?: { value: number }[]; label?: string; metricLabel: string }) {
  if (!active || !payload?.length) return null
  return <div className="chart-tooltip"><small>{label}</small><strong>{formatINR(payload[0].value)}</strong><span>{metricLabel}</span></div>
}
