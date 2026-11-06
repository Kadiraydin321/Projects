import prisma from '@/lib/prisma'
import BolumlerClient from './BolumlerClient'

export default async function BolumlerPage() {
  const bolumler = await prisma.bolumler.findMany({
    include: { mudur: true },
    orderBy: { bolum_adi: 'asc' }
  })

  const mudurler = await prisma.kullanici.findMany({
    where: { yetki_seviyesi: 'Müdür' },
    orderBy: { ad: 'asc' }
  })

  return (
    <div>
      <h1 style={{ marginBottom: '24px', fontSize: '1.5rem', color: 'var(--foreground)' }}>Bölüm Yönetimi</h1>
      <div className="admin-card">
        <BolumlerClient initialData={bolumler} mudurler={mudurler} />
      </div>
    </div>
  )
}
