# PROJECT_STATE.md

## Genel Durum (Status)
- **Tarih:** 05 Kasım 2026
- **Ortam:** Windows 11 (x64), PowerShell, RTX 5060 Ti 16 GB, i5-13400F, 64 GB RAM
- **Son İşlemler:**
  1. Claude Desktop Kurulumu ve Çevre Yapılandırması (Tamamlandı).
  2. Hermes Agent (Nous Research) Orkestrasyon Yapısı Kurulumu (Tamamlandı).
  3. 5 GitHub Reposu Beceri, Araç ve MCP Entegrasyonu (Tamamlandı - Antigravity + Hermes Agent).

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
