'use client'

import { useState } from 'react'
import { Server, Edit, Trash2, Search, Calendar, ArrowRight, ArrowRightLeft, X, Hand } from 'lucide-react'
import { deleteCihaz } from '@/actions/cihaz'
import { createDevirIstegi, createTakasIstegi, createCihazIstemeTalebi } from '@/actions/transfer'
import Link from 'next/link'

const SearchableSelect = ({ options, value, onChange, placeholder }: any) => {
  const [search, setSearch] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  
  const selectedOption = options.find((o:any) => o.value === value)
  const filteredOptions = options.filter((o:any) => o.label.toLowerCase().includes(search.toLowerCase()))
  
  return (
    <div style={{ position: 'relative' }}>
      <div 
        onClick={() => setIsOpen(!isOpen)}
        style={{ 
          background: 'var(--input-bg)', 
          border: '1px solid var(--card-border)', 
          padding: '12px', 
          borderRadius: 'var(--radius-sm)', 
          cursor: 'pointer',
          color: selectedOption ? 'var(--foreground)' : 'var(--muted)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}
      >
        <span>{selectedOption ? selectedOption.label : placeholder}</span>
        <span style={{ opacity: 0.5 }}>▼</span>
      </div>
      
      {isOpen && (
        <div style={{ position: 'absolute', top: '100%', left: 0, width: '100%', background: 'var(--card)', border: '1px solid var(--card-border)', borderRadius: 'var(--radius-sm)', zIndex: 1000, marginTop: '4px', maxHeight: '250px', overflowY: 'auto', boxShadow: '0 4px 12px var(--modal-overlay)' }}>
          <div style={{ padding: '8px', position: 'sticky', top: 0, background: 'var(--card)', borderBottom: '1px solid var(--card-border)' }}>
            <input 
              type="text" 
              placeholder="Ara..." 
              value={search} 
              onChange={e => setSearch(e.target.value)} 
              onClick={e => e.stopPropagation()}
              style={{ width: '100%', padding: '8px', background: 'var(--input-bg)', border: '1px solid var(--card-border)', borderRadius: '4px', color: 'var(--foreground)', outline: 'none' }}
              autoFocus
            />
          </div>
          {filteredOptions.length === 0 ? (
            <div style={{ padding: '12px', color: 'var(--muted)', textAlign: 'center' }}>Bulunamadı</div>
          ) : (
            filteredOptions.map((opt:any) => (
              <div 
                key={opt.value} 
                onClick={() => { onChange(opt.value); setIsOpen(false); setSearch(''); }}
                style={{ padding: '10px 12px', cursor: 'pointer', borderBottom: '1px solid var(--list-item-border)', backgroundColor: value === opt.value ? 'var(--hover-bg)' : 'transparent', color: value === opt.value ? 'var(--primary)' : 'var(--foreground)' }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--hover-bg)'}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = value === opt.value ? 'var(--hover-bg)' : 'transparent'}
              >
                {opt.label}
              </div>
            ))
          )}
        </div>
      )}
      {isOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 999 }} onClick={() => setIsOpen(false)} />
      )}
    </div>
  )
}

