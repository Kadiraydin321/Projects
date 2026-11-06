'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Save, UserPlus, AlertCircle } from 'lucide-react'
import Link from 'next/link'
import { createKullanici, updateKullanici } from '@/actions/kullanici'

export default function YeniKullaniciForm({ bolumler, session, initialData, roller }: { bolumler: any[], session: any, initialData?: any, roller?: any[] }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [telefon, setTelefon] = useState(initialData?.telefon || '')
  const [yetkiSeviyesi, setYetkiSeviyesi] = useState(initialData?.yetki_seviyesi || 'Standart')

  const isEdit = !!initialData
  const isAdmin = session?.role === 'Admin'

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let input = e.target.value.replace(/\D/g, '')
    if (input.startsWith('0')) input = input.substring(1)
    
    let formatted = ''
    if (input.length > 0) formatted += '(' + input.substring(0, 3)
    if (input.length >= 4) formatted += ') ' + input.substring(3, 6)
    if (input.length >= 7) formatted += ' ' + input.substring(6, 8)
    if (input.length >= 9) formatted += ' ' + input.substring(8, 10)
    
    setTelefon(formatted)
  }

  async function handleSubmit(formData: FormData) {
    setLoading(true)
    setError('')
    
    let res;
    if (isEdit) {
      res = await updateKullanici(initialData.kullanici_id, formData)
    } else {
      res = await createKullanici(formData)
    }
    
    if (res.success) {
      router.push('/kullanicilar')
      router.refresh()
    } else {
      setError(res.error || 'Bir hata oluştu')
      setLoading(false)
    }
  }

  return (
    <div className="container animate-fade-in">
      <div style={{ marginBottom: '24px' }}>
        <Link href="/kullanicilar" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: 'var(--muted)', fontSize: '0.9rem', marginBottom: '16px' }}>
          <ArrowLeft size={16} /> Kullanıcılara Dön
        </Link>
        <h1 style={{ fontSize: '2rem', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <UserPlus color="var(--primary)" />
          {isEdit ? 'Kullanıcıyı Düzenle' : 'Yeni Kullanıcı Ekle'}
        </h1>
      </div>

      <div className="glass-card" style={{ maxWidth: '800px' }}>
        {error && (
          <div style={{ background: 'var(--danger-subtle)', border: '1px solid rgba(239, 68, 68, 0.2)', color: 'var(--danger)', padding: '16px', borderRadius: 'var(--radius-sm)', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <AlertCircle size={20} />
            {error}
          </div>
        )}

        <form action={handleSubmit}>
          <div className="grid-cards" style={{ gridTemplateColumns: '1fr 1fr', gap: '16px 24px', marginBottom: '24px' }}>
            <div className="input-group">
              <label htmlFor="ad">Ad *</label>
              <input type="text" id="ad" name="ad" className="input-field" required defaultValue={initialData?.ad || ''} />
            </div>
            <div className="input-group">
              <label htmlFor="soyad">Soyad *</label>
              <input type="text" id="soyad" name="soyad" className="input-field" required defaultValue={initialData?.soyad || ''} />
            </div>
            
            <div className="input-group">
              <label htmlFor="email">E-Posta Adresi *</label>
              <input type="email" id="email" name="email" className="input-field" required defaultValue={initialData?.email || ''} />
            </div>
            
            <div className="input-group">
              <label htmlFor="sifre">Şifre {isEdit ? '(Boş bırakırsanız değişmez)' : '*'}</label>
              <input type="password" id="sifre" name="sifre" className="input-field" placeholder="Giriş şifresi" required={!isEdit} />
            </div>

            <div className="input-group">
              <label htmlFor="telefon">Telefon</label>
              <input 
                type="tel" 
                id="telefon" 
                name="telefon" 
                className="input-field" 
                value={telefon}
                onChange={handlePhoneChange}
                placeholder="(5XX) XXX XX XX"
                maxLength={15}
              />
            </div>

            <div className="input-group">
              <label htmlFor="unvan">Ünvan / Meslek</label>
              <input type="text" id="unvan" name="unvan" className="input-field" defaultValue={initialData?.unvan || ''} />
            </div>

            <div className="input-group">
              <label htmlFor="yetki_seviyesi">Yetki Seviyesi *</label>
              <select 
                id="yetki_seviyesi" 
                name="yetki_seviyesi" 
                className="input-field" 
                value={yetkiSeviyesi}
                onChange={(e) => setYetkiSeviyesi(e.target.value)}
                required 
                style={{ appearance: 'auto', background: 'var(--input-bg)' }}
              >
                {roller ? (
                  roller.map(r => (
                    <option key={r.ad} value={r.ad}>{r.ad}</option>
                  ))
                ) : (
                  <>
                    <option value="Standart">Standart (Personel)</option>
                    {(session?.role === 'Admin' || session?.role === 'Müdür') && <option value="Şef">Şef</option>}
                    {session?.role === 'Admin' && <option value="Müdür">Müdür</option>}
                    {session?.role === 'Admin' && <option value="Admin">Admin</option>}
                  </>
                )}
              </select>
            </div>
            
            <div className="input-group">
              <label htmlFor="durum">Hesap Durumu *</label>
              <select id="durum" name="durum" className="input-field" required style={{ appearance: 'auto', background: 'var(--input-bg)' }} defaultValue={initialData?.durum || 'Aktif'}>
                <option value="Aktif">Aktif</option>
                <option value="Pasif">Pasif</option>
              </select>
            </div>

            {yetkiSeviyesi !== 'Admin' && (
              <div className="input-group">
                <label htmlFor="bolum_id">Bağlı Olduğu Bölüm {isAdmin ? '*' : ''}</label>
                {isAdmin ? (
                  <select id="bolum_id" name="bolum_id" className="input-field" required style={{ appearance: 'auto', background: 'var(--input-bg)' }} defaultValue={initialData?.bolum_id || ''}>
                    <option value="">-- Bölüm Seçiniz --</option>
                    {bolumler.map(b => (
                      <option key={b.bolum_id} value={b.bolum_id}>{b.bolum_adi}</option>
                    ))}
                  </select>
                ) : (
                  <div style={{ padding: '12px', background: 'var(--input-bg)', border: '1px solid var(--card-border)', borderRadius: 'var(--radius-sm)', color: 'var(--muted)' }}>
                    Kendi bölümünüze atanacaktır.
                    <input type="hidden" name="bolum_id" value={session?.bolumId || ''} />
                  </div>
                )}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', borderTop: '1px solid var(--card-border)', paddingTop: '24px' }}>
            <Link href="/kullanicilar" className="btn btn-secondary">İptal</Link>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              <Save size={18} />
              {loading ? 'Kaydediliyor...' : 'Kullanıcıyı Kaydet'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
