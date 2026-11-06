import { ArrowLeft, Server } from 'lucide-react'
import Link from 'next/link'
import YeniCihazForm from './YeniCihazForm'
import { getSession } from '@/lib/session'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function YeniCihazPage() {
  const session = await getSession()
  
  if (!session || session.role === 'Standart') {
    redirect('/cihazlar')
  }

  return (
    <div className="container animate-fade-in">
      <div style={{ marginBottom: '24px' }}>
        <Link href="/cihazlar" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: 'var(--muted)', fontSize: '0.9rem', marginBottom: '16px' }}>
          <ArrowLeft size={16} /> Cihazlara Dön
        </Link>
        <h1 style={{ fontSize: '2rem', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Server color="var(--primary)" />
          Depoya Yeni Cihaz Ekle
        </h1>
        <p style={{ color: 'var(--muted)', marginTop: '8px' }}>
          Cihazı oluşturduktan sonra Zimmet (Atama) işlemini ayrı menüden yapabilirsiniz.
        </p>
      </div>

      <YeniCihazForm />
    </div>
  )
}
