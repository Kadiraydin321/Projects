# PROJECT_STATE.md

## Genel Durum (Status)
- **Tarih:** 06 Kasım 2026
- **Ortam:** Windows 11 (x64), PowerShell, RTX 5060 Ti 16 GB, i5-13400F, 64 GB RAM
- **Son İşlemler:**
  1. Claude Desktop Kurulumu ve Çevre Yapılandırması (Tamamlandı).
  2. Hermes Agent (Nous Research) Orkestrasyon Yapısı Kurulumu (Tamamlandı).
  3. 5 GitHub Reposu Beceri, Araç ve MCP Entegrasyonu (Tamamlandı - Antigravity + Hermes Agent).
  4. REA (Reverse Engineer Anything) CLI Başlatıcısı Geliştirildi (Tamamlandı - run_rea.ps1).

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
   - Antigravity Workspace: `c:\Users\Birin\Birin\Projeler\.agents\skills\` (74 beceri)
   - Hermes Global: `C:\Users\Birin\.hermes\skills\` (74 beceri)
   - Hermes Workspace: `C:\Users\Birin\hermes-workspace\.hermes\skills\` (74 beceri)
   - Hermes Toplam Aktif: **128 Beceri** (51 builtin + 77 local).

3. **CLI ve MCP Durumu:**
   - `uipro` (v2.5.0): Global Node.js CLI hazır.
   - `ecc`: Global Node.js CLI ve durum denetçisi hazır.
   - `ecc-memory-mcp`: Stdio tabanlı JSON-RPC 2.0 MCP sunucusu aktif (4 araç: `memory_save`, `memory_search`, `memory_read`, `memory_doctor`).
   - Doğrulama: 12/12 E2E Smoke Test Başarılı (PASS).

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

## GitHub Copilot CLI /remote Kılavuzu ve Başlatıcı Sistemi (2026-11-05)
- `docs/copilot-cli-remote-rehberi.md`: GitHub Copilot CLI `/remote` ve `copilot --remote` uzaktan kontrol protokolü hazırlandı (Node.js 22+, `/login`, Mission Control, QR kod `Ctrl+O`, `/keep-alive`, telefon/web üzerinden onay ve yönlendirme akışı).
- `baslaticilar/start-copilot-remote.ps1`: Copilot CLI `/remote` modu için akıllı PowerShell başlatıcısı geliştirildi.
  - Git deposu (`git rev-parse`) ve remote origin (`git config --get remote.origin.url`) akıllı doğrulaması eklendi.
  - `--connect <session-id>`, `--trust-folder`, `--model` ve serbest argüman desteği entegre edildi.
  - `-InstallProfile` anahtarı ile PowerShell profiline (`$PROFILE`) `copilot-remote`, `cop-remote` ve `copremote` aliasları kalıcı olarak eklendi.
- `baslaticilar/start-copilot-remote.bat`: Windows Gezgini ve CMD ortamı için tek tıkla çalıştırma desteği sağlandı.

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
