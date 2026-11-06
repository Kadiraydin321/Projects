import { Database, Wrench, Users, Bell, Server, ArrowRightLeft, Clock } from 'lucide-react'
import prisma from '@/lib/prisma'
import { getSession } from '@/lib/session'
import Link from 'next/link'
import IsteklerPanosuClient from './IsteklerPanosuClient'
import { getBekleyenIstekler } from '@/actions/transfer'

export const dynamic = 'force-dynamic'

export default async function Home() {
  const session = await getSession();

  const thirtyDaysFromNow = new Date()
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30)

  const countWhereKullanici = session.role === 'Admin' ? {} : { bolum_id: session.bolumId as string }
  const countWhereCihaz = session.role === 'Admin' ? {} : { anlik_kullanici: { bolum_id: session.bolumId as string } }
  const countWhereJig = session.role === 'Admin' ? {} : { anlik_kullanici: { bolum_id: session.bolumId as string } }

  const [
    cihazSayisi, 
    kullaniciSayisi, 
    jigSayisi, 
    yaklasanKalibrasyonlar,
    sonCihazZimmetleri,
    sonJigZimmetleri,
    bekleyenIsteklerData
  ] = await Promise.all([
    prisma.cihaz.count({ where: countWhereCihaz }),
    prisma.kullanici.count({ where: countWhereKullanici }),
    prisma.jig.count({ where: countWhereJig }),
    
    // Yaklaşan kalibrasyonlar (son 30 gün kalanlar)
    prisma.cihaz.findMany({
      where: {
        kalibrasyon_bitis: {
          gte: new Date(),
          lte: thirtyDaysFromNow
        },
        durum: 'Aktif'
      },
      include: { anlik_kullanici: true },
      take: 20,
      orderBy: { kalibrasyon_bitis: 'asc' }
    }),

    // Son kullanılan (zimmetlenen) cihazlar
    prisma.zimmetGecmisi.findMany({
      where: { cihaz_id: { not: null } },
      include: { cihaz: true, kullanici: true },
      orderBy: { baslangic_tarihi: 'desc' },
      take: 20
    }),

    // Son kullanılan (zimmetlenen) jigler
    prisma.zimmetGecmisi.findMany({
      where: { jig_id: { not: null } },
      include: { jig: true, kullanici: true },
      orderBy: { baslangic_tarihi: 'desc' },
      take: 20
    }),

    // Sağ pano için ilk sayfa istekleri
    getBekleyenIstekler(1, '')
  ])

  // Eğer zimmet geçmişi hiç yoksa, anlık kullanılanlardan fallback yapalım (yeni kurulan sistem için)
  let cihazFallback: any[] = []
  if (sonCihazZimmetleri.length === 0) {
    cihazFallback = await prisma.cihaz.findMany({
      where: { anlik_kullanici_id: { not: null } },
      include: { anlik_kullanici: true },
      take: 20
    })
  }

  let jigFallback: any[] = []
  if (sonJigZimmetleri.length === 0) {
    jigFallback = await prisma.jig.findMany({
      where: { anlik_kullanici_id: { not: null } },
      include: { anlik_kullanici: true },
      take: 20
    })
  }

  return (
    <div className="container animate-fade-in">
      <div className="dashboard-header">
        <div>
          <h1 style={{ fontSize: '2.5rem', marginBottom: '8px' }}>Sistem Özeti</h1>
          <p style={{ color: 'var(--muted)', fontSize: '1.1rem' }}>
            Güncel envanter, zimmet durumları ve istatistikleri buradan takip edebilirsiniz.
          </p>
        </div>
        
        <Link href="/cihazlar" className="btn btn-primary">
          <ArrowRightLeft size={18} />
          Yeni Transfer / Takas Başlat
        </Link>
      </div>

      <div style={{ display: 'flex', gap: '24px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
        
        {/* Sol Ana İçerik */}
        <div style={{ flex: '1 1 600px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Row 1: Kalibrasyonu Yaklaşan Cihazlar */}
          <div className="glass-card stagger-1" style={{ borderTop: '4px solid var(--warning)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
              <div style={{ padding: '8px', background: 'rgba(245, 158, 11, 0.1)', borderRadius: '8px', color: 'var(--warning)' }}>
                <Bell size={20} />
              </div>
              <h2 style={{ fontSize: '1.3rem', margin: 0 }}>Kalibrasyonu Yaklaşan Cihazlar</h2>
            </div>
            
            {yaklasanKalibrasyonlar.length === 0 ? (
              <div style={{ padding: '16px', background: 'var(--item-bg)', borderRadius: '8px', textAlign: 'center', color: 'var(--muted)' }}>
                Yakın zamanda kalibrasyon süresi dolacak cihaz bulunmuyor.
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '12px' }}>
                {yaklasanKalibrasyonlar.map(c => {
                  const daysLeft = Math.ceil((new Date(c.kalibrasyon_bitis!).getTime() - new Date().getTime()) / (1000 * 3600 * 24))
                  return (
                    <div key={c.cihaz_id} className="list-item" style={{ display: 'flex', flexDirection: 'column', padding: '12px', background: 'rgba(245, 158, 11, 0.05)', borderRadius: '8px', border: '1px solid rgba(245, 158, 11, 0.2)' }}>
                      <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{c.marka} {c.model}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>Seri No: {c.seri_no || '-'}</div>
                      <div style={{ marginTop: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span className="animate-pulse-glow" style={{ fontSize: '0.8rem', color: 'var(--warning)', fontWeight: 600 }}>Son {daysLeft} Gün</span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>
                          {c.anlik_kullanici ? `${c.anlik_kullanici.ad} ${c.anlik_kullanici.soyad}` : 'Depoda'}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Row 2: Sistem Özeti Kartları (3'lü Grid) */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
            <div className="glass-card stagger-2" style={{ padding: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <div style={{ padding: '10px', background: 'rgba(59, 130, 246, 0.1)', borderRadius: '10px', color: 'var(--primary)' }}>
                  <Database size={20} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1rem', margin: 0, color: 'var(--muted)' }}>
                    {session.role === 'Admin' ? 'Toplam Cihaz' : 'Bölümünüzdeki Cihazlar'}
                  </h3>
                </div>
              </div>
              <div style={{ fontSize: '2rem', fontWeight: 700 }}>{cihazSayisi}</div>
            </div>

            <div className="glass-card stagger-2" style={{ padding: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <div style={{ padding: '10px', background: 'rgba(139, 92, 246, 0.1)', borderRadius: '10px', color: 'var(--accent)' }}>
                  <Wrench size={20} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1rem', margin: 0, color: 'var(--muted)' }}>
                    {session.role === 'Admin' ? 'Toplam Jig' : 'Bölümünüzdeki Jigler'}
                  </h3>
                </div>
              </div>
              <div style={{ fontSize: '2rem', fontWeight: 700 }}>{jigSayisi}</div>
            </div>

            <div className="glass-card stagger-2" style={{ padding: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <div style={{ padding: '10px', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '10px', color: 'var(--success)' }}>
                  <Users size={20} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1rem', margin: 0, color: 'var(--muted)' }}>
                    {session.role === 'Admin' ? 'Kullanıcılar' : 'Bölüm Personeli'}
                  </h3>
                </div>
              </div>
              <div style={{ fontSize: '2rem', fontWeight: 700 }}>{kullaniciSayisi}</div>
            </div>
          </div>

          {/* Row 3: Son Zimmetlenen Cihazlar (Zimmet Geçmişi) */}
          <div className="glass-card stagger-3">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <Server size={20} color="var(--primary)" />
                <h2 style={{ fontSize: '1.2rem', margin: 0 }}>Son Zimmetlenen Cihazlar</h2>
              </div>
              <Link href="/cihazlar" style={{ fontSize: '0.85rem', color: 'var(--primary)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}>
                Tümünü Gör <ArrowRightLeft size={14} />
              </Link>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {sonCihazZimmetleri.length > 0 ? sonCihazZimmetleri.map((islem) => (
                <div key={islem.id} className="list-item" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px', background: 'var(--item-bg)', borderRadius: '8px', border: '1px solid var(--list-item-border)' }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{islem.cihaz?.marka} {islem.cihaz?.model}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>Seri No: {islem.cihaz?.seri_no || '-'}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.9rem', fontWeight: 500, color: 'var(--primary)' }}>
                      {islem.kullanici.ad} {islem.kullanici.soyad}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'flex-end' }}>
                      <Clock size={12} />
                      {new Date(islem.baslangic_tarihi).toLocaleDateString('tr-TR')}
                    </div>
                  </div>
                </div>
              )) : cihazFallback.length > 0 ? cihazFallback.map(c => (
                <div key={c.cihaz_id} className="list-item" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px', background: 'var(--item-bg)', borderRadius: '8px', border: '1px solid var(--list-item-border)' }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{c.marka} {c.model}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>Seri No: {c.seri_no || '-'}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.9rem', fontWeight: 500, color: 'var(--primary)' }}>
                      {c.anlik_kullanici?.ad} {c.anlik_kullanici?.soyad}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>Mevcut Zimmet</div>
                  </div>
                </div>
              )) : (
                <div style={{ padding: '16px', textAlign: 'center', color: 'var(--muted)' }}>Henüz cihaz hareket kaydı bulunmuyor.</div>
              )}
            </div>
          </div>

          {/* Row 4: Son Zimmetlenen Jigler (Zimmet Geçmişi) */}
          <div className="glass-card stagger-4">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <Wrench size={20} color="var(--accent)" />
                <h2 style={{ fontSize: '1.2rem', margin: 0 }}>Son Zimmetlenen Jigler</h2>
              </div>
              <Link href="/jigler" style={{ fontSize: '0.85rem', color: 'var(--accent)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}>
                Tümünü Gör <ArrowRightLeft size={14} />
              </Link>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {sonJigZimmetleri.length > 0 ? sonJigZimmetleri.map((islem) => (
                <div key={islem.id} className="list-item" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px', background: 'var(--item-bg)', borderRadius: '8px', border: '1px solid var(--list-item-border)' }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{islem.jig?.jig_adi}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>Kategori: {islem.jig?.kategori || '-'}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.9rem', fontWeight: 500, color: 'var(--accent)' }}>
                      {islem.kullanici.ad} {islem.kullanici.soyad}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'flex-end' }}>
                      <Clock size={12} />
                      {new Date(islem.baslangic_tarihi).toLocaleDateString('tr-TR')}
                    </div>
                  </div>
                </div>
              )) : jigFallback.length > 0 ? jigFallback.map(j => (
                <div key={j.jig_id} className="list-item" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px', background: 'var(--item-bg)', borderRadius: '8px', border: '1px solid var(--list-item-border)' }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{j.jig_adi}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>Kategori: {j.kategori || '-'}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.9rem', fontWeight: 500, color: 'var(--accent)' }}>
                      {j.anlik_kullanici?.ad} {j.anlik_kullanici?.soyad}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>Mevcut Zimmet</div>
                  </div>
                </div>
              )) : (
                <div style={{ padding: '16px', textAlign: 'center', color: 'var(--muted)' }}>Henüz jig hareket kaydı bulunmuyor.</div>
              )}
            </div>
          </div>

        </div>

        {/* Sağ İstekler Panosu (Sabit Genişlik ve Sticky) */}
        <div style={{ flex: '0 0 380px', position: 'sticky', top: '24px' }}>
          <IsteklerPanosuClient 
            initialIstekler={bekleyenIsteklerData.istekler} 
            initialTotalCount={bekleyenIsteklerData.totalCount} 
          />
        </div>

      </div>
    </div>
  )
}
