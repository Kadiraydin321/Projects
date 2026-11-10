# OmniBackupTransfer - Proje Yol Haritası (ROADMAP)

## Proje Vizyonu
Android tabanlı, internet bağlantısı gerektirmeyen (yerel Wi-Fi / Hotspot üzerinden), yüksek hızlı dosya aktarımı ve kapsamlı tam yedekleme çözümü. Özellikle WhatsApp veri ve medya tabanları, tam depolama, fotoğraflar, videolar, belgeler ve APK'ların telefondan PC'ye veya telefondan telefona kayıpsız ve güvenli aktarılmasını sağlar.

---

## Fazlar ve Aşamalar

### Faz 1: Sistem & Teknik Araştırma (TAMAMLANDI)
- [x] Proje dokümantasyon iskeletinin oluşturulması (`ROADMAP.md`, `ARCHITECTURE.md`, `STATUS.md`).
- [x] **Android Depolama & İzin Mekanizmaları:**
  - Android 11+ (API 30+) `MANAGE_EXTERNAL_STORAGE` (All Files Access) gereksinimleri ve yönetimi.
  - Storage Access Framework (SAF) kısıtlamaları ve `StoragePermissionManager` mimarisi.
- [x] **WhatsApp Yedekleme ve Dosya Mimarisi:**
  - Android 11 öncesi ve sonrası WhatsApp dosya konumları (`Android/media/com.whatsapp/WhatsApp/` vs `/sdcard/WhatsApp/`).
  - `Databases` (msgstore.db.crypt14/15 vb.), `Media`, `Backups` yapıları.
  - Canlı veri tutarlılığı ve dosya kilitleri çözümü.
- [x] **Yerel Aktarım Protokolleri:**
  - Ktor tabanlı gömülü HTTP/WebSocket sunucu mimarisi.
  - Web tabanlı aktarım paneli ve QR kod ile hızlı eşleşme.
- [x] Kapsamlı Teknik Rapor (`project_docs/RESEARCH_REPORT.md` - 860 satır).

### Faz 2: Mimari Tasarım ve Proje İskeleti (TAMAMLANDI)
- [x] Clean Architecture + MVVM prensiplerine göre Android projesinin oluşturulması.
- [x] Gradle yapılandırması (Kotlin DSL, Compose BOM, Material 3, Ktor Server CIO 2.3.11, Coroutines, ZXing Core).
- [x] Jetpack Compose & Material 3 tabanlı koyu/açık modern tema altyapısı.
- [x] Android Manifest izinleri ve Android 14 uyumlu Foreground Service tanımları.

### Faz 3: Çekirdek Modüllerin Geliştirilmesi (TAMAMLANDI)
- [x] **Modül A: Depolama & WhatsApp Yedek Motoru**
  - `WhatsAppScanner`: WhatsApp ve WhatsApp Business taraması, veritabanı, medya, yedek dosya ayrıştırması, `.Statuses` temizliği.
- [x] **Modül B: Canlı Akış & Ktor Sunucu Motoru**
  - `OnTheFlyZipStreamer`: 0-bayt disk maliyetli gerçek zamanlı ZIP akışı (Deflater.BEST_SPEED, 64KB tampon).
  - `KtorTransferServer`: Ktor CIO engine, REST API (`/api/v1/info`, `/api/v1/backup/whatsapp`, `/api/v1/files`, `/api/v1/download`), WebSocket (`/api/v1/events`), 4 haneli PIN güvenliği.
  - `WebAssets`: PC tarayıcısından tek tıkla canlı indirme sağlayan responsive modern Web UI.
- [x] **Modül C: Ağ ve Eşleşme (Discovery & Hotspot)**
  - `NetworkUtils`: Akıllı IPv4 arayüz tespiti (`192.168.43.1` Hotspot veya yerel Wi-Fi).
  - `QrCodeDialog`: QR kod üretimi ve IP/PIN bağlantı URL'si sunumu.
  - `TransferForegroundService`: WakeLock & WifiLock korumalı arka plan veri senkronizasyon servisi.
- [x] **Modül D: Modern Jetpack Compose UI**
  - `DashboardScreen` & `DashboardViewModel`: İzin durumu, WhatsApp yedek boyutu/özeti, Sunucu kontrolü, Canlı aktarım hızı ve ilerleme monitörü.

### Faz 4: Test, Doğrulama ve Kalite Güvence (TAMAMLANDI)
- [x] JUnit Birim testleri (`WhatsAppScannerTest`, `OnTheFlyZipStreamerTest`, `NetworkUtilsTest`, `AuthSecurityTest`).
- [x] Bellek içi ZIP akış doğrulaması ve CRC/Byte bütünlük kontrolü.
- [x] Sınır durumları (Edge cases) analizi (0-byte, boş klasör, donanım yokluğu, sabit zamanlı timing attack koruması).
- [x] QA Raporu (`project_docs/TEST_REPORT.md` - 18/18 PASS, %100 Başarı).

---
*Son Güncelleme: 2026-10-27*
