import prisma from '@/lib/prisma'
import CihazTurleriClient from './CihazTurleriClient'

export default async function CihazTurleriPage() {
  const turler = await prisma.cihazTuru.findMany({
    orderBy: { ad: 'asc' }
  })

  return (
    <div>
      <h1 style={{ marginBottom: '24px', fontSize: '1.5rem', color: 'var(--foreground)' }}>Cihaz Türleri Yönetimi</h1>
      <div className="admin-card">
        <CihazTurleriClient initialData={turler} />
      </div>
    </div>
  )
}
