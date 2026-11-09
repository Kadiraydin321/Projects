# Roborock Web Kontrol Merkezi (Web Hub) - Canlı Hafıza

**Son Güncelleme:** 09 Kasım 2026  
**Hedef Cihaz:** Roborock Q8 Max Pro (`roborock.vacuum.ss09`)  
**IP:** `192.168.1.44` | **Port:** `54321` (UDP miIO) | **DUID:** `4EDlM4fJ272Mg9kP98f1ST`  
**Token (Hex):** `6457713532704e374b56505062715362`  
**Web Sunucusu:** `http://localhost:8000` veya `http://192.168.1.6:8000`  
**Durum:** Faz 1 & Faz 2 Başarıyla Tamamlandı (Python FastAPI + Modern Glassmorphism Web SPA)

---

## 1. Aktif Özellikler ve Modüller
- **Asenkron miIO Motoru (`web_hub/miio_client.py`):**
  - AES-128-CBC şifreleme/çözme (PyCryptodome).
  - MD5 anahtar türetimi ve PKCS7 dolgusu.
  - Handshake yönetimi (DID & Stamp senkronizasyonu).
  - Doğrudan fiziksel LAN IP'sine (`192.168.1.6`) soket bağlama (Kaspersky VPN bypass).
- **Durum Yöneticisi (`web_hub/state_manager.py`):**
  - İmmutable telemetri durum önbelleği (`RobotSnapshot`).
  - Dinamik arka plan poller (temizlikte 3s, boştayken 10s).
  - Türkçe durum ve hata kodları tablosu.
  - Sarf malzeme hesaplama ve sıfırlama (Ana fırça, Yan fırça, Filtre, Sensör).
- **REST & WebSocket API (`web_hub/main.py`):**
  - `/api/status`, `/api/action/*`, `/api/settings/*`, `/api/consumables/*`, `/api/history`, `/api/health`.
  - `/ws/telemetry`: Canlı WebSocket telemetri akışı ve istemci heartbeat mekanizması.
- **Modern Glassmorphism Web Frontend (`web_hub/static/`):**
  - Neon Dark Mode (`#07090e`), Glassmorphism yarı saydam kartlar.
  - Three.js + OrbitControls destekli 3D Ev Kat Planı & Oda Modelleme HUD konteyneri.
  - İnteraktif 3D Oda Seçimi ve Segment Temizlik Düğmeleri (`app_segment_clean` - Salon, Mutfak, Yatak Odası, Koridor, Çalışma Odası, Banyo).
  - Dairesel SVG Radial Gösterge (anlık batarya ve animasyonlu durum rozeti).
  - 5 ana aksiyon butonu (🟢 Başlat, 🟡 Duraklat, 🔴 Durdur, ⚡ Şarja Dön, 🎯 Spot Temizlik).
  - Segmented emiş gücü (101-105) ve su seviyesi (200-203) seçicileri.
  - Kalan ömür progress barları ve toast bildirimleri.
- **Güvenlik ve Hata Giderme:**
  - HTTP 500 hataları tamamen giderildi; eksik `FAN_POWER_CODES`, `WATER_LEVEL_CODES`, `ConsumableItem` exportları eklendi.
  - Cihaz ve ağ hatalarında graceful fallback mimarisi ile sıfır kesinti sağlandı.
  - `Baslat_Web.ps1`: Tek tıkla arka plan sunucusunu ve varsayılan tarayıcıyı başlatan imzalı PowerShell betiği (`Authenticode: 18BDDE60A34E2F5E2AF49A9420F71C55445DE6F4`).
  - Tüm JS dosyaları Authenticode sertifikasıyla imzalanmıştır.

---

## 2. Test ve Kalite Durumu
- `pytest web_hub/test_main.py`: 6/6 test başarıyla geçti (%100 geçiş oranı).
- `code-reviewer` ve güvenlik denetimi uygulandı: CORS sıkılaştırıldı, WebSocket JSON ping/pong uyumu sağlandı, XSS koruması için `textContent` zorunlu kılındı.

---

## 3. Yol Haritası ve Tamamlanan Fazlar
- [x] Python FastAPI + Modern Web Hub prototipinin oluşturulması ve canlı testi.
- [x] **Faz 3 - Roborock Resmi APK (v4.74.08) Tersine Mühendislik ve Metot Deşifresi:**
  - JADX 1.5.6 ve Hermes v96 bytecode ayrıştırıcıları ile APK tam deşifre edildi.
  - **Yerel TCP Portu:** `58867` (LocalClientService) & UDP miIO `54321`.
  - **RPC Metot Kataloğu:** `app_segment_clean`, `app_zoned_clean`, `set_clean_motor_mode`, `set_custom_mode` (101-108), `set_water_box_custom_mode` (200-207), `set_mop_mode` (300-304), `reset_consumable`, istasyon (`app_start_collect_dust`, `app_start_wash`) ve kamera WebRTC protokolleri tam olarak haritalandırıldı.
  - **Hermes v96 Eklentisi:** `robot.vacuum.cleaner.zip` içerisindeki tüm `RobotState` (0-103) donanım durum kodları, UI PAG animasyonları ve `callMethod` köprüsü çıkarıldı.
