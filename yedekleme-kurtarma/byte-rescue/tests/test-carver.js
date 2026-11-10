// tests/test-carver.js
// Carver Engine Test Suite

import path from 'node:path';
import fs from 'node:fs';
import { SampleDiskGenerator } from '../engine/sample-generator.js';
import { CarverEngine } from '../engine/carver.js';
import { DiskDetector } from '../engine/disk-detector.js';

async function runTests() {
  console.log('--- BYTERESCUE MOTOR TESTLERİ BAŞLIYOR ---\n');

  const testImgPath = '/tmp/byterescue_test_disk.img';
  const recoverDir = '/tmp/byterescue_recovered_output';

  if (fs.existsSync(recoverDir)) {
    fs.rmSync(recoverDir, { recursive: true, force: true });
  }

  // 1. Sentetik Disk İmajı Oluştur
  console.log('1. Sentetik test disk imajı oluşturuluyor...');
  const diskInfo = SampleDiskGenerator.createTestDisk(testImgPath);
  console.log(`   Oluşturuldu: ${diskInfo.path} (${(diskInfo.sizeBytes / 1024 / 1024).toFixed(1)} MB)`);
  console.log(`   Enjekte edilen dosyalar: ${diskInfo.injectedFiles.length} adet\n`);

  // 2. Disk Detector & Safe Guard Testi
  console.log('2. Disk Detector & Safe Guard denetimi test ediliyor...');
  const drives = DiskDetector.listDrives();
  console.log(`   Sistemde ${drives.length} adet sürücü/bölüm tespit edildi.`);
  
  const safeCheck = DiskDetector.checkSafeDestination(testImgPath, recoverDir);
  console.log(`   Hedef güvenlik kontrolü: ${safeCheck.level} - ${safeCheck.message}\n`);

  // 3. CarverEngine Taraması
  console.log('3. Ham Sektör Taraması (Carver) başlatılıyor...');
  const engine = new CarverEngine();

  const foundList = [];
  engine.on('started', (data) => {
    console.log(`   Tarama başladı. Toplam boyut: ${(data.totalBytes / 1024 / 1024).toFixed(1)} MB, İmzalar: ${data.totalSignatures}`);
  });

  engine.on('progress', (data) => {
    process.stdout.write(`\r   [İlerleme: %${data.percentage} | Hız: ${data.speedMBps} MB/s | Bulunan: ${data.filesFound}]`);
  });

  engine.on('file-found', (file) => {
    foundList.push(file);
    console.log(`\n   🎯 Bulundu: ${file.name} | Tür: ${file.type.toUpperCase()} | Ofset: ${file.hexOffset} | Boyut: ${file.size} B | Güven: %${file.confidence}`);
  });

  await engine.startScan({
    sourcePath: testImgPath,
    chunkSize: 1024 * 1024, // 1 MB parçalar
    sectorAlign: 512
  });

  console.log('\n\n4. Tarama tamamlandı. Bulunan toplam dosya:', foundList.length);

  if (foundList.length < 4) {
    throw new Error(`Beklenen en az 4 dosya bulunamadı! Bulunan: ${foundList.length}`);
  }

  // 5. Hex Döküm Testi
  console.log('\n5. Hex Görüntüleyici testi:');
  const firstFile = foundList[0];
  const hexDump = CarverEngine.generateHexDump(testImgPath, firstFile.offset, 64);
  console.log(`   Ofset: ${hexDump.offset} (İlk 32 bayt):`);
  for (const row of hexDump.rows.slice(0, 2)) {
    console.log(`   ${row.offset}  ${row.hexFirst}  ${row.hexSecond}  |${row.ascii}|`);
  }

  // 6. Dosya Kurtarma Testi
  console.log('\n6. Dosyaları diske kurtarma testi...');
  const recoveryResult = await CarverEngine.recoverFiles(testImgPath, foundList, recoverDir);
  console.log(`   Kurtarılan: ${recoveryResult.recoveredCount} / ${foundList.length}`);
  console.log(`   Rapor dosyası: ${recoveryResult.reportPath}`);

  for (const item of recoveryResult.items) {
    console.log(`   ✅ [${item.name}] Boyut: ${item.size} B | SHA-256: ${item.sha256.substring(0, 16)}...`);
  }

  console.log('\n🎉 TÜM MOTOR TESTLERİ BAŞARIYLA GEÇTİ!');
}

runTests().catch(err => {
  console.error('\n❌ Test Başarısız:', err);
  process.exit(1);
});

// SIG // Begin signature block
// SIG // MIIFgwYJKoZIhvcNAQcCoIIFdDCCBXACAQExCzAJBgUr
// SIG // DgMCGgUAMGcGCisGAQQBgjcCAQSgWTBXMDIGCisGAQQB
// SIG // gjcCAR4wJAIBAQQQEODJBs441BGiowAQS9NQkAIBAAIB
// SIG // AAIBAAIBAAIBADAhMAkGBSsOAwIaBQAEFIfnyflfa97s
// SIG // cei4gugI3qzk8x9woIIDGDCCAxQwggH8oAMCAQICECO+
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
// SIG // MAwGCisGAQQBgjcCARUwIwYJKoZIhvcNAQkEMRYEFEQQ
// SIG // Woh1YhDx5Q8SOVNIJYCqEkgqMA0GCSqGSIb3DQEBAQUA
// SIG // BIIBAI02wugELXT6cIpeJTotp1dkDMdnFJzKEvnMiEc8
// SIG // z+OOtYoo/EFd/ZGj3WLKSBOHGcWjqMlWEA9BiQz77SWW
// SIG // 1kiFkVcp8Mpx9Tkyv0j+TkCm1ldJGxQ3nbHzxzi83Rp9
// SIG // iCdPBYlnlQq+jpu3WSedQJUCb9TQwL3fKoK9XA2ciU5s
// SIG // kOXtXYAYbxchyssa3/ZTv7WzcU2Nb/+Cakw7eJ06joJf
// SIG // W9fUDru8ZFYI+Rje8Jaf/UyVldzQ7xTxaWfxPfzwAL6J
// SIG // BiW5bx9/QnFepuyu38907cSbKHLyeuyG2/qv0d99qTr1
// SIG // 97Y50/6g7L8ZbgKnsQFgX01LybCByC1KxnAnkOE=
// SIG // End signature block
