import { Radio } from 'lucide-react'
import type { Freshness } from '../types'

export function FreshnessBadge({ status }: { status: Freshness }) {
  return <span className={`freshness freshness-${status.toLowerCase()}`}><i /><Radio size={11} /> {status}</span>
}

