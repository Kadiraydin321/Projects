import { getSession } from '@/lib/session'
import { redirect } from 'next/navigation'
import YeniJigForm from './YeniJigForm'
import { ArrowLeft, Wrench } from 'lucide-react'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function YeniJigPage() {
  const session = await getSession()
  
  // Standart (Personel) hesaplar cihaz ekleyemez
  if (!session || session.role === 'Standart') {
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
            <h1 style={{ fontSize: '1.8rem', marginBottom: '4px' }}>Yeni Jig (Fikstür) Kaydı</h1>
            <p style={{ color: 'var(--muted)', fontSize: '0.95rem' }}>
              Depoya veya üretime yeni bir jig, aparat veya fikstür ekleyin.
            </p>
          </div>
        </div>
      </div>

      <div className="glass-card stagger-1">
        <YeniJigForm />
      </div>
    </div>
  )
}
