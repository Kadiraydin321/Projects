# 🏗️ Antigravity Workspace Mimari ve Geçiş Manifestosu

Bu belge, **Antigravity AI Geliştirme Ortamı** ve tüm alt projelerin yerel Windows dosya sistemi üzerindeki birincil çalışma alanını (`C:\Users\Birin\Birin\Projeler`), 4 kategorili standart dizin mimarisini, kurallarını, entegre yönergelerini ve yetenek (skill) ağacını belgeler.

---

## 1. Birincil Çalışma Alanı (Primary Workspace)

* **Resmi Konum:** `C:\Users\Birin\Birin\Projeler`
* **İşletim Sistemi:** Windows (PowerShell / CMD / Windows Terminal)
* **Karakteristik:** Antigravity orkestrasyon sistemi, alt agent takımları ve geliştirici için merkezi, yüksek hızlı ve tam yetkili çalışma alanıdır.
* **Geçiş Tamamlanma Durumu:** WSL (`Ubuntu`) üzerindeki geliştirme ortamından Windows yerel sürücüsüne geçiş %100 oranında tamamlanmıştır.
* **Organizasyon Standardı:** Tüm projeler kategorik olarak gruplanmış, klasör isimleri standart **kebab-case** düzenine getirilmiş ve tüm çalıştırma betikleri özel **`baslaticilar\`** klasöründe toplanmıştır.
* **Geçici Dosyalar:** Aktarım ve test sırasında oluşan geçici işlem kütükleri arındırılmış, çalışma ortamı temizlenmiştir.

---

## 2. AntiGravity Yönergelerinin Entegrasyonu (`GEMINI.md`)

`C:\Users\Birin\Birin\Projeler\GEMINI.md` çalışma alanı yönergeleri, alt agent sistemi için birincil kural setidir:

### Temel Çalışma İlkeleri:
1. **İletişim Dili:** Kullanıcı ile iletişim dili Türkçedir. Yanıtlar net, doğrudan ve yüksek teknik derinliktedir.
2. **Mandatory Subagents (Alt Agent Orkestrasyonu):**
   - Asistan, kodlamayı doğrudan tek başına yapmak yerine projenin büyüklüğüne göre dinamik alt agent'lar görevlendiren bir **orkestratör** olarak çalışır.
   - **Küçük Projeler:** 5 - 6 Alt Agent
   - **Orta Projeler:** 10 - 11 Alt Agent
   - **Büyük Projeler:** 15 - 32 Alt Agent (Tam Kadro)
3. **32 Uzmanlık Rolü Kataloğu:**
   - Jenerik isimler ("Kodlayıcı 1") yasaktır.
   - Mimari (`system-architect`), dokümantasyon (`technical-writer`), sınır analizleri (`edge-case-analyst`), entegrasyon (`assembly-integrator`), kod kalitesi (`code-quality-auditor`), önbellek ve depolama (`storage-cache-manager`) gibi roller atanır.
4. **Dinamik Donanım ve Kaynak Koruması:**
   - **Yerel Donanım / GPU (RTX 5060 Ti & Ollama):** Eşzamanlılık 1-2 ile sınırlandırılır, işlemler sıralı yürütülür, VRAM şişmesi engellenir.
   - **Bulut / Harici Modeller:** Yerel donanım etkilenmediği için 30'a kadar paralel alt agent çalıştırılabilir.
5. **Güvenli Sistem Yönetimi:** Otomatik veya arka plan kapatma döngüleri yasaktır; yalnızca kullanıcı açıkça talep ettiğinde tek seferlik güvenli komut (`shutdown /s /t 10`) uygulanır.

---

## 3. Eklenen 3 Kritik Yetenek (Skill Ağacı)

Çalışma alanındaki projelerin hızlı, ucuz ve güvenli geliştirilmesi için sisteme 3 yeni skill tanımlanmıştır:

### A. `project-memory-keeper` (Proje Canlı Hafızası)
- **Konum:** `~/.gemini/config/skills/project-memory-keeper/SKILL.md`
- **İşlevi:** Her projenin kök dizininde `PROJECT_STATE.md` dosyasını yönetir. Projeye başlarken tüm dosyaları okumak yerine bu hafıza dosyasını okur; değişiklik bittiğinde son durumu işleyerek teslim eder.

### B. `targeted-error-locator` (Cerrahi Hata ve Kod Konumlandırma)
- **Konum:** `~/.gemini/config/skills/targeted-error-locator/SKILL.md`
- **İşlevi:** Projeyi baştan sona taramak yerine ters hata izi (stack trace slicing), hedefe yönelik regex araması (`Select-String`), I/O sınırları ve `git diff/log` yöntemleriyle hatayı doğrudan 1-2 dosya satırı üzerinden tespit eder.

### C. `token-efficient-clean-coder` (Token Verimli Temiz Kod Mühendisliği)
- **Konum:** `~/.gemini/config/skills/token-efficient-clean-coder/SKILL.md`
- **İşlevi:** 10 satırlık değişiklik için yüzlerce satırlık dosyayı yeniden yazdırmayı yasaklar (`edit_file` zorunluluğu). YAGNI ve tek seferde doğru kodlama (tip kontrolü, null güvenliği, import doğruluğu) ilkeleriyle token tüketimini minimuma indirir.

---

## 4. Korumalı ve Muaf Bağımsız Dizinler

Aşağıdaki dizin ve dosyalar `Projeler` çalışma alanının dışındadır, bağımsız varlıklardır ve kesinlikle silinmez veya taşınmaz:
* `C:\Users\Birin\Birin\Data` (Kullanıcı veri havuzu)
* `C:\Users\Birin\Birin\StabilityMatrix.exe` (Yerel Yapay Zekâ / Stable Diffusion arayüzü)
* `C:\Users\Birin\Birin\Recep` (Özel kullanıcı dizini)
* `C:\Users\Birin\Birin\DLL_çekme_aparatı` (Bağımsız araç seti)

---

## 5. Dörtlü Kategorik Proje Mimarisi ve Dizin Ağacı

Tüm projeler alanlarına göre 4 ana küme altında, standart **kebab-case** adlandırma kuralına uygun olarak organize edilmiştir:

```
C:\Users\Birin\Birin\Projeler\
├── baslaticilar\                     # ⚡ Tüm çalıştırma betiklerinin toplandığı özel klasör
│   ├── PROJELERI_BASLAT.bat          # 🎛️ Tüm projeleri tek menüden açan ana kontrol konsolu
│   ├── Baslat_NotDefterim.bat        # 📝 Not Defterim hızlı başlatıcı
│   ├── Baslat_ByteRescue.bat         # 🛡️ ByteRescue hızlı başlatıcı
│   ├── Baslat_CihazTakip.bat         # 📱 Cihaz Takip hızlı başlatıcı
│   ├── Baslat_Dashboard.bat          # 💻 Dashboard hızlı başlatıcı
│   ├── Baslat_WiFiSyncTester.bat     # 🌐 Wi-Fi Sync Tester hızlı başlatıcı
│   ├── Transfer_Projeler.bat         # 🔄 WSL Senkronizasyon aracı
│   └── Antigravity_Klasorunu_Sil.bat # 🧹 Boş AntiGravity klasörünü silme aracı
├── PROJELER_REHBERI.md              # 📖 Detaylı mimari ve çalıştırma rehberi
├── WORKSPACE.md                     # 🏗️ Çalışma alanı ve mimari manifestosu
├── GEMINI.md                        # ⚙️ Antigravity alt agent kuralları
│
├── not-uygulamalari\                # 📝 Not Alma ve Güvenli Not Kasası
│   ├── not-defterim\                # Eski: NoteApp (Kotlin Compose, Tauri Rust, Electron)
│   └── note-vault-rescue\           # Eski: NoteVaultRescue (Python, AES-GCM Parola Kurtarıcı)
│
├── sistem-yonetimi\                 # 💻 Windows Sistem ve Donanım Yönetimi
│   ├── antigravity-dashboard\       # Eski: AntiGravity_Dashboard (Flask Web PC Kontrol Paneli)
│   ├── win-control-hub\             # Eski: WinControlHub (Sistem Servis Hub'ı)
│   └── windows-control-app\         # Eski: WindowsControlApp (USB Health & WMI Donanım Aracı)
│
├── yedekleme-kurtarma\              # 🛡️ Disk Analizi, Kurtarma ve Yedekleme
│   ├── byte-rescue\                 # Eski: ByteRescue (Electron/Svelte Veri Kurtarma Laboratuvarı)
│   └── omni-backup-transfer\        # Eski: OmniBackupTransfer (Android Wi-Fi LAN Yedekleme Sunucusu)
│
└── araclar-ve-servisler\            # 🛠️ Yardımcı Araçlar, Çeviri, Ağ ve Test Servisleri
    ├── cihaz-takip\                 # Kurumsal Envanter Sistemi (Next.js 16, Prisma)
    ├── screen-translator\           # Eski: screen_translator (PyQt6 HUD Ekran Çevirici)
    ├── moon-novel-downloader\       # Eski: MoonNovelDownloaderApp (EPUB/Mobi Android İndirici)
    ├── kampus-kutusu\               # Eski: Yusuf (Öğrenci Yardımlaşma ve Eşya Portalı)
    ├── wifi-sync-tester\            # Eski: tools_sync_tester (Wi-Fi Eşitleme Test Paketi)
    ├── c-pe-builder\                # Eski: tools_test_build (C++/Zig Portable PE Derleyici)
    └── apk-deposu\                  # Eski: APK_Cikti (Hazır Android .apk Dağıtım Klasörü)
