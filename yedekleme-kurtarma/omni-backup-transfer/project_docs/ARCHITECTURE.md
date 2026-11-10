# OmniBackupTransfer - Sistem ve Teknik Mimari (ARCHITECTURE)

## 1. Genel Mimari Bakış
OmniBackupTransfer, harici bir bulut sağlayıcısına veya internet bağlantısına ihtiyaç duymadan, Android cihazların yerel ağ (Wi-Fi veya Hotspot) üzerinden tam depolama ve WhatsApp yedeklemesi yapmasını sağlayan modern bir Android uygulamasıdır.

Uygulama, **Clean Architecture** prensipleri ve **MVVM / MVI** desenleri gözetilerek çok modüllü veya net katmanlı bir yapıda tasarlanmıştır.

```
+-------------------------------------------------------------+
|                     UI Katmanı (Jetpack Compose)            |
|       - Dashboard & Durum                                   |
|       - WhatsApp Yedek Sihirbazı                            |
|       - Aktarım & Sunucu Kontrol Paneli                     |
+-------------------------------------------------------------+
                              |
+-------------------------------------------------------------+
|             Domain Katmanı (Use Cases & Entities)           |
|  - BackupWhatsAppUseCase     - ScanStorageUseCase           |
|  - StartTransferServerUseCase - ManageConnectionsUseCase    |
+-------------------------------------------------------------+
                              |
+-------------------------------------------------------------+
|             Data / Core Katmanı (Repository & Engines)      |
|  +---------------------+  +-------------------------------+ |
|  | Storage / IO Motoru |  | Ktor Embedded Server (CIO)    | |
|  | - File Scanner      |  | - Web Dashboard Static Assets | |
|  | - Tar/Zip Streamer  |  | - REST Streaming Endpoints   | |
|  | - Permission Guard  |  | - WebSocket Event Channel     | |
|  +---------------------+  +-------------------------------+ |
|  +--------------------------------------------------------+ |
|  | Network / Service Katmanı                              | |
|  | - Foreground Service & Notification Management         | |
|  | - Wi-Fi / Hotspot / IP Resolver                        | |
|  +--------------------------------------------------------+ |
+-------------------------------------------------------------+
```

---

## 2. Teknoloji Yığını (Tech Stack)

| Bileşen | Seçilen Teknoloji / Kütüphane | Gerekçe |
| :--- | :--- | :--- |
| **Dil** | Kotlin (En güncel kararlı sürüm) | Modern, null-safe, coroutine desteği |
| **Arayüz (UI)** | Jetpack Compose + Material 3 | Bildirimsel UI, hızlı prototipleme, modern animasyonlar |
| **Mimarisi** | Clean Architecture + MVVM | Katmanlar arası gevşek bağımlılık, test edilebilirlik |
| **Eşzamanlılık (Async)** | Kotlin Coroutines & Flow | Hafif iş parçacıkları, reaktif veri akışları |
| **Gömülü Sunucu** | Ktor Server (CIO Engine) | Kotlin-native, son derece hafif, WebSocket ve Chunked streaming desteği |
| **Gömülü Web Arayüzü**| HTML5 / CSS3 / Vanilla JS (veya Vue) | Herhangi bir PC veya telefon tarayıcısından tek tıkla bağlanıp dosya indirme/yükleme |
| **QR Kod Motoru** | ZXing Android Embedded / QRGen | Cihazların tarayıcı ile anında eşleşmesi için URL QR kod üretimi |
| **Bağımlılık Yönetimi** | Gradle Kotlin DSL (`build.gradle.kts`) | Tip güvenli yapılandırma, Version Catalog |
| **Arka Plan Servisleri**| Android Foreground Service + WakeLock | Büyük dosya aktarımlarında işletim sisteminin servisi uyutmasını önleme |

---

## 3. Depolama ve İzin Stratejisi (Storage & Permissions)

### 3.1. Android 11+ (API 30+) ve Scoped Storage Yönetimi
- **`MANAGE_EXTERNAL_STORAGE` (All Files Access):**
  - Uygulama dosya yöneticisi ve tam yedekleme aracı olarak çalıştığından bu izne (`android.permission.MANAGE_EXTERNAL_STORAGE`) ihtiyaç duyar.
  - İzin verilmediği takdirde `Settings.ACTION_MANAGE_ALL_FILES_ACCESS_PERMISSION` intent'i ile kullanıcı doğru ayar ekranına yönlendirilir.
- **WhatsApp Veri Konumları:**
  - Android 11 ve sonrası: `/sdcard/Android/media/com.whatsapp/WhatsApp/`
  - Android 10 ve öncesi: `/sdcard/WhatsApp/`
  - WhatsApp Business: `/sdcard/Android/media/com.whatsapp.w4b/WhatsApp Business/`
  - Bu yollardaki `Databases/` (şifreli sohbet geçmişi), `Media/` (görseller, videolar, belgeler, ses kayıtları) dizinleri tam erişim ile okunur.

---

## 4. Aktarım ve Sunucu Mimarisi (Local Transfer Engine)

1. **Sıfır İnternet Garantisi:**
   - Aktarım telefonun bağlı olduğu mevcut Wi-Fi ağı üzerinden veya telefonun kendi açtığı Wi-Fi Hotspot üzerinden gerçekleşir. Dış internet trafiği kullanılmaz.
2. **Ktor CIO Tabanlı Sunucu:**
   - Telefonda yerel bir porta (örn: `8080`) bağlanır.
   - Gömülü statik web paneli sunar (`/`).
   - REST API Uç Noktaları:
     - `GET /api/v1/info`: Cihaz ve depolama bilgisi.
     - `GET /api/v1/files`: Klasör ve dosya gezgini API'si.
     - `GET /api/v1/backup/whatsapp`: WhatsApp yedek paketini canlı akış (streaming archive) olarak indirir.
     - `GET /api/v1/download?path=...`: Seçili dosya/klasör indirme (Content-Range / Resume destekli).
     - `POST /api/v1/upload`: Bilgisayardan telefona dosya yükleme desteği.
     - `WS /api/v1/events`: Anlık hız, CPU, transfer durumu raporlayan WebSocket kanalı.
3. **QR Kod ile Bağlantı:**
   - Cihaz IP'si (`http://192.168.x.x:8080`) anında QR koda dönüştürülür. PC kamerası veya başka bir telefonla taranarak anında web paneli açılır.

---

## 5. Güvenlik ve Bütünlük (Integrity & Security)
- **PIN / Eşleşme Güvenliği:** Web arayüzü ilk açılışta telefonda gösterilen 4-6 haneli PIN kodunu talep edebilir (Yetkisiz yerel ağ erişimini engellemek için).
- **Checksum Doğrulaması:** Aktarılan kritik dosyalar (özellikle WhatsApp veritabanları) için SHA-256 doğrulama hash'i üretilir.
- **Okuma Koruması:** WhatsApp yedeklemesi esnasında dosya kilitlenme durumlarını tolere eden akış yönetimi.
