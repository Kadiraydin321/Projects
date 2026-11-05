# 🚀 Mandatory Post-Subagent GitHub Auto-Backup Rule

Bu kural, projede yapılan her geliştirme döngüsünün ardından zorunlu olarak uygulanır.

## Kural Şartları:
1. **İş Bitimi Tetiklemesi:** Bir istek veya görev kapsamında başlatılan alt agent'ların tüm işleri (`assembleDebug`, birim testler, E2E emülatör doğrulaması, UI düzenlemeleri vb.) bittiğinde işlem durdurulmaz.
2. **Otomatik Yedekleme:** Baş Yönetici / Orkestratör veya Montaj Uzmanı doğrudan devreye girer.
3. **Temiz Commit & Push:**
   - Değişiklikler incelenir, geçici veya gereksiz dosyalar dışlanır (`.gitignore`).
   - Yapılan işi net açıklayan anlamlı bir commit mesajı ile `git add -A` ve `git commit` yapılır.
   - Doğrudan ilgili GitHub reposuna (`origin/main` vb.) `git push` yapılarak yedekleme garanti altına alınır.
4. **Kullanıcıya Rapor:** Kullanıcıya sunulan sonuç raporunun sonunda commit hash ve uzak depo aktarım durumu açıkça belirtilir.
