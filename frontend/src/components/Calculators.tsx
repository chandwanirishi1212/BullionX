import { useMemo, useState } from 'react'
import { Calculator, Info, RotateCcw } from 'lucide-react'
import { formatINR, formatNumber } from '../utils/format'

type Props = { gold24k: number | null }

export function Calculators({ gold24k }: Props) {
  const [purity, setPurity] = useState(22)
  const [weight, setWeight] = useState(10)
  const [making, setMaking] = useState(12)
  const [wastage, setWastage] = useState(3)
  const [gst, setGst] = useState(3)
  const safeNumber = (value: number, maximum: number) => Number.isFinite(value) ? Math.min(Math.max(value, 0), maximum) : 0
  const result = useMemo(() => {
    const ratePerGram = Math.max(gold24k ?? 0, 0) / 10
    const goldValue = ratePerGram * safeNumber(weight, 10000) * (safeNumber(purity, 24) / 24)
    const wastageValue = goldValue * (safeNumber(wastage, 100) / 100)
    const makingValue = goldValue * (safeNumber(making, 100) / 100)
    const subtotal = goldValue + wastageValue + makingValue
    const gstValue = subtotal * (safeNumber(gst, 100) / 100)
    return { goldValue, wastageValue, makingValue, gstValue, total: subtotal + gstValue }
  }, [gold24k, weight, purity, making, wastage, gst])

  function reset() { setPurity(22); setWeight(10); setMaking(12); setWastage(3); setGst(3) }
  return <section className="panel calculator-panel"><div className="panel-heading"><div><span className="section-kicker">ESTIMATION TOOLS</span><h2>Make the rate actionable</h2><p>Transparent calculations for your next purchase</p></div><span className="estimate-label"><Info size={13} /> Estimates</span></div><div className="calculator-grid"><div className="calc-form"><div className="calc-form-title"><Calculator size={17} /><strong>Jewellery price estimator</strong><button onClick={reset} className="reset-button"><RotateCcw size={13} /> Reset</button></div><div className="form-grid"><label>Purity<select value={purity} onChange={(e) => setPurity(Number(e.target.value))}>{[24, 23, 22, 20, 18, 14].map((item) => <option key={item} value={item}>{item}K</option>)}</select></label><label>Weight (g)<input type="number" min="0" value={weight} onChange={(e) => setWeight(Number(e.target.value))} /></label><label>Making charge<input type="number" min="0" value={making} onChange={(e) => setMaking(Number(e.target.value))} /><span>%</span></label><label>Wastage<input type="number" min="0" value={wastage} onChange={(e) => setWastage(Number(e.target.value))} /><span>%</span></label><label>GST<input type="number" min="0" value={gst} onChange={(e) => setGst(Number(e.target.value))} /><span>%</span></label></div></div><div className="calc-output"><div className="calc-output-top"><span>Estimated final price</span><strong>{gold24k ? formatINR(result.total) : '—'}</strong></div><div className="calc-breakdown"><div><span>Gold value</span><strong>{gold24k ? formatINR(result.goldValue) : '—'}</strong></div><div><span>Wastage</span><strong>{gold24k ? formatINR(result.wastageValue) : '—'}</strong></div><div><span>Making charges</span><strong>{gold24k ? formatINR(result.makingValue) : '—'}</strong></div><div><span>GST</span><strong>{gold24k ? formatINR(result.gstValue) : '—'}</strong></div></div><small>Based on live 24K AIB rate of {gold24k ? `${formatNumber(gold24k / 10)} / gram` : 'unavailable'}. Seller quote may vary.</small></div></div></section>
}

