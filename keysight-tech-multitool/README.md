# Keysight Tech MultiTool

Windows için tek dosyalık (harici crate yok, yalnızca `std` + Win32 FFI) bir konsol aracı.
Keysight SCPI cihaz sunucusu simülasyonu, Ethernet IP/hız ayarı, USB panel kontrolü, Ping,
MAC doğrulama, fare tıklayıcısı, güvenlik duvarı yönetimi ve 10 renk teması içerir.

> **Not:** Bu branch (`keysight-tech-multitool`) `main`'den ayrıdır; `main` branch'ine dokunulmamıştır.

## Özellikler (özet)
- **Keysight Cihaz Ayarlama:** 3 cihaz türü × 7 gerçek Keysight modeli (toplam 21) arasından seçim; gerçekçi `*IDN?` yanıtı.
- **Sunucu sağlığı:** başlatma sonrası gerçek TCP + `*IDN?` doğrulaması ve 3 sn'de bir çalışan watchdog (yanıtsız sunucuyu otomatik yeniden başlatır).
- **Adres kopyalama:** panoya önce VISA (`TCPIP0::ip::port::SOCKET`), sonra IP (`ip:port`).
- **Çözünürlük/DPI'ya göre otomatik font** (14–48 px) ve pencere ortalama.
- **Ping** ve **MAC Doğrulama** ayrı menüler; kayıtlar `ProgramData\KeysightSim\devices.json` + koddaki `STATIC_DEVICES` dizisi.
- **Fare tıklayıcısı**, **Güvenlik duvarı** yönetimi, sessiz **uyku engelleyici**, **10 tema** (settings.json'da kalıcı).
- Yönetici zorunlu değil; yetki isteyen işlemler `[YÖNETİCİ]` rozetiyle gösterilir.

## Derleme

Rust kuruluysa (`rustup`), Windows'ta:

```bash
cargo build --release
```

Üretilen çalıştırılabilir dosya: `target/release/multitool.exe`

### Windows dışında derleme kontrolü (çalıştırma değil)
Kod Windows'a özeldir; yalnızca derlenip derlenmediği şöyle doğrulanabilir:

```bash
rustup target add x86_64-pc-windows-gnu
cargo check --target x86_64-pc-windows-gnu
```

## Kullanım
`multitool.exe` dosyasını Windows'ta çalıştırın. Menüde:
`Tab` = Ana Menü, `Backspace`/`Esc` = Geri, `0` = Geri/Çıkış.

## Bu branch nasıl açıldı / nasıl ayrı branch açarsınız
`main` branch'ine dokunmadan projeyi ayrı bir branch'e eklemek için:

```bash
# depoyu klonla
git clone https://github.com/Kadiraydin321/Projects.git
cd Projects

# proje adıyla yeni bir branch aç (main'den ayrılır, main değişmez)
git checkout -b keysight-tech-multitool

# dosyaları ekle, commit et
git add .
git commit -m "Keysight Tech MultiTool eklendi"

# yalnızca bu branch'i uzak depoya gönder (main'e dokunulmaz)
git push -u origin keysight-tech-multitool
```

Değişiklikleri `main`'e almak isterseniz GitHub üzerinde bu branch'ten `main`'e bir
**Pull Request** açabilirsiniz; böylece `main` yalnızca siz onayladığınızda güncellenir.
