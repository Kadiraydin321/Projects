import { getSession } from '@/lib/session'
import { redirect } from 'next/navigation'
import YeniKullaniciForm from '../../yeni/YeniKullaniciForm'
import { ArrowLeft, UserPlus } from 'lucide-react'
import Link from 'next/link'
import prisma from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export default async function DuzenleKullaniciPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getSession()
  
  if (!session || (session.role !== 'Admin' && session.role !== 'Müdür')) {
    redirect('/kullanicilar')
  }

  const kullanici = await prisma.kullanici.findUnique({
    where: { kullanici_id: id }
  })

  if (!kullanici) {
    redirect('/kullanicilar')
  }

  const bolumler = await prisma.bolumler.findMany({
    orderBy: { bolum_adi: 'asc' }
  })

  const roller = await prisma.rol.findMany({
    orderBy: { ad: 'asc' }
  })

  return (
    <div className="container animate-fade-in">
      <div style={{ marginBottom: '24px' }}>
        <Link href="/kullanicilar" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: 'var(--muted)', fontSize: '0.9rem', fontWeight: 500, textDecoration: 'none', transition: 'var(--transition)' }}>
          <ArrowLeft size={16} />
          Kullanıcı Listesine Dön
        </Link>
      </div>

      <div className="dashboard-header" style={{ marginBottom: '32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', boxShadow: '0 4px 12px var(--shadow-primary)' }}>
            <UserPlus size={24} />
          </div>
          <div>
            <h1 style={{ fontSize: '1.8rem', marginBottom: '4px' }}>Kullanıcı Düzenle</h1>
            <p style={{ color: 'var(--muted)', fontSize: '0.95rem' }}>
              {kullanici.ad} {kullanici.soyad} adlı personelin bilgilerini güncelleyin.
            </p>
          </div>
        </div>
      </div>

      <div className="glass-card stagger-1">
        <YeniKullaniciForm bolumler={bolumler} initialData={kullanici} session={session} roller={roller} />
      </div>
    </div>
  )
}
