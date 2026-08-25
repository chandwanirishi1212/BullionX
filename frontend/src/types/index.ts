export type Freshness = 'LIVE' | 'RECENT' | 'STALE' | 'UNAVAILABLE'

export type PriceMetric = {
  current: number | null
  previous: number | null
  change: number | null
  change_percent: number | null
}

export type RatesResponse = {
  city: string
  state: string
  source: string
  source_note: string | null
  timestamp: string | null
  freshness: Freshness
  metrics: Record<string, PriceMetric>
  product_labels: Record<string, string>
}

export type SummaryResponse = {
  city: string
  source: string
  source_note: string | null
  timestamp: string | null
  freshness: Freshness
  current_rate: number | null
  daily_high: number | null
  daily_low: number | null
  daily_movement: number | null
  daily_movement_percent: number | null
  snapshot_count: number
}

export type IntelligenceResponse = {
  city: string
  source: string
  source_note: string
  status: 'READY' | 'INSUFFICIENT_DATA' | 'UNAVAILABLE'
  generated_at: string
  data_points: number
  trend: { label: string; score: number | null; description: string }
  momentum: { gold_change: number | null; gold_change_percent: number | null; silver_change: number | null; silver_change_percent: number | null }
  volatility: { gold_percent: number | null; silver_percent: number | null; window_points: number }
  forecast: { horizon: string; gold_24k_10g: number; lower_bound: number; upper_bound: number; confidence: string; gold_999_with_gst_10g: number | null; gold_999_with_gst_lower_bound: number | null; gold_999_with_gst_upper_bound: number | null } | null
  summary: string
  method: string
}

export type HistoryPoint = {
  timestamp: string
  gold_24k_10g: number
  gold_22k_10g: number
  silver_999_kg: number
}

export type HistoryResponse = {
  city: string
  range: string
  source: string
  source_note: string | null
  points: HistoryPoint[]
  enough_data: boolean
  message: string | null
}

export type City = {
  slug: string
  name: string
  state: string
  source_url: string
  has_data: boolean
  latest_timestamp: string | null
}

export type HealthResponse = {
  status: 'ok' | 'degraded'
  database: 'connected' | 'unavailable'
  scheduler: 'running' | 'disabled'
  last_run: Record<string, unknown> | null
  data: {
    latest_snapshot: string | null
    latest_source: string | null
    cities_configured: number
    cities_with_snapshots: number
    last_success: string | null
    last_failure: { finished_at: string | null; error: string | null } | null
  }
}
