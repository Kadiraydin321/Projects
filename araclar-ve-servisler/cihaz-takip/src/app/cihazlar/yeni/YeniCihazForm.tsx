'use client'

import { createCihaz, updateCihaz } from '@/actions/cihaz'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Save, AlertCircle } from 'lucide-react'
import Link from 'next/link'

export default function YeniCihazForm({ initialData }: { initialData?: any }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const isEdit = !!initialData

  async function handleSubmit(formData: FormData) {
    setLoading(true)
    setError('')
    
    let res;
    if (isEdit) {
      res = await updateCihaz(initialData.cihaz_id, formData)
    } else {
      res = await createCihaz(formData)
    }
    
    if (res.success) {
      router.push('/cihazlar')
      router.refresh()
    } else {
      setError(res.error || 'Bir hata oluştu')
      setLoading(false)
    }
  }

  const formatInitialDate = (dateString: string) => {
    if (!dateString) return ''
    return new Date(dateString).toISOString().split('T')[0]
  }

  return (
    <>
      {error && (
        <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', color: 'var(--danger)', padding: '16px', borderRadius: 'var(--radius-sm)', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px', maxWidth: '1000px' }}>
          <AlertCircle size={20} />
          {error}
        </div>
      )}

      <form action={handleSubmit}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', maxWidth: '1000px' }}>
          
          {/* Sol Kolon - Temel Bilgiler */}
          <div className="glass-card" style={{ padding: '32px' }}>
            <h3 style={{ borderBottom: '1px solid var(--card-border)', paddingBottom: '12px', marginBottom: '24px', color: 'var(--primary)' }}>Temel Bilgiler</h3>
            
            <div className="input-group">
              <label htmlFor="marka">Marka *</label>
              <input type="text" id="marka" name="marka" className="input-field" required defaultValue={initialData?.marka || ''} />
            </div>
            
            <div className="input-group">
              <label htmlFor="model">Model *</label>
              <input type="text" id="model" name="model" className="input-field" required defaultValue={initialData?.model || ''} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="input-group">
                <label htmlFor="seri_no">Seri No</label>
                <input type="text" id="seri_no" name="seri_no" className="input-field" defaultValue={initialData?.seri_no || ''} />
              </div>
              <div className="input-group">
                <label htmlFor="envanter_no">Envanter No / Barkod</label>
                <input type="text" id="envanter_no" name="envanter_no" className="input-field" defaultValue={initialData?.envanter_no || ''} />
              </div>
            </div>

            <div className="input-group">
              <label htmlFor="cihaz_turu">Cihaz Türü</label>
              <select id="cihaz_turu" name="cihaz_turu" className="input-field" style={{ appearance: 'auto', background: 'rgba(15, 23, 42, 0.8)' }} defaultValue={initialData?.cihaz_turu?.toLocaleUpperCase('tr-TR') || ''}>
                <option value="">-- Seçiniz --</option>
                <option value="ÖLÇÜM CİHAZI">Ölçüm Cihazı</option>
                <option value="TEST CİHAZI">Test Cihazı</option>
                <option value="KALİBRATÖR">Kalibratör</option>
                <option value="DİĞER">Diğer</option>
              </select>
            </div>

            <div className="input-group">
              <label htmlFor="kullanilan_yer">Kullanılacak Bölüm / İstasyon</label>
              <input type="text" id="kullanilan_yer" name="kullanilan_yer" className="input-field" defaultValue={initialData?.kullanilan_yer || ''} />
            </div>
          </div>

          {/* Sağ Kolon - Durum & Kalibrasyon & Ekstra */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            
            {/* Durum & Garanti */}
            <div className="glass-card" style={{ padding: '32px' }}>
              <h3 style={{ borderBottom: '1px solid var(--card-border)', paddingBottom: '12px', marginBottom: '24px', color: 'var(--primary)' }}>Satın Alma & Durum</h3>
              
              <div className="input-group">
                <label htmlFor="durum">Cihaz Durumu *</label>
                <select id="durum" name="durum" className="input-field" required style={{ appearance: 'auto', background: 'rgba(15, 23, 42, 0.8)' }} defaultValue={initialData?.durum || 'Aktif'}>
                  <option value="Aktif">Aktif / Kullanımda</option>
                  <option value="Bakımda">Bakımda</option>
                  <option value="Hurda">Hurda / Kalibre Edilemez</option>
                  <option value="Kayıp">Kayıp</option>
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="input-group">
                  <label htmlFor="satin_alma_tarihi">Satın Alma Tarihi</label>
                  <input type="date" id="satin_alma_tarihi" name="satin_alma_tarihi" className="input-field" style={{ colorScheme: 'dark' }} defaultValue={formatInitialDate(initialData?.satin_alma_tarihi)} />
                </div>
                <div className="input-group">
                  <label htmlFor="garanti_bitis_tarihi">Garanti Bitiş Tarihi</label>
                  <input type="date" id="garanti_bitis_tarihi" name="garanti_bitis_tarihi" className="input-field" style={{ colorScheme: 'dark' }} defaultValue={formatInitialDate(initialData?.garanti_bitis_tarihi)} />
                </div>
              </div>
            </div>

            {/* Kalibrasyon Bilgileri */}
            <div className="glass-card" style={{ padding: '32px' }}>
              <h3 style={{ borderBottom: '1px solid var(--card-border)', paddingBottom: '12px', marginBottom: '24px', color: 'var(--accent)' }}>Kalibrasyon Takibi</h3>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="input-group">
                  <label htmlFor="kalibrasyon_baslangic">Son Kalibrasyon Tarihi</label>
                  <input type="date" id="kalibrasyon_baslangic" name="kalibrasyon_baslangic" className="input-field" style={{ colorScheme: 'dark' }} defaultValue={formatInitialDate(initialData?.kalibrasyon_baslangic)} />
                </div>
                <div className="input-group">
                  <label htmlFor="kalibrasyon_bitis">Geçerlilik Bitiş (Due Date)</label>
                  <input type="date" id="kalibrasyon_bitis" name="kalibrasyon_bitis" className="input-field" style={{ colorScheme: 'dark' }} defaultValue={formatInitialDate(initialData?.kalibrasyon_bitis)} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="input-group">
                  <label htmlFor="kalibrasyon_sikligi">Periyot (Sıklık)</label>
                  <input type="text" id="kalibrasyon_sikligi" name="kalibrasyon_sikligi" placeholder="Örn: 6 Ay, 1 Yıl" className="input-field" defaultValue={initialData?.kalibrasyon_sikligi || ''} />
                </div>
                <div className="input-group">
                  <label htmlFor="kalibrasyon_firma">Kalibrasyon Firması</label>
                  <input type="text" id="kalibrasyon_firma" name="kalibrasyon_firma" placeholder="TSE, İç Kalibrasyon vb." className="input-field" defaultValue={initialData?.kalibrasyon_firma || ''} />
                </div>
              </div>
            </div>

          </div>

          {/* Tam Genişlik - Ekstra Alanlar */}
          <div className="glass-card" style={{ gridColumn: '1 / -1', padding: '32px' }}>
            <h3 style={{ borderBottom: '1px solid var(--card-border)', paddingBottom: '12px', marginBottom: '24px', color: 'var(--success)' }}>Ekstra Detaylar & Dosyalar</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
              <div className="input-group">
                <label htmlFor="fotograf_url">Cihaz Fotoğraf Linki (URL)</label>
                <input type="url" id="fotograf_url" name="fotograf_url" placeholder="https://..." className="input-field" defaultValue={initialData?.fotograf_url || ''} />
              </div>
              <div className="input-group">
                <label htmlFor="notlar">Özel Notlar</label>
                <textarea id="notlar" name="notlar" rows={3} placeholder="Cihazın özellikleri, kullanım kısıtlamaları vb..." className="input-field" style={{ resize: 'vertical' }} defaultValue={initialData?.notlar || ''}></textarea>
              </div>
            </div>
          </div>
          
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '32px', maxWidth: '1000px' }}>
          <Link href="/cihazlar" className="btn btn-secondary" style={{ padding: '12px 24px' }}>İptal</Link>
          <button type="submit" className="btn btn-primary" style={{ padding: '12px 32px' }} disabled={loading}>
            <Save size={20} />
            {loading ? 'Kaydediliyor...' : (isEdit ? 'Cihazı Güncelle' : 'Cihazı Depoya Ekle')}
          </button>
        </div>
      </form>
    </>
  )
}
