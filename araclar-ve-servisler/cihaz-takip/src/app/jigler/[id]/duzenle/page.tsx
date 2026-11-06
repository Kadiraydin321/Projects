import { getSession } from '@/lib/session'
import { redirect } from 'next/navigation'
import YeniJigForm from '../../yeni/YeniJigForm'
import { ArrowLeft, Wrench } from 'lucide-react'
import Link from 'next/link'
import prisma from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export default async function DuzenleJigPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getSession()
  
  if (!session || session.role === 'Standart') {
    redirect('/jigler')
  }

  const jig = await prisma.jig.findUnique({
    where: { jig_id: id }
  })

  if (!jig) {
    redirect('/jigler')
  }

  return (
    <div className="container animate-fade-in">
      <div style={{ marginBottom: '24px' }}>
        <Link href="/jigler" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: 'var(--muted)', fontSize: '0.9rem', fontWeight: 500, textDecoration: 'none', transition: 'var(--transition)' }}>
          <ArrowLeft size={16} />
          Jig Listesine Dön
        </Link>
      </div>

      <div className="dashboard-header" style={{ marginBottom: '32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', boxShadow: '0 4px 12px rgba(139, 92, 246, 0.3)' }}>
            <Wrench size={24} />
          </div>
          <div>
            <h1 style={{ fontSize: '1.8rem', marginBottom: '4px' }}>Jig Düzenle</h1>
            <p style={{ color: 'var(--muted)', fontSize: '0.95rem' }}>
              {jig.jig_adi} adlı fikstürün bilgilerini güncelleyin.
            </p>
          </div>
        </div>
      </div>

      <div className="glass-card stagger-1">
        <YeniJigForm initialData={jig} />
      </div>
    </div>
  )
}
