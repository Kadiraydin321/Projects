import { checkPermission } from '@/lib/permissions'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { LayoutDashboard, Users, Shield, Server, Box, LogOut, ArrowLeft } from 'lucide-react'
import { getSession } from '@/lib/session'
import './admin.css'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession()
  
  if (!session) {
    redirect('/login')
  }

  // Sadece admin paneli izni olanlar girebilir
  const hasAccess = await checkPermission('admin_panel_erisimi')
  if (!hasAccess && session.role !== 'Admin') {
    redirect('/')
  }

  return (
    <div className="admin-layout">
      {/* Sidebar */}
      <aside className="admin-sidebar">
        <div className="admin-brand">
          <Shield size={28} className="brand-icon" />
          <div>
            <h2>Admin Paneli</h2>
            <p>Sistem Yönetimi</p>
          </div>
        </div>

        <nav className="admin-nav">
          <div className="nav-group">
            <span>SİSTEM</span>
            <Link href="/admin" className="nav-item">
              <LayoutDashboard size={20} />
              <span>Özet</span>
            </Link>
            <Link href="/admin/roller" className="nav-item">
              <Shield size={20} />
              <span>Rol & Yetkiler</span>
            </Link>
            <Link href="/admin/bolumler" className="nav-item">
              <Users size={20} />
              <span>Bölümler</span>
            </Link>
          </div>

          <div className="nav-group">
            <span>KATEGORİLER</span>
            <Link href="/admin/cihaz-turleri" className="nav-item">
              <Server size={20} />
              <span>Cihaz Türleri</span>
            </Link>
            <Link href="/admin/jig-kategorileri" className="nav-item">
              <Box size={20} />
              <span>Jig Kategorileri</span>
            </Link>
          </div>

          <div className="nav-group" style={{ marginTop: 'auto' }}>
            <Link href="/" className="nav-item return-btn">
              <ArrowLeft size={20} />
              <span>Ana Uygulamaya Dön</span>
            </Link>
          </div>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="admin-main">
        {/* Topbar */}
        <header className="admin-topbar">
          <div className="topbar-title">
            Yönetim Paneli
          </div>
          <div className="topbar-user">
            <span className="user-name">{session.userName} ({session.role})</span>
          </div>
        </header>

        {/* Page Content */}
        <div className="admin-content">
          {children}
        </div>
      </main>
    </div>
  )
}
