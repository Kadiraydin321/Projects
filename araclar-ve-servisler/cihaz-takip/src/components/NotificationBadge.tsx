import { Bell } from 'lucide-react'
import prisma from '@/lib/prisma'

export default async function NotificationBadge({ session }: { session: any }) {
  if (!session) return null;

  try {
    // 1. Bana gelen istekler (Alıcı Onayı Bekleyen)
    const banaGelenIstekler = await prisma.transferIstegi.count({
      where: {
        alici_id: session.userId,
        durum: 'ALICI_ONAYI_BEKLIYOR'
      }
    });

    // 2. Yöneticisi olduğum kişilerin istekleri (Şef Onayı Bekleyen)
    let sefOnayBekleyen = 0;
    if (session.role === 'Şef' || session.role === 'Admin') {
      let onayWhere: any = { 
        durum: 'SEF_ONAYI_BEKLIYOR',
        OR: [
          { gonderen: { bolum_id: session.bolumId as string } },
          { alici: { bolum_id: session.bolumId as string } }
        ]
      };
      
      if (session.role === 'Admin') {
        onayWhere = { durum: 'SEF_ONAYI_BEKLIYOR' };
      }

      sefOnayBekleyen = await prisma.transferIstegi.count({
        where: onayWhere
      });
    }

    const bildirimSayisi = banaGelenIstekler + sefOnayBekleyen;

    return (
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        <Bell size={18} />
        {bildirimSayisi > 0 && (
          <span style={{
            position: 'absolute',
            top: '-8px',
            right: '-10px',
            background: 'var(--danger)',
            color: 'white',
            fontSize: '0.65rem',
            fontWeight: 'bold',
            padding: '2px 5px',
            borderRadius: '99px',
            minWidth: '18px',
            textAlign: 'center',
            boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
          }}>
            {bildirimSayisi > 99 ? '99+' : bildirimSayisi}
          </span>
        )}
      </div>
    )
  } catch (error) {
    // Veritabanı hatası vb. durumlarda en azından ikonu render et
    return <Bell size={18} />
  }
}
