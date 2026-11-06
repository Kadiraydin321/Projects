'use server'

import prisma from '@/lib/prisma'
import { getSession } from '@/lib/session'

export async function globalSearch(query: string) {
  try {
    const session = await getSession()
    if (!session) return []

    if (!query || query.length < 2) return []

    const searchStrTR = query.toLocaleLowerCase('tr-TR')

    // 1. Cihazlarda Ara
    const allCihazlar = await prisma.cihaz.findMany({ include: { anlik_kullanici: true } })
    const cihazlar = allCihazlar.filter(c => 
      c.marka.toLocaleLowerCase('tr-TR').includes(searchStrTR) ||
      c.model.toLocaleLowerCase('tr-TR').includes(searchStrTR) ||
      (c.seri_no && c.seri_no.toLocaleLowerCase('tr-TR').includes(searchStrTR))
    ).slice(0, 5)

    // 2. Jiglerde Ara
    const allJigler = await prisma.jig.findMany({ include: { anlik_kullanici: true } })
    const jigler = allJigler.filter(j => 
      j.jig_adi.toLocaleLowerCase('tr-TR').includes(searchStrTR) ||
      (j.kategori && j.kategori.toLocaleLowerCase('tr-TR').includes(searchStrTR))
    ).slice(0, 5)

    // 3. Kullanıcılarda Ara
    const allKullanicilar = await prisma.kullanici.findMany({ include: { bolum: true } })
    const kullanicilar = allKullanicilar.filter(k => 
      k.ad.toLocaleLowerCase('tr-TR').includes(searchStrTR) ||
      k.soyad.toLocaleLowerCase('tr-TR').includes(searchStrTR) ||
      (k.sicil_no && k.sicil_no.toLocaleLowerCase('tr-TR').includes(searchStrTR))
    ).slice(0, 5)

    // Format the results for the frontend
    const results: any[] = []

    cihazlar.forEach(c => {
      results.push({
        type: 'CIHAZ',
        id: c.cihaz_id,
        title: `${c.marka} ${c.model}`,
        subtitle: `Seri No: ${c.seri_no || '-'} | Durum: ${c.anlik_kullanici ? c.anlik_kullanici.ad + ' ' + c.anlik_kullanici.soyad : 'Depoda'}`,
        url: `/cihazlar`
      })
    })

    jigler.forEach(j => {
      results.push({
        type: 'JIG',
        id: j.jig_id,
        title: j.jig_adi,
        subtitle: `Kategori: ${j.kategori || '-'} | Durum: ${j.anlik_kullanici ? j.anlik_kullanici.ad + ' ' + j.anlik_kullanici.soyad : 'Depoda'}`,
        url: `/jigler`
      })
    })

    kullanicilar.forEach(k => {
      results.push({
        type: 'KULLANICI',
        id: k.kullanici_id,
        title: `${k.ad} ${k.soyad}`,
        subtitle: `Sicil No: ${k.sicil_no} | Bölüm: ${k.bolum?.ad || '-'}`,
        url: `/kullanicilar`
      })
    })

    return results
  } catch (error) {
    console.error('Global search hatası:', error)
    return []
  }
}
