'use client'

import { useState } from 'react'
import { Plus, Trash2, Edit, Save, X } from 'lucide-react'
import { addCihazTuru, deleteCihazTuru, updateCihazTuru } from '@/actions/admin'

export default function CihazTurleriClient({ initialData }: { initialData: any[] }) {
  const [ad, setAd] = useState('')
  const [editId, setEditId] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleEdit = (t: any) => {
    setAd(t.ad)
    setEditId(t.id)
  }

  const handleCancel = () => {
    setAd('')
    setEditId(null)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!ad) return
    setIsSubmitting(true)
    
    let res;
    if (editId) {
      res = await updateCihazTuru(editId, ad)
    } else {
      res = await addCihazTuru(ad)
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
      <form onSubmit={handleSave} style={{ display: 'flex', gap: '12px', marginBottom: '32px' }}>
        <input 
          type="text" 
          className="admin-input" 
          placeholder="Cihaz türü (Örn: Monitör)" 
          value={ad}
          onChange={e => setAd(e.target.value)}
          required
        />
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
            <th>Cihaz Türü</th>
            <th style={{ textAlign: 'right', width: '120px' }}>İşlem</th>
          </tr>
        </thead>
        <tbody>
          {initialData.map(t => (
            <tr key={t.id}>
              <td>{t.ad}</td>
              <td style={{ textAlign: 'right' }}>
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                  <button type="button" className="admin-btn" style={{ padding: '6px', background: 'var(--item-bg)' }} onClick={() => handleEdit(t)} title="Düzenle">
                    <Edit size={16} />
                  </button>
                  <form action={async () => {
                    if (confirm('Silmek istediğinize emin misiniz?')) {
                      await deleteCihazTuru(t.id)
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
              <td colSpan={2} style={{ textAlign: 'center', color: '#64748B' }}>Henüz tür eklenmemiş.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
