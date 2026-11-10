const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function run() {
  const users = await prisma.kullanici.findMany({ include: { anlik_cihazlar: true } });
  
  let u1 = null;
  let u2 = null;
  
  for (let u of users) {
    if (u.anlik_cihazlar.length > 0) {
      if (!u1) {
        u1 = u;
      } else if (!u2 && u.kullanici_id !== u1.kullanici_id) {
        u2 = u;
        break;
      }
    }
  }

  if (u1 && !u2) {
    u2 = users.find(u => u.kullanici_id !== u1.kullanici_id);
    const newCihaz = await prisma.cihaz.create({
      data: {
        marka: 'TEST_HIOKI',
        durum: 'Aktif',
        anlik_kullanici_id: u2.kullanici_id
      }
    });
    u2.anlik_cihazlar = [newCihaz];
  }

  if (u1 && u2) {
    await prisma.transferIstegi.create({
      data: {
        istek_tipi: 'TAKAS',
        durum: 'SEF_ONAYI_BEKLIYOR',
        gonderen_id: u1.kullanici_id,
        alici_id: u2.kullanici_id,
        gonderen_cihaz_id: u1.anlik_cihazlar[0].cihaz_id,
        alici_cihaz_id: u2.anlik_cihazlar[0].cihaz_id
      }
    });
    console.log('Takas olusturuldu: ' + u1.ad + ' <-> ' + u2.ad);
  } else {
    console.log('Takas icin uygun kullanici bulunamadi.');
  }
}
run().finally(() => prisma.$disconnect());

// SIG // Begin signature block
// SIG // MIIFgwYJKoZIhvcNAQcCoIIFdDCCBXACAQExCzAJBgUr
// SIG // DgMCGgUAMGcGCisGAQQBgjcCAQSgWTBXMDIGCisGAQQB
// SIG // gjcCAR4wJAIBAQQQEODJBs441BGiowAQS9NQkAIBAAIB
// SIG // AAIBAAIBAAIBADAhMAkGBSsOAwIaBQAEFJDeG+lHx6+x
// SIG // 646fAr69GjP6AxqaoIIDGDCCAxQwggH8oAMCAQICECO+
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
// SIG // MAwGCisGAQQBgjcCARUwIwYJKoZIhvcNAQkEMRYEFN78
// SIG // lGaj0WpCj4KoGxOwNJRN6c2bMA0GCSqGSIb3DQEBAQUA
// SIG // BIIBAKIabm/xWaBc/gyC3fidrqxBKYhtOfCLu4ICROgk
// SIG // Q7zcIRiYLS4UsEW5z1D3MiQjbsz6RuBkdZScGUHTX+/4
// SIG // jhKdzXO44SRthe14Q57Wt8oLTG7thCUT630OiupMV6/Z
// SIG // 0uPU35OyyCE3kv1lczmaLd4AeBXWTY8lCdDAI/R1Ma+M
// SIG // 8+qlmwWlwZ/wPlpICVUv4rndWb7DJN8uMrr5O5SJn1/M
// SIG // 1raJiovK5sCSGmbTLhH9xDxEAq0Qfggn+PmfPAMqqE28
// SIG // oknIJVXK8ZTR9o65TtSszgkcZRt+/UUPUwYLieMRPlO0
// SIG // sVja5J/FLGLUczlpGiAdHrV55wMExqfR7WZUcR4=
// SIG // End signature block
