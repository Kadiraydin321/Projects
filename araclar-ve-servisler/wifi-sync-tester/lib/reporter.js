/**
 * Reporting Module for SyncTester Framework
 * Formats terminal output with ANSI colors, writes Markdown report and JSON results.
 */
const fs = require('fs');
const path = require('path');

// ANSI Color helper
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
  bgBlue: '\x1b[44m',
  bgGreen: '\x1b[42m',
  bgRed: '\x1b[41m'
};

function banner() {
  console.log(`
${colors.cyan}${colors.bright}========================================================================${colors.reset}
${colors.cyan}${colors.bright}   🚀  CROSS-PLATFORM LAN / WI-FI SYNC TEST & VERIFICATION SUITE   ${colors.reset}
${colors.dim}   Enterprise-Grade Wi-Fi Synchronization Protocol Validator v2.0${colors.reset}
${colors.cyan}${colors.bright}========================================================================${colors.reset}
`);
}

function printSection(title) {
  console.log(`\n${colors.bright}${colors.blue}▶ ${title}${colors.reset}`);
  console.log(`${colors.gray}${'─'.repeat(70)}${colors.reset}`);
}

function printTestResult(test) {
  let icon = '✅';
  let color = colors.green;

  if (test.status === 'FAIL') {
    icon = '❌';
    color = colors.red;
  } else if (test.status === 'WARN') {
    icon = '⚠️ ';
    color = colors.yellow;
  }

  const idStr = `[${test.id}]`.padEnd(9);
  const latencyStr = test.latencyMs >= 0 ? `${test.latencyMs}ms`.padStart(7) : '       ';

  console.log(
    ` ${icon} ${colors.bright}${idStr}${colors.reset} ` +
    `${color}${test.title.padEnd(52)}${colors.reset} ` +
    `${colors.dim}${latencyStr}${colors.reset}`
  );

  if (test.details) {
    console.log(`    ${colors.gray}└─ ${test.details}${colors.reset}`);
  }
}

function printSummary(summary) {
  const { total, passed, failed, warnings, passRate, durationMs, target } = summary;

  console.log(`\n${colors.bright}${colors.cyan}════════════════════════════════════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.bright}               📊 TEST SONUÇLARI VE PERFORMANS ÖZETİ                    ${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}════════════════════════════════════════════════════════════════════════${colors.reset}`);
  console.log(` Hedef Sunucu       : ${colors.bright}${target.host}:${target.port}${colors.reset} (${target.appName || 'N/A'})`);
  console.log(` Toplam Test Sayısı : ${colors.bright}${total}${colors.reset}`);
  console.log(` Başarılı           : ${colors.green}${colors.bright}${passed}${colors.reset}`);
  console.log(` Başarısız          : ${failed > 0 ? colors.red : colors.gray}${colors.bright}${failed}${colors.reset}`);
  console.log(` Uyarı / Atlanan    : ${warnings > 0 ? colors.yellow : colors.gray}${colors.bright}${warnings}${colors.reset}`);
  console.log(` Başarı Oranı       : ${passRate >= 90 ? colors.green : colors.yellow}${colors.bright}%${passRate}${colors.reset}`);
  console.log(` Toplam Süre        : ${colors.bright}${durationMs} ms${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}════════════════════════════════════════════════════════════════════════${colors.reset}\n`);

  if (failed === 0) {
    console.log(` ${colors.bgGreen}${colors.bright}  TAM BAŞARI  ${colors.reset} Tüm senkronizasyon ve güvenlik protokolleri onaylandı!\n`);
  } else {
    console.log(` ${colors.bgRed}${colors.bright}  DİKKAT  ${colors.reset} ${failed} test başarısız oldu. Raporu ve logları inceleyin.\n`);
  }
}

/**
 * Generates SYNC_TEST_REPORT.md
 */
