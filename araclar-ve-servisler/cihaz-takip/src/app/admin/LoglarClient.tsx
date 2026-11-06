'use client'

import { useState, useEffect } from 'react'
import { Search, Filter, Calendar, ChevronLeft, ChevronRight, Info, X } from 'lucide-react'
import { getSistemLoglari } from '@/actions/log'

export default function LoglarClient({ initialLogs }: { initialLogs: any[] }) {
  const [loglar, setLoglar] = useState(initialLogs)
  
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  
  const [selectedLog, setSelectedLog] = useState<any | null>(null)

  // Benzersiz işlem tiplerini sabit listesi (bunu veritabanından dinamik de çekebiliriz ama şimdilik sabit)
  const islemTipleri = ['LOGIN', 'LOGOUT', 'CIHAZ_EKLE', 'CIHAZ_GUNCELLE', 'CIHAZ_SIL', 'DEVIR_ISTEGI', 'DEVIR_ONAY', 'TAKAS_ISTEGI', 'TAKAS_ONAY', 'TALEP_ISTEGI', 'TALEP_ONAY']

  useEffect(() => {
    // Initial fetch from action is not needed if page is 1 and no filters, 
    // but to keep it simple, we just fetch when any filter/page changes.
    // We skip the very first render if we already have initialLogs and no filters.
    if (page === 1 && !searchTerm && !filterType && !startDate && !endDate && initialLogs.length > 0 && loglar === initialLogs) {
      return;
    }
    
    const fetchLogs = async () => {
      setIsLoading(true)
      try {
        const res = await getSistemLoglari(page, searchTerm, filterType, startDate, endDate)
        setLoglar(res.loglar)
        setTotalPages(res.totalPages || 1)
      } catch (error) {
        console.error("Loglar alınırken hata oluştu:", error)
      } finally {
        setIsLoading(false)
      }
    }
    
    // Add debounce for search term
    const timeoutId = setTimeout(() => {
      fetchLogs()
    }, 400)
    
    return () => clearTimeout(timeoutId)
  }, [page, searchTerm, filterType, startDate, endDate])

  const formatTarih = (tarihStr: string) => {
    const date = new Date(tarihStr)
    return new Intl.DateTimeFormat('tr-TR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit'
    }).format(date)
  }

  const getIslemRengi = (tip: string) => {
    if (tip.includes('EKLE')) return 'var(--success)'
    if (tip.includes('SIL') || tip.includes('RED')) return 'var(--danger)'
    if (tip.includes('GUNCELLE')) return 'var(--warning)'
    if (tip.includes('LOGIN') || tip.includes('LOGOUT')) return 'var(--primary)'
    if (tip.includes('DEVIR') || tip.includes('TAKAS') || tip.includes('TALEP')) return 'var(--accent)'
    return 'var(--muted)'
  }
  
  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setPage(newPage)
    }
  }

  const handleFilterChange = (setter: any, value: any) => {
    setter(value)
    setPage(1) // filtre değiştiğinde ilk sayfaya dön
  }

  const truncateText = (text: string, maxLength: number = 100) => {
    if (!text) return ''
    if (text.length <= maxLength) return text
    return text.substring(0, maxLength) + '...'
  }

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <div className="input-group" style={{ marginBottom: 0, flexDirection: 'row', alignItems: 'center', background: 'var(--input-bg)', border: '1px solid var(--card-border)', borderRadius: 'var(--radius-sm)', padding: '0 12px' }}>
          <Search size={18} color="var(--muted)" />
          <input 
            type="text" 
            placeholder="Açıklama, Kullanıcı ara..." 
            value={searchTerm}
            onChange={(e) => handleFilterChange(setSearchTerm, e.target.value)}
            style={{ background: 'transparent', border: 'none', color: 'var(--foreground)', padding: '12px', width: '100%', outline: 'none' }}
          />
        </div>
        
        <div className="input-group" style={{ marginBottom: 0, flexDirection: 'row', alignItems: 'center', background: 'var(--input-bg)', border: '1px solid var(--card-border)', borderRadius: 'var(--radius-sm)', padding: '0 12px' }}>
          <Filter size={18} color="var(--muted)" />
          <select 
            value={filterType}
            onChange={(e) => handleFilterChange(setFilterType, e.target.value)}
            style={{ background: 'transparent', border: 'none', outline: 'none', color: 'var(--foreground)', padding: '12px', width: '100%', cursor: 'pointer', appearance: 'auto' }}
          >
            <option value="" style={{ background: '#0f172a' }}>Tüm İşlemler</option>
            {islemTipleri.map(tip => (
              <option key={tip} value={tip} style={{ background: '#0f172a' }}>{tip}</option>
            ))}
          </select>
        </div>

        <div className="input-group" style={{ marginBottom: 0, flexDirection: 'row', alignItems: 'center', background: 'var(--input-bg)', border: '1px solid var(--card-border)', borderRadius: 'var(--radius-sm)', padding: '0 12px' }}>
          <Calendar size={18} color="var(--muted)" />
          <input 
            type="date"
            value={startDate}
            onChange={(e) => handleFilterChange(setStartDate, e.target.value)}
            style={{ background: 'transparent', border: 'none', color: 'var(--foreground)', padding: '12px', width: '100%', outline: 'none', colorScheme: 'dark' }}
            title="Başlangıç Tarihi"
          />
        </div>

        <div className="input-group" style={{ marginBottom: 0, flexDirection: 'row', alignItems: 'center', background: 'var(--input-bg)', border: '1px solid var(--card-border)', borderRadius: 'var(--radius-sm)', padding: '0 12px' }}>
          <span style={{ color: 'var(--muted)', fontSize: '0.9rem', paddingLeft: '4px' }}>-</span>
          <input 
            type="date"
            value={endDate}
            onChange={(e) => handleFilterChange(setEndDate, e.target.value)}
            style={{ background: 'transparent', border: 'none', color: 'var(--foreground)', padding: '12px', width: '100%', outline: 'none', colorScheme: 'dark' }}
            title="Bitiş Tarihi"
          />
        </div>
      </div>

      <div className="table-container" style={{ position: 'relative' }}>
        {isLoading && (
          <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', background: 'var(--modal-overlay)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10 }}>
            <div style={{ color: 'var(--primary)' }}>Yükleniyor...</div>
          </div>
        )}
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--card-border)' }}>
              <th style={{ width: '180px', padding: '16px', color: 'var(--muted)', fontWeight: 600 }}><div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Calendar size={14}/> Tarih</div></th>
              <th style={{ width: '160px', padding: '16px', color: 'var(--muted)', fontWeight: 600 }}>İşlem Tipi</th>
              <th style={{ padding: '16px', color: 'var(--muted)', fontWeight: 600 }}>Açıklama</th>
              <th style={{ width: '200px', padding: '16px', color: 'var(--muted)', fontWeight: 600 }}>Kullanıcı</th>
              <th style={{ width: '100px', padding: '16px', color: 'var(--muted)', fontWeight: 600, textAlign: 'right' }}>Detay</th>
            </tr>
          </thead>
          <tbody>
            {loglar.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', padding: '32px', color: 'var(--muted)' }}>
                  Kriterlere uygun log bulunamadı.
                </td>
              </tr>
            ) : (
              loglar.map((log: any) => (
                <tr key={log.log_id} className="animate-fade-in" style={{ borderBottom: '1px solid var(--list-item-border)' }}>
                  <td style={{ color: 'var(--muted)', fontSize: '0.9rem', padding: '16px' }}>
                    {formatTarih(log.tarih)}
                  </td>
                  <td style={{ padding: '16px' }}>
                    <span style={{ 
                      padding: '4px 10px', 
                      borderRadius: '20px', 
                      fontSize: '0.8rem', 
                      fontWeight: 600, 
                      backgroundColor: `${getIslemRengi(log.islem_tipi)}20`,
                      color: getIslemRengi(log.islem_tipi),
                      border: `1px solid ${getIslemRengi(log.islem_tipi)}40`
                    }}>
                      {log.islem_tipi}
                    </span>
                  </td>
                  <td style={{ padding: '16px', fontSize: '0.95rem' }} title={log.aciklama}>
                    {truncateText(log.aciklama, 100)}
                  </td>
                  <td style={{ fontWeight: 500, padding: '16px' }}>
                    {log.kullanici ? `${log.kullanici.ad} ${log.kullanici.soyad}` : 'Sistem / Anonim'}
                  </td>
                  <td style={{ padding: '16px', textAlign: 'right' }}>
                    <button 
                      onClick={() => setSelectedLog(log)}
                      className="btn btn-secondary" 
                      style={{ padding: '6px', color: 'var(--primary)' }} 
                      title="Detayları Gör"
                    >
                      <Info size={18} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      
      {/* Pagination Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '24px' }}>
        <div style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>
          Sayfa {page} / {Math.max(1, totalPages)}
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button 
            className="btn btn-secondary"
            disabled={page === 1}
            onClick={() => handlePageChange(page - 1)}
          >
            <ChevronLeft size={16} /> Önceki
          </button>
          <button 
            className="btn btn-secondary"
            disabled={page === totalPages || totalPages === 0}
            onClick={() => handlePageChange(page + 1)}
          >
            Sonraki <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* Log Detay Modalı */}
      {selectedLog && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'var(--modal-overlay)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999 }}>
          <div className="glass-card animate-fade-in" style={{ width: '90%', maxWidth: '600px', maxHeight: '80vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', borderBottom: '1px solid var(--card-border)', paddingBottom: '16px' }}>
              <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--primary)' }}>
                <Info size={20} /> Log Detayı
              </h3>
              <button onClick={() => setSelectedLog(null)} style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer' }}><X size={24} /></button>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>İşlem Tipi</label>
                <div style={{ fontWeight: 600, color: getIslemRengi(selectedLog.islem_tipi) }}>{selectedLog.islem_tipi}</div>
              </div>
              
              <div>
                <label style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>Kullanıcı</label>
                <div style={{ fontWeight: 500 }}>{selectedLog.kullanici ? `${selectedLog.kullanici.ad} ${selectedLog.kullanici.soyad}` : 'Sistem / Anonim'}</div>
              </div>

              <div>
                <label style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>Tarih</label>
                <div>{formatTarih(selectedLog.tarih)}</div>
              </div>
              
              <div>
                <label style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>IP Adresi</label>
                <div>{selectedLog.ip_adresi || '-'}</div>
              </div>

              <div>
                <label style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>Açıklama</label>
                <div style={{ padding: '12px', background: 'var(--input-bg)', borderRadius: '8px', border: '1px solid var(--card-border)', marginTop: '4px', lineHeight: '1.5' }}>
                  {selectedLog.aciklama}
                </div>
              </div>

              {selectedLog.detaylar && (
                <div>
                  <label style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>İlişkili Veritabanı Detayları (JSON)</label>
                  <pre style={{ 
                    padding: '16px', 
                    background: 'var(--input-bg)', 
                    borderRadius: '8px', 
                    border: '1px solid var(--card-border)', 
                    marginTop: '4px', 
                    overflowX: 'auto',
                    fontSize: '0.85rem',
                    color: '#a5b4fc',
                    fontFamily: 'monospace'
                  }}>
                    {(() => {
                      try {
                        return JSON.stringify(JSON.parse(selectedLog.detaylar), null, 2)
                      } catch {
                        return selectedLog.detaylar
                      }
                    })()}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
