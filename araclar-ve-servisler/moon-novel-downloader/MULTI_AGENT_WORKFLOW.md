# 🤖 ÇOKLU AJAN (MULTI-AGENT) MİMARİSİ VE OTONOM ÇALIŞMA PROTOKOLÜ

**Ana Agent (Orchestrator):** Antigravity / Senior System Architect  
**Hedef:** Moon Novel uygulamasını akıcı, zengin kaynaklı, hatasız çevirili ve akıcı TTS okumalı profesyonel bir seviyeye çıkarmak.

---

## 👥 Alt Agent Yapılanması ve Sorumluluk Matrisi

```
                  ┌─────────────────────────────────────┐
                  │       ANA AGENT (ORCHESTRATOR)      │
                  │   Karar, Yönlendirme ve Nihai Onay   │
                  └──────────────────┬──────────────────┘
                                     │
            ┌────────────────────────┴────────────────────────┐
            ▼                                                 ▼
┌─────────────────────────┐                       ┌─────────────────────────┐
│ 1. AGENT (RESEARCH)     │ ◄───────────────────► │ 3. AGENT (COORDINATOR)  │
│ Kaynak, Algoritma, UI   │                       │ Süreklilik & Backlog    │
└───────────┬─────────────┘                       └─────────────┬───────────┘
            │                                                   │
            ▼                                                   │
┌─────────────────────────┐                                     │
│ 5. AGENT (REVIEWER)     │ ◄───────────────────────────────────┤
│ Prompt & Kod Denetimi   │                                     │
└───────────┬─────────────┘                                     │
            │ (Onaylanan Prompt / Filtrelenen Kod)              │
            ▼                                                   │
┌─────────────────────────┐                                     │
│ 2. AGENT (OLLAMA CODER) │                                     │
│ qwen3-coder:30b Modeli  │                                     │
└───────────┬─────────────┘                                     │
            │                                                   │
            ▼                                                   │
┌─────────────────────────┐                                     │
│ 4. AGENT (TESTER)       │ ◄───────────────────────────────────┘
│ Gradle, Lint, APK, OTA  │
└─────────────────────────┘
```

### 1. Agent: Araştırma ve Kaynak Geliştirici (`research_agent`)
- Uygulama için gerekli yeni özellikleri, kullanıcı deneyimi iyileştirmelerini (UX) araştırır.
- Yeni Türkçe ve İngilizce web novel kaynaklarını (NovelBin, BoxNovel, ReadNovelFull vb.) inceler; API/HTML yapısını, slug ve sayfalama kurallarını tespit eder.
- Çeviri doğruluğunu artıracak terim sözlükleri ve akıcı TTS parçalama algoritmaları geliştirir.

### 2. Agent: Ollama Kodlama Uzmanı (`coder_agent`)
- Yerel Windows Ollama sunucusundaki **`qwen3-coder:30b`** (veya `qwen3.8:27b`) modeliyle haberleşir (`scripts/ollama_bridge.py`).
- Kotlin / Android kodlarını doğrudan Ollama modeline yazdırır.

### 3. Agent: Koordinatör ve Süreklilik Yöneticisi (`coordinator_agent`)
- 1, 2, 4 ve 5. agentların eşzamanlı çalışmasını sağlar.
- `AUTONOMOUS_PROGRESS.md` dosyasını her aşamada günceller.
- Bir özellik tamamlandığında durmaksızın sıradaki backlog maddesini devreye sokar.

### 4. Agent: Test ve Doğrulama Uzmanı (`tester_agent`)
- `./gradlew assembleRelease` ve birim testlerini icra eder.
- Derleme ve linter kontrollerini yapar.
- Başarılı APK'yı masaüstüne (`C:\Users\Birin\Desktop\NovelReaderDownloader.apk`), `APK_Cikti` klasörüne kopyalar ve GitHub OTA dalına (`NoteApp:novel-downloader-apk`) push eder.

### 5. Agent: Prompt & Kod Denetim Uzmanı (`reviewer_agent`)
- **İki Kademeli Güvenlik:**
  1. 2. Agent'ın Ollama'ya göndereceği istemi (prompt) inceler, optimize eder ve onaylar.
  2. Ollama'dan dönen kodu güvenlik açıkları, bellek sızıntıları (memory leak) ve Android mimari prensipleri açısından doğrular. Kusursuz ise entegrasyona onay verir.

---

## 🎯 1. Geliştirme Döngüsü Hedefleri:
1. **Yeni İngilizce / Türkçe Kaynak Entegrasyonu (NovelBin):** Dünya çapında en geniş arşive sahip NovelBin scraper adaptörü.
2. **Akıcı TTS & Noktalama / Duraklama İyileştirmesi:** Cümle geçişlerinde doğal nefes payı, kısaltmaların (Dr., Mr., vs.) doğru telaffuzu.
3. **Akıllı Çeviri Önbelleği (Translation Cache):** Çevrilen bölümleri yerel veritabanında saklayıp kotasız, anında açılmasını sağlama.