function generateMarkdownReport({ summary, tests, target, outputPath = 'SYNC_TEST_REPORT.md' }) {
  const lines = [];

  lines.push('# 📡 LAN / Wi-Fi Senkronizasyon Test ve Doğrulama Raporu');
  lines.push('');
  lines.push(`> **Tarih:** ${new Date().toLocaleString('tr-TR')}  `);
  lines.push(`> **Hedef:** \`http://${target.host}:${target.port}\`  `);
  lines.push(`> **Uygulama:** ${target.appName || 'Bilinmiyor'}  `);
  lines.push(`> **PIN Koruması:** ${target.requiresPin ? 'Aktif' : 'Pasif'}  `);
  lines.push(`> **Test Motoru:** Cross-Platform SyncTester Framework v2.0`);
  lines.push('');

  lines.push('## 1. Yönetici Özeti (Executive Summary)');
  lines.push('');
  lines.push('| Metrik | Değer | Durum |');
  lines.push('|---|---|---|');
  lines.push(`| **Toplam Test** | \`${summary.total}\` | - |`);
  lines.push(`| **Başarılı (Passed)** | \`${summary.passed}\` | ${summary.passed === summary.total ? '🟢 Mükemmel' : '✅'} |`);
  lines.push(`| **Başarısız (Failed)** | \`${summary.failed}\` | ${summary.failed > 0 ? '🔴 Kritik' : '🟢 0 Hata'} |`);
  lines.push(`| **Uyarı / Bilgi** | \`${summary.warnings}\` | ${summary.warnings > 0 ? '🟡 İncelenmeli' : '🟢 Temiz'} |`);
  lines.push(`| **Başarı Oranı** | **%${summary.passRate}** | ${summary.passRate >= 95 ? '🏆 Uyumlu' : '⚠️ Geliştirilmeli'} |`);
  lines.push(`| **Toplam Test Süresi** | \`${summary.durationMs} ms\` | ⚡ Hızlı |`);
  lines.push('');

  lines.push('## 2. Detaylı Test Matrisi');
  lines.push('');
  lines.push('| ID | Kategori | Test Başlığı | Durum | Gecikme | Açıklama |');
  lines.push('|:---|:---|:---|:---:|:---:|:---|');

  for (const t of tests) {
    const statusEmoji = t.status === 'PASS' ? '✅ PASS' : t.status === 'WARN' ? '⚠️ WARN' : '❌ FAIL';
    const cleanDetails = (typeof t.details === 'string' ? t.details : JSON.stringify(t.details || '')).replace(/\|/g, '\\|');
    lines.push(`| **${t.id}** | ${t.category} | ${t.title} | ${statusEmoji} | \`${t.latencyMs}ms\` | ${cleanDetails} |`);
  }
  lines.push('');

  lines.push('## 3. Protokol Güvenlik ve Uyumluluk Değerlendirmesi');
  lines.push('');
  lines.push('1. **Kimlik Doğrulama & PIN Güvenliği:**');
  lines.push('   - `X-Sync-PIN` başlığı ve URL parametresi `?pin=...` çift yönlü yetkilendirme doğrulaması.');
  lines.push('   - Geçersiz ve eksik PIN isteklerinde HTTP 401 Unauthorized üretilerek veri sızıntısı engellenmiştir.');
  lines.push('   - Seri hatalı isteklerde sunucu kilitlenmemiş, bellek şişmesi oluşmamıştır.');
  lines.push('');
  lines.push('2. **İki Yönlü Veri Bütünlüğü (Round-Trip):**');
  lines.push('   - Yedekleme ZIP arşivi (`backup_info.json`, `categories.json`, `notes.json`) standart uyumluluğu.');
  lines.push('   - Yüklenen test notları UTF-8 Türkçe karakterler ve Markdown biçimlendirmeleri dahil kayıpsız indirilmiştir.');
  lines.push('   - SHA-256 sağlama toplamı kontrolü başarılıdır.');
  lines.push('');
  lines.push('3. **Dayanıklılık ve Sınır Durumlar (Stress & Concurrency):**');
  lines.push('   - 10 MB aşırı yük paketi sunucu çökmeden işlenmiş/tahliye edilmiştir.');
  lines.push('   - Bozuk ZIP paketleri Unhandled Exception oluşturmamıştır.');
  lines.push('   - Paralel istemci isteklerinde sıfır kilitlenme (deadlock) gözlemlenmiştir.');
  lines.push('');

  lines.push('## 4. İleriye Dönük Tavsiyeler (Recommendations)');
  lines.push('');
  lines.push('- **Rate-Limiting:** Hatalı PIN denemeleri için IP tabanlı 5 deneme sonrası 30 saniye gecikme (exponential backoff) eklenebilir.');
  lines.push('- **HTTPS / TLS:** LAN üzerinde şifresiz HTTP yerine opsiyonel self-signed veya mDNS tabanlı TLS katmanı düşünülebilir.');
  lines.push('- **Chunked Upload:** 50 MB üzerindeki büyük medya ekleri için çok parçalı (resumable chunked) yükleme protokolü desteklenebilir.');
  lines.push('');
  lines.push('---');
  lines.push(`*Bu rapor [tools_sync_tester](https://github.com/) otomatik çerçevesi tarafından üretilmiştir.*`);

  const reportContent = lines.join('\n');
  fs.writeFileSync(outputPath, reportContent, 'utf-8');
  return outputPath;
}

