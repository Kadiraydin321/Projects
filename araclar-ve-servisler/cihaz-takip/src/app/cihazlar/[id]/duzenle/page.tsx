import { getSession } from '@/lib/session'
import { redirect } from 'next/navigation'
import YeniCihazForm from '../../yeni/YeniCihazForm'
import { ArrowLeft, Cpu } from 'lucide-react'
import Link from 'next/link'
import prisma from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export default async function DuzenleCihazPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getSession()
  
  if (!session || session.role === 'Standart') {
    redirect('/cihazlar')
  }

  const cihaz = await prisma.cihaz.findUnique({
    where: { cihaz_id: id }
  })

  if (!cihaz) {
    redirect('/cihazlar')
  }

  return (
    <div className="container animate-fade-in">
      <div style={{ marginBottom: '24px' }}>
        <Link href="/cihazlar" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: 'var(--muted)', fontSize: '0.9rem', fontWeight: 500, textDecoration: 'none', transition: 'var(--transition)' }}>
          <ArrowLeft size={16} />
          Cihaz Listesine Dön
        </Link>
      </div>

      <div className="dashboard-header" style={{ marginBottom: '32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', boxShadow: '0 4px 12px rgba(139, 92, 246, 0.3)' }}>
            <Cpu size={24} />
          </div>
          <div>
            <h1 style={{ fontSize: '1.8rem', marginBottom: '4px' }}>Cihaz Düzenle</h1>
            <p style={{ color: 'var(--muted)', fontSize: '0.95rem' }}>
              {cihaz.marka} {cihaz.model} adlı cihazın bilgilerini güncelleyin.
            </p>
          </div>
        </div>
      </div>

      <div className="glass-card stagger-1">
        <YeniCihazForm initialData={cihaz} />
      </div>
    </div>
  )
}
