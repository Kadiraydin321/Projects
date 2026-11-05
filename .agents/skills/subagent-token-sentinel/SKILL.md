---
name: subagent-token-sentinel
description: "Alt agent'ların ve orkestratörün tüm dosyaları körlemesine okumasını (read_file 800+ satır) ve dizinleri kontrolsüz taramasını engelleyen, katı cerrahi dilimleme (slicing) ve token muhafızı protokolü."
---

# 🛡️ Alt Agent Token Muhafızı & Cerrahi İcra Protokolü (`subagent-token-sentinel`)

Bu yetenek ve kural seti, özellikle **alt agent'ların (`subagent`)** görev icrası sırasında yüzlerce/binlerce satırlık dosyaları baştan sona okuyarak veya dizinleri kontrolsüz listeleyerek kullanıcı token bütçesini israf etmesini kesin olarak engellemek amacıyla oluşturulmuştur.

---

## 1. 🚨 Alt Agent'lar İçin Mutlak Yasaklar (Strict Prohibitions)

1. ❌ **KÖRLÜKLE TAM DOSYA OKUMA YASAĞI:**
   - Parametresiz `read_file(Path)` çağrısı yaparak 200, 500, 800 satırlık kod dosyalarını bağlama (context) çekmek **KESİNLİKLE YASAKTIR**.
   - Bir dosyanın tamamını merak veya keşif amaçlı okumak yasaktır.

2. ❌ **REKÜRSİF DİZİN & ÇÖP TARAMA YASAĞI:**
   - Proje kökünde veya üst dizinlerde derinlemesine `Get-ChildItem -Recurse` / `find` çalıştırmak; özellikle `build/`, `node_modules/`, `.git/`, `.gradle/`, `dist/`, `.idea/` gibi ağır dizinleri taramak yasaktır.

3. ❌ **TAM DOSYAYI YENİDEN YAZMA YASAĞI:**
   - Var olan bir dosyayı 5-10 satırlık değişiklik için `write_file(Overwrite=True)` ile baştan sona yeniden üretmek yasaktır. Daima `edit_file` kullanılmalıdır.

4. ❌ **ÇOKLU DÖNGÜ VE KÖR TAHMİN YASAĞI:**
   - Kodu okumadan rastgele değişiklik yapıp derleme hatası alarak döngüye girmek (trial-and-error token burn) yasaktır.

---

## 2. 🎯 Cerrahi Çalışma Protokolü (Surgical Execution Protocol)

Herhangi bir alt agent bir dosyada değişiklik veya inceleme yapacağı zaman **YALNIZCA** şu sırayı takip eder:

### Adım 1: Nokta Atışı Konum Belirleme (Locate Before Reading)
Dosyayı açmadan önce, aranan sembolün, fonksiyonun veya hatanın hangi satırda olduğunu terminalden sorgula:
```powershell
# PowerShell:
Select-String -Path "path/to/file.kt" -Pattern "fonksiyonAdi" -Context 0
```
veya
```bash
# Bash:
grep -n "fonksiyonAdi" path/to/file.kt
```
Bu komut yalnızca hedef satır numarasını (örn: `Satır 312`) döndürür ve sıfır LLM token harcar.

### Adım 2: Cerrahi Dilimleme ile Okuma (Surgical Slice Read)
Satır numarası tespit edildikten sonra `read_file` aracına **MUTLAKA** `StartLine` ve `EndLine` verilir:
- Hedef satır 312 ise: `StartLine: 300, EndLine: 335` (Maksimum 35-50 satırlık pencere).
- Asla 100 satırdan geniş aralıklar tek seferde okunmaz.

### Adım 3: Cerrahi Düzenleme (Surgical Patching)
Değişiklik yapılırken:
- `edit_file` kullanılır.
- `Target` alanı sadece değişecek 3-10 satırı tam eşleşmeyle içerir.
- `Replacement` doğrudan yeni kodu bırakır.

---

## 3. 👑 Orkestratör (Baş Yönetici) Görev Sorumluluğu

Baş Yönetici / Orkestratör agent, alt agent başlatırken bu kuralı subagent'a zorla kabul ettirmekle yükümlüdür:

1. **`define_subagent` Enjeksiyonu:**
   Tanımlanan her alt agent'ın `SystemPrompt` metnine şu zorunlu direktif eklenir:
   > *"ZORUNLU KURAL: Dosyaları baştan sona okumak (`read_file` limitsiz) YASAKTIR. Önce `Select-String` ile satır numarasını bul, ardından yalnızca 30-50 satırlık dar aralık oku (`StartLine`/`EndLine`). Dosya yazarken sadece `edit_file` kullan. Token israfı yapma."*

2. **`invoke_subagent` Enjeksiyonu:**
   Alt agent'a verilen görev isteminin (`Prompt`) en başına şu uyarı eklenir:
   > *"[TOKEN KORUMA PROTOKOLÜ: Bu görevde dosya okurken kesinlikle StartLine/EndLine aralığı ver. Tüm dosyayı okuma, Select-String ile cerrahi çalış.]"*
