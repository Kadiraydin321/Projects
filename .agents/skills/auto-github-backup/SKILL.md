---
name: auto-github-backup
description: "Alt agent'ların tüm geliştirme, onarım veya entegrasyon görevleri tamamlandıktan sonra yapılan değişiklikleri temiz bir commit ve push ile otomatik olarak GitHub reposuna yedekleyen protokol."
---

# 🚀 Otomatik GitHub Yedekleme Protokolü (`auto-github-backup`)

Bu yetenek ve operasyon kuralı, her geliştirme döngüsünde veya kullanıcı talebinde **tüm alt agent'ların görevleri tamamlandıktan sonra** yapılan tüm değişikliklerin eksiksiz, temiz ve doğrulanmış bir şekilde GitHub uzak deposuna aktarılmasını (commit & push) zorunlu kılar.

---

## 1. 📋 Çalışma Mantığı ve Tetiklenme Zamanı
- **Tetikleyici:** Bir görev veya talep kapsamında çalışan tüm alt agent'lar (`ui-ux-designer`, `responsive-layout-specialist`, `external-integration-dev`, `e2e-test-specialist`, vb.) işlerini tamamlayıp `idle` veya rapor teslim durumuna geçtiğinde tetiklenir.
- **Sorumlu:** Baş Yönetici / Orkestratör Agent veya görevlendirilen `assembly-integrator` / `dependency-packager`.

---

## 2. 🛡️ 4 Adımlı Güvenli Yedekleme Süreci

### Adım 1: Gereksiz Dosya ve Derleme Artığı Temizliği
Git deposuna ikili derleme çıktıları, geçici dosyalar ve kilit dosyaları eklenmemelidir:
- `.gitignore` dosyası kontrol edilir (`target/`, `node_modules/`, `build/`, `*.pyc`, `*.db`, `*.log`).
- Varsa izlenen derleme artıkları index'ten çıkarılır (`git rm -r --cached ... --ignore-unmatch`).

### Adım 2: Durum Kontrolü & Staging
```powershell
git status -s
git add -A
```

### Adım 3: Anlamlı ve Standart Commit Mesajı
Conventional Commits standardına uygun, sürüm veya yapılan işi özetleyen bir mesaj yazılır:
- Örnek: `feat(v1.4.0): reader mode fix, accordion menu, optical stream & auto-resize`
- Örnek: `fix(auth): resolve biometric session timeout regression`

### Adım 4: Uzak Depoya Aktarım (Push)
```powershell
git push origin <aktif_dal>  # Örn: git push origin main
```
İşlem tamamlandıktan sonra commit özeti ve commit hash kullanıcıya teslimat raporunda bildirilir.
