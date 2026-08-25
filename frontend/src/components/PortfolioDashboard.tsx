import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Coins, Plus, Trash2, WalletCards } from 'lucide-react'
import type { RatesResponse } from '../types'
import { formatINR, formatNumber } from '../utils/format'

type Holding = { id: string; metal: 'Gold' | 'Silver'; weight: number; purity: number; cost?: number }
type Props = { rates: RatesResponse | null }

export function PortfolioDashboard({ rates }: Props) {
  const [holdings, setHoldings] = useState<Holding[]>(() => {
    try { const value = JSON.parse(localStorage.getItem('bullionx-portfolio') || '[]'); return Array.isArray(value) ? value as Holding[] : [] } catch { return [] }
  })
  const [metal, setMetal] = useState<Holding['metal']>('Gold')
  const [weight, setWeight] = useState(10)
  const [purity, setPurity] = useState(22)
  const [cost, setCost] = useState(0)
  useEffect(() => { localStorage.setItem('bullionx-portfolio', JSON.stringify(holdings)) }, [holdings])
  const goldPerGram = (rates?.metrics.gold_24k_10g.current ?? 0) / 10
  const silverPerGram = (rates?.metrics.silver_999_kg.current ?? 0) / 1000
  const valued = useMemo(() => holdings.map((holding) => {
    const value = holding.metal === 'Gold' ? goldPerGram * holding.weight * (holding.purity / 24) : silverPerGram * holding.weight
    const costBasis = holding.cost ?? 0
    return { ...holding, value, costBasis, pnl: costBasis ? value - costBasis : null }
  }), [goldPerGram, silverPerGram, holdings])
  const total = valued.reduce((sum, item) => sum + item.value, 0)
  const totalCost = valued.reduce((sum, item) => sum + item.costBasis, 0)
  const pnl = totalCost ? total - totalCost : null
  function addHolding(event: FormEvent) {
    event.preventDefault()
    if (weight <= 0) return
    setHoldings((current) => [...current, { id: crypto.randomUUID(), metal, weight, purity: metal === 'Gold' ? purity : 999, cost: cost > 0 ? cost : undefined }])
    setWeight(10)
    setCost(0)
  }
  return <div className="dashboard-view portfolio-view">
    <div className="dashboard-intro"><div><span className="section-kicker">PERSONAL WORKSPACE</span><h2>Your metals, your view.</h2><p>Track holdings locally and value them against the selected city’s latest reference rates.</p></div><span className="dashboard-source"><WalletCards size={14} /> Stored in this browser</span></div>
    <div className="portfolio-summary"><div><span className="section-kicker">ESTIMATED VALUE</span><strong>{formatINR(total || null)}</strong><small>Based on {rates?.city || 'selected city'} reference rates</small></div><div><span className="section-kicker">P&L</span><strong className={pnl !== null && pnl < 0 ? 'pnl-negative' : 'pnl-positive'}>{formatINR(pnl)}</strong><small>{pnl === null ? 'Add purchase cost for P&L' : `Cost basis ${formatINR(totalCost)}`}</small></div><div><span className="section-kicker">POSITIONS</span><strong>{holdings.length}</strong><small>Local entries</small></div><div><span className="section-kicker">GOLD RATE</span><strong>{formatINR(rates?.metrics.gold_24k_10g.current)}</strong><small>24K / 10g</small></div></div>
    <div className="portfolio-layout"><section className="panel holding-form-panel"><div className="dashboard-panel-title"><span className="section-kicker">ADD POSITION</span><h2>Record a holding</h2><Coins size={17} /></div><form onSubmit={addHolding} className="holding-form"><label>Metal<select value={metal} onChange={(event) => setMetal(event.target.value as Holding['metal'])}><option>Gold</option><option>Silver</option></select></label><label>Weight (g)<input type="number" min="0.01" step="0.01" value={weight} onChange={(event) => setWeight(Number(event.target.value))} /></label>{metal === 'Gold' && <label>Purity<select value={purity} onChange={(event) => setPurity(Number(event.target.value))}>{[24, 22, 18, 14].map((item) => <option key={item} value={item}>{item}K</option>)}</select></label>}<label>Purchase cost <input type="number" min="0" step="100" value={cost || ''} placeholder="Optional" onChange={(event) => setCost(Number(event.target.value))} /></label><button className="primary-action" type="submit"><Plus size={15} /> Add position</button></form><p className="portfolio-note">Add purchase cost to unlock local P&L. No account or trade execution is connected.</p></section><section className="panel holdings-panel"><div className="dashboard-panel-title"><span className="section-kicker">HOLDINGS</span><h2>Current positions</h2><span className="holding-count">{holdings.length}</span></div>{holdings.length ? <div className="holding-list">{valued.map((holding) => <div className="holding-row" key={holding.id}><span className={`holding-metal ${holding.metal.toLowerCase()}`}>{holding.metal === 'Gold' ? 'Au' : 'Ag'}</span><div><strong>{holding.metal} · {formatNumber(holding.weight)}g</strong><small>{holding.metal === 'Gold' ? `${holding.purity}K purity` : '999 purity'}{holding.pnl !== null ? ` · P&L ${formatINR(holding.pnl)}` : ''}</small></div><b>{formatINR(holding.value)}</b><button onClick={() => setHoldings((current) => current.filter((item) => item.id !== holding.id))} aria-label={`Remove ${holding.metal} holding`}><Trash2 size={14} /></button></div>)}</div> : <div className="portfolio-empty"><WalletCards size={23} /><strong>No holdings yet</strong><span>Add gold or silver above to build your private view.</span></div>}</section></div>
  </div>
}
