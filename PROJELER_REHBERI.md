# 🚀 Windows Projeler Kapsamlı Çalıştırma Rehberi ve Mimari Dönüşüm Manifestosu

Bu belge, **WSL (Ubuntu)** ortamından **Windows** yerel diskine (`C:\Users\Birin\Birin\Projeler`) aktarılan ve **4 ana kategori** altında standart **kebab-case** formatıyla yeniden yapılandırılan tüm yazılım projelerinin çalıştırma yönergelerini, mimari detaylarını ve merkezi başlatıcılarını adım adım açıklar.

---

## 📑 İçindekiler
1. [Geçiş ve Dönüşüm Haritası (Eski İsim ➔ Yeni Kategorik Yol)](#1-geçiş-ve-dönüşüm-haritası-eski-isim--yeni-kategorik-yol)
2. [Merkezi Başlatıcı Konsolu (`baslaticilar\PROJELERI_BASLAT.bat`)](#2-merkezi-başlatıcı-konsolu-baslaticilarprojeleri_baslatbat)
3. [Dörtlü Kategorik Projeler Kataloğu ve Çalıştırma Kılavuzu](#3-dörtlü-kategorik-projeler-kataloğu-ve-çalıştırma-kılavuzu)
   - **📁 Kategori 1: Not Uygulamaları (`not-uygulamalari/`)**
     * [1.1. Not Defterim (`not-defterim`)](#11-not-defterim-not-defterim)
     * [1.2. NoteVault Rescue (`note-vault-rescue`)](#12-notevault-rescue-note-vault-rescue)
   - **💻 Kategori 2: Sistem Yönetimi (`sistem-yonetimi/`)**
     * [2.1. AntiGravity Dashboard (`antigravity-dashboard`)](#21-antigravity-dashboard-antigravity-dashboard)
     * [2.2. Win Control Hub (`win-control-hub`)](#22-win-control-hub-win-control-hub)
     * [2.3. Windows Control App & USB Health (`windows-control-app`)](#23-windows-control-app--usb-health-windows-control-app)
   - **🛡️ Kategori 3: Yedekleme ve Kurtarma (`yedekleme-kurtarma/`)**
     * [3.1. ByteRescue (`byte-rescue`)](#31-byterescue-byte-rescue)
     * [3.2. OmniBackup Transfer (`omni-backup-transfer`)](#32-omnibackup-transfer-omni-backup-transfer)
   - **🛠️ Kategori 4: Araçlar ve Servisler (`araclar-ve-servisler/`)**
     * [4.1. Cihaz Takip Sistemi (`cihaz-takip`)](#41-cihaz-takip-sistemi-cihaz-takip)
     * [4.2. Screen Translator AI (`screen-translator`)](#42-screen-translator-ai-screen-translator)
     * [4.3. Moon Novel Downloader (`moon-novel-downloader`)](#43-moon-novel-downloader-moon-novel-downloader)
     * [4.4. Kampüs Kutusu (`kampus-kutusu`)](#44-kampüs-kutusu-kampus-kutusu)
     * [4.5. Wi-Fi Sync Tester (`wifi-sync-tester`)](#45-wi-fi-sync-tester-wifi-sync-tester)
     * [4.6. C/C++ PE Builder (`c-pe-builder`)](#46-cc-pe-builder-c-pe-builder)
     * [4.7. APK Deposu (`apk-deposu`)](#47-apk-deposu-apk-deposu)
4. [Not Defterim ve Veritabanı Mimarisi](#4-not-defterim-ve-veritabanı-mimarisi)
5. [Git Güvenliği ve Kaynak Veri Bütünlüğü](#5-git-güvenliği-ve-kaynak-veri-bütünlüğü)
6. [Tek Tıkla Senkronizasyon Araçları (.bat ve .ps1)](#6-tek-tıkla-senkronizasyon-araçları)
7. [Aktarım Özeti ve Performans Metrikleri](#7-aktarım-özeti-ve-performans-metrikleri)

---

## 1. Geçiş ve Dönüşüm Haritası (Eski İsim ➔ Yeni Kategorik Yol)

Tüm projeler, dosya karmaşasını önlemek ve modüler yönetimi sağlamak amacıyla 4 ana kategori altında standart **kebab-case** düzeniyle eşleştirilmiştir:

| # | Eski Proje / Dizin Adı | Yeni Kategori | Yeni Kebab-Case Yol (`C:\Users\Birin\Birin\Projeler\...`) | Birincil Teknoloji | Hızlı Başlatıcı / Yürütme Komutu |
| :-: | :--- | :--- | :--- | :--- | :--- |
| **1** | `NoteApp` | `not-uygulamalari/` | `not-uygulamalari\not-defterim` | Kotlin Multiplatform, Tauri/Rust, SQLite | `Baslat_NotDefterim_Desktop.bat` |
| **2** | `NoteVaultRescue` | `not-uygulamalari/` | `not-uygulamalari\note-vault-rescue` | Python 3.12+, Flask Web GUI, AES-GCM | `baslat.bat` / `baslat_cli.bat` |
| **3** | `AntiGravity_Dashboard` | `sistem-yonetimi/` | `sistem-yonetimi\antigravity-dashboard` | Python 3.12, Flask, CSS Glassmorphism | `Baslat_AntiGravity.bat` |
| **4** | `WinControlHub` | `sistem-yonetimi/` | `sistem-yonetimi\win-control-hub` | Python Flask, Sistem Servis Konsolu | `Baslat_WinControlHub.bat` |
| **5** | `WindowsControlApp` | `sistem-yonetimi/` | `sistem-yonetimi\windows-control-app` | Python, WMI, PowerShell USB Health | `Baslat_WindowsControl.bat` |
| **6** | `ByteRescue` | `yedekleme-kurtarma/` | `yedekleme-kurtarma\byte-rescue` | Electron 33, Svelte 5, Vite 6 | `ByteRescue.exe` / `Baslat_ByteRescue.bat` |
| **7** | `OmniBackupTransfer` | `yedekleme-kurtarma/` | `yedekleme-kurtarma\omni-backup-transfer` | Android Compose, Ktor HTTP Engine | `gradlew.bat` / Hazır APK |
| **8** | `cihaz-takip` | `araclar-ve-servisler/` | `araclar-ve-servisler\cihaz-takip` | Next.js 16, React 19, Prisma SQLite | `Baslat_CihazTakip.bat` |
| **9** | `screen_translator` | `araclar-ve-servisler/` | `araclar-ve-servisler\screen-translator` | Python, PyQt6, Media OCR / Gemini Flash | `Baslat_ScreenTranslator.bat` |
| **10** | `MoonNovelDownloaderApp` | `araclar-ve-servisler/` | `araclar-ve-servisler\moon-novel-downloader` | Android Compose, Room SQLite, EPUB | `gradlew.bat` / Hazır APK |
| **11** | `Yusuf` | `araclar-ve-servisler/` | `araclar-ve-servisler\kampus-kutusu` | HTML5, CSS Variables, Vanilla JS | `index.html` / `python -m http.server` |
| **12** | `tools_sync_tester` | `araclar-ve-servisler/` | `araclar-ve-servisler\wifi-sync-tester` | Node.js, Python, HTTP/Socket Testi | `run_tests.bat` / `Test_WiFi_Sync.bat` |
| **13** | `tools_test_build` | `araclar-ve-servisler/` | `araclar-ve-servisler\c-pe-builder` | Zig, C++, Win32 Portable PE Derleme | `test.exe` |
| **14** | `APK_Cikti` | `araclar-ve-servisler/` | `araclar-ve-servisler\apk-deposu` | Derlenmiş Android APK Paket Havuzu | `NovelReaderDownloader.apk`, `OmniBackupTransfer-v2-debug.apk` |

---

## 2. Merkezi Başlatıcı Konsolu (`baslaticilar\PROJELERI_BASLAT.bat`)

Tüm çalıştırma betikleri **`baslaticilar\`** özel klasöründe toplanmıştır. **`baslaticilar\PROJELERI_BASLAT.bat`**, tüm kategorilerdeki uygulamalara tek ekrandan erişim sağlayan merkezi komut merkezidir.

```bat
:: Doğrudan çalıştırma:
C:\Users\Birin\Birin\Projeler\baslaticilar\PROJELERI_BASLAT.bat

:: Hızlı Başlatıcılar:
C:\Users\Birin\Birin\Projeler\baslaticilar\Baslat_NotDefterim.bat
C:\Users\Birin\Birin\Projeler\baslaticilar\Baslat_ByteRescue.bat
C:\Users\Birin\Birin\Projeler\baslaticilar\Baslat_CihazTakip.bat
C:\Users\Birin\Birin\Projeler\baslaticilar\Baslat_Dashboard.bat
C:\Users\Birin\Birin\Projeler\baslaticilar\Baslat_WiFiSyncTester.bat
```

* **Ana Menü Seçenekleri:**
  - `[1] Not Uygulamaları (Not Defterim, NoteVault Rescue)`
  - `[2] Sistem Yönetimi (AntiGravity Dashboard, WinControlHub, WindowsControlApp)`
  - `[3] Yedekleme & Kurtarma (ByteRescue, OmniBackupTransfer)`
  - `[4] Araçlar ve Servisler (Cihaz Takip, Screen Translator, Moon Novel, Kampüs Kutusu, Wi-Fi Tester)`
  - `[5] Tümünü Durumunu Raporla / Sağlık Kontrolü`

---

## 3. Dörtlü Kategorik Projeler Kataloğu ve Çalıştırma Kılavuzu

### 📁 KATEGORİ 1: NOT UYGULAMALARI (`not-uygulamalari/`)

#### 1.1. Not Defterim (`not-defterim`)
* **Yeni Konum:** `C:\Users\Birin\Birin\Projeler\not-uygulamalari\not-defterim` *(Eski: NoteApp)*
* **Görevi:** Zengin Markdown, çizim tahtası, hatırlatıcılar, ses/resim ekleri, AES-256 PBKDF2 şifreli kasa (`.notevault`) ve yerel Wi-Fi senkronizasyonu barındıran çok platformlu kurumsal not defteri.
* **Teknoloji Yığını:**
  - **Masaüstü (Desktop):** Compose Multiplatform for Desktop (Kotlin), SQLite JDBC.
  - **Native Masaüstü:** Rust, Tauri, Webview (`desktop-native`).
  - **Electron Masaüstü:** Node.js, Electron (`desktop-electron`).
  - **Mobil:** Android Jetpack Compose, Room SQLite.
* **Windows'ta Çalıştırma:**
  ```powershell
  # 1. Yöntem: Hepsi Bir Arada Masaüstü Menüsü (Önerilen)
  C:\Users\Birin\Birin\Projeler\not-uygulamalari\not-defterim\Baslat_NotDefterim_Desktop.bat
  # Menü Seçenekleri:
  # [1] Compose Multiplatform Kotlin Masaüstü
  # [2] JavaScript / Electron Masaüstü
  # [3] Windows Kurulum Paketi (.msi) Üretimi
  # [4] Wi-Fi Senkronizasyon Birim Testleri

  # 2. Yöntem: Compose Masaüstü (Terminal)
  cd C:\Users\Birin\Birin\Projeler\not-uygulamalari\not-defterim
  .\gradlew.bat :desktop:run

  # 3. Yöntem: Rust Native Masaüstü (Tauri)
  cd C:\Users\Birin\Birin\Projeler\not-uygulamalari\not-defterim\desktop-native
  cargo run

  # 4. Yöntem: Electron Masaüstü
  cd C:\Users\Birin\Birin\Projeler\not-uygulamalari\not-defterim\desktop-electron
  npm install
  npm start
  ```

---

#### 1.2. NoteVault Rescue (`note-vault-rescue`)
* **Yeni Konum:** `C:\Users\Birin\Birin\Projeler\not-uygulamalari\note-vault-rescue` *(Eski: NoteVaultRescue)*
* **Görevi:** NoteApp uygulamasında şifresi unutulmuş `.notevault` kasalarını kurtaran özel veri kurtarma aracı. SHA-256 ön filtreleme ve akıllı parola mutasyonu ile saniyede 1.000.000+ kombinasyon test edebilir.
* **Teknoloji Yığını:** Python 3.12+, Flask (Web GUI), Cryptography (AES-GCM, PBKDF2), HTML5.
* **Windows'ta Çalıştırma:**
  ```powershell
  # 1. Yöntem: Web Arayüzü ile (Sürükle-Bırak)
  C:\Users\Birin\Birin\Projeler\not-uygulamalari\note-vault-rescue\baslat.bat
  # Tarayıcıda açılır: http://localhost:7890

  # 2. Yöntem: Komut Satırı / Konsol Modu
  C:\Users\Birin\Birin\Projeler\not-uygulamalari\note-vault-rescue\baslat_cli.bat

  # 3. Yöntem: Python doğrudan
  cd C:\Users\Birin\Birin\Projeler\not-uygulamalari\note-vault-rescue
  pip install flask cryptography
  python app.py
  ```

---

### 💻 KATEGORİ 2: SİSTEM YÖNETİMİ (`sistem-yonetimi/`)

#### 2.1. AntiGravity Dashboard (`antigravity-dashboard`)
* **Yeni Konum:** `C:\Users\Birin\Birin\Projeler\sistem-yonetimi\antigravity-dashboard` *(Eski: AntiGravity_Dashboard)*
* **Görevi:** Bilgisayarınızı web tarayıcısından yönetmenizi sağlayan şık "Liquid Glass" (Cam Morfizm) temalı PC kontrol merkezi.
  - Canlı CPU, RAM, Disk (C:) izleme halkaları ve çalışma süresi (Uptime).
  - Disk Temizleyici (Windows Temp ve User Temp güvenli temizlik).
  - Güç Zamanlayıcı (belirlenen dakikada kapatma/uyku/yeniden başlatma).
  - AES-GCM 256-bit şifreli yapışkan notlar ve Google Drive (5 TB) entegrasyonu.
  - Epic Games & Steam ücretsiz oyun fırsatları takipçisi.
* **Teknoloji Yığını:** Python 3.12+, Flask, HTML5, Vanilla JavaScript, CSS3 Glassmorphism.
* **Windows'ta Çalıştırma:**
  ```powershell
  # 1. Yöntem: Hazır Başlatıcı ile (Önerilen)
  C:\Users\Birin\Birin\Projeler\sistem-yonetimi\antigravity-dashboard\Baslat_AntiGravity.bat

  # 2. Yöntem: Terminal üzerinden
  cd C:\Users\Birin\Birin\Projeler\sistem-yonetimi\antigravity-dashboard
  pip install -r requirements.txt
  python app.py
  # Tarayıcıda açın: http://localhost:5000
  ```

---

#### 2.2. Win Control Hub (`win-control-hub`)
* **Yeni Konum:** `C:\Users\Birin\Birin\Projeler\sistem-yonetimi\win-control-hub` *(Eski: WinControlHub)*
* **Görevi:** Windows arka plan servisleri, işlem öncelikleri ve donanım denetimi için modüler yönetim konsolu.
* **Teknoloji Yığını:** Python 3.12+, Flask, Win32 API, PowerShell köprüleri.
* **Windows'ta Çalıştırma:**
  ```powershell
  # 1. Yöntem: Hazır Başlatıcı ile
  C:\Users\Birin\Birin\Projeler\sistem-yonetimi\win-control-hub\Baslat_WinControlHub.bat

  # 2. Yöntem: Terminal üzerinden
  cd C:\Users\Birin\Birin\Projeler\sistem-yonetimi\win-control-hub
  pip install -r requirements.txt
  python app.py
  ```

---

#### 2.3. Windows Control App & USB Health (`windows-control-app`)
* **Yeni Konum:** `C:\Users\Birin\Birin\Projeler\sistem-yonetimi\windows-control-app` *(Eski: WindowsControlApp)*
* **Görevi:** USB bellek sağlık kontrolü, WMI donanım analizi, `chkdsk` dosya sistemi onarımı, yüzey sektör okuma/yazma testi ve Windows sistem yöneticisi.
* **Teknoloji Yığını:** Python, WMI (Windows Management Instrumentation), Subprocess/CMD.
* **Windows'ta Çalıştırma:**
  ```powershell
  # 1. Yöntem: Hazır Başlatıcı ile
  C:\Users\Birin\Birin\Projeler\sistem-yonetimi\windows-control-app\Baslat_WindowsControl.bat

  # 2. Yöntem: USB Sağlık Testi
  cd C:\Users\Birin\Birin\Projeler\sistem-yonetimi\windows-control-app
  pip install -r requirements.txt
  python usb_health_check.py

  # 3. Yöntem: Genel Sistem Yöneticisi
  python windows_manager.py
  ```

---

### 🛡️ KATEGORİ 3: YEDEKLEME VE KURTARMA (`yedekleme-kurtarma/`)

#### 3.1. ByteRescue (`byte-rescue`)
* **Yeni Konum:** `C:\Users\Birin\Birin\Projeler\yedekleme-kurtarma\byte-rescue` *(Eski: ByteRescue)*
* **Görevi:** Siber temalı, modern ve yüksek performanslı masaüstü veri kurtarma laboratuvarı (Raw Sector Carver & Deep Computer Scanner). Silinen disk sektörlerini tarayarak dosya imzaları üzerinden verileri kurtarır.
* **Teknoloji Yığını:** Electron 33+, Svelte 5, Vite 6, TailwindCSS, Node.js, NSIS Installer.
* **Windows'ta Çalıştırma:**
  ```powershell
  # 1. Yöntem: Derlenmiş Portable EXE (En Hızlı)
  C:\Users\Birin\Birin\Projeler\yedekleme-kurtarma\byte-rescue\ByteRescue.exe

  # 2. Yöntem: Hazır Başlatıcı Menüsü
  C:\Users\Birin\Birin\Projeler\yedekleme-kurtarma\byte-rescue\Baslat_ByteRescue.bat

  # 3. Yöntem: Geliştirici Modu (Node.js)
  cd C:\Users\Birin\Birin\Projeler\yedekleme-kurtarma\byte-rescue
  npm install
  npm start
  ```

---

#### 3.2. OmniBackup Transfer (`omni-backup-transfer`)
* **Yeni Konum:** `C:\Users\Birin\Birin\Projeler\yedekleme-kurtarma\omni-backup-transfer` *(Eski: OmniBackupTransfer)*
* **Görevi:** Android telefonların yerel ağ (Wi-Fi veya Hotspot) üzerinden harici buluta ihtiyaç duymadan tüm depolama alanını ve WhatsApp mesaj/medya verilerini PC tarayıcısına on-the-fly ZIP akışıyla yedekleyen modern Android uygulaması.
* **Teknoloji Yığını:** Kotlin, Android Jetpack Compose, Clean Architecture, Ktor Embedded Server (CIO), Coroutines, Material 3.
* **Windows'ta Çalıştırma & Derleme:**
  ```powershell
  # 1. Yöntem: Hazır APK Dosyası (Telefona doğrudan kurun)
  C:\Users\Birin\Birin\Projeler\araclar-ve-servisler\apk-deposu\OmniBackupTransfer-v2-debug.apk

  # 2. Yöntem: Android Studio ile Açma
  # Android Studio'dan "C:\Users\Birin\Birin\Projeler\yedekleme-kurtarma\omni-backup-transfer" yolunu açın.

  # 3. Yöntem: Terminal CLI Derleme
  cd C:\Users\Birin\Birin\Projeler\yedekleme-kurtarma\omni-backup-transfer
  .\gradlew.bat assembleDebug
  ```

---

### 🛠️ KATEGORİ 4: ARAÇLAR VE SERVİSLER (`araclar-ve-servisler/`)

#### 4.1. Cihaz Takip Sistemi (`cihaz-takip`)
* **Yeni Konum:** `C:\Users\Birin\Birin\Projeler\araclar-ve-servisler\cihaz-takip`
* **Görevi:** Kurumsal donanım ve cihaz envanteri yönetim platformu. Cihaz kayıtları, zimmet durumu, servis geçmişi, arıza takibi ve analitik raporlama.
* **Teknoloji Yığını:** Next.js 16 (App Router), React 19, TypeScript, Prisma ORM (SQLite `dev.db`), Tailwind CSS, Lucide React, Recharts.
* **Windows'ta Çalıştırma:**
  ```powershell
  # 1. Yöntem: Etkileşimli Yönetim Menüsü (.bat)
  C:\Users\Birin\Birin\Projeler\araclar-ve-servisler\cihaz-takip\Baslat_CihazTakip.bat

  # 2. Yöntem: Terminal üzerinden
  cd C:\Users\Birin\Birin\Projeler\araclar-ve-servisler\cihaz-takip
  npm install
  npx prisma generate
  npm run dev
  # Tarayıcıda açın: http://localhost:3000
  ```

---

#### 4.2. Screen Translator AI (`screen-translator`)
* **Yeni Konum:** `C:\Users\Birin\Birin\Projeler\araclar-ve-servisler\screen-translator` *(Eski: screen_translator)*
* **Görevi:** Google Lens tarzı sürüklenebilir split perde (swipe slider) ve tıklama geçirgen (click-through) HUD katmanı ile ekrandaki yabancı yazıları anlık algılayıp Google Gemini Flash veya RapidOCR/Windows Media OCR ile Türkçe'ye çeviren ultra hafif çevirici.
* **Teknoloji Yığını:** Python 3.12+, PyQt6, WinRT (Windows Media OCR), RapidOCR (ONNX), Google Gemini Flash API.
* **Windows'ta Çalıştırma:**
  ```powershell
  # 1. Yöntem: Hazır Başlatıcı ile
  C:\Users\Birin\Birin\Projeler\araclar-ve-servisler\screen-translator\Baslat_ScreenTranslator.bat

  # 2. Yöntem: Terminal üzerinden
  cd C:\Users\Birin\Birin\Projeler\araclar-ve-servisler\screen-translator
  pip install -r translator_requirements.txt
  python run_translator.py
  ```

---

#### 4.3. Moon Novel Downloader (`moon-novel-downloader`)
* **Yeni Konum:** `C:\Users\Birin\Birin\Projeler\araclar-ve-servisler\moon-novel-downloader` *(Eski: MoonNovelDownloaderApp)*
* **Görevi:** Web novel kaynaklarından kitap bölümlerini arka planda toplu indiren, temizleyen ve Moon+ Reader için hazır EPUB / metin arşivine dönüştüren native Android uygulaması.
* **Teknoloji Yığını:** Kotlin, Android Jetpack Compose, Material 3, Room SQLite, Hilt DI, Coroutines, Gradle 8.10.
* **Windows'ta Çalıştırma & Derleme:**
  ```powershell
  # 1. Yöntem: Hazır APK Dosyası
  C:\Users\Birin\Birin\Projeler\araclar-ve-servisler\apk-deposu\NovelReaderDownloader.apk

  # 2. Yöntem: Android Studio ile Açma
  # "C:\Users\Birin\Birin\Projeler\araclar-ve-servisler\moon-novel-downloader" yolunu açın.

  # 3. Yöntem: Gradle Derleme
  cd C:\Users\Birin\Birin\Projeler\araclar-ve-servisler\moon-novel-downloader
  .\gradlew.bat assembleRelease
  ```

---

#### 4.4. Kampüs Kutusu (`kampus-kutusu`)
* **Yeni Konum:** `C:\Users\Birin\Birin\Projeler\araclar-ve-servisler\kampus-kutusu` *(Eski: Yusuf)*
* **Görevi:** Akdeniz Üniversitesi öğrencileri ve personeli için yardımlaşma, sertifika doğrulama, kayıp ve güvenliğe bırakılan eşyalar takip platformu.
* **Teknoloji Yığını:** HTML5, Modern CSS3 (CSS Variables, Flexbox/Grid), Vanilla JavaScript.
* **Windows'ta Çalıştırma:**
  ```powershell
  # 1. Yöntem: Doğrudan Tarayıcıda Açma
  C:\Users\Birin\Birin\Projeler\araclar-ve-servisler\kampus-kutusu\index.html

  # 2. Yöntem: Yerel HTTP Web Sunucusu
  cd C:\Users\Birin\Birin\Projeler\araclar-ve-servisler\kampus-kutusu
  python -m http.server 8000
  # http://localhost:8000
  ```

---

#### 4.5. Wi-Fi Sync Tester (`wifi-sync-tester`)
* **Yeni Konum:** `C:\Users\Birin\Birin\Projeler\araclar-ve-servisler\wifi-sync-tester` *(Eski: tools_sync_tester)*
* **Görevi:** Not Defterim ve OmniBackupTransfer gibi uygulamaların Wi-Fi LAN senkronizasyon protokollerini simüle eden, test eden ve doğrulayan otomatik test paketi.
* **Teknoloji Yığını:** Node.js, Python 3.12, HTTP REST, Socket Engine.
* **Windows'ta Çalıştırma:**
  ```powershell
  # 1. Yöntem: Otomatik Test Paketi Başlatıcı (.bat)
  C:\Users\Birin\Birin\Projeler\araclar-ve-servisler\wifi-sync-tester\run_tests.bat

  # 2. Yöntem: Wi-Fi Entegrasyon Test Konsolu
  C:\Users\Birin\Birin\Projeler\araclar-ve-servisler\wifi-sync-tester\Test_WiFi_Sync.bat

  # 3. Yöntem: Python veya Node.js ile Doğrudan
  cd C:\Users\Birin\Birin\Projeler\araclar-ve-servisler\wifi-sync-tester
  python run_tests.py
  # veya
  node run_tests.js
  ```

---

#### 4.6. C/C++ PE Builder (`c-pe-builder`)
* **Yeni Konum:** `C:\Users\Birin\Birin\Projeler\araclar-ve-servisler\c-pe-builder` *(Eski: tools_test_build)*
* **Görevi:** Windows Portable Executable (.exe) ikili dosyalarını C++ ve Zig kaynak kodlarından kaynak dosyaları (.rc) ile birlikte doğrudan derleyen düşük seviyeli araç kiti.
* **Teknoloji Yığını:** Zig derleyici motoru, Clang/LLVM, Windows SDK Resource Compiler.
* **Windows'ta Çalıştırma:**
  ```powershell
  # Derlenmiş PE ikili dosyasını çalıştırma:
  C:\Users\Birin\Birin\Projeler\araclar-ve-servisler\c-pe-builder\test.exe
  C:\Users\Birin\Birin\Projeler\araclar-ve-servisler\c-pe-builder\test_res.exe
  ```

---

#### 4.7. APK Deposu (`apk-deposu`)
* **Yeni Konum:** `C:\Users\Birin\Birin\Projeler\araclar-ve-servisler\apk-deposu` *(Eski: APK_Cikti)*
* **Görevi:** Derlenmiş, imzalanmış ve telefonunuza USB kablo veya Wi-Fi üzerinden aktarıp hemen kurabileceğiniz hazır Android kurulum paketleri deposu.
* **Mevcut Paketler:**
  1. `NovelReaderDownloader.apk` (~2 MB) - MoonNovelDownloader hazır Android paketi.
  2. `OmniBackupTransfer-v2-debug.apk` (~18.8 MB) - OmniBackupTransfer hazır Android paketi.

---

## 4. Not Defterim ve Veritabanı Mimarisi

`not-defterim` (`C:\Users\Birin\Birin\Projeler\not-uygulamalari\not-defterim`) masaüstü uygulaması SQLite veritabanı mimarisini kullanır. Verilerin Windows ortamında kesintisiz çalışması için gerekli eşitlemeler tamamlanmıştır:

### Veritabanı Dosya Yolları:
1. **Windows Resmi Çalışma Konumu (Öncelikli):**
   `C:\Users\Birin\AppData\Roaming\NotDefterim\`
   - `notes_desktop.db`: Tüm not kayıtları, kategoriler, etiketler ve yapılacaklar.
   - `vault_config.json`: Kasa PBKDF2 tuzu (salt) ve parola doğrulama hash'i.
   - `attachments/`: Notlara eklenen çizimler, resimler ve ek dosyalar.
2. **Kullanıcı Ev Dizini (Alternatif/Uyumluluk):**
   `C:\Users\Birin\.notdefterim\`
3. **WSL Kaynağı (Yedek):**
   `\\wsl.localhost\Ubuntu\home\birin\.notdefterim\`

> [!NOTE]
> WSL'deki orijinal `notes_desktop.db`, `vault_config.json` ve `attachments` dizini hem `%APPDATA%\NotDefterim` hem de `~/.notdefterim` konumlarına aktarılmıştır. `not-defterim` başlatıldığında tüm eski notlarınız ve şifreli kasanız anında hazır olacaktır.

---

## 5. Git Güvenliği ve Kaynak Veri Bütünlüğü

1. **WSL Orijinali Dokunulmazdır:** WSL (`\\wsl.localhost\Ubuntu\home\birin\Projeler`) üzerindeki tüm git depoları, commit geçmişleri ve commit edilmemiş değişiklikler hiçbir silme veya taşıma işlemine maruz kalmamıştır.
2. **Commit Edilmemiş Dosyalar Korundu:** `not-defterim` içindeki `desktop-native/src/...` (Rust/Tauri) ve yeni eklenen betikler de dahil olmak üzere henüz commit edilmemiş tüm çalışma kopyası dosyaları Windows tarafına eksiksiz aktarılmıştır.
3. **Git Statüsündeki 'D' (Deleted) İşaretlerinin Sebebi:**
   Windows tarafında `git status` komutu çalıştırıldığında görünen silindi bildirimleri, aktarım scriptinin `/XD` kuralıyla `build`, `.gradle`, `node_modules` ve `target` klasörlerini hariç tutmasından kaynaklanmaktadır. Bu klasörler derleme artığı olup, projenin kaynak kodlarında hiçbir kayıp bulunmamaktadır.

---

## 6. Tek Tıkla Senkronizasyon Araçları

WSL ve Windows arasındaki dosya senkronizasyonunu dilediğiniz an tek tıkla tekrarlayabilmeniz için iki güçlü araç kök dizinde hazır bulunmaktadır:

### 1. `Transfer_Projeler.bat`
* **Kullanım:** Dosyaya çift tıklamanız yeterlidir (`C:\Users\Birin\Birin\Projeler\Transfer_Projeler.bat`).
* **Özellikler:**
  - Kullanıcı dostu etkileşimli menü sunar.
  - **[1] Optimize Aktarım:** Sadece kaynak kodları, dokümanları ve veritabanlarını aktarır (~2 GB, 15 saniye sürer).
  - **[2] Tam Klonlama:** `node_modules` ve `build` dahil her şeyi aktarır (~7.3 GB).
  - PowerShell yürütme politikasını (`ExecutionPolicy Bypass`) otomatik aşar.

### 2. `Transfer-Projeler.ps1`
* **Kullanım:** PowerShell konsolundan parametreli çalıştırma imkanı sunar:
  ```powershell
  # Optimize mod (Varsayılan):
  .\Transfer-Projeler.ps1 -Mode Optimized -Threads 32

  # Tam Klonlama modu:
  .\Transfer-Projeler.ps1 -Mode Full -Threads 32
  ```

---

## 7. Aktarım Özeti ve Performans Metrikleri

WSL dosya sisteminden Windows yerel sürücüsüne gerçekleştirilen transfer, **Robocopy Yüksek Başarımlı Çoklu İş Parçacığı (Multi-Threading 32)** motoru ile hatasız tamamlanmıştır.

| Parametre | Değer / Açıklama |
| :--- | :--- |
| **Kaynak Dizin (WSL)** | `\\wsl.localhost\Ubuntu\home\birin\Projeler` |
| **Hedef Dizin (Windows)** | `C:\Users\Birin\Birin\Projeler` |
| **Tamamlanma Zamanı** | 4 Kasım 2026 - 13:09:09 |
| **Aktarılan Dosya Sayısı** | **12.595 dosya** (Toplam 12.646 nesne tarandı) |
| **Aktarılan Klasör Sayısı** | **1.349 dizin** |
| **Aktarılan Toplam Veri** | **2.064 GB** (2.216.742.912 bayt) |
| **Aktarım Hızı** | **146.686.343 Bayt/sn (~146.7 MB/s)** \| **8.393,46 MB/dk** |
| **Kopyalama Süresi** | Yalnızca **15 saniye** (Tarama + transfer toplam: 5 dk 25 sn) |
| **Hata / Başarısızlık** | **0 HATA (FAILED: 0)** |
| **Nitelik ve Zaman Damgaları** | `/COPY:DAT` ve `/DCOPY:DAT` ile dosya oluşturma, değiştirme ve erişim zamanları **%100 korunmuştur**. |
| **Optimizasyon Stratejisi** | `node_modules`, `.gradle`, `build`, `target`, `.next`, `venv` ve `__pycache__` gibi yeniden derlenebilir ağır önbellekler hariç tutularak aktarım 7.3 GB'tan 2.06 GB'a indirilmiş ve disk sağlığı korunmuştur. |
| **Kaynak Veri Bütünlüğü** | WSL tarafındaki tüm kaynak dizin ve dosyalar **asla silinmemiş veya değiştirilmemiştir**, yerinde tam güvenliktedir. |
