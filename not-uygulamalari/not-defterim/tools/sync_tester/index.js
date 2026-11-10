#!/usr/bin/env node

/**
 * Cross-Platform LAN / Wi-Fi Sync Tester CLI
 * Bağımsız, Herhangi bir projede kullanılabilir test aracı.
 */

const path = require('path');
const { SyncTestEngine } = require('./lib/engine');
const { DiscoveryProbe } = require('./lib/discovery');
const { AuthValidator } = require('./lib/auth');
const { SyncProtocolSuite } = require('./lib/sync_protocol');
const { StressRunner } = require('./lib/stress');
const { TestReporter } = require('./lib/reporter');

function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    host: '127.0.0.1',
    port: 8765,
    pin: null,
    skipStress: false,
    autoProbe: true
  };

  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--host' && args[i + 1]) options.host = args[++i];
    else if (a === '--port' && args[i + 1]) options.port = parseInt(args[++i], 10);
    else if (a === '--pin' && args[i + 1]) options.pin = args[++i];
    else if (a === '--no-stress') options.skipStress = true;
    else if (a === '--help' || a === '-h') {
      console.log(`
Cross-Platform Wi-Fi Sync Tester
Kullanım:
  node index.js [seçenekler]

Seçenekler:
  --host <ip>       Hedef sunucu IP adresi (Varsayılan: 127.0.0.1)
  --port <port>     Hedef port numarası (Varsayılan: 8765)
  --pin <pin>       Eşleşme PIN kodu (örn: 1234)
  --no-stress       Stres ve aşırı yük testlerini atla
  --help, -h        Bu yardım mesajını göster
`);
      process.exit(0);
    }
  }

  return options;
}

async function main() {
  const options = parseArgs();
  console.log(`\n🔍 Wi-Fi Senkronizasyon Test Aracı Başlatılıyor...`);
  console.log(`   Hedef: http://${options.host}:${options.port}\n`);

  const engine = new SyncTestEngine({
    host: options.host,
    port: options.port,
    pin: options.pin
  });

  // 1. Ağ ve Port Kontrolü
  const isOpen = await DiscoveryProbe.checkPortOpen(options.host, options.port);
  if (!isOpen) {
    console.error(`❌ [BAĞLANTI HATASI] ${options.host}:${options.port} portuna bağlanılamadı!`);
    console.error(`   Lütfen hedef cihazda masaüstü uygulamasını başlatın veya Wi-Fi senkronizasyonunu açın.\n`);
    process.exit(1);
  }

  // 2. Health & Status Yoklaması
  await engine.assertTest('Ağ ve Keşif', 'Port ve TCP Soket Erişilebilirliği', async () => {
    return { passed: true, message: `Port ${options.port} açık ve dinliyor.` };
  });

  let serverInfo = null;
  await engine.assertTest('Ağ ve Keşif', 'Sunucu Kimliği ve Durum Sorgulama (/api/status)', async () => {
    const probe = await DiscoveryProbe.probeServer(engine);
    if (probe.online) {
      serverInfo = probe.info;
      return {
        passed: true,
        message: `Sunucu çevrimiçi (${probe.endpoint}). Uygulama: ${serverInfo.appName || serverInfo.app || 'Bilinmiyor'}, Not Sayısı: ${serverInfo.notesCount ?? 0}, Gecikme: ${probe.latency} ms`,
        details: probe.info
      };
    } else {
      return {
        passed: false,
        message: `Sunucu durum yanıtı vermedi. (HTTP ${probe.statusCode || 'Soket Hatası'})`
      };
    }
  });

  // 3. Eşleşme PIN Doğrulaması
  await AuthValidator.runAuthTests(engine, options.pin);

  // 4. Veri ve Protokol Testleri
  await SyncProtocolSuite.runProtocolTests(engine, options.pin);

  // 5. Stres ve Sınır Durum Testleri
  if (!options.skipStress) {
    await StressRunner.runStressTests(engine, options.pin);
  }

  // 6. Raporlama
  const summary = engine.getSummary();
  TestReporter.printConsole(summary, options.host, options.port);
  const reports = TestReporter.saveReports(summary, __dirname, options.host, options.port);

  console.log(`📄 Raporlar kaydedildi:`);
  console.log(`   - Markdown : ${reports.mdPath}`);
  console.log(`   - JSON     : ${reports.jsonPath}\n`);

  if (summary.failed > 0) {
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Kritik Hata:', err);
  process.exit(1);
});

// SIG // Begin signature block
// SIG // MIIFgwYJKoZIhvcNAQcCoIIFdDCCBXACAQExCzAJBgUr
// SIG // DgMCGgUAMGcGCisGAQQBgjcCAQSgWTBXMDIGCisGAQQB
// SIG // gjcCAR4wJAIBAQQQEODJBs441BGiowAQS9NQkAIBAAIB
// SIG // AAIBAAIBAAIBADAhMAkGBSsOAwIaBQAEFLyDZAf/j3lv
// SIG // VNt5oboqL58ywixYoIIDGDCCAxQwggH8oAMCAQICECO+
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
// SIG // MAwGCisGAQQBgjcCARUwIwYJKoZIhvcNAQkEMRYEFPSj
// SIG // d8Qrg6XgYGKllzMk0L47p2UJMA0GCSqGSIb3DQEBAQUA
// SIG // BIIBAKw8uL62mGlDSbVttQ9OQyFicn1oSsSW15xZ/NfP
// SIG // qfWpGvoBrqgYdW3GuSQb4UrbVyDOXbvszZ68tM8C8YOk
// SIG // WWqj50jQPCGom9uH4iv+8y5Nyt/VXrNaYwtiCE+YiFB/
// SIG // WPqwGOW66oSopxF+OPb5vi+bONhMDbtgnEox0YT5dDaS
// SIG // OTciUj8A8IrojbKaioanxiZ9v+UAvXGqUcZiR1EZ9S5E
// SIG // cFCK8g7n+86kd595qw86h7OM0FzIio4guYX7fy/iJxcm
// SIG // V9ajsrQPDbRAtt8hT/oOwGJ9+qTvDvH4jix2Xu2ZlZx2
// SIG // pgmVfX9r2MP+ZzbT41gh0EiEhp941PJljTgACfI=
// SIG // End signature block
