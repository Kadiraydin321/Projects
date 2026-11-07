# Visual Studio 2022 & Çok Dilli Geliştirme Ortamı Teslimat Raporu ve Kullanım Rehberi

Bu dokümantasyon, sistemde yapılandırılan **Visual Studio 2022 Community (v17.14.x)** kurulumunu, entegre edilen iş yüklerini (Workloads), **C++, C#, Web API, Python ve Go** dilleri için hibrit geliştirme mimarisini, masaüstü başlatıcısını ve doğrulama süreçlerini kapsamlı biçimde açıklamaktadır.

---

## 1. Sürüm Bilgisi ve Mimarisi
- **Sürüm:** Microsoft Visual Studio 2022 Community (En kararlı sürüm v17.14.x LTS/Current)
- **Mimari:** 64-bit Yerel IDE Mimarisi (`devenv.exe` - Yüksek bellek kapasitesi, çökme koruması ve büyük çözüm desteği)
- **Lisans Tipi:** Bireysel geliştiriciler, açık kaynak projeler, akademik çalışmalar ve küçük takımlar için ücretsiz Community lisansı.
- **Konfigürasyon Hedefi:** Düşük gecikmeli, yüksek performanslı, tam donanımlı çok dilli geliştirme ortamı.

---

## 2. Yapılandırılan İş Yükleri (Workloads) ve Dahili Bileşenler

Kurulum betiği (`VS2022_Kurulum.bat`), modern yazılım geliştirme pratiklerinin gerektirdiği 4 temel kurumsal iş yükünü ve tüm önerilen bileşenleri içerecek şekilde konfigüre edilmiştir:

### A. C++ ile Masaüstü Geliştirme (`Microsoft.VisualStudio.Workload.NativeDesktop`)
* **MSVC v143 Derleyici Araç Takımı:** VS 2022 C++ x64/x86 derleyici ve bağlayıcıları (C++17, C++20 ve C++23 standartları tam desteği).
* **Windows 10/11 SDK:** En güncel Universal C Runtime (UCRT), Windows API başlıkları, kütüphaneleri ve Windows platform araçları.
* **CMake Tools for Windows:** Harici yapı sistemine ihtiyaç duymadan `CMakeLists.txt` projelerini doğrudan Visual Studio içinden yapılandırma, derleme ve hata ayıklama desteği.
* **AddressSanitizer (ASan):** Bellek taşmaları, sızıntılar ve dangling pointer hatalarını derleme/çalıştırma anında tespit eden gelişmiş bellek denetleyicisi.
* **C++ Core Guidelines & ClangFormat:** Kod kalitesi analizörleri ve otomatik biçimlendirme araçları.

### B. .NET Masaüstü Geliştirme (`Microsoft.VisualStudio.Workload.ManagedDesktop`)
* **.NET 8 LTS & .NET 9 SDK / Runtime:** En güncel uzun vadeli destek (LTS) ve modern .NET sürümleri.
* **WPF & Windows Forms Araçları:** Görsel UI tasarımcıları, XAML Canlı Önizleme (Hot Reload) ve veri bağlama (Data Binding) araçları.
* **MSBuild & Roslyn Derleyici Platformu:** Yüksek hızlı paralel derleme, dinamik kod analizörleri ve kaynak jeneratörleri.
* **Diagnostics Hub:** CPU kullanımı, bellek tahsisatı ve nesne ömrü izleme araçları.

### C. ASP.NET ve Web Geliştirme (`Microsoft.VisualStudio.Workload.NetWeb`)
* **ASP.NET Core:** Yüksek performanslı REST API, Web API, gRPC ve Minimal APIs geliştirme ortamı.
* **Blazor Desteği:** Blazor Server ve Blazor WebAssembly ile C# tabanlı tek sayfa web uygulamaları (SPA).
* **OpenAPI / Swagger & Endpoints Explorer:** API rotalarını test etme, dokümante etme ve `.http` dosyaları ile doğrudan IDE içinden istek gönderme.
* **Web Sunucusu:** Yerel Kestrel ve IIS Express web geliştirme sunucuları.

