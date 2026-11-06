const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Veritabanına rastgele veriler ekleniyor...');

  // Bölüm kontrolü
  let bolum = await prisma.bolumler.findFirst();
  if (!bolum) {
    bolum = await prisma.bolumler.create({
      data: {
        bolum_adi: 'AR-GE VE DONANIM TEST BÖLÜMÜ',
      }
    });
    console.log('Yeni bölüm oluşturuldu:', bolum.bolum_adi);
  }

  // Kullanıcılar
  const u1 = await prisma.kullanici.create({
    data: {
      ad: 'AHMET',
      soyad: 'YILMAZ',
      email: `ahmet.yilmaz${Date.now()}@test.com`,
      sifre: '123456',
      yetki_seviyesi: 'Standart',
      durum: 'Aktif',
      bolum: { connect: { bolum_id: bolum.bolum_id } },
      telefon: '(555) 123 45 67'
    }
  });

  const u2 = await prisma.kullanici.create({
    data: {
      ad: 'AYŞE',
      soyad: 'KAYA',
      email: `ayse.kaya${Date.now()}@test.com`,
      sifre: '123456',
      yetki_seviyesi: 'Şef',
      durum: 'Aktif',
      bolum: { connect: { bolum_id: bolum.bolum_id } },
      telefon: '(555) 987 65 43'
    }
  });

  const u3 = await prisma.kullanici.create({
    data: {
      ad: 'MEHMET',
      soyad: 'DEMİR',
      email: `mehmet.demir${Date.now()}@test.com`,
      sifre: '123456',
      yetki_seviyesi: 'Müdür',
      durum: 'Aktif',
      bolum: { connect: { bolum_id: bolum.bolum_id } },
      telefon: '(555) 444 33 22'
    }
  });
  console.log('3 adet kullanıcı eklendi.');

  // Cihazlar
  await prisma.cihaz.create({
    data: {
      marka: 'FLUKE',
      model: '179',
      seri_no: 'FLK12345',
      cihaz_turu: 'ÖLÇÜM CİHAZI',
      durum: 'Aktif',
      kullanim_amaci: 'VOLTAJ ÖLÇÜMÜ',
      kullanilan_yer: 'MASA 1',
      anlik_kullanici: { connect: { kullanici_id: u1.kullanici_id } }
    }
  });

  await prisma.cihaz.create({
    data: {
      marka: 'TEKTRONIX',
      model: 'TBS1052B',
      seri_no: 'TEK98765',
      cihaz_turu: 'ÖLÇÜM CİHAZI',
      durum: 'Aktif',
      kullanilan_yer: 'OSİLOSKOP İSTASYONU'
    }
  });

  await prisma.cihaz.create({
    data: {
      marka: 'WELLER',
      model: 'WE1010',
      seri_no: 'WEL5555',
      cihaz_turu: 'DİĞER',
      durum: 'Bakımda',
      notlar: 'Havya ucu değiştirilecek.'
    }
  });
  console.log('3 adet cihaz eklendi.');

  // Jigler
  await prisma.jig.create({
    data: {
      jig_adi: 'MAINBOARD TEST JİGİ',
      stok_no: 'STK-MB-001',
      kategori: 'TEST JİGİ',
      durum: 'Aktif',
      anlik_kullanici: { connect: { kullanici_id: u2.kullanici_id } },
      kullanilan_yer: 'TEST HATTI A'
    }
  });

  await prisma.jig.create({
    data: {
      jig_adi: 'RF LEHİMLEME FİKSTÜRÜ',
      stok_no: 'STK-RF-002',
      kategori: 'LEHİMLEME FİKSTÜRÜ',
      durum: 'Aktif',
      notlar: 'RF modül montajında kullanılır.'
    }
  });

  await prisma.jig.create({
    data: {
      jig_adi: 'DISPLAY MONTAJ APARATI',
      stok_no: 'STK-DISP-003',
      kategori: 'MONTAJ APARATI',
      durum: 'Hurda',
      notlar: 'Kırık, yenisi sipariş edildi.'
    }
  });
  console.log('3 adet jig eklendi.');

  console.log('Veritabanına ekleme işlemi başarıyla tamamlandı!');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
