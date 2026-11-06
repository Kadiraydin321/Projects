# 📌 Proje Durumu & Hafıza Kartı (PROJECT_STATE)

**Son Güncelleme:** 2026-11-04 14:28
**Aktif Sürüm / Durum:** v1.0.0 / Kararlı / Windows'a Taşındı
**Teknoloji Yığını:** Next.js 16 (App Router), React 19, TypeScript, Prisma ORM, SQLite (`dev.db`), Tailwind CSS, Recharts

---

## 1. 🎯 Projenin Amacı ve Temel Mimarisi
- Kurumsal cihaz, donanım, lisans ve zimmet takip/envanter yönetim portalı.
- **Giriş Noktası (Entrypoint):** `app/page.tsx` & `app/layout.tsx`
- **Başlatıcı:** `Baslat_CihazTakip.bat` (`npm run dev` ile `http://localhost:3000`)
- **Modüller:**
  - `app/api/`: REST API rotaları (Cihaz ekleme, silme, güncelleme, zimmet atama)
  - `components/`: UI bileşenleri, veri tabloları ve istatistik kartları
  - `prisma/`: Veritabanı şeması (`schema.prisma`) ve SQLite veritabanı (`dev.db`)

---

## 2. ⚡ Aktif ve Tamamlanmış Özellikler
- [x] Cihaz Listeleme ve Dinamik Arama/Filtreleme
- [x] Yeni Cihaz ve Donanım Ekleme Formu
- [x] Zimmet / Kullanıcı Eşleme Modülü
- [x] SQLite & Prisma Veritabanı Kalıcılığı (`dev.db`)
- [x] Dashboard Grafik ve İstatistik Kartları (Recharts)
- [x] Windows Uyumlu Tek Tıkla Başlatıcı (`Baslat_CihazTakip.bat`)

---

## 3. 📝 Son Değişiklikler ve Sürüm Günlüğü (Changelog)
### [2026-11-04 14:28] - WSL -> Windows Göçü ve Stabilizasyon
- **Değiştirilen / Eklenen Dosyalar:** `Baslat_CihazTakip.bat`, `PROJECT_STATE.md`
- **Yapılan İşlem:** WSL'den yerel Windows `C:\Users\Birin\Birin\Projeler\cihaz-takip` yoluna sıfır hatayla taşındı. `Baslat_CihazTakip.bat` betiği `%~dp0` bağımsız kök dizin sabitlemesiyle modernize edildi.
- **Etkilenen Bileşenler:** Windows yerel Node.js ve npm ortamında doğrudan çalışabilir duruma getirildi.

---

## 4. 🗄️ Veritabanı, Çevre ve API Rotaları
- **Veritabanı Dosyası:** `prisma/dev.db` (SQLite)
- **Port:** `http://localhost:3000`
- **Temel Rotalar:**
  - `/` -> Ana gösterge paneli ve cihaz tablosu
  - `/api/devices` -> Cihaz CRUD API uç noktası

---

## 5. ⚠️ Bilinen Sorunlar ve Yapılacaklar (Backlog / TODO)
- [ ] Windows ortamında `npm install` bağımlılıklarının kontrol edilmesi
- [ ] Export (Excel / PDF raporlama) özelliğinin test edilmesi
