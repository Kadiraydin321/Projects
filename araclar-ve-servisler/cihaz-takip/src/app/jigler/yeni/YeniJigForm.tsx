'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createJig, updateJig } from '@/actions/jig'
import { Save } from 'lucide-react'

export default function YeniJigForm({ initialData }: { initialData?: any }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const isEdit = !!initialData

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const formData = new FormData(e.currentTarget)
    let result;
    if (isEdit) {
      result = await updateJig(initialData.jig_id, formData)
    } else {
      result = await createJig(formData)
    }

    if (result.success) {
      router.push('/jigler')
      router.refresh()
    } else {
      setError(result.error || 'Bilinmeyen bir hata oluştu.')
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {error && (
        <div className="badge badge-danger" style={{ display: 'block', padding: '12px 16px', borderRadius: 'var(--radius-sm)', textTransform: 'none', letterSpacing: 'normal' }}>
          {error}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '24px' }}>
        
        {/* Sütun 1: Temel Bilgiler */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <h3 style={{ fontSize: '1.1rem', color: 'var(--accent)', borderBottom: '1px solid var(--card-border)', paddingBottom: '8px', marginBottom: '8px' }}>Temel Bilgiler</h3>
          
          <div className="input-group">
            <label htmlFor="jig_adi">Jig / Fikstür Adı *</label>
            <input type="text" id="jig_adi" name="jig_adi" className="input-field" required placeholder="Örn: Anakart Test Jigi" defaultValue={initialData?.jig_adi || ''} />
          </div>

          <div className="input-group">
            <label htmlFor="kategori">Kategori</label>
            <select id="kategori" name="kategori" className="input-field" defaultValue={initialData?.kategori?.toLocaleUpperCase('tr-TR') || ''}>
              <option value="">Seçiniz...</option>
              <option value="TEST JİGİ">Test Jigi</option>
              <option value="MONTAJ APARATI">Montaj Aparatı</option>
              <option value="LEHİMLEME FİKSTÜRÜ">Lehimleme Fikstürü</option>
              <option value="DİĞER">Diğer</option>
            </select>
          </div>

          <div className="input-group">
            <label htmlFor="durum">Durum *</label>
            <select id="durum" name="durum" className="input-field" required defaultValue={initialData?.durum || "Aktif"}>
              <option value="Aktif">Aktif (Kullanıma Hazır)</option>
              <option value="Bakımda">Bakımda</option>
              <option value="Hurda">Hurda / Kullanım Dışı</option>
            </select>
          </div>
        </div>

        {/* Sütun 2: Tanımlama Bilgileri */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <h3 style={{ fontSize: '1.1rem', color: 'var(--primary)', borderBottom: '1px solid var(--card-border)', paddingBottom: '8px', marginBottom: '8px' }}>Tanımlama ve Konum</h3>

          <div className="input-group">
            <label htmlFor="stok_no">Stok Numarası</label>
            <input type="text" id="stok_no" name="stok_no" className="input-field" placeholder="Örn: STK-2023-001" defaultValue={initialData?.stok_no || ''} />
          </div>

          <div className="input-group">
            <label htmlFor="seri_no">Seri Numarası</label>
            <input type="text" id="seri_no" name="seri_no" className="input-field" placeholder="Cihaz üzerindeki SN" defaultValue={initialData?.seri_no || ''} />
          </div>

          <div className="input-group">
            <label htmlFor="kullanilan_yer">Kullanılan Yer (Konum)</label>
            <input type="text" id="kullanilan_yer" name="kullanilan_yer" className="input-field" placeholder="Örn: SMD Hattı 2" defaultValue={initialData?.kullanilan_yer || ''} />
          </div>
          
          <div className="input-group">
            <label htmlFor="kullanilma_amaci">Kullanılma Amacı</label>
            <input type="text" id="kullanilma_amaci" name="kullanilma_amaci" className="input-field" placeholder="Örn: PCBA İşlevsellik Testi" defaultValue={initialData?.kullanilma_amaci || ''} />
          </div>
        </div>

        {/* Sütun 3: Bakım ve Ek Bilgiler */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <h3 style={{ fontSize: '1.1rem', color: 'var(--success)', borderBottom: '1px solid var(--card-border)', paddingBottom: '8px', marginBottom: '8px' }}>Bakım ve Diğer Bilgiler</h3>

          <div className="input-group">
            <label htmlFor="bakim_tarihi">Son/Gelecek Bakım Tarihi</label>
            <input type="date" id="bakim_tarihi" name="bakim_tarihi" className="input-field" defaultValue={initialData?.bakim_tarihi ? new Date(initialData.bakim_tarihi).toISOString().split('T')[0] : ''} />
          </div>

          <div className="input-group">
            <label htmlFor="fotograf_url">Fotoğraf URL (Opsiyonel)</label>
            <input type="url" id="fotograf_url" name="fotograf_url" className="input-field" placeholder="https://..." defaultValue={initialData?.fotograf_url || ''} />
          </div>

          <div className="input-group" style={{ flex: 1 }}>
            <label htmlFor="notlar">Ek Notlar</label>
            <textarea 
              id="notlar" 
              name="notlar" 
              className="input-field" 
              placeholder="Jig ile ilgili özel uyarılar, eksikler vb." 
              style={{ minHeight: '100px', resize: 'vertical' }}
              defaultValue={initialData?.notlar || ''}
            />
          </div>
        </div>

      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '16px', marginTop: '16px', paddingTop: '24px', borderTop: '1px solid var(--card-border)' }}>
        <button 
          type="button" 
          onClick={() => router.back()}
          className="btn btn-secondary"
          disabled={loading}
        >
          İptal
        </button>
        <button 
          type="submit" 
          className="btn btn-primary"
          disabled={loading}
        >
          <Save size={18} />
          {loading ? 'Kaydediliyor...' : (isEdit ? 'Jigi Güncelle' : 'Jigi Kaydet')}
        </button>
      </div>

    </form>
  )
}
