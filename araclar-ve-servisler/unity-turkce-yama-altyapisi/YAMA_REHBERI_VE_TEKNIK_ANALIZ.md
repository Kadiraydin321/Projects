# Unity Oyunları Tersine Mühendislik ve Türkçe Yama Altyapı Raporu

Bu rapor ve beraberindeki araç seti, **`C:\Users\Birin\AppData\Roaming\itch\apps`** altındaki iki Unity oyununun (`Nemurimouto` ve `Factorial Omega`) ikili mimarilerini, metin/yerelleştirme motorlarını ve Türkçe yama entegrasyon yöntemlerini teknik derinlikle belgelemektedir.

---

## 1. Genel Mimari ve Sürüm Özeti

| Parametre | Oyun 1: Nemurimouto (win_c) | Oyun 2: Factorial Omega (My Dystopian Robot Girlfriend) |
| :--- | :--- | :--- |
| **Dizin** | `nemurimouto\win_c` | `factorial-omega` |
| **Unity Motoru** | **Unity 6000.3.18f1** (Unity 6 LTS) | **Unity 6000.3.8f1** (Unity 6) |
| **Çalışma Zamanı (Runtime)** | **Mono x64** (`MonoBleedingEdge`) | **IL2CPP x64** (`GameAssembly.dll`) |
| **Metadata Sürümü** | Yok (Doğrudan CLR / Managed DLL) | **Metadata Version 39** (`global-metadata.dat`: 14.19 MB) |
| **Diyalog Motoru** | **Ink Narrative Engine** + I2.Loc | **Fungus Engine** (`Fungus.SayDialog`) |
| **Yerelleştirme Kütüphanesi** | **I2 Localization** (`I2.Loc`) *(LeanLocalization kullanılmıyor)* | **Resmi Unity Localization Paketi** + **Yerel ModTranslations Sistemi** |
| **Arayüz (UI) Çatısı** | **UI Toolkit (UIElements)** + TextMeshPro UGUI | **TextMeshPro** + UGUI |
| **Önerilen Yama Yöntemi** | BepInEx 5 + XUnity.AutoTranslator / I2 CSV Enjeksiyonu | 1. Yerel `ModTranslations` JSON<br>2. BepInEx 6 IL2CPP + AutoTranslator |

---

## 2. Nemurimouto (Mono x64) Detaylı Analizi

### 2.1. LeanLocalization vs. I2 Localization Gerçeği
- Proje klasöründe `LeanLocalization.dll` bulunmasına rağmen, tersine mühendislik ile yapılan IL ve tip taramasında `Assembly-CSharp.dll` içerisindeki oyun kodlarının **LeanLocalization sınıf ve metotlarına sıfır (0) çağrı yaptığı** tespit edilmiştir.
- Oyunun gerçek yerelleştirme motoru **`I2.Loc` (I2 Localization)** kütüphanesidir.
- `SettingsUI::RefreshControls` metodu `I2.Loc.LocalizationManager::GetAllLanguages()` çağrısıyla dilleri dinamik olarak listeler ve dil değiştiğinde `LocalizationManager::set_CurrentLanguage` fonksiyonunu tetikler.

### 2.2. Metinlerin Depolanma Yapısı
- Tüm diyalog ve arayüz dizgileri `Nemurimouto_Data\resources.assets` içerisindeki **`I2Languages`** LanguageSourceAsset nesnesinde saklanmaktadır.
- Anahtar yapısı hiyerarşiktir:
  - Diyaloglar: `chat_01/` ... `chat_28/` (örn. `chat_28/00500_mayu`, `chat_27/00200_player`)
  - Olaylar: `event_love_01`, `event_desire_01`, `prologue`
  - Arayüz ve Sistem: `menu`, `shopTemp`, `bathPreInvoke`
- Hazırlanan `Metin_Cikarici_Nemurimouto.ps1` betiği ile bu dizgiler doğrudan `I2Languages_Ceviri_Tablosu.csv` ve AutoTranslator sözlüğüne dönüştürülmüştür.

### 2.3. Türkçe Yama Entegrasyon Seçenekleri
1. **XUnity.AutoTranslator (BepInEx 5 veya ReiPatcher):**
   - XUnity.AutoTranslator, `I2.Loc`, `TextMeshPro` ve Unity 6 `UIElements` desteğine doğrudan sahiptir.
   - `AutoTranslatorConfig.ini` dosyasında `EnableI2Loc=True`, `EnableUIElements=True`, `EnableTextMeshPro=True` ve `Language=tr` ayarlanarak oyun içi tüm metinler şeffaf olarak Türkçeleştirilir.
