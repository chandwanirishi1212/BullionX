import { useEffect, useMemo, useState } from 'react'
import { BarChart3, Calculator, ChevronDown, CircleHelp, LayoutDashboard, Search, Settings2, Sparkles, WalletCards, X } from 'lucide-react'
import { Brand } from './Brand'
import type { City } from '../types'

const nav = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'market', label: 'Market data', icon: BarChart3 },
  { id: 'calculators', label: 'Calculators', icon: Calculator },
  { id: 'portfolio', label: 'Portfolio', icon: WalletCards },
  { id: 'insights', label: 'AI insights', icon: Sparkles },
]

type Props = { open?: boolean; cities: City[]; selectedCity: string; onCity: (slug: string) => void; activeView: string; onNavigate: (view: string) => void }

export function Sidebar({ open = false, cities, selectedCity, onCity, activeView, onNavigate }: Props) {
  const [query, setQuery] = useState('')
  const matches = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (needle.length < 2) return []
    return cities.filter((city) => `${city.name} ${city.state}`.toLowerCase().includes(needle)).slice(0, 6)
  }, [cities, query])

  useEffect(() => {
    function clearOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape' && query) setQuery('')
    }
    window.addEventListener('keydown', clearOnEscape)
    return () => window.removeEventListener('keydown', clearOnEscape)
  }, [query])

  function chooseCity(slug: string) {
    onCity(slug)
    setQuery('')
  }

  return <aside className={`sidebar ${open ? 'open' : ''}`}>
    <Brand />
    <div className="market-selector">
      <span className="eyebrow">TRACKING</span>
      <label className="market-picker"><span className="city-dot" /><select value={selectedCity} onChange={(event) => onCity(event.target.value)} aria-label="Choose city"><option value="ahmedabad">Ahmedabad, Gujarat</option>{cities.filter((city) => city.slug !== 'ahmedabad').map((city) => <option value={city.slug} key={city.slug}>{city.name}, {city.state}{city.has_data ? '' : ' · unavailable'}</option>)}</select><ChevronDown size={15} /></label>
      <div className="sidebar-city-search"><div className="sidebar-search-heading"><span className="eyebrow">CITY SEARCH</span><small>{cities.length || 679} markets</small></div><div className="sidebar-search-field"><Search size={14} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search city or state" aria-label="Search city or state" aria-expanded={query.trim().length >= 2} />{query && <button className="sidebar-search-clear" onClick={() => setQuery('')} aria-label="Clear city search"><X size={13} /></button>}</div>{query.trim().length >= 2 && <div className="sidebar-search-results" role="listbox"><div className="sidebar-search-result-count">{matches.length ? `${matches.length} matching ${matches.length === 1 ? 'market' : 'markets'}` : 'No matching market'}</div>{matches.length ? matches.map((city) => <button key={city.slug} onClick={() => chooseCity(city.slug)} className={city.slug === selectedCity ? 'selected' : ''} role="option" aria-selected={city.slug === selectedCity}><span className="sidebar-result-initial">{city.name.charAt(0)}</span><span className="sidebar-result-copy"><strong>{city.name}</strong><small>{city.state}</small></span><span className={`sidebar-result-status ${city.has_data ? 'live' : ''}`}>{city.has_data ? 'LIVE' : 'CONTEXT'}</span></button>) : <span className="sidebar-search-empty">Try a different city or state</span>}</div>}</div>
    </div>
    <nav className="side-nav" aria-label="Main navigation">
      <span className="eyebrow nav-label">WORKSPACE</span>
      {nav.map(({ id, label, icon: Icon }) => (
        <button className={`nav-item ${activeView === id ? 'active' : ''}`} key={id} onClick={() => onNavigate(id)} aria-current={activeView === id ? 'page' : undefined}>
          <Icon size={17} strokeWidth={activeView === id ? 2.2 : 1.8} />
          <span>{label}</span>
        </button>
      ))}
    </nav>
    <div className="side-bottom">
      <div className="source-note"><span className="source-orb" /><div><strong>AIB verified source</strong><small>All India Bullion reference feed</small></div></div>
      <button className="nav-item"><CircleHelp size={17} /><span>Documentation</span></button>
      <button className="nav-item"><Settings2 size={17} /><span>Preferences</span></button>
      <div className="profile"><div className="avatar">RK</div><div><strong>Market observer</strong><small>Personal workspace</small></div><ChevronDown size={15} /></div>
    </div>
  </aside>
}
