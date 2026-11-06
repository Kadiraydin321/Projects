import { getSession } from '@/lib/session'
import { redirect } from 'next/navigation'
import prisma from '@/lib/prisma'
import IsteklerListesi from './IsteklerListesi'
import { Bell } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function IsteklerPage() {
  const session = await getSession()
  if (!session) redirect('/login')

  let whereClause: any = {
    OR: [
      { alici_id: session.userId as string },
      { gonderen_id: session.userId as string }
    ]
  }

  if (session.role === 'Admin') {
    whereClause = {}
  } else if (session.role === 'Şef' || session.role === 'Müdür') {
    whereClause = {
      OR: [
        { alici_id: session.userId as string },
        { gonderen_id: session.userId as string },
        { gonderen: { bolum_id: session.bolumId as string } },
        { alici: { bolum_id: session.bolumId as string } }
      ]
    }
  }

  // Gelen ve giden (veya görüntülenebilir) istekleri çek
  const istekler = await prisma.transferIstegi.findMany({
    where: whereClause,
    include: {
      gonderen: true,
      alici: true,
    },
    orderBy: { olusturulma: 'desc' }
  })

  // Eğer Şef veya Admin ise, onay bekleyenleri de çek (Müdür onayı kaldırıldı)
  let bekleyenOnaylar: any[] = []
  if (session.role === 'Şef' || session.role === 'Admin') {
    let onayWhere: any = { 
      durum: 'SEF_ONAYI_BEKLIYOR',
      OR: [
        { gonderen: { bolum_id: session.bolumId as string } },
        { alici: { bolum_id: session.bolumId as string } }
      ]
    }
    
    if (session.role === 'Admin') {
      onayWhere = { durum: 'SEF_ONAYI_BEKLIYOR' }
    }

    bekleyenOnaylar = await prisma.transferIstegi.findMany({
      where: onayWhere,
      include: {
        gonderen: true,
        alici: true,
      },
      orderBy: { olusturulma: 'desc' }
    })
  }

  return (
    <div className="container animate-fade-in">
      <div className="dashboard-header" style={{ marginBottom: '32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'linear-gradient(135deg, var(--warning) 0%, var(--accent) 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', boxShadow: '0 4px 12px rgba(245, 158, 11, 0.3)' }}>
            <Bell size={24} />
          </div>
          <div>
            <h1 style={{ fontSize: '1.8rem', marginBottom: '4px' }}>İstekler ve Bildirimler</h1>
            <p style={{ color: 'var(--muted)', fontSize: '0.95rem' }}>
              Cihaz devir ve takas işlemlerini buradan yönetebilir ve onaylayabilirsiniz.
            </p>
          </div>
        </div>
      </div>

      <IsteklerListesi userId={session.userId as string} role={session.role as string} istekler={istekler} bekleyenOnaylar={bekleyenOnaylar} />
    </div>
  )
}
