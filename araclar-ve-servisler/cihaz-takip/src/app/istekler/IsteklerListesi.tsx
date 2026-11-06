'use client'

import { CheckCircle, XCircle, ArrowRightLeft, ArrowRight, User } from 'lucide-react'
import { useState, useTransition } from 'react'
import { istegiOnayla, istegiReddet } from '@/actions/transfer'
import { useRouter } from 'next/navigation'

export default function IsteklerListesi({ userId, role, istekler, bekleyenOnaylar }: { userId: string, role: string, istekler: any[], bekleyenOnaylar: any[] }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const handleOnay = (istekId: string) => {
    if (confirm('Bu işlemi onaylamak istediğinize emin misiniz?')) {
      startTransition(async () => {
        await istegiOnayla(istekId)
        router.refresh()
      })
    }
  }

  const handleRed = (istekId: string) => {
    if (confirm('Bu işlemi REDDETMEK istediğinize emin misiniz?')) {
      startTransition(async () => {
        await istegiReddet(istekId)
        router.refresh()
      })
    }
  }

  const renderIstekCard = (istek: any, isYoneticiOnayi = false) => {
    const isGonderen = istek.gonderen_id === userId
    const needsMyApproval = (!isGonderen && istek.durum === 'ALICI_ONAYI_BEKLIYOR') || isYoneticiOnayi
    
    let durumRenk = 'var(--muted)'
    if (istek.durum === 'ONAYLANDI') durumRenk = 'var(--success)'
    if (istek.durum === 'REDDEDILDI') durumRenk = 'var(--danger)'
    if (istek.durum.includes('BEKLIYOR')) durumRenk = 'var(--warning)'

    return (
      <div key={istek.istek_id} className="glass-card" style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
            <span style={{ 
              padding: '4px 10px', 
              borderRadius: '20px', 
              fontSize: '0.8rem', 
              fontWeight: 600, 
              backgroundColor: `${durumRenk}20`,
              color: durumRenk,
              border: `1px solid ${durumRenk}40`
            }}>
              {istek.durum.replace(/_/g, ' ')}
            </span>
            <span style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>
              {new Date(istek.olusturulma).toLocaleDateString('tr-TR')}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.1rem' }}>
            {istek.istek_tipi === 'DEVIR' && (
              <>
                <ArrowRight size={20} color="var(--primary)" />
                <strong>{istek.gonderen.ad} {istek.gonderen.soyad}</strong> 
                <span style={{ color: 'var(--muted)' }}>cihaz devretmek istiyor:</span> 
                <strong>{istek.alici.ad} {istek.alici.soyad}</strong>
              </>
            )}
            {istek.istek_tipi === 'TALEP' && (
              <>
                <ArrowRight size={20} color="var(--primary)" />
                <strong>{istek.alici.ad} {istek.alici.soyad}</strong> 
                <span style={{ color: 'var(--muted)' }}>şu kişiden cihaz talep ediyor:</span> 
                <strong>{istek.gonderen.ad} {istek.gonderen.soyad}</strong>
              </>
            )}
            {istek.istek_tipi === 'TAKAS' && (
              <>
                <ArrowRightLeft size={20} color="var(--accent)" />
                <strong>{istek.gonderen.ad} {istek.gonderen.soyad}</strong> 
                <span style={{ color: 'var(--muted)' }}>şu kişiyle cihaz takaslamak istiyor:</span> 
                <strong>{istek.alici.ad} {istek.alici.soyad}</strong>
              </>
            )}
          </div>
        </div>
        
        {needsMyApproval && (
          <div style={{ display: 'flex', gap: '12px' }}>
            <button 
              className="btn" 
              style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', border: '1px solid rgba(239,68,68,0.3)' }}
              onClick={() => handleRed(istek.istek_id)}
              disabled={isPending}
            >
              <XCircle size={18} /> Reddet
            </button>
            <button 
              className="btn" 
              style={{ background: 'rgba(34, 197, 94, 0.1)', color: 'var(--success)', border: '1px solid rgba(34,197,94,0.3)' }}
              onClick={() => handleOnay(istek.istek_id)}
              disabled={isPending}
            >
              <CheckCircle size={18} /> Onayla
            </button>
          </div>
        )}
      </div>
    )
  }

  return (
    <div>
      {(role === 'Şef' || role === 'Müdür' || role === 'Admin') && bekleyenOnaylar.length > 0 && (
        <div style={{ marginBottom: '40px' }}>
          <h2 style={{ fontSize: '1.4rem', marginBottom: '16px', color: 'var(--warning)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <User size={20} />
            Yönetici Onayı Bekleyen İşlemler
          </h2>
          {bekleyenOnaylar.map(istek => renderIstekCard(istek, true))}
        </div>
      )}

      <div>
        <h2 style={{ fontSize: '1.4rem', marginBottom: '16px' }}>Benim İsteklerim</h2>
        {istekler.length === 0 ? (
          <div className="glass-card" style={{ textAlign: 'center', padding: '40px', color: 'var(--muted)' }}>
            Henüz size ait bir devir veya takas isteği bulunmuyor.
          </div>
        ) : (
          istekler.map(istek => renderIstekCard(istek, false))
        )}
      </div>
    </div>
  )
}
