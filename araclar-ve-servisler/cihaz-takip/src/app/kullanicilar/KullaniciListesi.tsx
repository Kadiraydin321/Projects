'use client'

import { useState } from 'react'
import { UserCircle, Edit, Trash2, Search } from 'lucide-react'
import Link from 'next/link'
import { deleteKullanici } from '@/actions/kullanici'

export default function KullaniciListesi({ kullanicilar, currentSession }: { kullanicilar: any[], currentSession: any }) {
  const [searchTerm, setSearchTerm] = useState('')

  const searchLower = searchTerm.toLowerCase()
  const filtered = kullanicilar.filter(k => 
    (k.ad + ' ' + k.soyad).toLowerCase().includes(searchLower) ||
    k.sicil_no?.toLowerCase().includes(searchLower) ||
    k.email?.toLowerCase().includes(searchLower) ||
    k.telefon?.toLowerCase().includes(searchLower) ||
    k.yetki_seviyesi?.toLowerCase().includes(searchLower) ||
    k.durum?.toLowerCase().includes(searchLower) ||
    k.bolum?.bolum_adi?.toLowerCase().includes(searchLower)
  )

  const canEditUser = (targetRole: string) => {
    if (currentSession.role === 'Admin') return true
    if (currentSession.role === 'Müdür' && (targetRole === 'Şef' || targetRole === 'Standart')) return true
    if (currentSession.role === 'Şef' && targetRole === 'Standart') return true
    return false
  }

  const hasAnyEditPermission = currentSession.role === 'Admin' || currentSession.role === 'Müdür' || currentSession.role === 'Şef'

  return (
    <div className="glass-card stagger-1">
      <div style={{ display: 'flex', gap: '16px', marginBottom: '24px' }}>
        <div className="input-group" style={{ marginBottom: 0, flex: 1, flexDirection: 'row', alignItems: 'center', background: 'var(--input-bg)', border: '1px solid var(--card-border)', borderRadius: 'var(--radius-sm)', padding: '0 12px' }}>
          <Search size={18} color="var(--muted)" />
          <input 
            type="text" 
            placeholder="İsim, e-posta, telefon, bölüm veya yetki ile ara..." 
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
              <th style={{ padding: '16px', color: 'var(--muted)', fontWeight: 600, fontSize: '0.9rem' }}>Personel</th>
              <th style={{ padding: '16px', color: 'var(--muted)', fontWeight: 600, fontSize: '0.9rem' }}>İletişim</th>
              <th style={{ padding: '16px', color: 'var(--muted)', fontWeight: 600, fontSize: '0.9rem' }}>Bölüm</th>
              <th style={{ padding: '16px', color: 'var(--muted)', fontWeight: 600, fontSize: '0.9rem' }}>Yetki</th>
              <th style={{ padding: '16px', color: 'var(--muted)', fontWeight: 600, fontSize: '0.9rem' }}>Durum</th>
              {hasAnyEditPermission && <th style={{ padding: '16px', color: 'var(--muted)', fontWeight: 600, fontSize: '0.9rem', textAlign: 'right' }}>İşlemler</th>}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={hasAnyEditPermission ? 6 : 5} style={{ padding: '32px', textAlign: 'center', color: 'var(--muted)' }}>
                  Arama kriterlerine uygun kullanıcı bulunamadı.
                </td>
              </tr>
            ) : (
              filtered.map((user) => (
                <tr key={user.kullanici_id} style={{ borderBottom: '1px solid var(--list-item-border)', transition: 'var(--transition)' }}>
                  <td style={{ padding: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--glass-icon-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}>
                        <UserCircle size={24} />
                      </div>
                      <div>
                        <div style={{ fontWeight: 600 }}>{user.ad} {user.soyad}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>{user.sicil_no || '-'}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '16px' }}>
                    <div style={{ fontSize: '0.9rem' }}>{user.email}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>{user.telefon || '-'}</div>
                  </td>
                  <td style={{ padding: '16px', fontSize: '0.9rem' }}>{user.bolum?.bolum_adi || '-'}</td>
                  <td style={{ padding: '16px' }}>
                    <span className={`badge ${user.yetki_seviyesi === 'Müdür' ? 'badge-danger' : user.yetki_seviyesi === 'Şef' ? 'badge-warning' : user.yetki_seviyesi === 'Admin' ? 'badge-primary' : 'badge-success'}`}>
                      {user.yetki_seviyesi}
                    </span>
                  </td>
                  <td style={{ padding: '16px' }}>
                    <span className={`badge ${user.durum === 'Aktif' ? 'badge-success' : 'badge-danger'}`}>
                      {user.durum}
                    </span>
                  </td>
                  <td style={{ padding: '16px', textAlign: 'right' }}>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                      {canEditUser(user.yetki_seviyesi) && (
                        <>
                          <Link href={`/kullanicilar/${user.kullanici_id}/duzenle`} className="btn btn-secondary" style={{ padding: '8px', textDecoration: 'none' }} title="Düzenle">
                            <Edit size={16} />
                          </Link>
                          {currentSession.role === 'Admin' && (
                            <form action={async () => {
                              if (confirm('Bu kullanıcıyı silmek istediğinizden emin misiniz?')) {
                                await deleteKullanici(user.kullanici_id)
                              }
                            }}>
                              <button type="submit" className="btn btn-secondary" style={{ padding: '8px', color: 'var(--danger)', cursor: 'pointer' }} title="Sil">
                                <Trash2 size={16} />
                              </button>
                            </form>
                          )}
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