### D. Python Geliştirme (`Microsoft.VisualStudio.Workload.Python`)
* **Python Araçları & REPL:** Python sözdizimi renklendirme, akıllı IntelliSense, etkileşimli REPL terminali.
* **Karma Mod Hata Ayıklama (Mixed-Mode Debugging):** Python betikleri ile C/C++ C-extension (.pyd / Cgo / C DLL) modüllerinin aynı oturumda adım adım birlikte hata ayıklanabilmesi (mixed native/managed debugging).
* **Python Profiler:** Python kodundaki darboğazları ve fonksiyon yürütme sürelerini tespit eden performans analizörü.

---

## 3. Go Dili İçin Hibrit Geliştirme Mimarisi

Go dili doğası gereği resmi Visual Studio Installer içinde ayrı bir iş yükü olarak paketlenmemektedir. Bu sebeple sistemde yüksek verimli ve endüstri standardı bir **Hibrit Mimari** kurulmuştur:

```
+-----------------------------------------------------------------------------------+
|                        HİBRİT GELİŞTİRME MİMARİSİ                                 |
+-----------------------------------------+-----------------------------------------+
|      VISUAL STUDIO 2022 (ENTERPRISE)    |          VS CODE (HAFİF & ÇEVİK)        |
+-----------------------------------------+-----------------------------------------+
| * "Open Folder" Modu                    | * Modern Go Dil Desteği (golang.go)     |
| * tasks.vs.json / launch.vs.json        | * gopls (Official Language Server)      |
| * MSVC v143 C++ Linker & Cgo Uyumu      | * Delve (dlv) Hata Ayıklayıcı           |
| * C/C++ & Go Ortak Derleme Pipeline     | * ms-dotnettools.csdevkit & csharp      |
| * Büyük Çözüm & Native Katman Yönetimi  | * ms-vscode.cpptools                    |
+-----------------------------------------+-----------------------------------------+
                    |                                          |
                    +--------------------+---------------------+
                                         |
                                         v
                         +-------------------------------+
                         |   SİSTEM ÇEKİRDEĞİ (PATH)     |
                         |  - Go 1.27.3 (Windows x64)    |
                         |  - MSVC / Clang / GCC         |
                         |  - Git & Terminal Ortamı      |
                         +-------------------------------+
```

### 1. Sistem Seviyesinde Go Durumu:
- Sistemde halihazırda modern ve kararlı **Go (v1.27.3 x64)** ortamı kuruludur ve sistem ortam değişkenlerinde (`PATH`) tanımlıdır.
- `go build`, `go run`, `go test`, `go mod` ve standart Go araç zinciri doğrudan PowerShell/CMD üzerinden erişilebilmektedir.

### 2. Visual Studio "Open Folder" + Cgo ve Harici Derleyici Uyumu:
- **Open Folder:** Visual Studio 2022'de `Dosya > Aç > Klasör` seçilerek herhangi bir Go projesi doğrudan açılabilir.
- **Cgo Uyumu:** Go uygulamaları C/C++ kütüphaneleriyle bağlandığında (`Cgo`), Visual Studio 2022 tarafından kurulan MSVC v143 araç takımı ve Windows SDK, yerel başlık dosyalarını ve kütüphaneleri eksiksiz sağlayarak pürüzsüz derleme sağlar.
- `.vs/tasks.vs.json` ve `.vs/launch.vs.json` dosyaları eklenerek `go build` ve `dlv (Delve)` hata ayıklayıcısı Visual Studio F5 akışına bağlanabilir.

### 3. VS Code Tarafındaki Tamamlayıcı Eklentiler:
Sistemdeki VS Code kurulumuna aşağıdaki temel geliştirme eklentileri kazandırılmıştır:
- `golang.go`: Google resmi Go eklentisi. Otomatik tamamlama, `gopls` dil sunucusu, kod navigasyonu, imza yardımı, Delve ile görsel hata ayıklama ve test çalıştırma.
- `ms-vscode.cpptools`: C/C++ IntelliSense, hata ayıklama ve kod tarama araçları.
- `ms-dotnettools.csdevkit`: Modern .NET Çözüm Gezgini, proje yönetimi ve test gezgini.
- `ms-dotnettools.csharp`: C# temel sözdizimi, Roslyn analizörleri ve dil motoru.