2. **I2 CSV Bellek İçe Aktarma:**
   - `I2.Loc.LanguageSourceData` sınıfı yerleşik `AddLanguage("Turkish", "tr")` ve `Import_CSV(string, eSpreadsheetUpdateMode)` API'lerine sahiptir. Başlangıçta çalışan bir BepInEx eklentisi ile oyunun resmi dil menüsüne "Turkish" seçeneği eklenebilir.

---

## 3. Factorial Omega (IL2CPP x64) Detaylı Analizi

### 3.1. IL2CPP & Unity 6 Metadata v39
- Oyun C++ makine koduna derlenmiş `GameAssembly.dll` ve 14.19 MB'lık `global-metadata.dat` (Sürüm 39) kullanmaktadır.
- Diyaloglar popüler Unity görsel roman motoru olan **Fungus** (`Fungus.SayDialog`) üzerinden yürütülmektedir.
- Sistem metinleri Unity'nin resmi `UnityEngine.Localization` paketi ile Addressables (`catalog.bin`) altında 8 StringTable halinde paketlenmiştir (`Tables/StoryV6`, `Tables/UI`, `Tables/Emails`, `Tables/News`, `Tables/Blog`, `Tables/Items`, `Tables/Common`, `Tables/Other5`).

### 3.2. Yerleşik Mod Yerelleştirme Altyapısı (`ModTranslationData`)
- Oyunun kodunda (`Assets\Game\Scripts\Mods\ModsSingleton.cs`), geliştiricinin yerleştirdiği resmi bir mod ve çeviri sistemi keşfedilmiştir.
- Oyun başlangıçta `%USERPROFILE%\AppData\LocalLow\IncontinentCell\My Dystopian Robot Girlfriend\ModsTranslations` dizinini tarar.
- Çeviri dosyası formatı JSON tabanlı `ModTranslationData` şemasıdır:
```json
{
  "TargetModGuid": "00000000-0000-0000-0000-000000000000",
  "TargetModVersion": "0.8.5",
  "LocaleKeyCode": "tr",
  "ShortNotes": "Türkçe Yerelleştirme Yaması",
  "TranslationRows": [
    {
      "DefaultString": "New Game",
      "TranslatedString": "Yeni Oyun",
      "HasBeenTranslated": true
    }
  ]
}
```
- Bu yöntem, **hiçbir harici DLL veya modloader gerektirmeden** %100 yerel ve güvenli bir şekilde Türkçe metinlerin oyuna tanıtılmasını sağlar!

### 3.3. BepInEx 6 IL2CPP + AutoTranslator Seçeneği
- Dinamik/makine çevirisi veya otomatik yakalama istendiğinde:
  - **BepInEx 6 (IL2CPP x64)** gereklidir (BepInEx 5 IL2CPP ile çalışmaz).
  - BepInEx 6, ilk çalıştırmada `GameAssembly.dll` ve metadata v39'dan `BepInEx\interop` içerisine managed stub DLL'leri üretir.
  - `XUnity.AutoTranslator-BepIn-IL2CPP` eklentisi `BepInEx\plugins\` içerisine yerleştirilir ve hazırladığımız `AutoTranslatorConfig.ini` ile Fungus diyalog pencerelerini kancalar.

---

## 4. Kullanım ve Kurulum Talimatları

### Nemurimouto İçin:
1. `c:\Users\Birin\Birin\Projeler\araclar-ve-servisler\unity-turkce-yama-altyapisi\nemurimouto\Kurulum_Nemurimouto_Yama.bat` dosyasını çalıştırın.
2. Betik, `AutoTranslatorConfig.ini` ve başlangıç sözlük dosyasını oyunun `BepInEx\` dizinine yükler.
3. Çevirmenler `I2Languages_Ceviri_Tablosu.csv` veya `_AutoGeneratedTranslations.txt` üzerinden metinleri düzenleyebilir.

### Factorial Omega İçin:
1. `c:\Users\Birin\Birin\Projeler\araclar-ve-servisler\unity-turkce-yama-altyapisi\factorial-omega\Kurulum_FactorialOmega_Yama.bat` dosyasını çalıştırın.
2. Betik:
   - **Metot 1 (Yerel):** `%USERPROFILE%\AppData\LocalLow\IncontinentCell\My Dystopian Robot Girlfriend\ModsTranslations\Translation_tr_BaseGame.json` dosyasını hazırlar.
   - **Metot 2 (AutoTranslator):** `BepInEx 6 IL2CPP` yapılandırmasını ve sözlüğünü oyun klasörüne aktarır.
