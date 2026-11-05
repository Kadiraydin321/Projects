# GitHub Copilot CLI `/remote` Kapsamlı Kullanım Kılavuzu

Bu kılavuz, **GitHub Copilot CLI**'ın terminal üzerinde çalışan yapay zeka ajan oturumlarını uzaktan (mobil cihazlardan veya web tarayıcılarından) canlı olarak izlemenizi, yönlendirmenizi ve onay mekanizmalarını yönetmenizi sağlayan **`/remote` (Remote Control)** özelliğini tüm teknik ayrıntılarıyla ele alır.

---

## 1. Genel Bakış ve Mimari

### 1.1 `/remote` Nedir?
GitHub Copilot CLI `/remote` özelliği; geliştiricinin bilgisayarında (yerel terminalde) çalışan etkileşimli bir Copilot CLI oturumunu, **GitHub Mobile** uygulaması (iOS / Android) veya **GitHub.com** web arayüzü üzerinden uzaktan kontrol etmesini sağlayan iki yönlü bir köprüdür.

Masa başından kalktığınızda, hareket halindeyken veya kahve molasındayken:
- Ajanın terminalde gerçekleştirdiği adımları ve komut çıktılarını canlı olarak izleyebilirsiniz.
- Çalıştırılmak istenen potansiyel riskli kabuk komutlarına (bash/PowerShell) ve dosya değişikliklerine telefondan onay (**Approve**) veya ret (**Reject**) verebilirsiniz.
- Ajana yeni talimatlar, geri bildirimler veya rota düzeltmeleri gönderebilirsiniz.

### 1.2 "Session Sync" vs. "Remote Control" Farkı
| Özellik | Session Sync (Oturum Senkronizasyonu) | Remote Control (`/remote`) |
| :--- | :--- | :--- |
| **Erişim Türü** | Salt Okunur (Read-only) | Çift Yönlü Tam Kontrol (Interactive Steering) |
| **Gecikme** | Periyodik / Arka plan | Gerçek Zamanlı (Websocket/SSE tabanlı canlı akış) |
| **Müdahale** | Sadece geçmiş adımları görme | Canlı prompt gönderme, plan onaylama, izin verme |
| **Gereksinim** | Standart hesap senkronizasyonu | Etkileşimli yerel terminal + açık oturum |

---

## 2. Sistem Gereksinimleri ve Ön Koşullar

1. **İşletim Sistemi ve Terminal:**
   - Windows 10/11 (PowerShell 7+ veya Windows Terminal), macOS (zsh/bash), Linux.
2. **Node.js Ortamı:**
   - **Node.js 22.0.0 LTS veya daha güncel sürüm** (Node.js 22+ gereklidir).
   - `npm` paket yöneticisi.
3. **GitHub Hesabı ve Lisans:**
   - Aktif bir GitHub Copilot lisansı (Copilot Individual, Copilot Business veya Copilot Enterprise).
   - *Not:* Kurumsal (Enterprise/Business) hesaplarda organizasyon yöneticisinin Copilot CLI ve Remote politikalarını devre dışı bırakmamış olması gerekir.
