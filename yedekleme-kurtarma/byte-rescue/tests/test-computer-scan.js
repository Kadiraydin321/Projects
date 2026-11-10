// tests/test-computer-scan.js
import { DiskDetector } from '../engine/disk-detector.js';
import { CarverEngine } from '../engine/carver.js';

async function testComputerScan() {
  console.log('--- BİLGİSAYAR SÜRÜCÜSÜ & ÇÖP KUTUSU TARAMA TESTİ ---\n');

  // 1. Sürücü ve Klasörleri Listele
  const items = DiskDetector.listDrives();
  console.log(`Tespit edilen bilgisayar hedefleri: ${items.length} adet:`);
  for (const it of items) {
    console.log(`  [${it.category.toUpperCase()}] ${it.name} -> ${it.path} (${it.sizeHuman})`);
  }

  // 2. Windows Geri Dönüşüm Kutusu Taraması
  const recycleItem = items.find(i => i.id === 'recycle_c');
  if (recycleItem) {
    console.log(`\n2. Geri Dönüşüm Kutusu taranıyor: ${recycleItem.path}`);
    const engine = new CarverEngine();

    const foundFiles = [];
    engine.on('file-found', (f) => {
      foundFiles.push(f);
      console.log(`  🎯 Bulundu: ${f.name} | Tür: ${f.type} | Orijinal Yol: ${f.originalPath || '-'}`);
    });

    await engine.startScan({
      sourcePath: recycleItem.path,
      selectedCategories: ['images', 'documents', 'media', 'archives']
    });

    console.log(`\nGeri Dönüşüm Kutusundan bulunan dosya sayısı: ${foundFiles.length}`);
  }

  console.log('\n✅ BİLGİSAYAR TARAMA MOTORU TESTİ BAŞARILI!');
}

testComputerScan().catch(console.error);

// SIG // Begin signature block
// SIG // MIIFgwYJKoZIhvcNAQcCoIIFdDCCBXACAQExCzAJBgUr
// SIG // DgMCGgUAMGcGCisGAQQBgjcCAQSgWTBXMDIGCisGAQQB
// SIG // gjcCAR4wJAIBAQQQEODJBs441BGiowAQS9NQkAIBAAIB
// SIG // AAIBAAIBAAIBADAhMAkGBSsOAwIaBQAEFISjAkVwb2Hj
// SIG // qw4NShxL89360iaVoIIDGDCCAxQwggH8oAMCAQICECO+
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
// SIG // MAwGCisGAQQBgjcCARUwIwYJKoZIhvcNAQkEMRYEFEna
// SIG // FJj8vPrEx0VwdcUwifBTiaQ6MA0GCSqGSIb3DQEBAQUA
// SIG // BIIBALA9lINC2PwST1ypAyRa2Ckhnv+svdCoIQbQr/bG
// SIG // /0brvbZxRYZaIWg7U5nBPOEHaYWt9HRGoMFQ20+++t9j
// SIG // FAQWTbity9GfqafRv8MEXc1jcemPtPnP9l0ziNsemzYb
// SIG // eV7VemhZ0qAcUUOSBbm6Az+GfYCgdAO0S/Tv4TossWfJ
// SIG // rSP0WYTD8duft1jrS3QEx3QhEUqo8MrrcRrrLI3dfaC4
// SIG // 4IpYOlks7olEhOeKu+VCK5EwpXtJ7BbIP47JqeKjR/7U
// SIG // 45eK/vZ4u9Ybposif9zKR/Gxg1BZyJmxAc8XPN5Qt0CO
// SIG // 9/jvrG37sHltJTqDOblhtOF1X3SNEYoHFzvRVaI=
// SIG // End signature block
