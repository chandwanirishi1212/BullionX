import { ArrowDownRight, ArrowUpRight } from 'lucide-react'
import type { RatesResponse } from '../types'
import { formatINR, formatSignedINR, formatSignedPercent } from '../utils/format'

const rows = [
  { key: 'retail_995_gold', label: 'Retail 995 gold', note: '995 · before GST' },
  { key: 'rtgs_995_gold', label: 'RTGS 995 gold', note: '995 · settlement' },
  { key: 'gold_995_with_gst', label: '995 gold with GST', note: '995 · tax inclusive' },
  { key: 'retail_999_gold', label: 'Retail 999 gold', note: '999 · before GST' },
  { key: 'rtgs_999_gold', label: 'RTGS 999 gold', note: '999 · settlement' },
  { key: 'gold_999_with_gst', label: '999 gold with GST', note: '999 · tax inclusive' },
  { key: 'retail_999_silver', label: 'Retail 999 silver', note: '999 · before GST' },
  { key: 'rtgs_999_silver', label: 'RTGS 999 silver', note: '999 · settlement' },
  { key: 'silver_999_with_gst', label: '999 silver with GST', note: '999 · tax inclusive' },
]

export function RateTable({ rates }: { rates: RatesResponse | null }) {
  return <section className="panel rates-panel"><div className="panel-heading"><div><span className="section-kicker">{rates?.source.includes('IBJA') ? 'IBJA BENCHMARK' : 'AIB PRODUCT BOARD'}</span><h2>Reference rate matrix</h2><p>{rates?.source_note || `${rates?.city || 'City'} · all values from the latest source snapshot`}</p></div><button className="text-button">View methodology <span>↗</span></button></div><div className="rate-table-wrap"><table><thead><tr><th>Product</th><th>Reference</th><th>Change</th><th>Move</th></tr></thead><tbody>{rows.map((row) => { const metric = rates?.metrics[row.key]; const positive = (metric?.change ?? 0) >= 0; return <tr key={row.key}><td><div className="product-name">{row.label}<small>{row.note}</small></div></td><td className="table-price">{formatINR(metric?.current)}</td><td className={`table-change ${positive ? 'positive' : 'negative'}`}>{formatSignedINR(metric?.change)}<small>{formatSignedPercent(metric?.change_percent)}</small></td><td><span className={`mini-move ${positive ? 'positive' : 'negative'}`}>{positive ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}</span></td></tr>})}</tbody></table></div></section>
}
