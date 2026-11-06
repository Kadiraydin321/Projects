import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // 1. Roller
  const roller = [
    {
      ad: 'Standart',
      cihaz_ekle: false,
      cihaz_duzenle: false,
      cihaz_sil: false,
      jig_ekle: false,
      jig_duzenle: false,
      jig_sil: false,
      kullanici_ekle: false,
      kullanici_duzenle: false,
      kullanici_sil: false,
      admin_panel_erisimi: false
    },
    {
      ad: 'Şef',
      cihaz_ekle: true,
      cihaz_duzenle: true,
      cihaz_sil: false,
      jig_ekle: true,
      jig_duzenle: true,
      jig_sil: false,
      kullanici_ekle: false,
      kullanici_duzenle: false,
      kullanici_sil: false,
      admin_panel_erisimi: false
    },
    {
      ad: 'Müdür',
      cihaz_ekle: true,
      cihaz_duzenle: true,
      cihaz_sil: false,
      jig_ekle: true,
      jig_duzenle: true,
      jig_sil: false,
      kullanici_ekle: true,
      kullanici_duzenle: true,
      kullanici_sil: false,
      admin_panel_erisimi: false
    },
    {
      ad: 'Admin',
      cihaz_ekle: true,
      cihaz_duzenle: true,
      cihaz_sil: true,
      jig_ekle: true,
      jig_duzenle: true,
      jig_sil: true,
      kullanici_ekle: true,
      kullanici_duzenle: true,
      kullanici_sil: true,
      admin_panel_erisimi: true
    }
  ]

  for (const r of roller) {
    await prisma.rol.upsert({
      where: { ad: r.ad },
      update: r,
      create: r
    })
  }
  console.log('Roller eklendi.')

  // 2. Cihaz Türleri
  const cihazTurleri = [
    'Multimetre',
    'Osiloskop',
    'Güç Kaynağı',
    'Sinyal Jeneratörü',
    'Havya İstasyonu',
    'Laptop',
    'Tablet',
    'Yazıcı'
  ]

  for (const t of cihazTurleri) {
    await prisma.cihazTuru.upsert({
      where: { ad: t },
      update: {},
      create: { ad: t }
    })
  }
  console.log('Cihaz Türleri eklendi.')

  // 3. Jig Kategorileri
  const jigKategorileri = [
    'Mekanik',
    'Elektronik',
    'Test',
    'Montaj',
    'Kalibrasyon'
  ]

  for (const k of jigKategorileri) {
    await prisma.jigKategorisi.upsert({
      where: { ad: k },
      update: {},
      create: { ad: k }
    })
  }
  console.log('Jig Kategorileri eklendi.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
