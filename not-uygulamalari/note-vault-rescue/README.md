# 🔐 NoteVault Şifre Kurtarıcı ve Kasa Açıcı

Bu uygulama, **NoteApp** uygulamasında kaydedilmiş ve şifresi unutulmuş `.notevault` kasalarını kurtarmak için özel olarak geliştirilmiştir.

Tahmin ettiğiniz kelimeleri, şifre parçalarını veya şüphe duyduğunuz parolaları girdiğinizde, **akıllı varyasyon ve mutasyon motoru** ile saniyede **1.000.000+'dan fazla** olası parolayı deneyerek kasanızı açar ve içindeki tüm notları, kategorileri ve medya dosyalarını kurtarır.

---

## ⚡ Neden Bu Kadar Hızlı? (Saniyede 1 Milyon+ Şifre)
`.notevault` dosya formatının başlığında (header), `SHA-256(salt + password)` doğrulaması bulunur.
Bu kurtarma aracı, her parola adayında ağır PBKDF2 ve AES-GCM işlemlerini çalıştırmak yerine, önce **ultra-hızlı SHA-256 filtresi** uygular. Eşleşen şifre bulunduğunda PBKDF2 ve AES-GCM bir kez çalıştırılır. Bu sayede yüz binlerce varyasyon **1 saniyeden kısa sürede** taranır.

---

## 🚀 Nasıl Çalıştırılır?

### 1. Seçenek: Web Arayüzü (Görsel ve Kolay - Önerilen)
Web arayüzü ile dosyanızı sürükle-bırak yapabilir, arama ilerlemesini canlı izleyebilir ve kurtarılan notları tarayıcıda okuyup indirebilirsiniz.

**Linux / macOS:**
```bash
cd /home/birin/Projeler/NoteVaultRescue
./baslat.sh
```
veya doğrudan:
```bash
python3 app.py
```

**Windows:**
`baslat.bat` dosyasına çift tıklayın.

Otomatik olarak tarayıcınızda açılacaktır: `http://localhost:7890`

---

### 2. Seçenek: Terminal / Komut Satırı (CLI)

**Windows (Tek Tıkla veya Sürükle-Bırak):**
- [`baslat_cli.bat`](file:///home/birin/Projeler/NoteVaultRescue/baslat_cli.bat) dosyasına çift tıklayın (veya bir `.notevault` dosyasını doğrudan bu `.bat` dosyasının üzerine sürükleyip bırakın).

**Linux / macOS (Etkileşimli Mod):**
```bash
./baslat_terminal.sh
# veya
python3 cli.py
```

**Tek Satır Komutla:**
```bash
python3 cli.py /yol/dosya.notevault -g "tahmin1" "tahmin2" -l standard
```

#### Örnekler:
```bash
# Tek kelimelik tahmin:
python3 cli.py ornek_kasa.notevault -g "gizlisifre"

# Birden fazla tahmin / ipucu:
python3 cli.py ornek_kasa.notevault -g "ahmet" "1905" "bursa"

# Hızlı arama seviyesi (fast):
python3 cli.py ornek_kasa.notevault -g "deneme" -l fast

# Kapsamlı / derinlemesine arama (deep):
python3 cli.py ornek_kasa.notevault -g "parola" -l deep

# Özel son ek veya ön ek ekleme:
python3 cli.py ornek_kasa.notevault -g "notlar" --suffix "2024!" "123"
```

---

## 🧠 Desteklenen Varyasyonlar & Mutasyonlar

| Kategori | Açıklama | Örnekler |
| :--- | :--- | :--- |
| **Büyük/Küçük Harf** | PascalCase, camelCase, lowercase, UPPERCASE, swapcase | `GizliSifre`, `gizliSifre`, `GIZLISIFRE` |
| **Türkçe Karakterler** | Türkçe ve İngilizce karakter dönüşümleri (ç-c, ğ-g, ı-i, ö-o, ş-s, ü-u) | `şifre` ↔ `sifre`, `bursa` ↔ `bursa` |
| **Leet Speak** | Sayı ve simge ikameleri | `a`→`4`/`@`, `e`→`3`, `i`→`1`/`!`, `s`→`5`/`$` |
| **Yıllar & Tarihler** | 1960-2030 yılları, tarihi yıllar (1453, 1923, 1881), takım yılları (1903, 1905, 1907) | `Ahmet2024`, `Sifre1905!`, `Not1453` |
| **Plakalar & Sayılar** | 81 ilin plakaları (01-81), 1, 12, 123, 1234 vb. | `Gizli34`, `Ahmet06!`, `Kasa123` |
| **Ayırıcılar** | Alt tire `_`, tire `-`, nokta `.`, boşluk | `Ahmet_1905!`, `Kasa_Yedegi_2025` |
| **Klavye Hataları (Deep)** | QWERTY ve Türkçe Q klavyede yan tuşa basma, eksik/çift harf | `ahmet` → `ajmet`, `amhet`, `aahmet` |

---

## 📥 Kurtarılan Notların Dışa Aktarımı
Şifre bulunduğunda:
1. **Şifre ve Bilgiler:** `SIFRE_BILGISI.txt` dosyasına açık olarak yazılır.
2. **Ayrı Metin Dosyaları (.txt):** Her not `Notlar/` klasörüne başlığı ve kategorisiyle temiz metin olarak kaydedilir.
3. **ZIP Arşivi:** Kasa eğer tam yedek ise şifresiz orijinal `.zip` arşivi ve ekleri (resimler/sesler) çıkartılır.
4. **JSON Dökümü:** Tüm notlar `notlar_tam_liste.json` olarak dışa aktarılır.
