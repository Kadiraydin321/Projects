'use server'

import prisma from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { getSession } from '@/lib/session'
import { createLog } from './log'

export async function getCihazlar() {
  try {
    const cihazlar = await prisma.cihaz.findMany({
      include: {
        anlik_kullanici: true,
      },
      orderBy: { cihaz_id: 'desc' }
    })
    return { success: true, data: cihazlar }
  } catch (error) {
    console.error('Cihazlar getirilirken hata:', error)
    return { success: false, error: 'Cihazlar yüklenemedi.' }
  }
}

export async function createCihaz(formData: FormData) {
  try {
    const session = await getSession()
    if (!session || session.role === 'Standart') {
      return { success: false, error: 'Cihaz ekleme yetkiniz yok.' }
    }

    const marka = (formData.get('marka') as string)?.toLocaleUpperCase('tr-TR')
    const model = (formData.get('model') as string)?.toLocaleUpperCase('tr-TR')
    const seri_no = (formData.get('seri_no') as string)?.toLocaleUpperCase('tr-TR')
    const envanter_no = (formData.get('envanter_no') as string)?.toLocaleUpperCase('tr-TR')
    const cihaz_turu = formData.get('cihaz_turu') as string
    const kullanim_amaci = (formData.get('kullanim_amaci') as string)?.toLocaleUpperCase('tr-TR')
    const kullanilan_yer = (formData.get('kullanilan_yer') as string)?.toLocaleUpperCase('tr-TR')
    const durum = formData.get('durum') as string
    const satin_alma_tarihi = formData.get('satin_alma_tarihi') as string
    const garanti_bitis_tarihi = formData.get('garanti_bitis_tarihi') as string
    const kalibrasyon_baslangic = formData.get('kalibrasyon_baslangic') as string
    const kalibrasyon_bitis = formData.get('kalibrasyon_bitis') as string
    const kalibrasyon_sikligi = formData.get('kalibrasyon_sikligi') as string
    const kalibrasyon_firma = (formData.get('kalibrasyon_firma') as string)?.toLocaleUpperCase('tr-TR')
    const fotograf_url = formData.get('fotograf_url') as string
    const notlar = (formData.get('notlar') as string)?.toLocaleUpperCase('tr-TR')

    if (!marka || !model || !durum) {
      return { success: false, error: 'Marka, Model ve Durum zorunludur.' }
    }

    const yeniCihaz = await prisma.cihaz.create({
      data: {
        marka,
        model,
        seri_no: seri_no || null,
        envanter_no: envanter_no || null,
        cihaz_turu: cihaz_turu || null,
        kullanim_amaci: kullanim_amaci || null,
        kullanilan_yer: kullanilan_yer || null,
        durum,
        satin_alma_tarihi: satin_alma_tarihi ? new Date(satin_alma_tarihi) : null,
        garanti_bitis_tarihi: garanti_bitis_tarihi ? new Date(garanti_bitis_tarihi) : null,
        kalibrasyon_baslangic: kalibrasyon_baslangic ? new Date(kalibrasyon_baslangic) : null,
        kalibrasyon_bitis: kalibrasyon_bitis ? new Date(kalibrasyon_bitis) : null,
        kalibrasyon_sikligi: kalibrasyon_sikligi || null,
        kalibrasyon_firma: kalibrasyon_firma || null,
        fotograf_url: fotograf_url || null,
        notlar: notlar || null,
      }
    })

    await createLog('CIHAZ_EKLE', `${yeniCihaz.marka || ''} ${yeniCihaz.model || ''} model cihaz eklendi.`)
    revalidatePath('/cihazlar')
    revalidatePath('/')
    return { success: true, data: yeniCihaz }
  } catch (error) {
    console.error('Cihaz oluşturulurken hata:', error)
    return { success: false, error: 'Cihaz kaydedilirken bir hata oluştu.' }
  }
}

export async function updateCihaz(id: string, formData: FormData) {
  try {
    const session = await getSession()
    if (!session || session.role === 'Standart') {
      return { success: false, error: 'Cihaz düzenleme yetkiniz yok.' }
    }

    const marka = (formData.get('marka') as string)?.toLocaleUpperCase('tr-TR')
    const model = (formData.get('model') as string)?.toLocaleUpperCase('tr-TR')
    const seri_no = (formData.get('seri_no') as string)?.toLocaleUpperCase('tr-TR')
    const envanter_no = (formData.get('envanter_no') as string)?.toLocaleUpperCase('tr-TR')
    const cihaz_turu = (formData.get('cihaz_turu') as string)?.toLocaleUpperCase('tr-TR')
    const kullanilan_yer = (formData.get('kullanilan_yer') as string)?.toLocaleUpperCase('tr-TR')
    const durum = formData.get('durum') as string
    const kalibrasyon_baslangic = formData.get('kalibrasyon_baslangic') as string
    const kalibrasyon_bitis = formData.get('kalibrasyon_bitis') as string

    if (!marka || !model || !durum) {
      return { success: false, error: 'Marka, Model ve Durum zorunludur.' }
    }

    const updatedCihaz = await prisma.cihaz.update({
      where: { cihaz_id: id },
      data: {
        marka,
        model,
        seri_no: seri_no || null,
        envanter_no: envanter_no || null,
        cihaz_turu: cihaz_turu || null,
        kullanilan_yer: kullanilan_yer || null,
        durum,
        kalibrasyon_baslangic: kalibrasyon_baslangic ? new Date(kalibrasyon_baslangic) : null,
        kalibrasyon_bitis: kalibrasyon_bitis ? new Date(kalibrasyon_bitis) : null,
      }
    })

    await createLog('CIHAZ_GUNCELLE', `${updatedCihaz.marka || ''} ${updatedCihaz.model || ''} model cihaz güncellendi.`)
    revalidatePath('/cihazlar')
    revalidatePath('/')
    return { success: true, data: updatedCihaz }
  } catch (error) {
    console.error('Cihaz güncellenirken hata:', error)
    return { success: false, error: 'Cihaz güncellenirken bir hata oluştu.' }
  }
}

export async function deleteCihaz(id: string) {
  try {
    const session = await getSession()
    if (!session || session.role === 'Standart') {
      return { success: false, error: 'Cihaz silme yetkiniz yok.' }
    }

    const cihaz = await prisma.cihaz.findUnique({ where: { cihaz_id: id } })
    await prisma.cihaz.delete({
      where: { cihaz_id: id }
    })
    
    if (cihaz) {
      await createLog('CIHAZ_SIL', `${cihaz.marka || ''} ${cihaz.model || ''} model cihaz silindi.`)
    }

    revalidatePath('/cihazlar')
    revalidatePath('/')
    return { success: true }
  } catch (error) {
    return { success: false, error: 'Cihaz silinemedi. Başka bir kayda (zimmet vb.) bağlı olabilir.' }
  }
}
