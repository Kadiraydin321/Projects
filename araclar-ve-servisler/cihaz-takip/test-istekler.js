const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Test verileri oluşturuluyor...');

  const bolum = await prisma.bolumler.findFirst();
  
  // 1. İki yeni standart kullanıcı
  const ali = await prisma.kullanici.create({
    data: {
      ad: 'ALİ',
      soyad: 'GÜN',
      email: `ali.gun${Date.now()}@test.com`,
      sifre: '123456',
      yetki_seviyesi: 'Standart',
      durum: 'Aktif',
      bolum: { connect: { bolum_id: bolum.bolum_id } },
      telefon: '(555) 111 22 33'
    }
  });

  const veli = await prisma.kullanici.create({
    data: {
      ad: 'VELİ',
      soyad: 'ŞAHİN',
      email: `veli.sahin${Date.now()}@test.com`,
      sifre: '123456',
      yetki_seviyesi: 'Standart',
      durum: 'Aktif',
      bolum: { connect: { bolum_id: bolum.bolum_id } },
      telefon: '(555) 999 88 77'
    }
  });
  console.log('İki standart kullanıcı oluşturuldu (Ali ve Veli).');

  // Ali için bir cihaz oluşturalım
  const aliCihazi = await prisma.cihaz.create({
    data: {
      marka: 'UNIT',
      model: 'UT89X',
      seri_no: 'UNI001',
      cihaz_turu: 'ÖLÇÜM CİHAZI',
      durum: 'Aktif',
      anlik_kullanici: { connect: { kullanici_id: ali.kullanici_id } }
    }
  });

  // Devir İsteği (Ali'den Veli'ye)
  await prisma.transferIstegi.create({
    data: {
      istek_tipi: 'DEVIR',
      durum: 'ALICI_ONAYI_BEKLIYOR',
      bolumler_arasi: false,
      gonderen: { connect: { kullanici_id: ali.kullanici_id } },
      alici: { connect: { kullanici_id: veli.kullanici_id } },
      gonderen_cihaz_id: aliCihazi.cihaz_id
    }
  });
  console.log('Ali -> Veli Devir İsteği oluşturuldu (Alıcı onayı bekliyor).');

  // Ahmet ve Ayşe'yi bulalım
  const ahmet = await prisma.kullanici.findFirst({ where: { ad: 'AHMET' } });
  const ayse = await prisma.kullanici.findFirst({ where: { ad: 'AYŞE' } });

  if (ahmet && ayse) {
    let ahmetCihazi = await prisma.cihaz.findFirst({ where: { anlik_kullanici_id: ahmet.kullanici_id } });
    let ayseCihazi = await prisma.cihaz.findFirst({ where: { anlik_kullanici_id: ayse.kullanici_id } });

    // Eğer Ayşe'nin cihazı yoksa oluşturalım (Takas için iki cihaz lazım)
    if (!ayseCihazi) {
      ayseCihazi = await prisma.cihaz.create({
        data: {
          marka: 'HIOKI',
          model: 'DT4252',
          seri_no: 'HIO999',
          cihaz_turu: 'ÖLÇÜM CİHAZI',
          durum: 'Aktif',
          anlik_kullanici: { connect: { kullanici_id: ayse.kullanici_id } }
        }
      });
    }

    if (ahmetCihazi && ayseCihazi) {
      // Takas İsteği (Ahmet ve Ayşe)
      await prisma.transferIstegi.create({
        data: {
          istek_tipi: 'TAKAS',
          durum: 'SEF_ONAYI_BEKLIYOR', // Dashboard'da farklı durumlar görebilmek için
          bolumler_arasi: false,
          gonderen: { connect: { kullanici_id: ahmet.kullanici_id } },
          alici: { connect: { kullanici_id: ayse.kullanici_id } },
          gonderen_cihaz_id: ahmetCihazi.cihaz_id,
          alici_cihaz_id: ayseCihazi.cihaz_id
        }
      });
      console.log('Ahmet <-> Ayşe Takas İsteği oluşturuldu (Şef onayı bekliyor).');
    }
  }

  console.log('İşlem başarıyla tamamlandı!');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
