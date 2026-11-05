# 🌐 Graphify Autonomous Workflow

Bu iş akışı, projeyi veya hedef kod tabanını deterministik bir bilgi grafiğine (Knowledge Graph) dönüştürmek, modüller arası ilişkileri analiz etmek ve mimari sorguları yanıtlamak için kullanılır.

## 🎯 Tetikleme (Triggers)
- Kullanıcı `/graphify` komutunu girdiğinde.
- Büyük/karmaşık bir projenin mimari yapısını, sembol ilişkilerini ve "God Node" düğümlerini anlamak gerektiğinde.
- Kod tabanında yapılan değişiklikler sonrası grafın güncellenmesi gerektiğinde (`/graphify update`).

---

## 📋 İş Akışı Aşamaları (Workflow Phases)

### Aşama 1: Ortam ve Bağımlılık Tespiti (Environment Check)
1. Python ve paket yöneticisi (`uv`, `pipx` veya `pip`) varlığını doğrula.
2. `graphify` aracının sistemde kurulu olup olmadığını kontrol et (`Get-Command graphify`).
3. Kurulu değilse veya güncellenmesi gerekiyorsa:
   ```powershell
   uv tool install --upgrade graphify
   # veya
   pipx install graphify
   ```

### Aşama 2: Kod Tabanı ve Kapsam Analizi (Detect Scope)
1. Hedef dizindeki dosya türlerini ve dağılımını tara:
   - Desteklenen formatlar: Python, JS/TS, Go, Rust, Java, C#, C/C++, Markdown/Docs, Görsel, Video/Ses.
2. Halihazırda `graphify-out/` dizininin var olup olmadığını denetle:
   - Varsa ve sadece yeni dosyalar eklendiyse: **Artımlı Güncelleme (Aşama 4B)**.
   - Yoksa veya tam yeniden indeksleme istendiyse: **Tam Kurulum (Aşama 3)**.

### Aşama 3: Bilgi Grafiği Oluşturma (Full Graph Pipeline)
1. Temel boru hattını çalıştır:
   ```powershell
   graphify .
   ```
2. Opsiyonel parametreler:
   - Derin analiz (zenginleştirilmiş INFERRED ilişkiler): `graphify . --mode deep`
   - Yönlendirilmiş bağımlılıklar: `graphify . --directed`
   - Etkileşimli Wiki çıktısı: `graphify . --wiki`
   - Görselleştirme atlama (yalnızca JSON ve Rapor): `graphify . --no-viz`

### Aşama 4: Çıktıların Doğrulanması ve Sunumu (Artifacts Verification)
1. `graphify-out/` altında üretilen dosyaları doğrula:
   - `graph.json`: GraphRAG ve sorgulama için temel veri yapısı.
   - `GRAPH_REPORT.md`: Doğal dilde yazılmış modül ve mimari özet raporu.
   - `graph.html`: Etkileşimli D3 tabanlı görselleştirme.
2. Kullanıcıya graf özetini (düğüm sayısı, kenar sayısı, topluluklar ve kritik God Node'lar) raporla.

### Aşama 4B: Artımlı Güncelleme (Incremental Update)
Kod değişiklikleri sonrasında LLM maliyetine girmeden AST tabanlı hızlı güncelleme:
```powershell
graphify update .
```

### Aşama 5: Bilgi Grafiği Sorgulama (Querying & Pathfinding)
Agent'lar ve kullanıcılar dosya dosyası kod okumak yerine grafı hedefe yönelik sorgular:
1. **Genel Sorgulama (BFS Traversal):**
   ```powershell
   graphify query "Kimlik doğrulama akışı nasıl işliyor?"
   ```
2. **Yol Analizi (En Kısa Yol):**
   ```powershell
   graphify path "AuthService" "DatabaseAdapter"
   ```
3. **Kavram Açıklama (Deep Explanation):**
   ```powershell
   graphify explain "SessionManager"
   ```

---

## 🔒 Güvenlik ve Git Hijyeni Kuralları
- `graphify-out/` içerisindeki geçici önbellek dosyaları (`.graphify_detect.json` vb.) git takibine eklenmez.
- `graph.json` dosyası ekibin ortak mimari referansı olarak versiyon kontrolüne dahil edilebilir; dosya boyutu büyük olsa bile normal kabul edilir.