export default function CihazListesi({ cihazlar, currentSession, aktifKullanicilar }: { cihazlar: any[], currentSession: any, aktifKullanicilar: any[] }) {
  const [searchTerm, setSearchTerm] = useState('')
  
  const [devirModal, setDevirModal] = useState<string | null>(null)
  const [takasModal, setTakasModal] = useState<any | null>(null)
  
  const [devirHedefKullanici, setDevirHedefKullanici] = useState('')
  const [takasBenimCihazim, setTakasBenimCihazim] = useState('')
  
  const [isTransferring, setIsTransferring] = useState(false)

  const userId = currentSession?.userId

  const handleDevir = async (cihazId: string) => {
    if (!devirHedefKullanici) return
    setIsTransferring(true)
    await createDevirIstegi(cihazId, devirHedefKullanici)
    setIsTransferring(false)
    setDevirModal(null)
    alert('Devir isteği başarıyla gönderildi.')
  }

  const handleTakas = async () => {
    if (!takasBenimCihazim || !takasModal) return
    setIsTransferring(true)
    await createTakasIstegi(takasModal.anlik_kullanici_id, takasBenimCihazim, takasModal.cihaz_id)
    setIsTransferring(false)
    setTakasModal(null)
    setTakasBenimCihazim('')
    alert('Takas teklifi başarıyla gönderildi.')
  }

  const handleIsteme = async (cihazId: string) => {
    if (confirm('Bu cihazı kullanıcısından talep etmek istediğinize emin misiniz?')) {
      setIsTransferring(true)
      const res = await createCihazIstemeTalebi(cihazId)
      setIsTransferring(false)
      if (res.success) {
        alert('Cihaz talebiniz gönderildi.')
      } else {
        alert('Hata: ' + res.error)
      }
    }
  }

  const searchLower = searchTerm.toLowerCase()
  const filtered = cihazlar.filter(c => 
    (c.marka + ' ' + c.model).toLowerCase().includes(searchLower) ||
    c.seri_no?.toLowerCase().includes(searchLower) ||
    c.envanter_no?.toLowerCase().includes(searchLower) ||
    c.barkod_qr?.toLowerCase().includes(searchLower) ||
    c.cihaz_turu?.toLowerCase().includes(searchLower) ||
    c.kullanim_amaci?.toLowerCase().includes(searchLower) ||
    c.kullanilan_yer?.toLowerCase().includes(searchLower) ||
    c.durum?.toLowerCase().includes(searchLower) ||
    c.anlik_kullanici?.ad?.toLowerCase().includes(searchLower) ||
    c.anlik_kullanici?.soyad?.toLowerCase().includes(searchLower)
  )

  const canEdit = currentSession?.role && currentSession.role !== 'Standart'

  // Kendi cihazlarımızı takas filtresi için alıyoruz
  const benimCihazlarim = cihazlar.filter(c => c.anlik_kullanici_id === userId)

  return (
    <div className="glass-card stagger-1">
      <div style={{ display: 'flex', gap: '16px', marginBottom: '24px' }}>
        <div className="input-group" style={{ marginBottom: 0, flex: 1, flexDirection: 'row', alignItems: 'center', background: 'var(--input-bg)', border: '1px solid var(--card-border)', borderRadius: 'var(--radius-sm)', padding: '0 12px' }}>
          <Search size={18} color="var(--muted)" />
          <input 
            type="text" 
            placeholder="Marka, Model, Seri No, Tür, Durum veya Kullanıcı ara..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ background: 'transparent', border: 'none', color: 'var(--foreground)', padding: '12px', width: '100%', outline: 'none' }}
          />
        </div>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--card-border)' }}>
              <th style={{ padding: '16px', color: 'var(--muted)', fontWeight: 600, fontSize: '0.9rem' }}>Cihaz Bilgisi</th>
              <th style={{ padding: '16px', color: 'var(--muted)', fontWeight: 600, fontSize: '0.9rem' }}>Seri / Envanter No</th>
              <th style={{ padding: '16px', color: 'var(--muted)', fontWeight: 600, fontSize: '0.9rem' }}>Tür & Konum</th>
              <th style={{ padding: '16px', color: 'var(--muted)', fontWeight: 600, fontSize: '0.9rem' }}>Zimmet Durumu</th>
              <th style={{ padding: '16px', color: 'var(--muted)', fontWeight: 600, fontSize: '0.9rem' }}>Kalibrasyon</th>
              <th style={{ padding: '16px', color: 'var(--muted)', fontWeight: 600, fontSize: '0.9rem', textAlign: 'right' }}>İşlemler</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: '32px', textAlign: 'center', color: 'var(--muted)' }}>
                  Arama kriterlerine uygun cihaz bulunamadı.
                </td>
              </tr>
            ) : (
              filtered.map((cihaz) => {
                const isOnMe = cihaz.anlik_kullanici?.kullanici_id === userId
                return (
                  <tr key={cihaz.cihaz_id} style={{ borderBottom: '1px solid var(--list-item-border)', transition: 'var(--transition)' }}>
                    <td style={{ padding: '16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: 'var(--glass-icon-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)' }}>
                          <Server size={22} />
                        </div>
                        <div>
                          <div style={{ fontWeight: 600 }}>{cihaz.marka} {cihaz.model}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '16px' }}>
                      <div style={{ fontSize: '0.9rem' }}>SN: <span style={{ color: 'var(--muted)' }}>{cihaz.seri_no || '-'}</span></div>
                      <div style={{ fontSize: '0.9rem' }}>Env: <span style={{ color: 'var(--muted)' }}>{cihaz.envanter_no || '-'}</span></div>
                    </td>
                    <td style={{ padding: '16px' }}>
                      <div style={{ fontSize: '0.9rem' }}>{cihaz.cihaz_turu || '-'}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>{cihaz.kullanilan_yer || '-'}</div>
                    </td>
                    <td style={{ padding: '16px' }}>
                      {cihaz.anlik_kullanici ? (
                        <div style={{ fontSize: '0.9rem', color: isOnMe ? 'var(--primary)' : 'var(--foreground)' }}>
                          {isOnMe ? 'Bende' : `${cihaz.anlik_kullanici.ad} ${cihaz.anlik_kullanici.soyad}`}
                        </div>
                      ) : (
                        <span className={`badge ${
                          cihaz.durum === 'Aktif' ? 'badge-success' : 
                          cihaz.durum === 'Bakımda' ? 'badge-warning' : 
                          'badge-danger'
                        }`}>
                          {cihaz.durum === 'Aktif' ? 'Depoda' : cihaz.durum}
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '16px' }}>
                      {cihaz.kalibrasyon_bitis ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem' }}>
                          <Calendar size={14} color="var(--primary)" />
                          {new Date(cihaz.kalibrasyon_bitis).toLocaleDateString('tr-TR')}
                        </div>
                      ) : (
                        <span style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>Gerekmiyor</span>
                      )}
                    </td>
                    <td style={{ padding: '16px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                        {isOnMe ? (
                          <div style={{ display: 'flex', gap: '8px', marginRight: canEdit ? '8px' : '0', paddingRight: canEdit ? '8px' : '0', borderRight: canEdit ? '1px solid var(--list-item-border)' : 'none' }}>
                            <button className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '0.8rem', color: 'var(--primary)' }} onClick={() => setDevirModal(cihaz.cihaz_id)}>
                              <ArrowRight size={14} style={{ marginRight: '4px' }}/> Devret
                            </button>
                          </div>
                        ) : cihaz.anlik_kullanici_id ? (
                          <div style={{ display: 'flex', gap: '8px', marginRight: canEdit ? '8px' : '0', paddingRight: canEdit ? '8px' : '0', borderRight: canEdit ? '1px solid var(--list-item-border)' : 'none' }}>
                            <button className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '0.8rem', color: 'var(--success)' }} onClick={() => handleIsteme(cihaz.cihaz_id)} disabled={isTransferring}>
                              <Hand size={14} style={{ marginRight: '4px' }}/> İste
                            </button>
                            <button className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '0.8rem', color: 'var(--accent)' }} onClick={() => setTakasModal(cihaz)}>
                              <ArrowRightLeft size={14} style={{ marginRight: '4px' }}/> Takas Teklif Et
                            </button>
                          </div>
                        ) : (currentSession?.role === 'Sef' || currentSession?.role === 'Mudur' || currentSession?.role === 'Admin') ? (
                          <div style={{ display: 'flex', gap: '8px', marginRight: canEdit ? '8px' : '0', paddingRight: canEdit ? '8px' : '0', borderRight: canEdit ? '1px solid var(--list-item-border)' : 'none' }}>
                            <button className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '0.8rem', color: 'var(--success)' }} onClick={() => handleIsteme(cihaz.cihaz_id)} disabled={isTransferring}>
                              <Hand size={14} style={{ marginRight: '4px' }}/> Depodan İste
                            </button>
                          </div>
                        ) : null}

                        {canEdit && (
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <Link href={`/cihazlar/${cihaz.cihaz_id}/duzenle`} className="btn btn-secondary" style={{ padding: '8px', textDecoration: 'none' }} title="Düzenle">
                              <Edit size={16} />
                            </Link>
                            <form action={async () => {
                              if (confirm('Bu cihazı silmek istediğinizden emin misiniz?')) {
                                await deleteCihaz(cihaz.cihaz_id)
                              }
                            }}>
                              <button type="submit" className="btn btn-secondary" style={{ padding: '8px', color: 'var(--danger)' }} title="Sil">
                                <Trash2 size={16} />
                              </button>
                            </form>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Devir Modalı */}
      {devirModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'var(--modal-overlay)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div className="glass-card" style={{ width: '400px', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--primary)' }}>
                <ArrowRight size={20} /> Cihaz Devret
              </h3>
              <button onClick={() => setDevirModal(null)} style={{ background: 'none', border: 'none', color: 'var(--foreground)', cursor: 'pointer' }}><X size={20} /></button>
            </div>
            <div className="input-group">
              <label>Kime Devredilecek?</label>
              <SearchableSelect 
                options={aktifKullanicilar.filter(k => k.kullanici_id !== userId).map(k => ({ value: k.kullanici_id, label: `${k.ad} ${k.soyad}` }))}
                value={devirHedefKullanici}
                onChange={setDevirHedefKullanici}
                placeholder="-- Kullanıcı Seçin --"
              />
            </div>
            <button className="btn btn-primary" style={{ width: '100%', marginTop: '16px' }} disabled={isTransferring || !devirHedefKullanici} onClick={() => handleDevir(devirModal)}>
              {isTransferring ? 'İstek Gönderiliyor...' : 'Devir İsteği Gönder'}
            </button>
          </div>
        </div>
      )}

      {/* Takas Modalı */}
      {takasModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'var(--modal-overlay)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div className="glass-card" style={{ width: '400px', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent)' }}>
                <ArrowRightLeft size={20} /> Takas Teklifi
              </h3>
              <button onClick={() => setTakasModal(null)} style={{ background: 'none', border: 'none', color: 'var(--foreground)', cursor: 'pointer' }}><X size={20} /></button>
            </div>
            
            <p style={{ fontSize: '0.9rem', color: 'var(--muted)', marginBottom: '16px' }}>
              <strong>{takasModal.anlik_kullanici.ad} {takasModal.anlik_kullanici.soyad}</strong> adlı kullanıcıdan <strong>{takasModal.marka} {takasModal.model}</strong> cihazını istiyorsunuz.
              <br/><br/>
              Lütfen karşılığında vereceğiniz <u>aynı türdeki</u> cihazınızı seçin:
            </p>

            <div className="input-group">
              <label>Kendi Cihazınız ({takasModal.cihaz_turu || 'Tür Belirtilmemiş'})</label>
              <SearchableSelect 
                options={benimCihazlarim.filter(c => c.cihaz_turu === takasModal.cihaz_turu).map(c => ({ value: c.cihaz_id, label: `${c.marka} ${c.model} - ${c.seri_no}` }))}
                value={takasBenimCihazim}
                onChange={setTakasBenimCihazim}
                placeholder="-- Cihazınızı Seçin --"
              />
            </div>
            
            {benimCihazlarim.filter(c => c.cihaz_turu === takasModal.cihaz_turu).length === 0 && (
              <div style={{ color: 'var(--danger)', fontSize: '0.85rem', marginTop: '8px' }}>
                Elinizde bu cihazla aynı türde ({takasModal.cihaz_turu || 'Tür Belirtilmemiş'}) takas edebileceğiniz bir cihaz bulunmuyor.
              </div>
            )}

            <button className="btn btn-primary" style={{ width: '100%', marginTop: '16px' }} disabled={isTransferring || !takasBenimCihazim} onClick={handleTakas}>
              {isTransferring ? 'İstek Gönderiliyor...' : 'Takas Teklifini Gönder'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
