import prisma from '@/lib/prisma'
import RollerClient from './RollerClient'

export default async function RollerPage() {
  const roller = await prisma.rol.findMany({
    orderBy: { ad: 'asc' }
  })

  return (
    <div>
      <h1 style={{ marginBottom: '24px', fontSize: '1.5rem', color: 'var(--foreground)' }}>Rol ve Yetki Yönetimi</h1>
      <p style={{ color: 'var(--muted)', marginBottom: '24px' }}>
        Sistemdeki mevcut rolleri yönetebilir veya yeni roller ekleyebilirsiniz. 
        Kullanıcılar sisteme girerken bu yetkilere göre işlem yapabilirler.
      </p>
      <div className="admin-card">
        <RollerClient initialData={roller} />
      </div>
    </div>
  )
}
