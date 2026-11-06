import { getKullanicilar } from '@/actions/kullanici'
import { Plus } from 'lucide-react'
import Link from 'next/link'
import KullaniciListesi from './KullaniciListesi'
import { getSession } from '@/lib/session'

export const dynamic = 'force-dynamic'

export default async function KullanicilarPage() {
  const session = await getSession()
  const response = await getKullanicilar()
  const kullanicilar = response.success && response.data ? response.data : []
  
  const canAdd = session && (session.role === 'Admin' || session.role === 'Müdür' || session.role === 'Şef')

  return (
    <div className="container animate-fade-in">
      <div className="dashboard-header">
        <div>
          <h1 style={{ fontSize: '2rem', marginBottom: '8px' }}>Kullanıcı Yönetimi</h1>
          <p style={{ color: 'var(--muted)', fontSize: '1rem' }}>
            Sistemde kayıtlı personelleri ve yetki seviyelerini görüntüleyin.
          </p>
        </div>
        {canAdd && (
          <Link href="/kullanicilar/yeni" className="btn btn-primary">
            <Plus size={18} />
            Yeni Kullanıcı
          </Link>
        )}
      </div>

      <KullaniciListesi kullanicilar={kullanicilar} currentSession={session} />
    </div>
  )
}
