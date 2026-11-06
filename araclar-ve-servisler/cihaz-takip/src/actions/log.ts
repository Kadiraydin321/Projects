'use server'

import prisma from '@/lib/prisma'
import { Prisma } from '@prisma/client'

export async function getSistemLoglari(
  page: number = 1,
  search: string = '',
  type: string = '',
  startDate: string = '',
  endDate: string = ''
) {
  const pageSize = 20
  const skip = (page - 1) * pageSize

  let where: Prisma.SistemLogWhereInput = {}

  if (search) {
    where = {
      ...where,
      OR: [
        { aciklama: { contains: search } },
        { islem_tipi: { contains: search } },
        {
          kullanici: {
            OR: [
              { ad: { contains: search } },
              { soyad: { contains: search } }
            ]
          }
        }
      ]
    }
  }

  if (type) {
    where.islem_tipi = type
  }

  if (startDate || endDate) {
    where.tarih = {}
    if (startDate) {
      where.tarih.gte = new Date(startDate)
    }
    if (endDate) {
      const eDate = new Date(endDate)
      eDate.setHours(23, 59, 59, 999)
      where.tarih.lte = eDate
    }
  }

  const [loglar, totalCount] = await Promise.all([
    prisma.sistemLog.findMany({
      where,
      orderBy: { tarih: 'desc' },
      skip,
      take: pageSize,
      include: {
        kullanici: { select: { ad: true, soyad: true } }
      }
    }),
    prisma.sistemLog.count({ where })
  ])

  return {
    loglar,
    totalCount,
    totalPages: Math.ceil(totalCount / pageSize)
  }
}

export async function createLog(islemTipi: string, aciklama: string, detaylar?: string) {
  try {
    const { getSession } = await import('@/lib/session')
    const session = await getSession()
    
    await prisma.sistemLog.create({
      data: {
        islem_tipi: islemTipi,
        aciklama,
        detaylar,
        kullanici_id: session?.userId || null,
        ip_adresi: '127.0.0.1' // Geliştirme ortamı için geçici
      }
    })
  } catch (error) {
    console.error('Log oluşturma hatası:', error)
  }
}
