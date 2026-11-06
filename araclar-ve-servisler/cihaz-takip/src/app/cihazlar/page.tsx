import { getCihazlar } from '@/actions/cihaz'
import { Plus } from 'lucide-react'
import prisma from '@/lib/prisma'
import CihazListesi from './CihazListesi'
import { getSession } from '@/lib/session'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { PlusCircle, Cpu } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function CihazlarPage() {
  const session = await getSession()
  if (!session) redirect('/login')

  const cihazlar = await prisma.cihaz.findMany({
    include: {
      zimmetli_kullanici: true,
      anlik_kullanici: true
    }
  })
  
  const aktifKullanicilar = await prisma.kullanici.findMany({
    where: { durum: 'Aktif' },
    select: { kullanici_id: true, ad: true, soyad: true }
  })

  // admin, müdür ve şef cihaz ekleyebilir
  const canAdd = session.role === 'Admin' || session.role === 'Müdür' || session.role === 'Şef'

  return (
    <div className="container animate-fade-in">
      <div className="dashboard-header" style={{ marginBottom: '32px', display: 'flex', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)' }}>
            <Cpu size={24} />
          </div>
          <div>
            <h1 style={{ fontSize: '1.8rem', marginBottom: '4px' }}>Cihazlar</h1>
            <p style={{ color: 'var(--muted)', fontSize: '0.95rem' }}>
              Şirket içi tüm ölçüm cihazlarının listesi ve zimmet durumları.
            </p>
          </div>
        </div>
        
        {canAdd && (
          <Link href="/cihazlar/yeni" className="btn btn-primary">
            <PlusCircle size={20} /> Yeni Cihaz
          </Link>
        )}
      </div>

      <div className="glass-card stagger-1">
        <CihazListesi cihazlar={cihazlar} currentSession={session} aktifKullanicilar={aktifKullanicilar} />
      </div>
    </div>
  )
}
