'use server'

import prisma from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { getSession } from '@/lib/session'
import { createLog } from './log'

export async function getJigler() {
  try {
    const jigler = await prisma.jig.findMany({
      include: {
        anlik_kullanici: true,
      },
      orderBy: { jig_id: 'desc' }
    })
    return { success: true, data: jigler }
  } catch (error) {
    console.error('Jigler getirilirken hata:', error)
    return { success: false, error: 'Jigler yüklenemedi.' }
  }
}

export async function createJig(formData: FormData) {
  try {
    const session = await getSession()
    if (!session || session.role === 'Standart') {
      return { success: false, error: 'Jig ekleme yetkiniz yok.' }
    }

    const jig_adi = (formData.get('jig_adi') as string)?.toLocaleUpperCase('tr-TR')
    const stok_no = (formData.get('stok_no') as string)?.toLocaleUpperCase('tr-TR')
    const seri_no = (formData.get('seri_no') as string)?.toLocaleUpperCase('tr-TR')
    const kategori = (formData.get('kategori') as string)?.toLocaleUpperCase('tr-TR')
    const kullanilan_yer = (formData.get('kullanilan_yer') as string)?.toLocaleUpperCase('tr-TR')
    const kullanilma_amaci = (formData.get('kullanilma_amaci') as string)?.toLocaleUpperCase('tr-TR')
    const durum = formData.get('durum') as string
    const bakim_tarihi = formData.get('bakim_tarihi') as string
    const fotograf_url = formData.get('fotograf_url') as string
    const notlar = (formData.get('notlar') as string)?.toLocaleUpperCase('tr-TR')

    if (!jig_adi || !durum) {
      return { success: false, error: 'Jig Adı ve Durum zorunludur.' }
    }

    const yeniJig = await prisma.jig.create({
      data: {
        jig_adi,
        stok_no: stok_no || null,
        seri_no: seri_no || null,
        kategori: kategori || null,
        kullanilan_yer: kullanilan_yer || null,
        kullanilma_amaci: kullanilma_amaci || null,
        durum,
        bakim_tarihi: bakim_tarihi ? new Date(bakim_tarihi) : null,
        fotograf_url: fotograf_url || null,
        notlar: notlar || null,
      }
    })

    await createLog('JIG_EKLE', `${yeniJig.jig_adi} jigi eklendi.`)
    revalidatePath('/jigler')
    revalidatePath('/')
    return { success: true, data: yeniJig }
  } catch (error) {
    console.error('Jig oluşturulurken hata:', error)
    return { success: false, error: 'Jig kaydedilirken bir hata oluştu.' }
  }
}

export async function updateJig(id: string, formData: FormData) {
  try {
    const session = await getSession()
    if (!session || session.role === 'Standart') {
      return { success: false, error: 'Jig düzenleme yetkiniz yok.' }
    }

    const jig_adi = (formData.get('jig_adi') as string)?.toLocaleUpperCase('tr-TR')
    const stok_no = (formData.get('stok_no') as string)?.toLocaleUpperCase('tr-TR')
    const seri_no = (formData.get('seri_no') as string)?.toLocaleUpperCase('tr-TR')
    const kategori = (formData.get('kategori') as string)?.toLocaleUpperCase('tr-TR')
    const kullanilan_yer = (formData.get('kullanilan_yer') as string)?.toLocaleUpperCase('tr-TR')
    const kullanilma_amaci = (formData.get('kullanilma_amaci') as string)?.toLocaleUpperCase('tr-TR')
    const durum = formData.get('durum') as string
    const bakim_tarihi = formData.get('bakim_tarihi') as string
    const fotograf_url = formData.get('fotograf_url') as string
    const notlar = (formData.get('notlar') as string)?.toLocaleUpperCase('tr-TR')

    if (!jig_adi || !durum) {
      return { success: false, error: 'Jig Adı ve Durum zorunludur.' }
    }

    const updatedJig = await prisma.jig.update({
      where: { jig_id: id },
      data: {
        jig_adi,
        stok_no: stok_no || null,
        seri_no: seri_no || null,
        kategori: kategori || null,
        kullanilan_yer: kullanilan_yer || null,
        kullanilma_amaci: kullanilma_amaci || null,
        durum,
        bakim_tarihi: bakim_tarihi ? new Date(bakim_tarihi) : null,
        fotograf_url: fotograf_url || null,
        notlar: notlar || null,
      }
    })

    await createLog('JIG_GUNCELLE', `${updatedJig.jig_adi} jigi güncellendi.`)
    revalidatePath('/jigler')
    revalidatePath('/')
    return { success: true, data: updatedJig }
  } catch (error) {
    console.error('Jig güncellenirken hata:', error)
    return { success: false, error: 'Jig güncellenirken bir hata oluştu.' }
  }
}

export async function deleteJig(id: string) {
  try {
    const session = await getSession()
    if (!session || session.role === 'Standart') {
      return { success: false, error: 'Jig silme yetkiniz yok.' }
    }

    const jig = await prisma.jig.findUnique({ where: { jig_id: id } })
    await prisma.jig.delete({
      where: { jig_id: id }
    })

    if (jig) {
      await createLog('JIG_SIL', `${jig.jig_adi} jigi silindi.`)
    }

    revalidatePath('/jigler')
    revalidatePath('/')
    return { success: true }
  } catch (error) {
    return { success: false, error: 'Jig silinemedi. Başka bir kayda (zimmet vb.) bağlı olabilir.' }
  }
}
