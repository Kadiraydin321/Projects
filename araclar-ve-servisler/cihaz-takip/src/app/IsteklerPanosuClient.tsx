'use client'

import { useState, useEffect } from 'react'
import { ArrowRightLeft, Search, ChevronLeft, ChevronRight } from 'lucide-react'
import { getBekleyenIstekler } from '@/actions/transfer'
import Link from 'next/link'

export default function IsteklerPanosuClient({ initialIstekler, initialTotalCount }: { initialIstekler: any[], initialTotalCount: number }) {
  const [istekler, setIstekler] = useState(initialIstekler)
  const [searchTerm, setSearchTerm] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(Math.max(1, Math.ceil(initialTotalCount / 20)))
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (page === 1 && !searchTerm && initialIstekler.length > 0 && istekler === initialIstekler) {
      return
    }

    const fetchIstekler = async () => {
      setIsLoading(true)
      try {
        const res = await getBekleyenIstekler(page, searchTerm)
        setIstekler(res.istekler)
        setTotalPages(res.totalPages || 1)
      } catch (error) {
        console.error('İstekler çekilirken hata:', error)
      } finally {
        setIsLoading(false)
      }
    }

    const timeoutId = setTimeout(() => fetchIstekler(), 400)
    return () => clearTimeout(timeoutId)
  }, [page, searchTerm])

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setPage(newPage)
    }
  }

  return (
    <div className="glass-card animate-fade-in" style={{ borderTop: '4px solid var(--accent)', padding: '20px', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h2 style={{ fontSize: '1.2rem', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <ArrowRightLeft size={20} color="var(--accent)" />
          İstekler Panosu
        </h2>
      </div>

      <div className="input-group" style={{ marginBottom: '16px', flexDirection: 'row', alignItems: 'center', background: 'var(--input-bg)', border: '1px solid var(--card-border)', borderRadius: 'var(--radius-sm)', padding: '0 12px' }}>
        <Search size={16} color="var(--muted)" />
        <input 
          type="text" 
          placeholder="İsteklerde ara..." 
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value)
            setPage(1)
          }}
          style={{ background: 'transparent', border: 'none', color: 'var(--foreground)', padding: '10px', width: '100%', outline: 'none', fontSize: '0.9rem' }}
        />
      </div>
      
      <div style={{ flex: 1, position: 'relative', minHeight: '300px' }}>
        {isLoading && (
          <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', background: 'var(--modal-overlay)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10 }}>
            <div style={{ color: 'var(--primary)', fontSize: '0.9rem' }}>Yükleniyor...</div>
          </div>
        )}

        {istekler.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'var(--muted)', padding: '32px 0', fontSize: '0.95rem' }}>
            Bekleyen işlem bulunmuyor.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {istekler.map((istek: any) => (
              <div key={istek.istek_id} style={{ padding: '16px', background: 'var(--item-bg)', borderRadius: '8px', border: '1px solid var(--list-item-border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                  <div style={{ fontWeight: 600, color: 'var(--foreground)', fontSize: '0.95rem' }}>
                    {istek.istek_tipi === 'DEVIR' && 'Devir İsteği'}
                    {istek.istek_tipi === 'TALEP' && 'Cihaz Talebi'}
                    {istek.istek_tipi === 'TAKAS' && 'Takas İsteği'}
                  </div>
                  <span className="badge badge-warning" style={{ fontSize: '0.65rem', padding: '2px 6px' }}>{istek.durum.replace(/_/g, ' ')}</span>
                </div>
                
                <div style={{ fontSize: '0.85rem', color: 'var(--muted)', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {istek.istek_tipi === 'DEVIR' && (
                    <span><strong>{istek.gonderen.ad}</strong> {'->'} <strong>{istek.alici.ad}</strong></span>
                  )}
                  {istek.istek_tipi === 'TALEP' && (
                    <span><strong>{istek.alici.ad}</strong>, {istek.gonderen.ad} kişisinden talep ediyor</span>
                  )}
                  {istek.istek_tipi === 'TAKAS' && (
                    <span><strong>{istek.gonderen.ad}</strong> {'<->'} <strong>{istek.alici.ad}</strong></span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px', borderTop: '1px solid var(--list-item-border)', paddingTop: '16px' }}>
          <div style={{ color: 'var(--muted)', fontSize: '0.8rem' }}>
            Sayfa {page} / {totalPages}
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button 
              className="btn btn-secondary"
              style={{ padding: '4px 8px', fontSize: '0.8rem' }}
              disabled={page === 1}
              onClick={() => handlePageChange(page - 1)}
            >
              <ChevronLeft size={14} />
            </button>
            <button 
              className="btn btn-secondary"
              style={{ padding: '4px 8px', fontSize: '0.8rem' }}
              disabled={page === totalPages || totalPages === 0}
              onClick={() => handlePageChange(page + 1)}
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
      
      <Link href="/istekler" className="btn btn-secondary" style={{ width: '100%', marginTop: '16px', textAlign: 'center', justifyContent: 'center' }}>
        Tüm İstekler Sayfası →
      </Link>
    </div>
  )
}
