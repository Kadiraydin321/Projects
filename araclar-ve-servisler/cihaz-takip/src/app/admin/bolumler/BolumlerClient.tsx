'use client'

import { useState } from 'react'
import { Plus, Trash2, Edit, Save, X } from 'lucide-react'
import { addBolum, deleteBolum, updateBolum } from '@/actions/admin'

export default function BolumlerClient({ initialData, mudurler }: { initialData: any[], mudurler: any[] }) {
  const [bolumAdi, setBolumAdi] = useState('')
  const [mudurId, setMudurId] = useState('')
  const [editId, setEditId] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleEdit = (b: any) => {
    setBolumAdi(b.bolum_adi)
    setMudurId(b.bagli_mudur_id || '')
    setEditId(b.bolum_id)
  }

  const handleCancel = () => {
    setBolumAdi('')
    setMudurId('')
    setEditId(null)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!bolumAdi) return
    setIsSubmitting(true)
    
    let res;
    if (editId) {
      res = await updateBolum(editId, bolumAdi, mudurId)
    } else {
      res = await addBolum(bolumAdi, mudurId)
    }
    
    setIsSubmitting(false)
    if (res.success) {
      handleCancel()
    } else {
      alert(res.error)
    }
  }

  return (
    <div>
      <form onSubmit={handleSave} style={{ display: 'flex', gap: '12px', marginBottom: '32px', flexWrap: 'wrap' }}>
        <input 
          type="text" 
          className="admin-input" 
          placeholder="Bölüm adı (Örn: Ar-Ge)" 
          value={bolumAdi}
          onChange={e => setBolumAdi(e.target.value)}
          required
          style={{ flex: 1, minWidth: '200px' }}
        />
        <select 
          className="admin-input" 
          value={mudurId} 
          onChange={e => setMudurId(e.target.value)}
          style={{ flex: 1, minWidth: '200px' }}
        >
          <option value="">-- Sorumlu Müdür Seçin (İsteğe Bağlı) --</option>
          {mudurler.map(m => (
            <option key={m.kullanici_id} value={m.kullanici_id}>{m.ad} {m.soyad}</option>
          ))}
        </select>
        <button type="submit" className="admin-btn" disabled={isSubmitting} style={{ whiteSpace: 'nowrap' }}>
          {editId ? <><Save size={18} /> Güncelle</> : <><Plus size={18} /> Ekle</>}
        </button>
        {editId && (
          <button type="button" className="admin-btn" onClick={handleCancel} style={{ background: 'transparent', border: '1px solid #475569' }}>
            <X size={18} /> İptal
          </button>
        )}
      </form>

      <table className="admin-table">
        <thead>
          <tr>
            <th>Bölüm Adı</th>
            <th>Sorumlu Müdür</th>
            <th style={{ textAlign: 'right', width: '120px' }}>İşlem</th>
          </tr>
        </thead>
        <tbody>
          {initialData.map(b => (
            <tr key={b.bolum_id}>
              <td>{b.bolum_adi}</td>
              <td>{b.mudur ? `${b.mudur.ad} ${b.mudur.soyad}` : '-'}</td>
              <td style={{ textAlign: 'right' }}>
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                  <button type="button" className="admin-btn" style={{ padding: '6px', background: 'var(--item-bg)' }} onClick={() => handleEdit(b)} title="Düzenle">
                    <Edit size={16} />
                  </button>
                  <form action={async () => {
                    if (confirm('Bölümü silmek istediğinize emin misiniz? (Bölümdeki kullanıcılar etkilenebilir)')) {
                      const res = await deleteBolum(b.bolum_id)
                      if (!res.success) alert(res.error)
                    }
                  }}>
                    <button type="submit" className="admin-btn danger" style={{ padding: '6px' }} title="Sil">
                      <Trash2 size={16} />
                    </button>
                  </form>
                </div>
              </td>
            </tr>
          ))}
          {initialData.length === 0 && (
            <tr>
              <td colSpan={3} style={{ textAlign: 'center', color: '#64748B' }}>Henüz bölüm eklenmemiş.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
