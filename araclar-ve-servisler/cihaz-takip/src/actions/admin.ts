'use server'

import prisma from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { checkPermission } from '@/lib/permissions'

// CIHAZ TURLERI
export async function addCihazTuru(ad: string) {
  if (!await checkPermission('admin_panel_erisimi')) return { success: false, error: 'Yetkiniz yok.' }
  try {
    await prisma.cihazTuru.create({ data: { ad } })
    revalidatePath('/admin/cihaz-turleri')
    return { success: true }
  } catch (e: any) {
    if (e.code === 'P2002') return { success: false, error: 'Bu tür zaten var.' }
    return { success: false, error: 'Hata oluştu.' }
  }
}

export async function updateCihazTuru(id: string, ad: string) {
  if (!await checkPermission('admin_panel_erisimi')) return { success: false, error: 'Yetkiniz yok.' }
  try {
    await prisma.cihazTuru.update({ where: { id }, data: { ad } })
    revalidatePath('/admin/cihaz-turleri')
    return { success: true }
  } catch (e: any) {
    if (e.code === 'P2002') return { success: false, error: 'Bu tür zaten var.' }
    return { success: false, error: 'Hata oluştu.' }
  }
}

export async function deleteCihazTuru(id: string) {
  if (!await checkPermission('admin_panel_erisimi')) return { success: false, error: 'Yetkiniz yok.' }
  try {
    await prisma.cihazTuru.delete({ where: { id } })
    revalidatePath('/admin/cihaz-turleri')
    return { success: true }
  } catch (e) {
    return { success: false, error: 'Hata oluştu.' }
  }
}

// JIG KATEGORILERI
export async function addJigKategorisi(ad: string) {
  if (!await checkPermission('admin_panel_erisimi')) return { success: false, error: 'Yetkiniz yok.' }
  try {
    await prisma.jigKategorisi.create({ data: { ad } })
    revalidatePath('/admin/jig-kategorileri')
    return { success: true }
  } catch (e: any) {
    if (e.code === 'P2002') return { success: false, error: 'Bu kategori zaten var.' }
    return { success: false, error: 'Hata oluştu.' }
  }
}

export async function updateJigKategorisi(id: string, ad: string) {
  if (!await checkPermission('admin_panel_erisimi')) return { success: false, error: 'Yetkiniz yok.' }
  try {
    await prisma.jigKategorisi.update({ where: { id }, data: { ad } })
    revalidatePath('/admin/jig-kategorileri')
    return { success: true }
  } catch (e: any) {
    if (e.code === 'P2002') return { success: false, error: 'Bu kategori zaten var.' }
    return { success: false, error: 'Hata oluştu.' }
  }
}

export async function deleteJigKategorisi(id: string) {
  if (!await checkPermission('admin_panel_erisimi')) return { success: false, error: 'Yetkiniz yok.' }
  try {
    await prisma.jigKategorisi.delete({ where: { id } })
    revalidatePath('/admin/jig-kategorileri')
    return { success: true }
  } catch (e) {
    return { success: false, error: 'Hata oluştu.' }
  }
}

// ROLLER
export async function upsertRol(data: any) {
  if (!await checkPermission('admin_panel_erisimi')) return { success: false, error: 'Yetkiniz yok.' }
  try {
    await prisma.rol.upsert({
      where: { ad: data.ad },
      update: data,
      create: data
    })
    revalidatePath('/admin/roller')
    return { success: true }
  } catch (e) {
    console.error(e)
    return { success: false, error: 'Hata oluştu.' }
  }
}

export async function deleteRol(ad: string) {
  if (!await checkPermission('admin_panel_erisimi')) return { success: false, error: 'Yetkiniz yok.' }
  if (['Admin', 'Standart', 'Şef', 'Müdür'].includes(ad)) {
    return { success: false, error: 'Sistem varsayılan rolleri silinemez.' }
  }
  try {
    await prisma.rol.delete({ where: { ad } })
    revalidatePath('/admin/roller')
    return { success: true }
  } catch (e) {
    return { success: false, error: 'Bu role sahip kullanıcılar olabilir, önce onları değiştirin.' }
  }
}

// BOLUMLER
export async function addBolum(bolum_adi: string, bagli_mudur_id?: string) {
  if (!await checkPermission('admin_panel_erisimi')) return { success: false, error: 'Yetkiniz yok.' }
  try {
    await prisma.bolumler.create({ data: { bolum_adi, bagli_mudur_id: bagli_mudur_id || null } })
    revalidatePath('/admin/bolumler')
    return { success: true }
  } catch (e) {
    return { success: false, error: 'Hata oluştu.' }
  }
}

export async function updateBolum(id: string, bolum_adi: string, bagli_mudur_id?: string) {
  if (!await checkPermission('admin_panel_erisimi')) return { success: false, error: 'Yetkiniz yok.' }
  try {
    await prisma.bolumler.update({ 
      where: { bolum_id: id }, 
      data: { bolum_adi, bagli_mudur_id: bagli_mudur_id || null } 
    })
    revalidatePath('/admin/bolumler')
    return { success: true }
  } catch (e) {
    return { success: false, error: 'Hata oluştu.' }
  }
}

export async function deleteBolum(id: string) {
  if (!await checkPermission('admin_panel_erisimi')) return { success: false, error: 'Yetkiniz yok.' }
  try {
    await prisma.bolumler.delete({ where: { bolum_id: id } })
    revalidatePath('/admin/bolumler')
    return { success: true }
  } catch (e) {
    return { success: false, error: 'Bölüme kayıtlı kullanıcılar olabilir.' }
  }
}