```

---

## 6. Geçiş ve Dönüşüm Haritası (Eski İsim ➔ Yeni Kategorik Yol)

Aşağıdaki tablo, WSL/eski yapıdan yeni 4'lü kategorik kebab-case yapısına dönüşümün resmi eşleşme haritasıdır:

| # | Eski Dizin / Proje Adı | Yeni Kategori | Yeni Kebab-Case Dizin Yolu | Birincil Teknoloji | Hızlı Başlatıcı / Yürütülebilir Dosya |
| :-: | :--- | :--- | :--- | :--- | :--- |
| **1** | `NoteApp` | `not-uygulamalari/` | `.\not-uygulamalari\not-defterim` | Kotlin Multiplatform, Tauri/Rust, SQLite | `Baslat_NotDefterim_Desktop.bat` |
| **2** | `NoteVaultRescue` | `not-uygulamalari/` | `.\not-uygulamalari\note-vault-rescue` | Python 3.12, Flask, Cryptography | `baslat.bat` / `baslat_cli.bat` |
| **3** | `AntiGravity_Dashboard` | `sistem-yonetimi/` | `.\sistem-yonetimi\antigravity-dashboard` | Python Flask, Glassmorphism, WMI | `Baslat_AntiGravity.bat` |
| **4** | `WinControlHub` | `sistem-yonetimi/` | `.\sistem-yonetimi\win-control-hub` | Python Flask, Sistem Servis Konsolu | `Baslat_WinControlHub.bat` |
| **5** | `WindowsControlApp` | `sistem-yonetimi/` | `.\sistem-yonetimi\windows-control-app` | Python, WMI, PowerShell USB Health | `Baslat_WindowsControl.bat` |
| **6** | `ByteRescue` | `yedekleme-kurtarma/` | `.\yedekleme-kurtarma\byte-rescue` | Electron 33, Svelte 5, Vite 6 | `ByteRescue.exe` / `Baslat_ByteRescue.bat` |
| **7** | `OmniBackupTransfer` | `yedekleme-kurtarma/` | `.\yedekleme-kurtarma\omni-backup-transfer` | Android Compose, Ktor HTTP Engine | `gradlew.bat` / Hazır APK |
| **8** | `cihaz-takip` | `araclar-ve-servisler/` | `.\araclar-ve-servisler\cihaz-takip` | Next.js 16, React 19, Prisma SQLite | `Baslat_CihazTakip.bat` |
| **9** | `screen_translator` | `araclar-ve-servisler/` | `.\araclar-ve-servisler\screen-translator` | Python, PyQt6, Media OCR / Gemini | `Baslat_ScreenTranslator.bat` |
| **10** | `MoonNovelDownloaderApp` | `araclar-ve-servisler/` | `.\araclar-ve-servisler\moon-novel-downloader` | Android Compose, Room, EPUB Motoru | `gradlew.bat` / Hazır APK |
| **11** | `Yusuf` | `araclar-ve-servisler/` | `.\araclar-ve-servisler\kampus-kutusu` | HTML5, CSS3 Variables, Vanilla JS | `index.html` / `python -m http.server` |
| **12** | `tools_sync_tester` | `araclar-ve-servisler/` | `.\araclar-ve-servisler\wifi-sync-tester` | Node.js, Python, HTTP/Socket Testi | `run_tests.bat` / `Test_WiFi_Sync.bat` |
| **13** | `tools_test_build` | `araclar-ve-servisler/` | `.\araclar-ve-servisler\c-pe-builder` | Zig, C++, Win32 PE Portable Derleme | `test.exe` |
| **14** | `APK_Cikti` | `araclar-ve-servisler/` | `.\araclar-ve-servisler\apk-deposu` | Derlenmiş Android APK Havuzu | `NovelReaderDownloader.apk`, `OmniBackupTransfer-v2-debug.apk` |

---

## 7. Merkezi Başlatıcı ve Yönetim Konsolu

Tüm çalıştırma betikleri **`baslaticilar\`** klasöründe toplanmıştır. **`baslaticilar\PROJELERI_BASLAT.bat`** betiği, tüm kategorilerdeki projeleri tek bir interaktif terminal arayüzünden başlatmanızı sağlar:

```bat
:: Merkezi Başlatıcı Konsolu
C:\Users\Birin\Birin\Projeler\baslaticilar\PROJELERI_BASLAT.bat

