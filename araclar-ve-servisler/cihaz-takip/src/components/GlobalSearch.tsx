'use client'

import { useState, useEffect, useRef } from 'react'
import { Search, Loader2 } from 'lucide-react'
import { globalSearch } from '@/actions/search'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function GlobalSearch() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    if (!query || query.length < 2) {
      setResults([])
      setIsOpen(false)
      return
    }

    const fetchResults = async () => {
      setIsLoading(true)
      try {
        const res = await globalSearch(query)
        setResults(res)
        setIsOpen(true)
      } catch (error) {
        console.error(error)
      } finally {
        setIsLoading(false)
      }
    }

    const timeoutId = setTimeout(() => fetchResults(), 400)
    return () => clearTimeout(timeoutId)
  }, [query])

  return (
    <div ref={wrapperRef} style={{ position: 'relative', width: '100%' }}>
      <div style={{
        display: 'flex', alignItems: 'center', background: 'var(--nav-bg)', 
        border: '1px solid var(--card-border)', borderRadius: '20px', padding: '6px 16px',
        transition: 'all 0.3s ease', boxShadow: isOpen ? '0 0 0 2px rgba(59, 130, 246, 0.4)' : 'none'
      }}>
        {isLoading ? <Loader2 size={16} className="animate-spin" color="var(--primary)" /> : <Search size={16} color="var(--muted)" />}
        <input 
          type="text" 
          placeholder="Cihaz, jig veya kullanıcı ara..." 
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => query.length >= 2 && setIsOpen(true)}
          style={{ 
            background: 'transparent', border: 'none', outline: 'none', 
            color: 'var(--foreground)', width: '100%', padding: '4px 8px', fontSize: '0.9rem' 
          }}
        />
      </div>

      {isOpen && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, width: '100%', marginTop: '8px',
          background: 'var(--card)', backdropFilter: 'blur(16px)',
          border: '1px solid var(--card-border)', borderRadius: '12px',
          boxShadow: '0 10px 40px var(--modal-overlay)', zIndex: 1000, overflow: 'hidden'
        }}>
          {results.length === 0 ? (
            <div style={{ padding: '16px', textAlign: 'center', color: 'var(--muted)', fontSize: '0.9rem' }}>
              Sonuç bulunamadı.
            </div>
          ) : (
            <div style={{ maxHeight: '400px', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
              {results.map((item, index) => (
                <div 
                  key={`${item.type}-${item.id}-${index}`}
                  onClick={() => {
                    router.push(item.url)
                    setIsOpen(false)
                    setQuery('')
                  }}
                  style={{ 
                    padding: '12px 16px', borderBottom: '1px solid var(--list-item-border)', 
                    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px',
                    transition: 'background 0.2s', background: 'transparent'
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--hover-bg)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <div style={{ 
                    width: '36px', height: '36px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: item.type === 'CIHAZ' ? 'rgba(59, 130, 246, 0.15)' : item.type === 'JIG' ? 'rgba(139, 92, 246, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                    color: item.type === 'CIHAZ' ? 'var(--primary)' : item.type === 'JIG' ? 'var(--accent)' : 'var(--success)'
                  }}>
                    {item.type.charAt(0)}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontWeight: 600, color: 'var(--foreground)', fontSize: '0.95rem' }}>{item.title}</span>
                    <span style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>{item.subtitle}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
