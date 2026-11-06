import { getYoneticiler, getBolumler } from '@/actions/kullanici'
import { getSession } from '@/lib/session'
import YeniKullaniciForm from './YeniKullaniciForm'
import { redirect } from 'next/navigation'
import prisma from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export default async function Page() {
  const session = await getSession()
  
  if (!session || (session.role !== 'Admin' && session.role !== 'Müdür' && session.role !== 'Şef')) {
    redirect('/kullanicilar') // Yetkisizleri engelle
  }

  // Admin tüm yöneticileri görür, Şef/Müdür ise sadece kendi bölümündekileri görebilsin
  const yoneticilerRes = await getYoneticiler(session.role === 'Admin' ? undefined : (session.bolumId as string))
  const bolumlerRes = await getBolumler()
  
  const yoneticiler = yoneticilerRes.success ? yoneticilerRes.data : []
  const bolumler = bolumlerRes.success ? (bolumlerRes.data || []) : []
  
  const roller = await prisma.rol.findMany({ orderBy: { ad: 'asc' } })

  return <YeniKullaniciForm bolumler={bolumler} session={session} roller={roller} />
}
