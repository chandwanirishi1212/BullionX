import { CircleDollarSign } from 'lucide-react'

export function Brand() {
  return (
    <div className="brand-mark">
      <span className="brand-icon"><CircleDollarSign size={21} strokeWidth={1.8} /></span>
      <span className="brand-copy"><strong>BULLION<span>X</span></strong><small>INDIA MARKET INTELLIGENCE</small></span>
    </div>
  )
}

