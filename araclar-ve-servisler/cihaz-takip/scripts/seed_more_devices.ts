import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const users = await prisma.kullanici.findMany()
  
  if (users.length === 0) {
    console.log("No users found.")
    return
  }
  
  const user1 = users[0]
  const user2 = users.length > 1 ? users[1] : users[0]

  const cihazlar = [
    {
      marka: 'Fluke',
      model: '179',
      seri_no: 'FLK-179-1122',
      envanter_no: 'ENV-FLK-01',
      cihaz_turu: 'Multimetre',
      durum: 'Aktif',
      anlik_kullanici_id: user1.kullanici_id
    },
    {
      marka: 'Keysight',
      model: '34461A',
      seri_no: 'KEY-344-9988',
      envanter_no: 'ENV-KEY-02',
      cihaz_turu: 'Multimetre',
      durum: 'Aktif',
      anlik_kullanici_id: user2.kullanici_id
    },
    {
      marka: 'Tektronix',
      model: 'MDO3014',
      seri_no: 'TEK-MDO-5544',
      envanter_no: 'ENV-TEK-03',
      cihaz_turu: 'Osiloskop',
      durum: 'Aktif',
      anlik_kullanici_id: user1.kullanici_id
    },
    {
      marka: 'Rohde & Schwarz',
      model: 'RTE1000',
      seri_no: 'RS-RTE-7766',
      envanter_no: 'ENV-RS-04',
      cihaz_turu: 'Osiloskop',
      durum: 'Aktif',
      anlik_kullanici_id: user2.kullanici_id
    },
    {
      marka: 'Rigol',
      model: 'DS1054Z',
      seri_no: 'RGL-DS-1234',
      envanter_no: 'ENV-RGL-05',
      cihaz_turu: 'Osiloskop',
      durum: 'Aktif',
      anlik_kullanici_id: null // DEPOT
    },
    {
      marka: 'Hakko',
      model: 'FX-888D',
      seri_no: 'HK-FX-0001',
      envanter_no: 'ENV-HK-06',
      cihaz_turu: 'Havya İstasyonu',
      durum: 'Aktif',
      anlik_kullanici_id: null // DEPOT
    }
  ]

  for (const c of cihazlar) {
    await prisma.cihaz.create({ data: c })
  }

  console.log('Seed completed: Added ' + cihazlar.length + ' new devices.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