---

## 4. Masaüstü Başlatıcısı ve UAC Onay Talimatı

Kullanıcının tek tıklamayla kuruluma başlaması için masaüstüne optimize edilmiş bir toplu iş kütüğü yerleştirilmiştir:
- **Dosya Konumu:** `C:\Users\Birin\Desktop\VS2022_Kurulum.bat`

### Çalışma Mekanizması ve UAC Yükseltme:
1. Betik çalıştırıldığında ilk olarak `net session` komutuyla yönetici haklarını denetler.
2. Yetki bulunmuyorsa, kullanıcıyı bilgilendirerek arka planda PowerShell aracılığıyla UAC yükseltme isteği (`Start-Process cmd ... -Verb RunAs`) gönderir.
3. Ekrana **Kullanıcı Hesabı Denetimi (UAC)** penceresi gelecektir. **"Evet"** butonuna basıldığında kurulum tam yetkiyle başlar.
4. Betik, resmi Microsoft web önyükleyicisini (`%TEMP%\vs_community.exe`) çağırarak yukarıda belirtilen tüm iş yüklerini (`NativeDesktop`, `ManagedDesktop`, `NetWeb`, `Python`) ve önerilen bileşenleri görsel ilerleme çubuğuyla kurar.
5. Kurulum bittiğinde çıkış kodunu denetler (Kod 0: Başarılı, Kod 3010: Başarılı & Yeniden başlatma önerilir).

---

## 5. Kurulum Sonrası Ortam Doğrulama (Verification Guide)

Kurulum tamamlandıktan sonra geliştirme ortamının kusursuz çalıştığını doğrulamak için aşağıdaki adımlar uygulanabilir:

### 1. Visual Studio 2022 Doğrulaması:
- Başlat menüsünden `Visual Studio 2022` uygulamasını açın.
- `Yeni Proje Oluştur` penceresinde `C++`, `C#` ve `Python` şablonlarının (Örn: C++ Console App, C# ASP.NET Core Web API, Python Application) listelendiğini teyit edin.

### 2. C++ (MSVC & CMake) Komut Satırı Doğrulaması:
- Başlat menüsünden **"Developer Command Prompt for VS 2022"** açın ve şu komutları çalıştırın:
  ```cmd
  cl
  cmake --version
  ```
  *Beklenen Sonuç:* Microsoft (R) C/C++ Optimizing Compiler sürüm bilgisi ve CMake sürüm bilgisi ekrana gelmelidir.

### 3. C# / .NET SDK Doğrulaması:
- PowerShell veya CMD üzerinden:
  ```powershell
  dotnet --version
  dotnet --list-sdks
  ```
  *Beklenen Sonuç:* .NET 8 veya .NET 9 SDK sürümlerinin listelenmesi.

### 4. Python Doğrulaması:
- Terminal üzerinden:
  ```powershell
  python --version
  ```
  *Beklenen Sonuç:* Python sürümünün görüntülenmesi.

### 5. Go Ortamı Doğrulaması:
- Terminal üzerinden:
  ```powershell
  go version
  go env
  ```
  *Beklenen Sonuç:* `go version go1.27.3 windows/amd64` çıktısı ve Go ortam değişkenleri.
- VS Code içinde bir `.go` dosyası açıldığında sağ altta Go dil sunucusunun (`gopls`) aktifleştiğini ve IntelliSense'in çalıştığını doğrulayın.

---

## 6. Özet Sonuç
Visual Studio 2022 Community (v17.14.x) iş yükleri, tek tıkla çalıştırılmaya hazır masaüstü otomasyon betiği ve VS Code tamamlayıcı eklentileriyle sistem tam teşekküllü, çok dilli bir yazılım geliştirme istasyonuna dönüştürülmüştür.
