# USB Bellek Sağlık Kontrolü (USB Health Checker)

Bu script, Windows CMD ortamında çalışan bir USB bellek sağlık kontrol aracıdır. Hem WMI ile donanım bilgilerini alır, hem de `chkdsk` komutu ile dosya sistemi kontrolleri yapar.

## Kurulum

1. Python 3.x yüklü olmalıdır.
2. `usb_health_check.py` yazılımını Windows CMD'de çalıştırın:
   ```
   python usb_health_check.py
   ```

## Özellikler

- USB belleklerin listelenmesi
- WMI aracılığıyla fiziksel disk bilgileri
- SMART bilgileri (USB'ler için sınırlı olabilir)
- `chkdsk` komutunu çalıştırmak
- Opsiyonel sektör testi (okuma/yazma)

## Kullanım

1. Program çalıştırıldığında USB bellek cihazları listelenir.
2. Sürücü harfini girerek kontrol yapabilirsiniz:
   - `chkdsk` komutu ile dosya sistemi hatası kontrolü
   - Seçimli olarak sektör testi yapılır

## Notlar

- USB belleklerde SMART desteği sınırlı olabilir.
- Sektör testi sırasında yazma komutları kullanılabilir.