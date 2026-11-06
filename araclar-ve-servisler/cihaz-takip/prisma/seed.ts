import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  console.log('Seeding veritabani...')

  await prisma.cihazIstekleri.deleteMany()
  await prisma.cihaz.deleteMany()
  await prisma.jig.deleteMany()
  await prisma.bolumler.deleteMany()
  await prisma.kullanici.deleteMany()

  // Create Departments
  const uretim = await prisma.bolumler.create({ data: { bolum_adi: 'ÜRETİM' } })
  const arge = await prisma.bolumler.create({ data: { bolum_adi: 'AR-GE' } })
  const kalite = await prisma.bolumler.create({ data: { bolum_adi: 'KALİTE KONTROL' } })
  const muhasebe = await prisma.bolumler.create({ data: { bolum_adi: 'MUHASEBE' } })
  const depolar = [uretim, arge, kalite, muhasebe]

  // Create Admin
  const admin = await prisma.kullanici.upsert({
    where: { email: 'admin@test.com' },
    update: {},
    create: {
      ad: 'SİSTEM',
      soyad: 'YÖNETİCİSİ',
      email: 'admin@test.com',
      sifre: 'admin123',
      yetki_seviyesi: 'Admin',
      durum: 'Aktif'
    }
  })
  
  // Create Mudurs
  const mudur = await prisma.kullanici.create({
    data: { ad: 'AHMET', soyad: 'YILMAZ', email: 'mudur@test.com', sifre: 'mudur123', yetki_seviyesi: 'Müdür', durum: 'Aktif', bolum_id: uretim.bolum_id }
  })
  await prisma.bolumler.update({ where: { bolum_id: uretim.bolum_id }, data: { bagli_mudur_id: mudur.kullanici_id } })

  const argeMudur = await prisma.kullanici.create({
    data: { ad: 'AYŞE', soyad: 'KARA', email: 'arge@test.com', sifre: 'mudur123', yetki_seviyesi: 'Müdür', durum: 'Aktif', bolum_id: arge.bolum_id }
  })
  await prisma.bolumler.update({ where: { bolum_id: arge.bolum_id }, data: { bagli_mudur_id: argeMudur.kullanici_id } })

  // Random Users
  const isimler = ['MEHMET', 'ALİ', 'VELİ', 'FATMA', 'HAYRİYE', 'MUSTAFA', 'CAN', 'CEM', 'ELİF', 'BURAK']
  const soyisimler = ['DEMİR', 'ÇELİK', 'KAYA', 'ŞAHİN', 'YILDIZ', 'ÖZTÜRK', 'AYDIN', 'ÖZDEMİR', 'ARSLAN', 'DOĞAN']
  
  const kullanicilar = []
  for (let i = 0; i < 15; i++) {
    const rAd = isimler[Math.floor(Math.random() * isimler.length)]
    const rSoyad = soyisimler[Math.floor(Math.random() * soyisimler.length)]
    const rBolum = depolar[Math.floor(Math.random() * depolar.length)]
    const k = await prisma.kullanici.create({
      data: {
        ad: rAd,
        soyad: rSoyad,
        email: `user${i}@test.com`,
        sifre: 'pass123',
        yetki_seviyesi: Math.random() > 0.8 ? 'Şef' : 'Standart',
        durum: 'Aktif',
        bolum_id: rBolum.bolum_id,
        telefon: `(555) ${Math.floor(100 + Math.random() * 900)} ${Math.floor(10 + Math.random() * 90)} ${Math.floor(10 + Math.random() * 90)}`
      }
    })
    kullanicilar.push(k)
  }

  // Random Devices
  const markalar = ['FLUKE', 'KEYSIGHT', 'TEKTRONIX', 'ROHDE & SCHWARZ', 'RIGOL']
  const turler = ['MULTİMETRE', 'OSİLOSKOP', 'GÜÇ KAYNAĞI', 'SİNYAL JENERATÖRÜ', 'TERMOMETRE']
  
  for (let i = 0; i < 20; i++) {
    const isAssigned = Math.random() > 0.5
    const rUser = isAssigned ? kullanicilar[Math.floor(Math.random() * kullanicilar.length)] : null
    
    await prisma.cihaz.create({
      data: {
        marka: markalar[Math.floor(Math.random() * markalar.length)],
        model: `MOD-${Math.floor(1000 + Math.random() * 9000)}`,
        seri_no: `SN${Math.floor(100000 + Math.random() * 900000)}`,
        envanter_no: `ENV-${i+1}`,
        cihaz_turu: turler[Math.floor(Math.random() * turler.length)],
        durum: Math.random() > 0.1 ? 'Aktif' : 'Bakımda',
        anlik_kullanici_id: rUser ? rUser.kullanici_id : null,
        kullanilan_yer: rUser ? 'PERSONEL' : 'DEPO'
      }
    })
  }

  // Random Jigs
  const jigTurleri = ['TEST JİGİ', 'MONTAJ APARATI', 'LEHİMLEME FİKSTÜRÜ']
  for (let i = 0; i < 12; i++) {
    const isAssigned = Math.random() > 0.6
    const rUser = isAssigned ? kullanicilar[Math.floor(Math.random() * kullanicilar.length)] : null

    await prisma.jig.create({
      data: {
        jig_adi: `${jigTurleri[Math.floor(Math.random() * jigTurleri.length)]} TİP-${i+1}`,
        stok_no: `STK-JIG-${Math.floor(100 + Math.random() * 900)}`,
        seri_no: `JIG-SN-${i+1}`,
        kategori: jigTurleri[Math.floor(Math.random() * jigTurleri.length)],
        durum: 'Aktif',
        anlik_kullanici_id: rUser ? rUser.kullanici_id : null,
        kullanilan_yer: rUser ? 'HAT 1' : 'DEPO'
      }
    })
  }

  console.log('Seed tamamlandi.')
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
