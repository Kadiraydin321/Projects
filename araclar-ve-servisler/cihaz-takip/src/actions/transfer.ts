'use server'

import prisma from '@/lib/prisma'
import { getSession } from '@/lib/session'
import { revalidatePath } from 'next/cache'
import { createLog } from './log'

export async function createDevirIstegi(aliciId: string, cihazId?: string, jigId?: string) {
  try {
    const session = await getSession()
    if (!session) return { success: false, error: 'Yetkisiz erişim.' }

    const gonderenId = session.userId as string

    if (!cihazId && !jigId) {
      return { success: false, error: 'Devredilecek cihaz veya jig seçilmelidir.' }
    }

    // Check if receiver is in the same department
    const alici = await prisma.kullanici.findUnique({
      where: { kullanici_id: aliciId },
      select: { bolum_id: true }
    })

    const gonderen = await prisma.kullanici.findUnique({
      where: { kullanici_id: gonderenId },
      select: { bolum_id: true }
    })

    const bolumler_arasi = alici?.bolum_id !== gonderen?.bolum_id

    const istek = await prisma.transferIstegi.create({
      data: {
        istek_tipi: 'DEVIR',
        durum: 'ALICI_ONAYI_BEKLIYOR',
        bolumler_arasi,
        gonderen_id: gonderenId,
        alici_id: aliciId,
        gonderen_cihaz_id: cihazId || null,
        gonderen_jig_id: jigId || null
      }
    })

    await createLog('DEVIR_ISTEGI', `Kullanıcı ${aliciId} kullanıcısına devir isteği gönderdi. İstek ID: ${istek.istek_id}`)
    revalidatePath('/istekler')
    return { success: true }
  } catch (error) {
    console.error('Devir isteği hatası:', error)
    return { success: false, error: 'İstek oluşturulamadı.' }
  }
}

export async function createCihazIstemeTalebi(hedefCihazId: string) {
  try {
    const session = await getSession()
    if (!session) return { success: false, error: 'Yetkisiz erişim.' }

    const aliciId = session.userId as string

    const cihaz = await prisma.cihaz.findUnique({
      where: { cihaz_id: hedefCihazId },
      include: { anlik_kullanici: true }
    })

    let gonderenId = cihaz.anlik_kullanici_id
    let isDepot = false

    if (!gonderenId) {
      // Depodan isteniyor
      const admin = await prisma.kullanici.findFirst({ where: { yetki_seviyesi: 'Admin' } })
      if (!admin) return { success: false, error: 'Sistemde Admin bulunamadı, depodan istek yapılamaz.' }
      gonderenId = admin.kullanici_id
      isDepot = true
    }

    const alici = await prisma.kullanici.findUnique({
      where: { kullanici_id: aliciId },
      select: { bolum_id: true }
    })

    const bolumler_arasi = isDepot ? true : alici?.bolum_id !== cihaz.anlik_kullanici?.bolum_id

    const istek = await prisma.transferIstegi.create({
      data: {
        istek_tipi: 'TALEP',
        durum: 'GONDEREN_ONAYI_BEKLIYOR',
        bolumler_arasi,
        gonderen_id: gonderenId,
        alici_id: aliciId,
        gonderen_cihaz_id: hedefCihazId
      }
    })

    await createLog('DEVIR_TALEBI', `Kullanıcı ${aliciId}, ${isDepot ? 'Depodan' : gonderenId + ' kullanıcısından'} cihaz talebinde bulundu. İstek ID: ${istek.istek_id}`)
    revalidatePath('/istekler')
    return { success: true }
  } catch (error) {
    console.error('Devir talebi hatası:', error)
    return { success: false, error: 'Talep oluşturulamadı.' }
  }
}

export async function createTakasIstegi(aliciId: string, gonderenCihazId: string, aliciCihazId: string) {
  try {
    const session = await getSession()
    if (!session) return { success: false, error: 'Yetkisiz erişim.' }

    const gonderenId = session.userId as string

    const alici = await prisma.kullanici.findUnique({
      where: { kullanici_id: aliciId },
      select: { bolum_id: true }
    })

    const gonderen = await prisma.kullanici.findUnique({
      where: { kullanici_id: gonderenId },
      select: { bolum_id: true }
    })

    const bolumler_arasi = alici?.bolum_id !== gonderen?.bolum_id

    const istek = await prisma.transferIstegi.create({
      data: {
        istek_tipi: 'TAKAS',
        durum: 'ALICI_ONAYI_BEKLIYOR',
        bolumler_arasi,
        gonderen_id: gonderenId,
        alici_id: aliciId,
        gonderen_cihaz_id: gonderenCihazId,
        alici_cihaz_id: aliciCihazId
      }
    })

    await createLog('TAKAS_ISTEGI', `Kullanıcı ${aliciId} kullanıcısı ile takas isteği oluşturdu. İstek ID: ${istek.istek_id}`)
    revalidatePath('/istekler')
    return { success: true }
  } catch (error) {
    console.error('Takas isteği hatası:', error)
    return { success: false, error: 'İstek oluşturulamadı.' }
  }
}

