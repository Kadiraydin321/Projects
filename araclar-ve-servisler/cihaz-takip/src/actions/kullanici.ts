'use server'

import prisma from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { getSession } from '@/lib/session'
import { createLog } from './log'

export async function getKullanicilar() {
  try {
    const session = await getSession()
    if (!session) return { success: false, error: 'Yetkisiz erişim.' }

    let whereClause: any = {}
    
    // Herkes tüm listeyi görebilir (Kısıtlama sadece dashboard istatistiklerinde)

    const kullanicilar = await prisma.kullanici.findMany({
      where: whereClause,
      include: {
        sef: true,
        mudur: true,
        bolum: true
      },
      orderBy: { ad: 'asc' }
    })
    return { success: true, data: kullanicilar }
  } catch (error) {
    console.error('Kullanıcılar getirilirken hata:', error)
    return { success: false, error: 'Kullanıcılar yüklenemedi.' }
  }
}

export async function getBolumler() {
  try {
    const bolumler = await prisma.bolumler.findMany({
      orderBy: { bolum_adi: 'asc' }
    })
    return { success: true, data: bolumler }
  } catch (error) {
    return { success: false, error: 'Bölümler getirilemedi.' }
  }
}

export async function createKullanici(formData: FormData) {
  try {
    const session = await getSession()
    if (!session || (session.role !== 'Admin' && session.role !== 'Müdür' && session.role !== 'Şef')) {
      return { success: false, error: 'Kullanıcı ekleme yetkiniz yok.' }
    }

    const ad = (formData.get('ad') as string)?.toLocaleUpperCase('tr-TR')
    const soyad = (formData.get('soyad') as string)?.toLocaleUpperCase('tr-TR')
    const email = (formData.get('email') as string)?.toLowerCase()
    const sifre = formData.get('sifre') as string
    const telefon = formData.get('telefon') as string
    const sicil_no = (formData.get('sicil_no') as string)?.toLocaleUpperCase('tr-TR')
    let bolum_id = formData.get('bolum_id') as string
    
    // Eğer admin değilse zorunlu kendi bölümüne ekler
    if (session.role !== 'Admin') {
      bolum_id = session.bolumId as string
    }

    const yetki_seviyesi = formData.get('yetki_seviyesi') as string
    
    if (session.role === 'Şef' && yetki_seviyesi !== 'Standart') {
      return { success: false, error: 'Şefler sadece Standart kullanıcı oluşturabilir.' }
    }
    if (session.role === 'Müdür' && (yetki_seviyesi === 'Admin' || yetki_seviyesi === 'Müdür')) {
      return { success: false, error: 'Müdürler sadece Şef veya Standart kullanıcı oluşturabilir.' }
    }

    const durum = formData.get('durum') as string
    const sef_id = formData.get('sef_id') as string
    const mudur_id = formData.get('mudur_id') as string

    if (!ad || !soyad || !email || !yetki_seviyesi || !durum || !bolum_id) {
      return { success: false, error: 'Lütfen zorunlu alanları doldurun.' }
    }

    const yeniKullanici = await prisma.kullanici.create({
      data: {
        ad,
        soyad,
        email,
        sifre: sifre || null,
        telefon: telefon || null,
        sicil_no: sicil_no || null,
        bolum_id: bolum_id || null,
        yetki_seviyesi,
        durum,
        sef_id: sef_id || null,
        mudur_id: mudur_id || null,
      }
    })

    await createLog('KULLANICI_EKLE', `${yeniKullanici.ad} ${yeniKullanici.soyad} (${yeniKullanici.email}) kullanıcısı eklendi.`)
    revalidatePath('/kullanicilar')
    return { success: true, data: yeniKullanici }
  } catch (error) {
    console.error('Kullanıcı oluşturulurken hata:', error)
    return { success: false, error: 'Kayıt sırasında bir hata oluştu. E-posta adresi kullanımda olabilir.' }
  }
}

