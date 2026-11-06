import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Activity, Settings, LogOut, Shield } from 'lucide-react'
import { getSession } from '@/lib/session'
import { checkPermission } from '@/lib/permissions'
import GlobalSearch from '@/components/GlobalSearch'
import Link from 'next/link'
import { ThemeProvider } from '@/components/ThemeProvider'
import { ThemeToggle } from '@/components/ThemeToggle'
import NotificationBadge from '@/components/NotificationBadge'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Cihaz & Jig Takip Sistemi',
  description: 'Şirket içi ölçüm cihazları ve jig takibi için yönetim platformu.',
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getSession()

  return (
    <html lang="tr" suppressHydrationWarning>
      <body className={inter.className} suppressHydrationWarning>
        <ThemeProvider attribute="data-theme" defaultTheme="dark" enableSystem={false}>
          {session && (
            <nav className="navbar" style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto', alignItems: 'center', width: '100%', background: 'var(--nav-bg)' }}>
              <Link href="/" className="nav-brand" style={{ whiteSpace: 'nowrap', textDecoration: 'none', color: 'inherit' }}>
                <Activity color="var(--primary)" size={28} />
                Cihaz & Jig Takip
              </Link>
              
              <div style={{ padding: '0 50px', width: '100%', display: 'flex', justifyContent: 'center' }}>
                <div style={{ width: '100%', maxWidth: '800px' }}>
                  <GlobalSearch />
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div className="nav-links" style={{ margin: 0 }}>
                  <a href="/" className="nav-link">Dashboard</a>
                  <a href="/cihazlar" className="nav-link">Cihazlar</a>
                  <a href="/jigler" className="nav-link">Jigler</a>
                  <a href="/kullanicilar" className="nav-link">Kullanıcılar</a>
                  <a href="/istekler" className="nav-link" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <NotificationBadge session={session} /> İstekler
                  </a>

                  {await checkPermission('admin_panel_erisimi') && (
                    <a href="/admin" className="nav-link" style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#3b82f6' }}>
                      <Shield size={18} /> Admin Paneli
                    </a>
                  )}
                </div>
                
                <div style={{ paddingLeft: '1rem', borderLeft: '1px solid var(--card-border)', display: 'flex', alignItems: 'center', gap: '1rem', whiteSpace: 'nowrap' }}>
                  <ThemeToggle />
                  <span style={{ fontSize: '0.9rem', color: 'var(--muted)' }}>{session.userName as string} ({session.role as string})</span>
                  <form action="/api/logout" method="POST" style={{ margin: 0 }}>
                    <button type="submit" className="nav-link" style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', color: '#ef4444' }} title="Çıkış Yap">
                      <LogOut size={20} />
                    </button>
                  </form>
                </div>
              </div>
            </nav>
          )}
          <main>
            {children}
          </main>
        </ThemeProvider>
      </body>
    </html>
  )
}
