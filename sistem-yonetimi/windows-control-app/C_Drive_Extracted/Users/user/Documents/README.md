# Windows Yönetim Aracı

Bu uygulama, Windows sistem yönetimi için çeşitli araçları bir araya getirir.

## Özellikler

- Sistem bilgilerinin gerçek zamanlı takibi (CPU, Bellek, Disk)
- Görev Yöneticisi (Görevleri listeleme ve sonlandırma)
- Ağ testi (Bağlantı ve internet hızı)
- Windows Registry manipülasyonu
- Ses ve parlaklık ayarları
- Sistem komutları çalıştırma

## Gereksinimler

- Python 3.7+
- psutil kütüphanesi
- pywin32 kütüphanesi

## Kurulum

1. Gerekli kütüphaneleri yükleyin:
   ```
   pip install psutil pywin32
   ```

2. Uygulamayı çalıştırın:
   ```
   python windows_manager.py
   ```

## Kullanım

Uygulama penceresindeki çeşitli sekmelerden sistem yönetimi görevlerini yapabilirsiniz.