'use client'

import { useState } from 'react'
import { Wrench, Edit, Trash2, Search, Calendar, Repeat, ArrowRight, X } from 'lucide-react'
import { deleteJig } from '@/actions/jig'
import { createDevirIstegi } from '@/actions/transfer'
import Link from 'next/link'

export default function JigListesi({ jigler, currentSession, aktifKullanicilar }: { jigler: any[], currentSession: any, aktifKullanicilar: any[] }) {
  const [searchTerm, setSearchTerm] = useState('')
  const [devirModal, setDevirModal] = useState<string | null>(null)
  const [hedefKullanici, setHedefKullanici] = useState('')
  const [isTransferring, setIsTransferring] = useState(false)

  const userId = currentSession?.userId

  const handleDevir = async (jigId: string) => {
    if (!hedefKullanici) return
    setIsTransferring(true)
    await createDevirIstegi(hedefKullanici, undefined, jigId)
    setIsTransferring(false)
    setDevirModal(null)
  }

  const searchLower = searchTerm.toLowerCase()
  const filtered = jigler.filter(j => 
    j.jig_adi?.toLowerCase().includes(searchLower) ||
    j.seri_no?.toLowerCase().includes(searchLower) ||
    j.stok_no?.toLowerCase().includes(searchLower) ||
    j.kategori?.toLowerCase().includes(searchLower) ||
    j.kullanilan_yer?.toLowerCase().includes(searchLower) ||
    j.kullanilma_amaci?.toLowerCase().includes(searchLower) ||
    j.durum?.toLowerCase().includes(searchLower) ||
    j.notlar?.toLowerCase().includes(searchLower) ||
    j.anlik_kullanici?.ad?.toLowerCase().includes(searchLower) ||
    j.anlik_kullanici?.soyad?.toLowerCase().includes(searchLower)
  )

  const canEdit = currentSession?.role && currentSession.role !== 'Standart'

  return (
    <div className="glass-card stagger-1">
      <div style={{ display: 'flex', gap: '16px', marginBottom: '24px' }}>
        <div className="input-group" style={{ marginBottom: 0, flex: 1, flexDirection: 'row', alignItems: 'center', background: 'var(--input-bg)', border: '1px solid var(--card-border)', borderRadius: 'var(--radius-sm)', padding: '0 12px' }}>
          <Search size={18} color="var(--muted)" />
          <input 
            type="text" 
            placeholder="Jig Adı, Stok/Seri No, Kategori, Durum, Konum veya Kullanıcı ara..." 
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
              <th style={{ padding: '16px', color: 'var(--muted)', fontWeight: 600, fontSize: '0.9rem' }}>Fikstür Bilgisi</th>
              <th style={{ padding: '16px', color: 'var(--muted)', fontWeight: 600, fontSize: '0.9rem' }}>Stok / Seri No</th>
              <th style={{ padding: '16px', color: 'var(--muted)', fontWeight: 600, fontSize: '0.9rem' }}>Kategori & Konum</th>
              <th style={{ padding: '16px', color: 'var(--muted)', fontWeight: 600, fontSize: '0.9rem' }}>Zimmet Durumu</th>
              <th style={{ padding: '16px', color: 'var(--muted)', fontWeight: 600, fontSize: '0.9rem' }}>Bakım Tarihi</th>
              <th style={{ padding: '16px', color: 'var(--muted)', fontWeight: 600, fontSize: '0.9rem', textAlign: 'right' }}>İşlemler</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: '32px', textAlign: 'center', color: 'var(--muted)' }}>
                  Arama kriterlerine uygun jig/fikstür bulunamadı.
                </td>
              </tr>
            ) : (
              filtered.map((jig) => {
                const isOnMe = jig.anlik_kullanici?.kullanici_id === currentSession?.userId
                return (
                  <tr key={jig.jig_id} style={{ borderBottom: '1px solid var(--list-item-border)', transition: 'var(--transition)' }}>
                    <td style={{ padding: '16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: 'var(--glass-icon-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)' }}>
                          <Wrench size={22} />
                        </div>
                        <div>
                          <div style={{ fontWeight: 600 }}>{jig.jig_adi}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '16px' }}>
                      <div style={{ fontSize: '0.9rem' }}>Stok: <span style={{ color: 'var(--muted)' }}>{jig.stok_no || '-'}</span></div>
                      <div style={{ fontSize: '0.9rem' }}>Seri: <span style={{ color: 'var(--muted)' }}>{jig.seri_no || '-'}</span></div>
                    </td>
                    <td style={{ padding: '16px' }}>
                      <div style={{ fontSize: '0.9rem' }}>{jig.kategori || '-'}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>{jig.kullanilan_yer || '-'}</div>
                    </td>
                    <td style={{ padding: '16px' }}>
                      {jig.anlik_kullanici ? (
                        <div style={{ fontSize: '0.9rem', color: isOnMe ? 'var(--primary)' : 'var(--foreground)' }}>
                          {isOnMe ? 'Bende' : `${jig.anlik_kullanici.ad} ${jig.anlik_kullanici.soyad}`}
                        </div>
                      ) : (
                        <span className={`badge ${
                          jig.durum === 'Aktif' ? 'badge-success' : 
                          jig.durum === 'Bakımda' ? 'badge-warning' : 
                          'badge-danger'
                        }`}>
                          {jig.durum === 'Aktif' ? 'Depoda' : jig.durum}
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '16px' }}>
                      {jig.bakim_tarihi ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem' }}>
                          <Calendar size={14} color="var(--primary)" />
                          {new Date(jig.bakim_tarihi).toLocaleDateString('tr-TR')}
                        </div>
                      ) : (
                        <span style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>Belirtilmedi</span>
                      )}
                    </td>
                    <td style={{ padding: '16px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                        {jig.anlik_kullanici_id === userId && (
                          <div style={{ display: 'flex', gap: '8px', marginRight: canEdit ? '8px' : '0', paddingRight: canEdit ? '8px' : '0', borderRight: canEdit ? '1px solid var(--list-item-border)' : 'none' }}>
                            <button className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '0.8rem', color: 'var(--primary)' }} onClick={() => setDevirModal(jig.jig_id)}>Devret</button>
                          </div>
                        )}
                        {isOnMe && (
                          <button className="btn btn-secondary" style={{ padding: '8px', color: 'var(--accent)' }} title="Devret / Takas Et">
                            <Repeat size={16} />
                          </button>
                        )}
                        {canEdit && (
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <Link href={`/jigler/${jig.jig_id}/duzenle`} className="btn btn-secondary" style={{ padding: '8px', textDecoration: 'none' }} title="Düzenle">
                              <Edit size={16} />
                            </Link>
                            <form action={async () => {
                              if (confirm('Bu jigi silmek istediğinizden emin misiniz?')) {
                                await deleteJig(jig.jig_id)
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
                <ArrowRight size={20} /> Jig Devret
              </h3>
              <button onClick={() => setDevirModal(null)} style={{ background: 'none', border: 'none', color: 'var(--foreground)', cursor: 'pointer' }}><X size={20} /></button>
            </div>
            <div className="input-group">
              <label>Kime Devredilecek?</label>
              <select className="input-field" value={hedefKullanici} onChange={e => setHedefKullanici(e.target.value)}>
                <option value="">-- Kullanıcı Seçin --</option>
                {aktifKullanicilar.filter(k => k.kullanici_id !== userId).map(k => (
                  <option key={k.kullanici_id} value={k.kullanici_id}>{k.ad} {k.soyad}</option>
                ))}
              </select>
            </div>
            <button className="btn btn-primary" style={{ width: '100%', marginTop: '16px' }} disabled={isTransferring} onClick={() => handleDevir(devirModal)}>
              {isTransferring ? 'İstek Gönderiliyor...' : 'Devir İsteği Gönder'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