4. **Mobil Cihaz veya İkincil Ekran:**
   - **GitHub Mobile App** (App Store veya Google Play Store'dan güncel sürüm) VEYA modern bir mobil/masaüstü web tarayıcısı (Chrome, Safari, Firefox, Edge).
5. **Ağ Bağlantısı:**
   - Yerel makinenin internete bağlı ve GitHub API / WebSocket uç noktalarına erişebilir olması gerekir.

---

## 3. Kurulum ve İlk Doğrulama

### 3.1 Node.js Sürüm Kontrolü
Terminalinizde Node.js sürümünün 22+ olduğunu doğrulayın:

```powershell
node -v
# Beklenen: v22.x.x veya üzeri
```

Eğer Node.js sürümünüz eskiyse `nvm`, `winget` veya resmi [nodejs.org](https://nodejs.org) üzerinden Node.js 22 LTS sürümüne yükseltin:

```powershell
winget install OpenJS.NodeJS.LTS
```

### 3.2 GitHub Copilot CLI Kurulumu
Resmi küresel npm paketini kurun:

```powershell
npm install -g @github/copilot
```

Kurulumun doğruluğunu ve kurulu sürümü kontrol edin:

```powershell
copilot --version
```

---

## 4. Giriş ve Yetkilendirme (`/login`)

Copilot CLI'ın yerel makineniz ile GitHub hesabınızı bağlaması için tek seferlik cihaz akışı (OAuth Device Flow) yetkilendirmesi yapılır.

### 4.1 Giriş Adımları
1. Terminalde etkileşimli oturumu başlatın:
   ```powershell
   copilot
   ```
2. Copilot komut isteminde `/login` komutunu yazıp Enter'a basın:
   ```text
   > /login
   ```
3. Terminal size tek seferlik bir doğrulama kodu (örneğin: `ABCD-1234`) ve bir bağlantı adresi sunacaktır:
   ```text
   Please visit https://github.com/login/device and enter code: ABCD-1234
   ```
4. Tarayıcınızda bağlantıyı açın, kodu girin ve GitHub hesabınızla Copilot CLI için istenen izinleri onaylayın.
5. Terminaliniz otomatik olarak yetkilendirmeyi algılayacak ve `Successfully authenticated as <kullanici_adiniz>` mesajını gösterecektir.

### 4.2 Yetki ve Oturum Kontrolü
Oturum durumunuzu teyit etmek için:
```text
> /whoami
> /status
```

---

## 5. Uzaktan Oturumu Başlatma (`/remote`)

Uzaktan yönetim modunu iki şekilde başlatabilirsiniz:

### Yöntem A: Terminalden Doğrudan Parametre ile Başlatma
Oturumu en baştan uzaktan kontrol yeteneğiyle açmak için terminal komut satırına şu bayrağı ekleyin:

```powershell
copilot --remote
```

### Yöntem B: Aktif Oturum İçinde Slash Komutu ile Başlatma
Halihazırda açık olan etkileşimli bir oturumun ortasında uzaktan kontrole geçmek için:

```text
> /remote
# veya açıkça:
> /remote on
```

### 5.1 Konsol Çıktısı ve Bağlantı Bilgisi
Komut çalıştırıldığında CLI şu bilgileri ekrana basar:
1. **Mission Control URL'si:**
   - Oturum bir Git reposu içindeyse:
     `https://github.com/<org-veya-kullanici>/<repo>/tasks/<task-id>`
   - Oturum bağımsız bir dizindeyse:
     `https://github.com/copilot/agents`
2. **Terminal QR Kodu:** Ekranda doğrudan akıllı telefon kamerasıyla taranabilecek bir ASCII QR kod çizilir.

### 5.2 QR Kod Görünürlük Kısayolu
Çalışma sırasında ekrandaki diğer çıktılar QR kodu yukarı kaydırırsa veya QR kodu tekrar görmek isterseniz:
- Komut satırı boşken terminalde **`Ctrl + O`** (veya bazı sürümlerde **`Ctrl + E`**) tuş kombinasyonuna basarak QR kodu açıp kapatabilirsiniz (toggle).

### 5.3 Makinenin Uykuya Geçmesini Önleme (`/keep-alive`)
> [!IMPORTANT]
> Uzaktan kontrolün çalışabilmesi için yerel bilgisayarınızın ve terminalinizin açık kalması şarttır. Bilgisayarınızın ekran kilidine girmesi durumunda askıya alınmasını (sleep mode) engellemek için Copilot içinden şu komutu çalıştırın:
> ```text
> > /keep-alive
> ```

### 5.4 Uzaktan Kontrolü Kapatma
Uzaktan oturumu sonlandırmak ve sadece yerel terminale dönmek için:
```text
> /remote off
```
Durumu öğrenmek için:
```text
> /remote status
```

---

## 6. Telefon veya Web'den Kontrol (Mission Control)

### 6.1 GitHub Mobile ile Bağlantı (En Hızlı Yöntem)
1. Telefonunuzda **GitHub Mobile** uygulamasını açın.
2. Dahili QR kod okuyucuyu veya telefonunuzun varsayılan kamerasını kullanarak terminalinizdeki QR kodu tarayın.
3. GitHub Mobile doğrudan aktif terminal oturumunun arayüzünü açacaktır.

### 6.2 Web Tarayıcısı Üzerinden Bağlantı
Bilgisayarınızdan uzaktayken herhangi bir dizüstü, tablet veya tarayıcıdan:
- Oturumunuz bir GitHub reposuyla ilişkiliyse: İlgili reponun **Agents** sekmesine gidin veya terminalin verdiği doğrudan bağlantıyı (`/tasks/<task-id>`) açın.
- Genel ajan listesi için: `https://github.com/copilot/agents` adresine gidin.

### 6.3 Canlı Arayüz ve Kontrol Mekanizmaları

#### 1. Gerçek Zamanlı Akış (Streaming Logs & Thoughts)
- Ajanın yerel makinenizde okuduğu dosyalar, çalıştırdığı teşhisler ve düşünce zinciri (reasoning trace) eşzamanlı olarak mobil ekranda akar.

#### 2. Plan İnceleme ve Yönlendirme (Reviewing & Steering)
- Ajan bir görev için çok adımlı uygulama planı hazırladığında, mobil arayüzde plan adımlarını madde madde görebilirsiniz.
- Planı olduğu gibi onaylayabilir veya ekrana metin yazarak *"Adım 3'teki veritabanı migration'ını atla, önce testleri çalıştır"* şeklinde yönlendirme yapabilirsiniz.

#### 3. Onay ve İzin Mekanizması (Approval Prompts)
Copilot CLI, kritik operasyonlarda güvenlik nedeniyle duraklar ve onay ister. Bu istekler telefonunuza anlık bildirim ve modal olarak düşer:
- **Kabuk Komutu Onayı (Command Execution):** Örneğin `npm test`, `git status` veya derleme komutları.
- **Dosya Değişiklik Onayı (File Modifications):** Oluşturulan kod parçaları veya diff'ler.
- **Dış Ağ Erişimi (Network/URL Requests):** Web aramaları veya paket indirmeleri.
- Telefondaki arayüzden **`Approve` (Onayla)** veya **`Deny / Reject` (Reddet)** butonuna dokunarak işlemi saniyeler içinde onaylayabilirsiniz.

---

## 7. Güvenlik Modeli ve Sınırlar

1. **Uçtan Uca Kimlik Doğrulama:**
   - Bir terminal oturumuna yalnızca o oturumu yerel makinede başlatan GitHub kimliği erişebilir. Farklı bir kullanıcı veya yetkisiz oturum linke tıklasa dahi erişim reddedilir.
2. **Yerel Yürütme Güvenliği (Local Execution):**
   - Kodlar, komutlar ve dosya işlemleri bulutta değil, bizzat yerel bilgisayarınızın çalışma dizininde yürütülür. GitHub arayüzü yalnızca bir I/O kumandası görevi görür.
3. **Kapsam ve Kısıtlamalar:**
   - `/remote` özelliği yalnızca **etkileşimli (interactive)** Copilot oturumlarında kullanılabilir.
   - Betikler içinden `--prompt` (`-p`) bayrağıyla tek seferlik (headless/non-interactive) çağrılan komutlarda `/remote` çalıştırılamaz.
   - Bazı yerel yapılandırma komutları (örneğin `/permissions assisted`) yalnızca doğrudan yerel terminal klavyesinden yapılandırılabilir.

---

## 8. Hızlı Başvuru Kartı (Cheat Sheet)

| Komut / Kısayol | Açıklama |
| :--- | :--- |
| `npm install -g @github/copilot` | Copilot CLI'ı global olarak kurar / günceller. |
| `copilot` | Etkileşimli terminal ajanını başlatır. |
| `copilot --remote` | Ajanı uzaktan kontrol köprüsü doğrudan açık şekilde başlatır. |
| `/login` | GitHub OAuth Device akışı ile CLI'ı yetkilendirir. |
| `/remote` veya `/remote on` | Açık oturumda uzaktan kontrolü devreye alır ve QR kod üretir. |
| `/remote off` | Uzaktan bağlantıyı kapatır. |
| `/remote status` | Uzaktan kontrol bağlantısının aktifliğini ve URL'sini gösterir. |
| `Ctrl + O` *(boş promptta)* | Terminaldeki QR kod görünümünü açar / kapatır (toggle). |
| `/keep-alive` | Bilgisayarın uyku moduna geçmesini engelleyerek oturumu canlı tutar. |
| `/exit` | Oturumu tamamen kapatır. |

---

*Rehber Sürümü: v1.0.0 — GitHub Copilot CLI Entegrasyon Standardı*
