import prisma from '@/lib/prisma'
import { Shield, Users, Server, Box, Terminal } from 'lucide-react'
import LoglarClient from './LoglarClient'

export const dynamic = 'force-dynamic'

export default async function AdminDashboard() {
  const userCount = await prisma.kullanici.count()
  const roleCount = await prisma.rol.count()
  const cihazTuruCount = await prisma.cihazTuru.count()
  const jigKategoriCount = await prisma.jigKategorisi.count()

  const initialLogs = await prisma.sistemLog.findMany({
    orderBy: { tarih: 'desc' },
    include: { kullanici: true },
    take: 20
  })

  return (
    <div>
      <h1 style={{ marginBottom: '24px', fontSize: '1.5rem', color: 'var(--foreground)' }}>Sistem Özeti</h1>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '24px', marginBottom: '40px' }}>
        <div className="admin-card" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ padding: '16px', background: 'var(--primary-subtle)', borderRadius: '12px', color: 'var(--primary)' }}>
            <Users size={28} />
          </div>
          <div>
            <div style={{ fontSize: '2rem', fontWeight: 700, color: '#F8FAFC' }}>{userCount}</div>
            <div style={{ color: '#94A3B8', fontSize: '0.9rem' }}>Toplam Kullanıcı</div>
          </div>
        </div>

        <div className="admin-card" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ padding: '16px', background: 'var(--accent-subtle)', borderRadius: '12px', color: 'var(--accent)' }}>
            <Shield size={28} />
          </div>
          <div>
            <div style={{ fontSize: '2rem', fontWeight: 700, color: '#F8FAFC' }}>{roleCount}</div>
            <div style={{ color: '#94A3B8', fontSize: '0.9rem' }}>Sistem Rolü</div>
          </div>
        </div>

        <div className="admin-card" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ padding: '16px', background: 'var(--success-subtle)', borderRadius: '12px', color: 'var(--success)' }}>
            <Server size={28} />
          </div>
          <div>
            <div style={{ fontSize: '2rem', fontWeight: 700, color: '#F8FAFC' }}>{cihazTuruCount}</div>
            <div style={{ color: '#94A3B8', fontSize: '0.9rem' }}>Cihaz Türü</div>
          </div>
        </div>

        <div className="admin-card" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ padding: '16px', background: 'var(--warning-subtle)', borderRadius: '12px', color: 'var(--warning)' }}>
            <Box size={28} />
          </div>
          <div>
            <div style={{ fontSize: '2rem', fontWeight: 700, color: '#F8FAFC' }}>{jigKategoriCount}</div>
            <div style={{ color: '#94A3B8', fontSize: '0.9rem' }}>Jig Kategorisi</div>
          </div>
        </div>
      </div>

      <div style={{ borderTop: '1px solid var(--card-border)', paddingTop: '32px' }}>
        <h2 style={{ fontSize: '1.3rem', marginBottom: '16px', color: 'var(--foreground)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Terminal size={22} color="var(--accent)" /> Sistem Logları
        </h2>
        <LoglarClient initialLogs={initialLogs} />
      </div>
    </div>
  )
}
