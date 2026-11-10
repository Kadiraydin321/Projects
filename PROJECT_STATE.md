# PROJECT_STATE.md

## Genel Durum (Status)
- **Tarih:** 11 Kasım 2026
- **Ortam:** Windows 11 (x64), PowerShell, RTX 5060 Ti 16 GB, i5-13400F, 64 GB RAM
- **Son İşlemler:**
  1. SSH Anahtar Yetkilendirmesi & Uzak Depo Entegrasyonu:
     - Antigravity ED25519 anahtarı (`SHA256:w96XHrMnxM45LEu4HgcxLVeB74INJX8UtrMvpPqCQ4E`) GitHub hesabına bağlandı.
     - `~/.ssh/config` güncellendi, `origin` uzak deposu (`git@github.com:Kadiraydin321/projects.git`) başarıyla doğrulandı.
  2. Not Defterim (NoteApp) Bağımsız Repo Ayrıştırması & APK Sürüm Kilidi:
     - Harici NoteApp reposu yerine `not-uygulamalari/not-defterim` tüm kaynak kodlarıyla monorepo sistemine katıldı.
     - NoteApp için bağımsız `project/not-defterim` dalı tahsis edildi.
     - APK (`NoteApp-release.apk`) doğrudan proje kök dizinine yerleştirildi; SHA256 ve sürüm bilgisi (`version.json`) ile kilitlendi.
     - Go motoru (`getAppVersion()`) ve Gradle (`exportApkToRoot`) dinamik sürüm mekanizması bağlandı.
  3. Monorepo Çoklu Şube (Multi-Branch) & Agent Yönergesi Mimarisi:
     - `main` dalı sadece merkezi depolama, yedekleme ve orkestrasyon havuzu olarak yapılandırıldı.
     - `main` README.md başına tüm yapay zeka ajanlarını bağlayan ZORUNLU AJAN DİREKTİFİ (asla main'de geliştirme yapmama, her proje için ayrı branch açma zorunluluğu) işlendi.
     - Tüm bağımsız projeler (`project/not-defterim`, `project/yerel-ag-tarayici`, `project/byte-rescue`, `project/omni-backup-transfer`, `project/screen-translator`, `project/moon-novel-downloader`, `project/roborock-control-hub`, `project/sistem-yonetimi`, `project/game-modding-ghida`) kendi izole dallarına ve Agent-Ready dokümantasyonlarına kavuşturuldu.
- **Ortam:** Windows 11 (x64), PowerShell, RTX 5060 Ti 16 GB, i5-13400F, 64 GB RAM
- **Son İşlemler:**
  1. Rust Motorlu Yerel Ağ & Sunucu Yönetim Konsolu Geliştirildi (yerel-ag-tarayici-rust):
     - Gerçek yerel IP netleştirildi: 192.168.1.6 (Kaspersky VPN 172.21.x sanal arayüzü filtrelendi, gerçek LAN Ethernet 192.168.1.0/24 kilitlendi).
     - Sunucu sekmesine anlık '🔄 Sunucuları Yenile' butonu eklendi; yerel sunucu başlatıldığında hem arayüzde hem de ağ listesinde anında sunucu olarak işaretlenmesi sağlandı.
     - Sunucu Başlatma Paneline özel IP (Host: 0.0.0.0, 192.168.1.6 veya özel IP) girme yeteneği entegre edildi.
  2. ECC ve Graphify Protokolü Tüm İstekler İçin Zorunlu Kılındı (Antigravity & Hermes):
     - Global ve yerel kural dosyalarına (GEMINI.md, AGENTS.md, Hermes AGENTS.md) ECC (Plan-Before-Build, TDD %80+, code-reviewer/security-reviewer) ve Graphify bilgi grafiği (graphify query/path/update) kuralları kalıcı olarak işlendi.
  3. affaan-m/ECC Full Profil Dağıtımı Tamamlandı:
     - Antigravity ortamına 371 beceri, 125 kural, 71 alt ajan ve 85 iş akışı; Hermes ortamına 137 beceri ve 122 kural kuruldu.
     - 58 adet dil tablosu tarandı ve oyunda lisans bildirimleri harici 0 (sıfır) İngilizce metin kaldığı doğrulandı.
  2. D Diski Kurulum & Entegrasyon Eşitlemesi:
     - C'deki mükemmel yama dosyaları D'ye aktarıldı, data.i indeksi 3.881 harici dosya ile sorunsuz güncellendi.
  3. Kayıp Save Dosyası Kurtarıldı (SaveData1 SteamID Eşitlemesi):
     - Oyunun yeni Steam emülatör ID'si (76561198866384432) ile eski save dosyasındaki ID eşitlendi, 1. Yuva ilerlemesi geri getirildi.
  4. Reloaded-II Modlu Başlatıcı & BetterDescriptions Yerelleştirmesi:
     - Modlu başlatmada Türkçe yamayı bozan GBFR.UI.BetterDescriptions tespit edildi.
     - En güncel yerel model olan Qwen 3.8 (eriktonon/qwen3.8-uncensored:latest) ile 92 özel yetenek/mühür açıklaması Türkçeleştirildi.
     - 7.070 satır oyunun asıl Türkçe tablolarıyla birleştirilerek mod %100 Türkçe yapıldı ve Reloaded-II'de yeniden aktifleştirildi.

  5. GBFR İpuçları (Tips) Başlık Çakışması & Ana Hikaye (Story) Metin Kutusu Sığdırma:
     - BetterDescriptions modundaki text_tips.json ve text_tips_tag.json tablolarındaki satır kayması (index offset: 41. satırdan sonra başlık alanlarına çok satırlı açıklamaların binmesi) giderildi: moddaki bozuk json dosyaları devre dışı bırakıldı (.disabled) ve Reloaded-II geçici önbelleği (temp) temizlenerek oyunun doğrudan 533 satırlık hatasız Türkçe text_tips.msg tablosunu kullanması sağlandı.
     - text_story.msg msgpack ile açıldı; Ana Hikaye ve bölüm açıklamalarındaki (özellikle uzunluğu > 60 olan tek satırlı metinler dahil 389 kayıt) kelime sınırlarından (word boundary) maksimum 62 karakterde bir \n eklenerek UI metin kutularına tam sığması sağlandı. Orijinal tablo yedek\text_story.msg.bak olarak yedeklendi, güncellenmiş dosya kaydedildi ve TR yama diziniyle eşitlendi.

  6. Granblue Fantasy: Relink - Anlatim Bozukluklari, Kaptan Adi Hizalamalari & 144 FPS Kilit Acimi:
     - BetterDescriptions Modunun Ingilizce Override Cakismasi Giderildi: Reloaded-II altindaki text.json ve text_ui.json dosyalari .disabled yapildi; temp onbellegi temizlendi.
     - Saha Notlari (Field Notes): text_note_tag.msg icindeki 47 kaptan enjeksiyonunun ofsetleri Turkcelestirildi.
     - Kader Hikayeleri (Fate Episodes): text_fate_episode_tag.msg icindeki 60 girdi ve 91 kaptan adi enjeksiyonu Turkceye uyarlandi; bolunmus kelime (split words) 53'ten 0'a indirildi.
     - Envanter, Esya ve Silah Duzeltmeleri: Fortitude Shard -> Kuvvet Parcacigi, Cobblestone -> Parke Tasi, Whorlshroom -> Girdap Mantari, Tempestone -> Firtina Tasi, Landbeast Claw -> Kara Canavari Pencesi, Prism Chip -> Prizma Kirintisi, Rainbow Prism -> Gokkusagi Prizmasi, Rafale Coin -> Rafale Parasi, Little Witch Scepter -> Kucuk Cadi Asasi, Flintspike -> Cakmaktasi Dikeni, Egoism -> Egoizm.
     - 144+ FPS Sinir Kaldirma: GBFRelinkFix (v1.1.5) Reloaded-II mod listesine ve bagimsiz (winmm.dll) olarak hem D hem C oyun dizinlerine kuruldu; 144+ FPS tam desteklendi.
     - Her iki oyun klasorunde NEXUS_GBFR_KURULUM.ps1 calistirildi (3.885 harici dosya guncellendi), Authenticode sertifikasiyla imzalandi.

  7. Granblue Fantasy: Relink - Genel UI Kutu Taşmalarının Sıfırlanması, Otomatik \n Sarmaları & Silah/Düşman/Karakter Kartı Düzenlemeleri:
     - Oyun motorunun kutularda otomatik word-wrap yapmaması nedeniyle ekrandan taşan tüm uzun metinlere merkezi Python betiği (ix_box_overflows_and_weapons.py) ile tam kutu geometrisi uygulandı:
     - Mürettebat Kartları (Fraux & 28 Karakter): TXT_PROF_PL*_LOAD tek satırlık devasa yapıdan kurtarılıp width=50 (orijinal UI kutu genişliği) ile sarıldı; Fraux tam 4 satır ve maksimum 46 karakter olarak kutu içine kusursuz hizalandı.
     - Saha Notları - Düşmanlar (Quakadile & 93 Canavar): 54 karakter yerine width=74 ile sarıldı; Quakadile tam 4 satır yapılarak yukarı taşıp 'Zayıf Element: Rüzgâr' başlığı ile çakışması engellendi.
     - Saha Notları - Silahlar: TXT_WEP_EXPLAIN_PL0400_01 (Küçük Cadı Asası) edebi 4 satıra dönüştürüldü, sondaki sarkan \n. temizlendi; TXT_WEP_NAME_PL0500_01 'Dreys' -> 'Dreyse' düzeltildi; tüm 221 silah width=70 ile sarıldı.
     - Envanter & Eşyalar: Gökyüzü Haritası Parçası (TXT_ITEM_INFO_70_0003_01/02) ve 309 eşya açıklaması width=70 ile sarıldı.
     - Yetenekler, Eğitim ve İpuçları: Tüm 204 beceri/yetenek açıklaması (TXT_SKILL_*, TXT_ABIF_*) width=68, 55 eğitim metni (	ext_tutorial.msg) width=70, 28 ipucu (	ext_tips.msg) width=68 ile kutulara hizalandı.
     - Her iki oyun dizininde (D:\ ve C:\) data.i indeksleri hatasız inşa edildi; %100 CPU çalışıldı, GPU (RTX 5060 Ti) oyuna özel tamamen serbest bırakıldı.

  8. Granblue Fantasy: Relink - Tüm Senaryo Tablolarının %100 Çevirisi ve Entegrasyonu (42/42 Dosya):
     - Kullanıcının kesin talimatı doğrultusunda tüm senaryo dosyaları (Öncelik 1, 2, 3, Fate Episodes, Post-Game ve Yan Görevler) eksiksiz Türkçeleştirildi.
     - Toplam 19.879 satır çeviri önbelleği oluşturuldu; 42 adet text_scenario_*.msg ve text_scenario_*_tag.msg dosyası (toplam 84 dosya) 68 karakterlik kutu taşması koruması (word-wrap) ve etiket bütünlüğü ile paketlendi.
     - Hem D: (D:\Games\Granblue Fantasy Relink\data\system\table\scenario\en\) hem de C: (C:\Games\Granblue Fantasy - Relink\data\system\table\scenario\en\) sürücülerine eksiksiz senkronize edildi (dizindeki toplam dosya sayısı 106).
     - Her iki oyun dizininde NEXUS_GBFR_KURULUM.ps1 çalıştırılarak data.i indeks kaydı 3.901'den 3.969 harici kayda çıkarıldı.
     - Kurulum betikleri 18BDDE60A34E2F5E2AF49A9420F71C55445DE6F4 Authenticode sertifikası ile imzalanıp doğrulandı.

---

## Otonom Beceri, Araç ve İş Akışı Entegrasyonu (5 Repo)
1. **Entegre Edilen Repolar:**
   - `andrej-karpathy-skills`: `karpathy-guidelines` (saf LLM kılavuzları).
   - `superpowers`: 15 çekirdek mühendislik ve orkestrasyon becerisi (`subagent-driven-development`, `test-driven-development`, `systematic-debugging` vb.).
   - `mattpocock/skills`: 39 TypeScript & mimari becerisi (`grill-me`, `to-spec`, `to-tickets`, `codebase-design`, `implement` vb.).
   - `ui-ux-pro-max-skill`: 7 çekirdek tasarım zekası becerisi, `uipro` CLI motoru, Python BM25 arama motoru ve slayt jeneratörleri.
   - `everything-claude-code`: 10 kritik mimari/güvenlik becerisi, `ecc-memory-mcp` MCP sunucusu (Claude Desktop + Hermes), `ecc` küresel CLI aracı.

2. **Dağıtım İstatistikleri:**
   - Antigravity Global: `C:\Users\Birin\.gemini\config\skills\` (105 beceri)
   - Antigravity Workspace: `c:\Users\Birin\Birin\Projeler\.agents\skills\` (371 beceri, 125 kural dosyası)
   - Hermes Global: `C:\Users\Birin\.hermes\skills\` (137 beceri, 122 kural dosyası)
   - Hermes Workspace: `C:\Users\Birin\hermes-workspace\.hermes\skills\` (137 beceri, 122 kural dosyası)
   - Hermes Toplam Aktif: **188+ Beceri** (builtin + ECC tam profil).

3. **CLI ve MCP Durumu:**
   - `uipro` (v2.5.0): Global Node.js CLI hazır.
   - `ecc`: Global Node.js CLI ve durum denetçisi hazır.
   - `ecc-memory-mcp`: Stdio tabanlı JSON-RPC 2.0 MCP sunucusu aktif (4 araç: `memory_save`, `memory_search`, `memory_read`, `memory_doctor`).
   - Doğrulama: 12/12 E2E Smoke Test Başarılı (PASS).

  5. GBFR İpuçları (Tips) Başlık Çakışması & Ana Hikaye (Story) Metin Kutusu Sığdırma:
     - BetterDescriptions modundaki text_tips.json ve text_tips_tag.json tablolarındaki satır kayması (index offset: 41. satırdan sonra başlık alanlarına çok satırlı açıklamaların binmesi) giderildi: moddaki bozuk json dosyaları devre dışı bırakıldı (.disabled) ve Reloaded-II geçici önbelleği (temp) temizlenerek oyunun doğrudan 533 satırlık hatasız Türkçe text_tips.msg tablosunu kullanması sağlandı.
     - text_story.msg msgpack ile açıldı; Ana Hikaye ve bölüm açıklamalarındaki (özellikle uzunluğu > 60 olan tek satırlı metinler dahil 389 kayıt) kelime sınırlarından (word boundary) maksimum 62 karakterde bir \n eklenerek UI metin kutularına tam sığması sağlandı. Orijinal tablo yedek\text_story.msg.bak olarak yedeklendi, güncellenmiş dosya kaydedildi ve TR yama diziniyle eşitlendi.

---

## Hermes Agent Orkestrasyon Mimarisi
1. **Ana Model (Orkestra Şefi):**
   - Sağlayıcı: `anthropic`
   - Model: `claude-sonnet-5-5`
   - Yapılandırma Dosyası: `C:\Users\Birin\AppData\Local\hermes\config.yaml` (Yedek: `config.yaml.bak_20261105_124958`)
   - Kimlik Doğrulama: `C:\Users\Birin\AppData\Local\hermes\.env` (Yedek: `.env.bak_20261105_125010`) -> Satır 571 (`ANTHROPIC_API_KEY=`)

2. **İşçi Modeller (Yerel Alt Agent - Delegation):**
   - Model: `gemma4-64k` (65536 sabit context length, q8_0 KV Cache)
   - Sağlayıcı: `ollama` (`http://localhost:11434/v1`)
   - Paralel Limit: `max_concurrent_children: 2` (GPU VRAM korumalı)
   - Hiyerarşi Sınırı: `max_spawn_depth: 1`
   - Tur Limiti: `max_iterations: 40`
   - Zaman Aşımı: `HERMES_API_TIMEOUT: 1800`

3. **Ollama Ortam Değişkenleri (Kalıcı - User Scope):**
   - `OLLAMA_NUM_PARALLEL = 2`
   - `OLLAMA_FLASH_ATTENTION = 1`
   - `OLLAMA_KV_CACHE_TYPE = q8_0`
   - `OLLAMA_KEEP_ALIVE = 24h`

4. **Çalışma Alanı ve Başlatıcılar:**
   - Dizin: `C:\Users\Birin\hermes-workspace`
   - Kurallar: `C:\Users\Birin\hermes-workspace\AGENTS.md`
   - Plan Takip: `C:\Users\Birin\hermes-workspace\docs\PLAN.md`
   - Başlatıcılar: `C:\Users\Birin\hermes-workspace\start-hermes.ps1` ve `start-hermes.bat`

  5. GBFR İpuçları (Tips) Başlık Çakışması & Ana Hikaye (Story) Metin Kutusu Sığdırma:
     - BetterDescriptions modundaki text_tips.json ve text_tips_tag.json tablolarındaki satır kayması (index offset: 41. satırdan sonra başlık alanlarına çok satırlı açıklamaların binmesi) giderildi: moddaki bozuk json dosyaları devre dışı bırakıldı (.disabled) ve Reloaded-II geçici önbelleği (temp) temizlenerek oyunun doğrudan 533 satırlık hatasız Türkçe text_tips.msg tablosunu kullanması sağlandı.
     - text_story.msg msgpack ile açıldı; Ana Hikaye ve bölüm açıklamalarındaki (özellikle uzunluğu > 60 olan tek satırlı metinler dahil 389 kayıt) kelime sınırlarından (word boundary) maksimum 62 karakterde bir \n eklenerek UI metin kutularına tam sığması sağlandı. Orijinal tablo yedek\text_story.msg.bak olarak yedeklendi, güncellenmiş dosya kaydedildi ve TR yama diziniyle eşitlendi.

---

## Gerçekleştirilen İşlemler ve Bileşenler
1. **Claude Desktop Kurulumu:**
   - **Paket:** `Anthropic.Claude`
   - **Sürüm:** `2.42304.2`
   - **Yayımcı:** Anthropic PBC
   - **Yükleyici:** Windows Package Manager (`winget`)
   - **Durum:** Başarıyla yüklendi ve doğrulandı.

2. **Dizin ve Dosya Yapısı:**
   - **Yürütülebilir Dosya:** `C:\Users\Birin\AppData\Local\AnthropicClaude\claude.exe`
   - **Başlat Menüsü Kısayolu:** `C:\Users\Birin\AppData\Roaming\Microsoft\Windows\Start Menu\Programs\Anthropic\Claude.lnk`
   - **Yapılandırma Dosyası:** `C:\Users\Birin\AppData\Roaming\Claude\claude_desktop_config.json` (MCP sunucu altyapısına hazır şekilde oluşturuldu).

3. **Güvenlik & Bütünlük:**
   - SHA256 ve dijital imza doğrulaması: Geçerli (Valid).
   - Yetki Seviyesi: Kullanıcı düzeyi (Non-elevated, UAC gereksinimi yok).

  5. GBFR İpuçları (Tips) Başlık Çakışması & Ana Hikaye (Story) Metin Kutusu Sığdırma:
     - BetterDescriptions modundaki text_tips.json ve text_tips_tag.json tablolarındaki satır kayması (index offset: 41. satırdan sonra başlık alanlarına çok satırlı açıklamaların binmesi) giderildi: moddaki bozuk json dosyaları devre dışı bırakıldı (.disabled) ve Reloaded-II geçici önbelleği (temp) temizlenerek oyunun doğrudan 533 satırlık hatasız Türkçe text_tips.msg tablosunu kullanması sağlandı.
     - text_story.msg msgpack ile açıldı; Ana Hikaye ve bölüm açıklamalarındaki (özellikle uzunluğu > 60 olan tek satırlı metinler dahil 389 kayıt) kelime sınırlarından (word boundary) maksimum 62 karakterde bir \n eklenerek UI metin kutularına tam sığması sağlandı. Orijinal tablo yedek\text_story.msg.bak olarak yedeklendi, güncellenmiş dosya kaydedildi ve TR yama diziniyle eşitlendi.

---

## Çoklu Ajan Yönetimi & Yerel/Ücretsiz Model Orkestrasyonu
1. **Yönetilen Araçlar ve Yerel Yönlendirmeler:**
   - **Claude Code (`claude` v2.1.318):** `npm -g @anthropic-ai/claude-code` ile kuruldu. `litellm[proxy]` (v1.83.9) ile Anthropic API istekleri yerel Ollama modeline (`qwen2.5-coder:14b`) köprülendi (`ANTHROPIC_BASE_URL=http://127.0.0.1:8000`).
   - **Qwen Code (`qwen` v0.26.7):** `~/.qwen/settings.json` soket hatası düzeltildi (`http://127.0.0.1:11434/v1`), `qwen2.5-coder:14b` varsayılan model yapıldı.
   - **Hermes Agent (`hermes` v0.22.5):** `config.yaml` ana modeli %100 yerel ve ücretsiz Ollama (`qwen2.5-coder:14b`, `http://127.0.0.1:11434/v1`) olarak yapılandırıldı.

2. **VRAM Mutex ve Orkestrasyon Altyapısı:**
   - Yönetici Betik: `c:\Users\Birin\Birin\Projeler\baslaticilar\manage-agents.ps1` ve `C:\Users\Birin\hermes-workspace\manage-agents.ps1`
   - Kısayollar: `start-qwen.ps1`, `start-hermes-local.ps1`, `start-claude-local.ps1`
   - VRAM Mutex Kuralı: Model geçişlerinde aktif olmayan modeller `ollama stop` ile tahliye edilerek RTX 5060 Ti 16 GB VRAM'in sistem RAM'ine taşması kesin olarak engellenir.

3. **Katı Test ve Kodlama Doğrulama Sonuçları (`tests_rigorous/`):**
   - **Qwen Code Testi:** `ThreadSafeTTLCache` (O(1) LRU, RLock, TTL süresi, 10-thread eşzamanlı yarışma, callback doğrulaması).
   - **Hermes Agent Testi:** `AsyncTaskQueue` (Deadlock korumalı worker, DLQ yönlendirmesi, üstel geri çekilme, 1000 görev bellek sızıntı denetimi).
   - **Claude Code Köprü Testi:** `RFC 7807 API` (Idempotency-Key koruması, 8-thread eşzamanlılık kilidi, SQL enjeksiyon koruması, LiteLLM Anthropic şema doğrulaması).
   - **Sonuç:** 25/25 somut birim testi eksiksiz geçti (`pytest 25 passed in 1.04s`).

  5. GBFR İpuçları (Tips) Başlık Çakışması & Ana Hikaye (Story) Metin Kutusu Sığdırma:
     - BetterDescriptions modundaki text_tips.json ve text_tips_tag.json tablolarındaki satır kayması (index offset: 41. satırdan sonra başlık alanlarına çok satırlı açıklamaların binmesi) giderildi: moddaki bozuk json dosyaları devre dışı bırakıldı (.disabled) ve Reloaded-II geçici önbelleği (temp) temizlenerek oyunun doğrudan 533 satırlık hatasız Türkçe text_tips.msg tablosunu kullanması sağlandı.
     - text_story.msg msgpack ile açıldı; Ana Hikaye ve bölüm açıklamalarındaki (özellikle uzunluğu > 60 olan tek satırlı metinler dahil 389 kayıt) kelime sınırlarından (word boundary) maksimum 62 karakterde bir \n eklenerek UI metin kutularına tam sığması sağlandı. Orijinal tablo yedek\text_story.msg.bak olarak yedeklendi, güncellenmiş dosya kaydedildi ve TR yama diziniyle eşitlendi.

---

## Graphify (Graphify-Labs) Çoklu Ajan Bilgi Grafı Entegrasyonu
1. **Kurulum ve Paket:**
   - Paket: `graphifyy` (v0.9.102) `uv tool install --with mcp graphifyy` ile kuruldu.
   - Bağımlılıklar: 25+ Tree-Sitter grameri (`tree-sitter>=0.25`), `networkx`, `numpy`, `rapidfuzz`, `mcp==2.3.0`.
   - Giriş Noktaları: `graphify.exe` ve `graphify-mcp.exe` (Sistem PATH'inde aktif).

2. **Ajan Dağıtımı:**
   - **Antigravity:** Global `C:\Users\Birin\.gemini\config\skills\graphify\`, Workspace `.agents/skills/graphify/`, Kural `.agents/rules/graphify.md`, İş Akışı `.agents/workflows/graphify.md`.
   - **Hermes Agent:** Global `C:\Users\Birin\.hermes\skills\graphify\`, Workspace `C:\Users\Birin\hermes-workspace\.hermes\skills\graphify\`.
   - **Claude Code:** `C:\Users\Birin\.claude\skills\graphify\` ve Claude Desktop MCP (`claude_desktop_config.json`).
   - **Qwen Code / Ortak:** `AGENTS.md` kılavuzuna `/graphify` kuralları işlendi.
   - **MCP Servisi:** `hermes mcp list` -> `graphify` (10 araç: `query_graph`, `get_node`, `god_nodes`, `shortest_path` vb.) `✓ enabled` (2606ms PASS).

3. **Canlı Kod Tabanı Graf Sonuçları (`graphify-out/`):**
   - Taranan Dosya: 1.102 kod dosyası (340 desteklenmeyen dosya türü atlandı)
   - Graf Metrikleri: **12.746 Düğüm**, **22.596 Kenar**, **762 Topluluk** (`graph.json` 14.62 MB)
   - Doğrulama: `graphify query "cache"`, `graphify query "queue"`, `graphify god-nodes` ve BFS/DFS canlı sorgulaması doğrulandı.

## Not Defterim Masaüstü UI İyileştirmesi (2026-11-05)
- `desktop-native/ui/style.css` içinde kenar çubuğu ve not listesi hiyerarşisi, tema uyumlu seçili not durumu, editör araç çubukları ve boş durum görünümleri iyileştirildi.
- Sıralama ve çoklu-seçim düğmelerine eksik olan görsel stiller eklendi; HTML/IPC davranışına dokunulmadı.
- Dosya tabanlı tarayıcı önizlemesinde boş durumlar ve kontrol stilleri doğrulandı. `cargo test --manifest-path desktop-native\Cargo.toml`, ortamda MSVC `link.exe` bulunmadığı için çalıştırılamadı.

## GitHub Copilot Kaldırma & Temizlik Operasyonu (2026-11-07)
- GitHub Copilot CLI extension ve ekosistem kalıntıları tamamen temizlendi.
- `%LOCALAPPDATA%\copilot`, `%LOCALAPPDATA%\github-copilot*`, `%USERPROFILE%\.copilot` dizinleri ve önbellekleri silindi.
- Hermes Agent (`config.yaml`) içerisindeki `github-copilot` eklentisi kaldırıldı.
- PowerShell profili (`$PROFILE`), kullanıcı PATH değişkenleri (`GitHubCopilotCLI`, `copilot-shim`) ve yerel başlatıcılar (`baslaticilar/start-copilot-remote.*`) temizlendi.

## İtch.io Oyunları Yerel Türkçe Yama ve Yerelleştirme Entegrasyonu (2026-11-06)
- **Hedef Konum:** `C:\Users\Birin\AppData\Roaming\itch\apps\`
- **Kural & Güvenlik:** Kullanıcı talimatı gereği tüm işlemler ve yamalar tamamen YERELDE tutuldu; GitHub'a hiçbir push/gönderim yapılmadı.
- **1. A Simple Life with My Unobtrusive Sister (`demo 2` - RPG Maker MZ):**
  - `Drill_SceneEmpty.js` içindeki `buttons` listesine `'Türkçe'` butonu ve `ConfigManager.language = 14` eklendi.
  - `shiroin_multilingualSupport.js` motoruna TR (14) dili, FusionPixel Latin fontu ve Windows sistem dili oto-tespiti (`prefixes: ["tr"]`) eklendi.
  - Açılış dili 14 yapıldı, eski `config.rmmzsave` temizlendi.
  - **Diyalog Yerelleştirmesi:** `bin\www\data\TR\` altındaki 19 dosyada yer alan **11.794 adet harita ve hikaye diyaloğu** (`MapEventDialogueTR001` - `TR054`, `MapCommonEventDialogueTR`) RPG Maker etiket korumalı olarak eksiksiz Türkçe'ye çevrildi.
- **2. Path of Desire (`path-of-desire-cursed-chakra` - Ren'Py Visual Novel):**
  - `00_turkish_patch.rpy` init lifecycle hatası giderildi, Ren'Py derleyicisi ile bytecode (`00_turkish_patch.rpyc`) derlendi.
  - Ana menü ekranına doğrudan `🌐 Dil: Türkçe` seçim butonu (`main_menu_language_overlay`) eklendi.
  - Varsayılan dil açılışta doğrudan Türkçe yapıldı.
- **3. Nemurimouto (`nemurimouto\win_c` - Unity Mono LTS):**
  - Resmi BepInEx 5.4.23.6 x64 ve XUnity.AutoTranslator 5.6.3.1 kurularak `winhttp.dll` kancası aktif edildi.
  - **Diyalog Yerelleştirmesi:** `resources.assets` içindeki 274 diyalog satırı ve Prologue/Prologue 02 açılış hikaye konuşmaları dahil toplam **533 aktif diyalog girdisi** `_AutoGeneratedTranslations.txt` ve `_PreTranslations.txt` sözlüklerine işlendi; canlı yenileme (`ReloadTranslationsOnFileChange=True`) aktif edildi.
- **4. My Dystopian Robot Girlfriend (`factorial-omega` - Unity 6 IL2CPP):**
  - Oyunun resmi modlama kodu olan `tr-TR` standartlaştırıldı (`Translation_tr-TR_BaseGame.json`).
- **Yerel Araç & Betik Konumu:** `c:\Users\Birin\Birin\Projeler\araclar-ve-servisler\unity-turkce-yama-altyapisi\`
- **5. GhIDA (Ghidra Decompiler for IDA Pro Entegrasyonu):**
  - **Kurulum & Başlatıcı Betiği:** `c:\Users\Birin\Birin\Projeler\GhIDA\install_ghida.ps1`
    - Otomatik ve etkileşimli IDA Pro ve Ghidra kurulum tespiti (Ortam değişkenleri, Registry, yaygın dizinler).
    - `plugins/` dizinine `ghida.py` ve `ghida_plugin/` entegrasyonu.
    - `$env:TEMP\ghida_config.json` dosyasını BOM-suz UTF-8 formatında otomatik üretme ve Ghidra yolunu bağlama.
    - `-Uninstall` parametresi ile temiz kaldırma yeteneği.
  - **Teşhis & Ortam Kontrol Betiği:** `c:\Users\Birin\Birin\Projeler\GhIDA\check_ghida_env.py`
    - Python, kütüphaneler (`requests`, `pygments`), Java 17+, GhIDA yapılandırması ve eklenti varlığını doğrulama.
    - E2E kurulum ve kaldırma testleri hatasız tamamlandı.
- **6. REA (Reverse Engineer Anything) CLI Başlatıcısı:**
  - **Başlatıcı Betiği:** `c:\Users\Birin\Birin\Projeler\run_rea.ps1`
    - Parametrik ve etkileşimli kullanım (Sürükle-bırak desteği ile otomatik tırnak/boşluk temizleme).
    - 5 Çalışma Modu: `Overview` (Genel Analiz), `Deep` (Derin Dekompilasyon/Fonksiyon Çıkarma), `Electron` (JS/ASAR AST Rekonstrüksiyonu), `Strings` (Dize/Regex Arama), `Doctor` (Sistem Hazırlık Kontrolü).
    - Otomatik Çıktı Yönetimi: `./rea-output` altında zaman damgalı Markdown/JSON/YAML raporlama.
    - Akıllı Teşhis: Ghidra/IDA eksikliğinde `inspect-pe-imports` ve alternatif PE analiz komutlarını rehberlik olarak sunma.
    - Doğrulama: PowerShell AST Parse Testi ve E2E Doctor/Electron/Overview testleri başarıyla tamamlandı (PASS).
- **7. Visual Studio 2022 & Çok Dilli Geliştirme Ortamı (C++, C#, Web API, Python, Go Hibrit):**
  - **.NET SDK Entegrasyonu:** En güncel .NET 9.0.320 SDK (`C:\Users\Birin\AppData\Local\Microsoft\dotnet`) sisteme kuruldu ve `DOTNET_ROOT` ile kullanıcı PATH'ine kalıcı olarak eklendi.
  - **Masaüstü Başlatıcısı & Yükleyici:** `C:\Users\Birin\Desktop\VS2022_Kurulum.bat` ve `vs_community.exe` masaüstüne yerleştirildi; mutlak yol ve hata teşhisiyle güçlendirildi.
  - **İş Yükleri:** `NativeDesktop` (MSVC v143, Windows SDK, CMake), `ManagedDesktop` (.NET 8/9, WPF), `NetWeb` (ASP.NET Core), `Python` (Python araçları, karma debug).
  - **Go Dili:** Sistemdeki Go v1.27.3 x64 korundu; VS Code için `golang.go`, `ms-vscode.cpptools`, `ms-dotnettools.csdevkit` eklentileri kuruldu.
  - **Dokümantasyon:** `c:\Users\Birin\Birin\Projeler\VS2022_COK_DILLI_GELISTIRME_ORTAMI_REHBERI.md` oluşturuldu.


## Granblue Fantasy: Relink Türkçe Yerelleştirme, Mod Entegrasyonu & UI Onarımı (2026-11-08)
- **Hedef Konumlar:** `D:\Games\Granblue Fantasy Relink\` ve `C:\Games\Granblue Fantasy - Relink\`
- **Save Dosyası Kurtarma:** Kullanıcının eski 23 MB'lık ilerleme kayıt dosyası (`SaveData1.dat`), SteamID64 başlık hizalaması yapılarak aktif emülatör ID'si (`76561198866384432`) ile eşleştirildi ve başarıyla yüklendi.
- **BetterDescriptions Mod Çakışması Giderildi:**
  - Mod klasöründeki yedek klasör çakışması (`GBFR.UI.BetterDescriptions.YEDEK`) temizlendi.
  - Modun v1.1 sürümünden kalan hatalı ve satır kayması (index offset) içeren `text_tips.json` ve `text_tips_tag.json` dosyaları devre dışı bırakıldı (`.disabled`).
  - İpuçları menüsündeki butonların ve başlıkların üst üste binme hatası tamamen çözüldü; oyun temiz 533 satırlık Türkçe `text_tips.msg` tablosuna bağlandı.
- **Ana Hikâye Metin Kutusu Taşması (Word-Wrap) Çözüldü:**
  - `text_story.msg` içerisindeki tüm 887 satır taranarak, sağ parşömen çerçevesinden taşan 389 satırlık hikaye özeti kelime bütünlüğü korunarak (`word boundary`) 60-62 karakter sınırından `\n` satır sonları ile sarıldı.
- **Eksik Saha Notları ve Envanter Tablolarının Yerel LLM ile Çevirisi:**
  - Nexus yamasında hiç bulunmayan `text_note.msg` (1.233 satır - Karakter profilleri, Boss/Canavar bilgileri, Silah hikayeleri, Hazine açıklamaları, Terimler Sözlüğü) ve `text.msg` (4.455 satır - Beceriler, Silahlar, Eşyalar ve Envanter) tabloları tespit edildi.
  - **4X Turbo Paralel Çeviri Motoru:** Yerel Ollama üzerindeki `eriktonon/qwen3.8-uncensored:latest` modeli, RTX 5060 Ti 16 GB üzerinde 4 eşzamanlı worker ile çalıştırılarak dakikada ~200-400 metin hızıyla sıfır maliyetle eksiksiz Türkçe'ye çevrildi.
  - Msgpack ile binary olarak paketlenerek her iki oyun dizinine (`D:` ve `C:`) `data\system\table\text\en\` altına yerleştirildi.
  - `NEXUS_GBFR_KURULUM.ps1` çalıştırılarak oyunun ana arşiv indeksi (`data.i`) 3.881'den **3.885 harici kayda** güncellendi.
- **Tüm Senaryo Dosyalarının (42/42) Çevrilmesi ve Entegrasyonu:**
  - 42 senaryo dosyasının tamamı (Öncelik 1, 2, 3, Fate Episodes, Post-game, Yan Görevler) taranarak çevrildi. Toplam 19.879 satır önbellek kaydı oluşturuldu.
  - UI kutularında metin taşması yaşanmaması için 68 karakterlik otomatik word-wrap ve etiket koruma algoritmaları uygulandı.
  - 42 adet `text_scenario_*.msg` ve 42 adet `text_scenario_*_tag.msg` hem `D:\Games\Granblue Fantasy Relink\data\system\table\scenario\en\` hem de `C:\Games\Granblue Fantasy - Relink\data\system\table\scenario\en\` dizinlerine yazıldı.
  - `NEXUS_GBFR_KURULUM.ps1` çalıştırılarak `data.i` indeks kaydı 3.901'den **3.969 harici kayda** çıkarıldı ve güncellendi. Kurulum scriptleri Authenticode ile imzalandı.
