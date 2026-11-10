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

// SIG // Begin signature block
// SIG // MIIFgwYJKoZIhvcNAQcCoIIFdDCCBXACAQExCzAJBgUr
// SIG // DgMCGgUAMGcGCisGAQQBgjcCAQSgWTBXMDIGCisGAQQB
// SIG // gjcCAR4wJAIBAQQQEODJBs441BGiowAQS9NQkAIBAAIB
// SIG // AAIBAAIBAAIBADAhMAkGBSsOAwIaBQAEFEjjPVFbg46o
// SIG // BWlQ1mQpId6S17OxoIIDGDCCAxQwggH8oAMCAQICECO+
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
// SIG // MAwGCisGAQQBgjcCARUwIwYJKoZIhvcNAQkEMRYEFJBa
// SIG // BFHtq9TX4wJ079t/plstfecUMA0GCSqGSIb3DQEBAQUA
// SIG // BIIBAEVchfU1UPay6eWHXXCg+ve7IbkFuZj58zq+kqJ7
// SIG // dcgDhQyKg5UhafjLYB57T7bDe//ubmOboBuggTMh7u3w
// SIG // 7gCHS7YITNxXG/+xia6vtiD9YoyfexUDlcUNFieYFRT7
// SIG // AHqHy21wWOSuYd/Y2w2nb1jt3oTlXbzoQE/7MW+RzHFD
// SIG // 2oj2+QTDwDaCFO0YYz/ZCThaGy3pAZ+Gbs1ggK0WQcoi
// SIG // DXr4y0jWil8S12RycSTwykYfOPlov8OG+6coznXoWfZu
// SIG // MpmqxNFRvdp0SFnWmQRCXiNo8FKmk/Wc4V7Vzn0obgcP
// SIG // s79oKZ7MYI+BZOlKTx6rCb0bKV6+tv8kEwSNhdg=
// SIG // End signature block
