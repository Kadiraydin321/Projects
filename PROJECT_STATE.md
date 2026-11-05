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