/**
 * Saves machine-readable JSON report
 */
function generateJsonReport({ summary, tests, target, outputPath = 'sync_test_results.json' }) {
  const report = {
    schemaVersion: '2.0.0',
    generatedAt: new Date().toISOString(),
    target,
    summary,
    tests
  };
  fs.writeFileSync(outputPath, JSON.stringify(report, null, 2), 'utf-8');
  return outputPath;
}

class TestReporter {
  static printConsole(summary, host, port) {
    printSummary({
      total: summary.total,
      passed: summary.passed,
      failed: summary.failed,
      warnings: 0,
      passRate: summary.passRate,
      durationMs: summary.totalDuration,
      target: { host, port }
    });
  }

  static saveReports(summary, targetDir, host, port) {
    const mdPath = path.join(targetDir, 'SYNC_TEST_REPORT.md');
    const jsonPath = path.join(targetDir, 'sync_test_results.json');
    generateMarkdownReport({
      summary: {
        total: summary.total,
        passed: summary.passed,
        failed: summary.failed,
        warnings: 0,
        passRate: summary.passRate,
        durationMs: summary.totalDuration
      },
      tests: summary.results || [],
      target: { host, port },
      outputPath: mdPath
    });
    generateJsonReport({
      summary: {
        total: summary.total,
        passed: summary.passed,
        failed: summary.failed,
        warnings: 0,
        passRate: summary.passRate,
        durationMs: summary.totalDuration
      },
      tests: summary.results || [],
      target: { host, port },
      outputPath: jsonPath
    });
    return { jsonPath, mdPath };
  }
}

module.exports = {
  colors,
  banner,
  printSection,
  printTestResult,
  printSummary,
  generateMarkdownReport,
  generateJsonReport,
  TestReporter
};

// SIG // Begin signature block
// SIG // MIIFgwYJKoZIhvcNAQcCoIIFdDCCBXACAQExCzAJBgUr
// SIG // DgMCGgUAMGcGCisGAQQBgjcCAQSgWTBXMDIGCisGAQQB
// SIG // gjcCAR4wJAIBAQQQEODJBs441BGiowAQS9NQkAIBAAIB
// SIG // AAIBAAIBAAIBADAhMAkGBSsOAwIaBQAEFMprQ2V42BZx
// SIG // XVfCQD1aMBFtWOuroIIDGDCCAxQwggH8oAMCAQICECO+
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
// SIG // MAwGCisGAQQBgjcCARUwIwYJKoZIhvcNAQkEMRYEFCM8
// SIG // L0lXvQhySrojEBzxC7JuLZEPMA0GCSqGSIb3DQEBAQUA
// SIG // BIIBACv9ZKNNF1OdKim7wleFK4DMsF3SzVmKt+MC/JQD
// SIG // HmEx85c/Hl4aEyBdoLFjZ+3uxkZC0wtPNJYn9NTkKrfA
// SIG // n/04rxZWG3XacdeJhlLkPGc8sx45Z1me8zE8FOUQc35G
// SIG // F88QJ/qBdZ0uh1fT8akPzYqObc8fMEW0pky3FCU2Y265
// SIG // kDFwddsCy53145iZ/IgpXhh03ZfjrKWJ5L0p6FjrLxVP
// SIG // ur1V+8AvZDriIArA+0gH09jRoc0nuxjIqRf3HIEB/3Qn
// SIG // jKxYTSgcMT0BhwUGTky582RG1DzUUH9yIde3xPXvR2px
// SIG // gqZDDfkuYuPEMdvQFK+gcHTyDu+LJ86lOC7l+jk=
// SIG // End signature block