:: Hızlı Başlatıcılar
C:\Users\Birin\Birin\Projeler\baslaticilar\Baslat_NotDefterim.bat
C:\Users\Birin\Birin\Projeler\baslaticilar\Baslat_ByteRescue.bat
C:\Users\Birin\Birin\Projeler\baslaticilar\Baslat_CihazTakip.bat
C:\Users\Birin\Birin\Projeler\baslaticilar\Baslat_Dashboard.bat
C:\Users\Birin\Birin\Projeler\baslaticilar\Baslat_WiFiSyncTester.bat
```

* **Özellikler:**
  - 4 ana kategori arasında hızlı geçiş veya direkt başlatma menüsü.
  - Bağımlılık kontrolü (Python, Node.js, Java vb.) ve otomatik çevre değişkeni sağlama.
  - Port çakışmalarını önceden algılama ve bilgilendirme.

---

## 8. Senkronizasyon ve Kurtarma Araçları

WSL veya harici bir kaynaktan yeni veri çekmek veya tam klonlama yapmak gerekirse:
- `.\baslaticilar\Transfer_Projeler.bat`: Çift tıklanarak çalışan etkileşimli senkronizasyon arayüzü.
- `.\baslaticilar\Transfer-Projeler.ps1`: Robocopy 32-thread motoruyla optimize veya tam klonlama komut satırı aracı.
- `.\PROJELER_REHBERI.md`: Tüm projelerin detaylı mimari, çalıştırma ve ortam değişkeni kılavuzu.