export async function getYoneticiler(bolum_id?: string) {
  try {
    let whereClause: any = {
      yetki_seviyesi: { in: ['Şef', 'Müdür', 'Admin'] }
    }
    
    if (bolum_id) {
      whereClause.bolum_id = bolum_id
    }

    const yoneticiler = await prisma.kullanici.findMany({
      where: whereClause,
      orderBy: { ad: 'asc' }
    })
    return { success: true, data: yoneticiler }
  } catch (error) {
    return { success: false, error: 'Yöneticiler getirilemedi.' }
  }
}

export async function updateKullanici(id: string, formData: FormData) {
  try {
    const session = await getSession()
    if (!session || (session.role !== 'Admin' && session.role !== 'Müdür' && session.role !== 'Şef')) {
      return { success: false, error: 'Kullanıcı güncelleme yetkiniz yok.' }
    }

    const ad = (formData.get('ad') as string)?.toLocaleUpperCase('tr-TR')
    const soyad = (formData.get('soyad') as string)?.toLocaleUpperCase('tr-TR')
    const email = (formData.get('email') as string)?.toLowerCase()
    const sifre = formData.get('sifre') as string
    const telefon = formData.get('telefon') as string
    
    let bolum_id = formData.get('bolum_id') as string
    if (session.role !== 'Admin') {
      bolum_id = session.bolumId as string
    }

    const yetki_seviyesi = formData.get('yetki_seviyesi') as string

    const targetUser = await prisma.kullanici.findUnique({ where: { kullanici_id: id } })
    if (!targetUser) return { success: false, error: 'Kullanıcı bulunamadı.' }

    if (session.role !== 'Admin') {
      if (targetUser.yetki_seviyesi === 'Admin' || targetUser.yetki_seviyesi === 'Müdür') {
        return { success: false, error: 'Bu kullanıcıyı düzenleme yetkiniz yok.' }
      }
      if (session.role === 'Şef' && targetUser.yetki_seviyesi === 'Şef') {
        return { success: false, error: 'Şefler diğer şefleri düzenleyemez.' }
      }
    }

    if (session.role === 'Şef' && yetki_seviyesi !== 'Standart') {
      return { success: false, error: 'Şefler sadece Standart seviye yetki verebilir.' }
    }
    if (session.role === 'Müdür' && (yetki_seviyesi === 'Admin' || yetki_seviyesi === 'Müdür')) {
      return { success: false, error: 'Müdürler sadece Şef veya Standart seviye yetki verebilir.' }
    }

    const durum = formData.get('durum') as string

    if (!ad || !soyad || !email || !yetki_seviyesi || !durum || !bolum_id) {
      return { success: false, error: 'Lütfen zorunlu alanları doldurun.' }
    }

    const dataToUpdate: any = {
      ad,
      soyad,
      email,
      telefon: telefon || null,
      bolum_id: bolum_id || null,
      yetki_seviyesi,
      durum,
    }

    if (sifre && sifre.trim() !== '') {
      dataToUpdate.sifre = sifre
    }

    const guncel = await prisma.kullanici.update({
      where: { kullanici_id: id },
      data: dataToUpdate
    })

    await createLog('KULLANICI_GUNCELLE', `${guncel.ad} ${guncel.soyad} kullanıcısı güncellendi.`)
    revalidatePath('/kullanicilar')
    return { success: true, data: guncel }
  } catch (error) {
    console.error('Kullanıcı güncellenirken hata:', error)
    return { success: false, error: 'Kayıt sırasında bir hata oluştu.' }
  }
}

export async function deleteKullanici(id: string) {
  try {
    const session = await getSession()
    if (!session || session.role !== 'Admin') {
      return { success: false, error: 'Kullanıcı silme yetkiniz yok.' }
    }
    
    const k = await prisma.kullanici.findUnique({ where: { kullanici_id: id } })
    await prisma.kullanici.delete({
      where: { kullanici_id: id }
    })
    
    if (k) {
      await createLog('KULLANICI_SIL', `${k.ad} ${k.soyad} kullanıcısı silindi.`)
    }

    revalidatePath('/kullanicilar')
    return { success: true }
  } catch (error) {
    return { success: false, error: 'Kullanıcı silinemedi.' }
  }
}
