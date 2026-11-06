'use client'

import { useState } from 'react'
import { Plus, Trash2, Edit, Save, X } from 'lucide-react'
import { upsertRol, deleteRol } from '@/actions/admin'

export default function RollerClient({ initialData }: { initialData: any[] }) {
  const defaultForm = {
    ad: '',
    cihaz_ekle: false, cihaz_duzenle: false, cihaz_sil: false,
    jig_ekle: false, jig_duzenle: false, jig_sil: false,
    kullanici_ekle: false, kullanici_duzenle: false, kullanici_sil: false,
    admin_panel_erisimi: false
  }
  
  const [formData, setFormData] = useState<any>(defaultForm)
  const [isEditing, setIsEditing] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleEdit = (rol: any) => {
    setFormData(rol)
    setIsEditing(true)
  }

  const handleCancel = () => {
    setFormData(defaultForm)
    setIsEditing(false)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.ad) return
    setIsSubmitting(true)
    const res = await upsertRol(formData)
    setIsSubmitting(false)
    if (res.success) {
      handleCancel()
    } else {
      alert(res.error)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target
    setFormData((prev: any) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
  }

  return (
    <div>
      <form onSubmit={handleSave} style={{ marginBottom: '40px', padding: '20px', background: 'var(--card)', borderRadius: '8px', border: '1px solid var(--card-border)' }}>
        <h3 style={{ marginTop: 0, marginBottom: '16px', color: '#CBD5E1' }}>
          {isEditing ? 'Rolü Düzenle' : 'Yeni Rol Ekle'}
        </h3>
        
        <div style={{ marginBottom: '24px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', color: '#94A3B8' }}>Rol Adı</label>
          <input 
            type="text" 
            name="ad"
            className="admin-input" 
            value={formData.ad}
            onChange={handleChange}
            readOnly={isEditing}
            required
            style={{ maxWidth: '300px' }}
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '20px', marginBottom: '24px' }}>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <h4 style={{ margin: 0, color: '#3b82f6', fontSize: '0.85rem' }}>Cihaz Yetkileri</h4>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem' }}>
              <input type="checkbox" name="cihaz_ekle" checked={formData.cihaz_ekle} onChange={handleChange} /> Ekle
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem' }}>
              <input type="checkbox" name="cihaz_duzenle" checked={formData.cihaz_duzenle} onChange={handleChange} /> Düzenle
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem' }}>
              <input type="checkbox" name="cihaz_sil" checked={formData.cihaz_sil} onChange={handleChange} /> Sil
            </label>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <h4 style={{ margin: 0, color: '#10b981', fontSize: '0.85rem' }}>Jig Yetkileri</h4>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem' }}>
              <input type="checkbox" name="jig_ekle" checked={formData.jig_ekle} onChange={handleChange} /> Ekle
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem' }}>
              <input type="checkbox" name="jig_duzenle" checked={formData.jig_duzenle} onChange={handleChange} /> Düzenle
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem' }}>
              <input type="checkbox" name="jig_sil" checked={formData.jig_sil} onChange={handleChange} /> Sil
            </label>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <h4 style={{ margin: 0, color: '#f59e0b', fontSize: '0.85rem' }}>Kullanıcı Yetkileri</h4>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem' }}>
              <input type="checkbox" name="kullanici_ekle" checked={formData.kullanici_ekle} onChange={handleChange} /> Ekle
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem' }}>
              <input type="checkbox" name="kullanici_duzenle" checked={formData.kullanici_duzenle} onChange={handleChange} /> Düzenle
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem' }}>
              <input type="checkbox" name="kullanici_sil" checked={formData.kullanici_sil} onChange={handleChange} /> Sil
            </label>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <h4 style={{ margin: 0, color: '#ef4444', fontSize: '0.85rem' }}>Sistem Yetkileri</h4>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem' }}>
              <input type="checkbox" name="admin_panel_erisimi" checked={formData.admin_panel_erisimi} onChange={handleChange} /> Admin Paneli
            </label>
          </div>

        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <button type="submit" className="admin-btn" disabled={isSubmitting}>
            <Save size={18} /> {isEditing ? 'Güncelle' : 'Kaydet'}
          </button>
          {isEditing && (
            <button type="button" className="admin-btn" onClick={handleCancel} style={{ background: 'transparent', border: '1px solid #475569' }}>
              <X size={18} /> İptal
            </button>
          )}
        </div>
      </form>

      <table className="admin-table">
        <thead>
          <tr>
            <th>Rol Adı</th>
            <th>Cihaz İzinleri</th>
            <th>Jig İzinleri</th>
            <th>Kullanıcı İzinleri</th>
            <th>Admin Panel</th>
            <th style={{ textAlign: 'right' }}>İşlem</th>
          </tr>
        </thead>
        <tbody>
          {initialData.map(r => (
            <tr key={r.ad}>
              <td style={{ fontWeight: 600, color: '#3b82f6' }}>{r.ad}</td>
              <td>
                <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                  {r.cihaz_ekle && 'Ekle '}
                  {r.cihaz_duzenle && 'Düzenle '}
                  {r.cihaz_sil && 'Sil'}
                  {!r.cihaz_ekle && !r.cihaz_duzenle && !r.cihaz_sil && '-'}
                </div>
              </td>
              <td>
                <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                  {r.jig_ekle && 'Ekle '}
                  {r.jig_duzenle && 'Düzenle '}
                  {r.jig_sil && 'Sil'}
                  {!r.jig_ekle && !r.jig_duzenle && !r.jig_sil && '-'}
                </div>
              </td>
              <td>
                <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                  {r.kullanici_ekle && 'Ekle '}
                  {r.kullanici_duzenle && 'Düzenle '}
                  {r.kullanici_sil && 'Sil'}
                  {!r.kullanici_ekle && !r.kullanici_duzenle && !r.kullanici_sil && '-'}
                </div>
              </td>
              <td>
                {r.admin_panel_erisimi ? (
                  <span style={{ color: '#10b981', fontSize: '0.8rem' }}>Erişim Var</span>
                ) : (
                  <span style={{ color: '#ef4444', fontSize: '0.8rem' }}>Yok</span>
                )}
              </td>
              <td style={{ textAlign: 'right' }}>
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                  <button type="button" className="admin-btn" style={{ padding: '6px', background: 'var(--item-bg)' }} onClick={() => handleEdit(r)} title="Düzenle">
                    <Edit size={16} />
                  </button>
                  <form action={async () => {
                    if (confirm('Rolü silmek istediğinize emin misiniz?')) {
                      const res = await deleteRol(r.ad)
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
        </tbody>
      </table>
    </div>
  )
}
