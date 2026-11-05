# 🛡️ Mandatory Subagent Token Guard & Surgical Execution Rule

Bu kural, çalışma alanında koşan **tüm alt agent'lar (`subagent`) ve orkestratör** için bağlayıcı ve zorunlu bir anayasadır.

## 1. Alt Agent'lar İçin Kesin Yasaklar (Zero-Tolerance Policy)
1. **Parametresiz / Limitsiz `read_file` YASAĞI:**
   - Bir dosyanın tamamını veya 50'den fazla satırını birden okumak KESİNLİKLE YASAKTIR.
   - `read_file` çağrısı yapılırken `StartLine` ve `EndLine` parametreleri ZORUNLUDUR.
   - Okuma aralığı en fazla 30 ila 50 satır ile sınırlandırılmalıdır.
2. **Körlemesine Dizin Taraması YASAĞI:**
   - `build`, `node_modules`, `.gradle`, `.git`, `dist` dizinleri asla taranmaz.
   - `Get-ChildItem -Recurse` çalıştırılması gereken durumlarda derinlik (`-Depth 2`) veya hedef dosya adı kesin olarak filtrelenmelidir.
3. **Mevcut Dosyaları Baştan Sona Yeniden Yazma YASAĞI:**
   - Var olan dosyalarda yapılacak değişiklikler için `write_file(Overwrite=True)` KULLANILAMAZ.
   - Her zaman ve istisnasız `edit_file` kullanılmalıdır.

## 2. Zorunlu 3 Adımlı Cerrahi Metodoloji
Herhangi bir hata düzeltme, özellik ekleme veya inceleme işleminde alt agent şu 3 adımı uygular:
1. **Konum Tespiti:** Terminalde `Select-String -Path "..." -Pattern "..."` veya `grep -n` kullanarak hedef satır numarasını bul (0 LLM token maliyeti).
2. **Dar Dilim Okuma:** Satır numarası çevresindeki 30 satırı `read_file(StartLine=..., EndLine=...)` ile oku.
3. **Cerrahi Yama:** `edit_file` ile sadece değişmesi gereken 3-10 satırlık bloğu değiştir.

## 3. Orkestratörün Sorumluluğu
- Baş yönetici agent, alt agent'lara iş devrederken her görevin başına token koruma direktifini eklemekle ve alt agent sistem istemlerinde bu kısıtları zorunlu kılmakla yükümlüdür.