- [x] **Faz 4 - Rust Seviyesinde Ultra Hızlı Mock Robot Sunucusu (`roborock_mock_server`):**
  - **Motor:** Tokio asenkron çalışma zamanı, 1.56 MB tek başına çalışabilir optimize binary (`roborock_mock_server.exe`).
  - **Protokoller:** UDP `54321` (miIO el sıkışma, AES-128-CBC şifreleme/çözme, MD5 Key/IV) ve TCP `58867` (Roborock LAN LocalClientService).
  - **Durum & Simülasyon:** `Arc<RwLock<RobotState>>` iş parçacığı güvenli durum makinesi, arka plan batarya tüketimi, temizlik alanı/süresi ve istasyona dönüş simülatörü.
  - **Canlı Paket Denetçisi (Live Packet Inspector):** Gelen ve giden tüm JSON-RPC isteklerini ekranda renkli ve milisaniye altı gecikme ölçümüyle (700-800 µs) loglama.
  - **Test Durumu:** 14/14 test başarıyla geçti (%100 geçiş oranı).
  - **Başlatıcı:** `Baslat_Mock_Server.ps1` oluşturuldu ve Authenticode sertifikasıyla (`18BDDE60A34E2F5E2AF49A9420F71C55445DE6F4`) imzalandı.
- [x] **Faz 5 - MAC Adresi Klonlama ve Yapılandırılmış JSONL Trafik Günlüğü (`traffic_log.jsonl`):**
  - **MAC Klonlama (Katman 7):** `--mac <MAC>` bayrağı (`-a`) ile `miIO.info` metoduna robotun orijinal MAC adresi dinamik olarak enjekte edildi.
  - **Fiziksel MAC Klonlama Desteği (Katman 2 / ARP):** Gerçek robot kapalıyken PC ağ kartı MAC adresini robotun MAC adresiyle eşleme rehberi sağlandı.
  - **Yapılandırılmış JSONL Trafik Kayıtçısı:** Ekrana kaybolup giden loglar yerine `traffic_log.jsonl` dosyasında her gelen istek, eş zaman damgası, milisaniye altı gecikme (`elapsed_us`), istemci soket bilgisi ve dönülen yanıt makine tarafından okunabilir formatta kalıcı hale getirildi.
- [x] **Faz 6 - Hermes v96 Derin Entegrasyonu & Dayanıklı TCP Akış Ayrıştırıcısı (Hardening):**
  - **Akıllı `get_prop` Ayrıştırıcısı:** Hermes'in `["get_status"]` çağrılarına tam durum nesnesi, tekil/çoğul skaler özellik sorgularına (`["battery"]`, `["state", "fan_power"]`) ise tam sıra ve format uyumlu değerler dizisi döndürme (`[98, 8, 102]`).
  - **Hermes Görev & İstasyon Metotları:** `resume_segment_clean`, `resume_zoned_clean`, `app_wakeup_robot`, `app_stop_wash`, `start_wash_then_charge`, `set_dust_collection_mode`, `set_wash_towel_mode`, `app_set_dryer_setting` metotları eksiksiz uygulandı.
  - **Harita, Ağ & Ayarlar:** `get_multi_maps_list` (Roborock çok katmanlı harita şeması), `load_multi_map`, `save_map`, `get_network_info`, `get_server_timer`, `get_child_lock_status`, `set_child_lock_status`, `get_led_status`, `set_led_status`, `get_voice_locale` metotları eklendi.
  - **Dayanıklı TCP Akış Ayrıştırıcısı (`find_next_json_object`):** Satır sonu (`\n`) olmayan tekil JSON paketleri veya tek TCP soketinde ardışık gelen birleşik JSON akışlarını (`{"id":1...}{"id":2...}`) 64 KB DoS korumalı tamponlayıcı ile bloklanmadan ayrıştıran motor.
  - **Otomatik Simülasyon Kurtarması:** Toz boşaltma (`CollectingDust`) ve paspas yıkama (`WashingDuster`) durumlarının belirli tick sonrasında otomatik `Charging`/`FullyCharged` durumuna dönmesi.
  - **Kalite & Güvenlik Onayı:** 21/21 test (%100 geçiş), Clippy sıfır hata/uyarı, `rust-reviewer` tarafından tam güvenlik onayı.
- [ ] **Seçenek A - Rust Geçişi (Rust Hub):**
  - Axum + Tokio + rust-embed ile sıfır bağımlılıklı tek dosya `roborock-web.exe` derlemesi.
  - Rust AES-128 miIO UDP ve LAN TCP 58867 motorunun implementasyonu.
  - 10 MB altı ultra hafif RAM tüketimi.
