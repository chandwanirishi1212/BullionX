import { useState } from 'react'
import { Check, Menu, Moon, RefreshCw, Share2, Sun } from 'lucide-react'
import { Brand } from './Brand'

type Props = { dark: boolean; refreshing: boolean; loading?: boolean; onTheme: () => void; onRefresh: () => void; onMenu: () => void }

export function Topbar({ dark, refreshing, loading = false, onTheme, onRefresh, onMenu }: Props) {
  const [shared, setShared] = useState(false)

  async function shareView() {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setShared(true)
      window.setTimeout(() => setShared(false), 1800)
    } catch {
      setShared(false)
    }
  }

  return <header className="topbar">
    <span className={`topbar-progress ${loading ? 'active' : ''}`} />
    <button className="mobile-menu icon-button" onClick={onMenu} aria-label="Open navigation"><Menu size={20} /></button>
    <div className="mobile-brand"><Brand /></div>
    <div className="topbar-title"><span className="eyebrow">MARKET OVERVIEW</span><span className="live-clock"><i /> Live market context</span></div>
    <div className="topbar-actions">
      <button className="icon-button share-button" onClick={() => void shareView()} aria-label="Copy shareable city link" title="Copy shareable city link">{shared ? <Check size={17} /> : <Share2 size={17} />}</button>
      <button className={`theme-switch ${dark ? 'is-midnight' : 'is-light'}`} onClick={onTheme} aria-pressed={!dark} aria-label={dark ? 'Switch to light mode' : 'Switch to midnight mode'}><span className="theme-switch-icon">{dark ? <Moon size={13} /> : <Sun size={14} />}</span><span className="theme-switch-label">{dark ? 'Light mode' : 'Midnight mode'}</span><span className="theme-switch-track"><i /></span></button>
      <button className="refresh-button" onClick={onRefresh} disabled={refreshing}><RefreshCw size={15} className={refreshing ? 'spin' : ''} /> {refreshing ? 'Syncing' : 'Refresh'}</button>
    </div>
  </header>
}
