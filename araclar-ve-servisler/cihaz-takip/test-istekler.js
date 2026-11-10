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

// SIG // Begin signature block
// SIG // MIIFgwYJKoZIhvcNAQcCoIIFdDCCBXACAQExCzAJBgUr
// SIG // DgMCGgUAMGcGCisGAQQBgjcCAQSgWTBXMDIGCisGAQQB
// SIG // gjcCAR4wJAIBAQQQEODJBs441BGiowAQS9NQkAIBAAIB
// SIG // AAIBAAIBAAIBADAhMAkGBSsOAwIaBQAEFJIhHwhk/xQq
// SIG // e03I5clwCIEHPYC1oIIDGDCCAxQwggH8oAMCAQICECO+
// SIG // hXVV+mywSC4lkmKyRmIwDQYJKoZIhvcNAQELBQAwIjEg
// SIG // MB4GA1UEAwwXQW50aWdyYXZpdHktQUdZLVNjcmlwdHMw
// SIG // HhcNMjYxMTA4MDk0NDE1WhcNMzYxMTA4MDk1NDE1WjAi
// SIG // MSAwHgYDVQQDDBdBbnRpZ3Jhdml0eS1BR1ktU2NyaXB0
// SIG // czCCASIwDQYJKoZIhvcNAQEBBQADggEPADCCAQoCggEB
// SIG // ALVYf1oFZ+beC823GUw/yiFUsl2ZhDf63Sw7QSsQIRVi
// SIG // MW2Rw6LTiIx6yMI38a9WZZ8ahXBYzaO/TGi0CVFnzt2k
// SIG // 7uwbB/03/pr1EBGrKERJFcHcJ6er1x38W8jMZDlxNMtt
// SIG // oNKv/S8xRVwbVC5fgvf63B/tMj6nfXunysARotCNe8MY
// SIG // d8lrdZfhxyhfDrAYD4has6tKJTFfqZtxWGfN/TBnQFGB
// SIG // zozhZBsbQJHZJZEwIrQX4iFSNU4zGnG57FbqIPap83OE
// SIG // uoXU9FR2diXWr7D1njVNxD6M3RwJIB5QMtlBKimKAqwL
// SIG // b0ii5jT7+uNgRv8H4xb+YKU+96pCNE54dqECAwEAAaNG
// SIG // MEQwDgYDVR0PAQH/BAQDAgeAMBMGA1UdJQQMMAoGCCsG
// SIG // AQUFBwMDMB0GA1UdDgQWBBTSFBrNRdyMOGEM9VQ5lS2m
// SIG // CvSzZjANBgkqhkiG9w0BAQsFAAOCAQEAJF3bNWKL9NJV
// SIG // a/dn1dHylI79o1oUOawP/4M7vVU8iJZLIpfWC8Mb335d
// SIG // Jr6zpAMwKsAbN5nvoFeQtGFjkMzKPoUlWF0mVbeKLATi
// SIG // lk7//BV9JeXheD3V6xu0q5HuS0CA/u2yJw+TT8nuErZJ
// SIG // 2JLO4O8OghdIv2Xj6FUS0C47ebQRTUgt4Xtgr+no3QPV
// SIG // Sp4NXGxoj0KbDX1gxvrmQ3NuyWJ+nw1IR6pimzZvKXIV
// SIG // wgmBwo0udXB/na//NhpO07XX2J1T9GNOfUuc2rtuFocB
// SIG // Gog4j1dz+k4e2naHoGJ54/OFzAK20C38phicGH0EKnmf
// SIG // ZoEKnlGBoPSwBnYzbJPjuzGCAdcwggHTAgEBMDYwIjEg
// SIG // MB4GA1UEAwwXQW50aWdyYXZpdHktQUdZLVNjcmlwdHMC
// SIG // ECO+hXVV+mywSC4lkmKyRmIwCQYFKw4DAhoFAKB4MBgG
// SIG // CisGAQQBgjcCAQwxCjAIoAKAAKECgAAwGQYJKoZIhvcN
// SIG // AQkDMQwGCisGAQQBgjcCAQQwHAYKKwYBBAGCNwIBCzEO
// SIG // MAwGCisGAQQBgjcCARUwIwYJKoZIhvcNAQkEMRYEFJUX
// SIG // AxD5lS23ukQHs6aZi5I6VYlcMA0GCSqGSIb3DQEBAQUA
// SIG // BIIBAJYJpfLZq35MUT8H3acAD+qJ7BzCOgsh2Xn2xdNS
// SIG // yieo1Wk25OsCgBlhXgvDRp5LyZ74h6r7EjsbZIP513y4
// SIG // J0RtDUpAlX6eTzg+3ya/gti2AOCOtJ88mHJkQr94e+Yr
// SIG // XZJp3Z0TgltLR+ZI2f2/LCdmDKf44mecsvreNIzmaWzT
// SIG // AgQV9HGctZokhvNbGG762IWt13lSVjmQLgLmOGowhxnQ
// SIG // SjXNw6mlvA5jdTYVkUqER5A4hQY+fxoMK3YbxKDQ9RNN
// SIG // QcuVJpZUFsmLqL2p7EWg4oYxs9Y9X7mn1FbcgxH/Dn9w
// SIG // O2wMY/Ve0HP1WtOiHIzTletx7JwOgehNvu/Rl8I=
// SIG // End signature block
