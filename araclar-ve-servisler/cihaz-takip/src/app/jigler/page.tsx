import { Plus } from 'lucide-react'
import prisma from '@/lib/prisma'
import JigListesi from './JigListesi'
import { getSession } from '@/lib/session'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { PlusCircle, Wrench } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function JiglerPage() {
  const session = await getSession()
  if (!session) redirect('/login')

  const jigler = await prisma.jig.findMany({
    include: {
      anlik_kullanici: true,
      onceki_kullanici: true
    }
  })
  
  const aktifKullanicilar = await prisma.kullanici.findMany({
    where: { durum: 'Aktif' },
    select: { kullanici_id: true, ad: true, soyad: true }
  })

  // admin, müdür ve şef jig ekleyebilir
  const canAdd = session.role === 'Admin' || session.role === 'Müdür' || session.role === 'Şef'

  return (
    <div className="container animate-fade-in">
      <div className="dashboard-header" style={{ marginBottom: '32px', display: 'flex', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'linear-gradient(135deg, var(--warning) 0%, var(--accent) 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', boxShadow: '0 4px 12px rgba(245, 158, 11, 0.3)' }}>
            <Wrench size={24} />
          </div>
          <div>
            <h1 style={{ fontSize: '1.8rem', marginBottom: '4px' }}>Jig ve Fikstürler</h1>
            <p style={{ color: 'var(--muted)', fontSize: '0.95rem' }}>
              Üretimde kullanılan jig ve fikstürlerin bakım durumları ve geçmişi.
            </p>
          </div>
        </div>
        
        {canAdd && (
          <Link href="/jigler/yeni" className="btn btn-primary">
            <PlusCircle size={20} /> Yeni Jig
          </Link>
        )}
      </div>

      <div className="glass-card stagger-1">
        <JigListesi jigler={jigler} currentSession={session} aktifKullanicilar={aktifKullanicilar} />
      </div>
    </div>
  )
}
