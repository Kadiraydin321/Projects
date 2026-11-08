# Antigravity Global Agent & Subagent Directives

## 0. Kural ve Beceri Önceliği Protokolü (Mandatory Rule & Skill First-Read)
- HER AGENT VE SUBAGENT, göreve başlar başlamaz İLK ADIM OLARAK (herhangi bir dosya aramadan veya işlem yapmadan önce) `AGENTS.md` ve `.agents/rules/` altındaki kural ve beceri dosyalarını okumak ve cerrahi okuma sınırlarına uymakla yükümlüdür.
- Kural okuması yapılmadan hiçbir kodlama veya dosya işlemi başlatılamaz.

## 1. Temel Görev Dağılımı ve Orkestrasyon
- Antigravity ana asistanı **BAŞ YÖNETİCİ / ORKESTRATÖR**dür. Doğrudan kodlama yapmaz, işleri uzman alt agent'lara (`invoke_subagent`) devreder.
- Kullanıcı iletişim dili Türkçe ve teknik derinliği yüksektir.

## 2. Zorunlu Alt Agent Token Muhafızı ve Cerrahi Okuma (Subagent Token Guard)
- **TÜM ALT AGENT'LAR İÇİN GEÇERLİ KESİN KURAL:**
  - Dosyaların tamamını parametresiz `read_file` ile okumak KESİNLİKLE YASAKTIR.
  - Bir dosyada aranan fonksiyon veya satır önce `Select-String` veya `grep -n` ile tespit edilir.
  - Ardından yalnızca 30-50 satırlık dar bir pencere `read_file(StartLine, EndLine)` ile okunur.
  - Var olan dosyalar asla `write_file Overwrite=true` ile yeniden yazılmaz; sadece `edit_file` kullanılır.
  - `build`, `node_modules`, `.gradle`, `.git` klasörleri taranmaz.
- Bu kural tüm alt agent sistem istemlerine ve görev tanımlarına doğrudan işlenir.

## 3. Proje Canlı Hafızası (`PROJECT_STATE.md`)
- Proje başlangıcında tüm dosyaları okumak yerine yalnızca kökteki `PROJECT_STATE.md` okunur.
- Görev tamamlandığında yapılan değişiklikler `PROJECT_STATE.md` içerisine işlenerek teslim edilir.

## 4. Script İmzalama Kuralı — Tüm Agent'lar İçin Zorunlu
Her agent ve subagent, ürettiği desteklenen script dosyalarını teslimattan önce mutlaka imzalamalıdır.

- **Sertifika Thumbprint:** `18BDDE60A34E2F5E2AF49A9420F71C55445DE6F4`
- **Store:** `Cert:\CurrentUser\My`
- **İmzalanabilir uzantılar:** `.ps1`, `.psm1`, `.psd1`, `.vbs`, `.js`
- **İmzalanamaz uzantılar:** `.bat`, `.cmd`, `.py`, `.exe` (Authenticode desteklemez)

```powershell
# Tek dosya imzalama
$cert = Get-Item "Cert:\CurrentUser\My\18BDDE60A34E2F5E2AF49A9420F71C55445DE6F4"
Set-AuthenticodeSignature -FilePath "<dosya>" -Certificate $cert
```
- İmzasız script teslim etmek KESİNLİKLE YASAKTIR.
- İmza sonrası `Status = Valid` olduğu doğrulanır.

## 5. Alt Agent Sonrası Otomatik GitHub Yedekleme Protokolü
- Alt agent'ların tüm işlemleri ve canlı testleri bittiğinde yapılan değişiklikler derleme artıklarından arındırılarak temiz bir commit oluşturulur ve doğrudan GitHub uzak deposuna (`git push`) aktarılarak yedeklenir.

## 5. Graphify Bilgi Grafiği ve Kod Tabanı Mimarisi (/graphify)
- Bu projede ve ortak geliştirme ortamında kod tabanı mimarisi, sembol ilişkileri ve god node'lar `graphify-out/` altında bilgi grafiği olarak indekslenir.
- Kullanıcı `/graphify` komutunu girdiğinde veya mimari sorgulama yapıldığında kurulu graphify becerisi ve CLI araçları kullanılır.
- **Temel Kurallar:**
  - `graphify-out/graph.json` mevcut olduğunda, geniş kod okumaları ve kör `grep` aramaları yerine ilk adım olarak `graphify query "<soru>"` (CLI) veya `query_graph` (MCP) çalıştırılır. Alt agent istemlerine bu kural öncelikli olarak enjekte edilir.
  - İki sembol/modül arasındaki bağlantılar için `graphify path "<A>" "<B>"`, odaklanmış kavram analizi için `graphify explain "<kavram>"` kullanılır.
  - `graphify-out/wiki/index.md` varsa ham kaynak kodları taramak yerine bu wiki üzerinden navigasyon yapılır.
  - Kod değişiklikleri sonrasında grafı güncel tutmak için `graphify update .` komutu çalıştırılır (AST-only, sıfır API maliyeti).
  - `graphify-out/graph.json` her derlemede baştan yazıldığı için PR diff'lerindeki büyük değişiklikler normal karşılanır.

## 6. Zorunlu ECC ve Graphify Protokolü (Mandatory ECC & Graphify Protocol)
- **TÜM İSTEKLERDE İSTİSNASIZ ZORUNLU:**
  - Kullanıcının her isteğinde, görevinde veya kodlama adımında ECC kural ve iş akışları ile Graphify bilgi grafiği zorunlu kılınmıştır.
  - **ECC Disiplini:**
    - Kod yazmadan önce mutlaka ECC planlama adımı uygulanır (planner / rchitect).
    - Geliştirmeler TDD döngüsü ile yürütülür (	dd-guide, %80+ test kapsamı).
    - Her kodlama adımının ardından code-reviewer ve güvenlik gerektiren yerlerde security-reviewer kullanılır.
    - Tüm üretilen scriptler Authenticode ile imzalanır.
  - **Graphify Disiplini:**
    - Kod tabanı mimarisi sorgulanırken daima graphify query, graphify path ve graphify explain kullanılır.
    - Değişiklikler sonrasında graphify update . tetiklenerek bilgi grafiği güncel tutulur.
