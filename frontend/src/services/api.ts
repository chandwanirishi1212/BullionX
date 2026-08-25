import type { City, HealthResponse, HistoryResponse, IntelligenceResponse, RatesResponse, SummaryResponse } from '../types'

const configuredApiUrl = import.meta.env.VITE_API_URL
const localApiUrl = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? 'http://localhost:8000'
  : ''
const API_URL = (configuredApiUrl || localApiUrl).replace(/\/$/, '')

async function get<T>(path: string): Promise<T> {
  const separator = path.includes('?') ? '&' : '?'
  const response = await fetch(`${API_URL}${path}${separator}_=${Date.now()}`, { cache: 'no-store' })
  if (!response.ok) {
    throw new Error(`BullionX API error (${response.status})`)
  }
  return response.json() as Promise<T>
}

async function post<T>(path: string): Promise<T> {
  const separator = path.includes('?') ? '&' : '?'
  const response = await fetch(`${API_URL}${path}${separator}_=${Date.now()}`, { method: 'POST', cache: 'no-store' })
  if (!response.ok) {
    const detail = await response.text().catch(() => '')
    throw new Error(detail || `BullionX API error (${response.status})`)
  }
  return response.json() as Promise<T>
}

export const api = {
  health: () => get<HealthResponse>('/api/health'),
  rates: (city = 'ahmedabad') => get<RatesResponse>(`/api/rates/${city}`),
  summary: (city = 'ahmedabad') => get<SummaryResponse>(`/api/summary/${city}`),
  history: (range: string, city = 'ahmedabad') => get<HistoryResponse>(`/api/history/${city}?range=${range}`),
  intelligence: (city = 'ahmedabad') => get<IntelligenceResponse>(`/api/intelligence/${city}`),
  cities: () => get<City[]>('/api/cities'),
  refresh: (city = 'ahmedabad') => post<{ status: string; records_saved: number; finished_at: string | null }>(`/api/refresh/${city}`),
}