export async function istegiOnayla(istekId: string) {
  try {
    const session = await getSession()
    if (!session) return { success: false, error: 'Yetkisiz erişim.' }

    const istek = await prisma.transferIstegi.findUnique({
      where: { istek_id: istekId },
      include: {
        gonderen: true,
        alici: true,
      }
    })

    if (!istek) return { success: false, error: 'İstek bulunamadı.' }

    // Onay durumu akışı
    let yeniDurum = istek.durum
    const isAdmin = session.role === 'Admin'
    
    if (istek.durum === 'GONDEREN_ONAYI_BEKLIYOR') {
      if (session.userId !== istek.gonderen_id && !isAdmin) return { success: false, error: 'Bu isteği onaylama yetkiniz yok.' }
      
      if (istek.bolumler_arasi) {
        yeniDurum = 'SEF_ONAYI_BEKLIYOR'
      } else {
        yeniDurum = 'ONAYLANDI'
      }
    } else if (istek.durum === 'ALICI_ONAYI_BEKLIYOR') {
      if (session.userId !== istek.alici_id && !isAdmin) return { success: false, error: 'Bu isteği onaylama yetkiniz yok.' }
      
      if (istek.bolumler_arasi) {
        yeniDurum = 'SEF_ONAYI_BEKLIYOR'
      } else {
        yeniDurum = 'ONAYLANDI'
      }
    } else if (istek.durum === 'SEF_ONAYI_BEKLIYOR') {
      if (session.role !== 'Şef' && !isAdmin) return { success: false, error: 'Sadece şefler onaylayabilir.' }
      yeniDurum = 'ONAYLANDI'
    }

    await prisma.transferIstegi.update({
      where: { istek_id: istekId },
      data: { durum: yeniDurum }
    })

    if (yeniDurum === 'ONAYLANDI') {
      // Cihaz transfer işlemlerini gerçekleştir
      if (istek.istek_tipi === 'DEVIR' || istek.istek_tipi === 'TALEP') {
        if (istek.gonderen_cihaz_id) {
          await prisma.cihaz.update({
            where: { cihaz_id: istek.gonderen_cihaz_id },
            data: { anlik_kullanici_id: istek.alici_id, zimmetli_kullanici_id: istek.alici_id }
          })
        }
        if (istek.gonderen_jig_id) {
          await prisma.jig.update({
            where: { jig_id: istek.gonderen_jig_id },
            data: { anlik_kullanici_id: istek.alici_id, onceki_kullanici_id: istek.gonderen_id }
          })
        }
        await createLog('DEVIR_ONAYLANDI', `${istek.gonderen.ad} cihazını/jigini ${istek.alici.ad} kişisine devretti.`)
      } else if (istek.istek_tipi === 'TAKAS') {
        if (istek.gonderen_cihaz_id && istek.alici_cihaz_id) {
          // Gönderenin cihazını alıcıya ver
          await prisma.cihaz.update({
            where: { cihaz_id: istek.gonderen_cihaz_id },
            data: { anlik_kullanici_id: istek.alici_id, zimmetli_kullanici_id: istek.alici_id }
          })
          // Alıcının cihazını gönderene ver
          await prisma.cihaz.update({
            where: { cihaz_id: istek.alici_cihaz_id },
            data: { anlik_kullanici_id: istek.gonderen_id, zimmetli_kullanici_id: istek.gonderen_id }
          })
          await createLog('TAKAS_ONAYLANDI', `${istek.gonderen.ad} ile ${istek.alici.ad} cihazlarını takas etti.`)
        }
      }
    }

    revalidatePath('/istekler')
    return { success: true, durum: yeniDurum }
  } catch (error) {
    console.error('İstek onaylama hatası:', error)
    return { success: false, error: 'İşlem başarısız.' }
  }
}

export async function istegiReddet(istekId: string) {
  try {
    const session = await getSession()
    if (!session) return { success: false, error: 'Yetkisiz erişim.' }

    await prisma.transferIstegi.update({
      where: { istek_id: istekId },
      data: { durum: 'REDDEDILDI' }
    })

    await createLog('ISTEK_REDDEDILDI', `Transfer isteği (${istekId}) reddedildi.`)
    revalidatePath('/istekler')
    return { success: true }
  } catch (error) {
    return { success: false, error: 'İşlem başarısız.' }
  }
}

export async function getBekleyenIstekler(page: number = 1, search: string = '') {
  try {
    const session = await getSession()
    if (!session) return { istekler: [], totalCount: 0, totalPages: 0 }

    const pageSize = 20
    const skip = (page - 1) * pageSize

    let pendingWhere: any = {
      durum: { notIn: ['ONAYLANDI', 'REDDEDILDI'] }
    }

    if (session.role !== 'Admin') {
      if (session.role === 'Şef' || session.role === 'Müdür') {
        pendingWhere.OR = [
          { alici_id: session.userId as string },
          { gonderen_id: session.userId as string },
          { gonderen: { bolum_id: session.bolumId as string } },
          { alici: { bolum_id: session.bolumId as string } }
        ]
      } else {
        pendingWhere.OR = [
          { alici_id: session.userId as string },
          { gonderen_id: session.userId as string }
        ]
      }
    }

    if (search) {
      pendingWhere = {
        AND: [
          pendingWhere,
          {
            OR: [
              { istek_tipi: { contains: search } },
              { durum: { contains: search } },
              { gonderen: { ad: { contains: search } } },
              { gonderen: { soyad: { contains: search } } },
              { alici: { ad: { contains: search } } },
              { alici: { soyad: { contains: search } } }
            ]
          }
        ]
      }
    }

    const [istekler, totalCount] = await Promise.all([
      prisma.transferIstegi.findMany({
        where: pendingWhere,
        include: {
          gonderen: true,
          alici: true,
        },
        orderBy: { olusturulma: 'desc' },
        skip,
        take: pageSize
      }),
      prisma.transferIstegi.count({ where: pendingWhere })
    ])

    return {
      istekler,
      totalCount,
      totalPages: Math.ceil(totalCount / pageSize)
    }
  } catch (error) {
    console.error("İstekler çekilirken hata oluştu:", error)
    return { istekler: [], totalCount: 0, totalPages: 0 }
  }
}
