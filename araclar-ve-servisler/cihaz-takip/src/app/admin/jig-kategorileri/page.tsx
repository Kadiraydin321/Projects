import prisma from '@/lib/prisma'
import JigKategorileriClient from './JigKategorileriClient'

export default async function JigKategorileriPage() {
  const kategoriler = await prisma.jigKategorisi.findMany({
    orderBy: { ad: 'asc' }
  })

  return (
    <div>
      <h1 style={{ marginBottom: '24px', fontSize: '1.5rem', color: 'var(--foreground)' }}>Jig Kategorileri Yönetimi</h1>
      <div className="admin-card">
        <JigKategorileriClient initialData={kategoriler} />
      </div>
    </div>
  )
}
