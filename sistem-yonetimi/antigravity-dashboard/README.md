# AntiGravity PC Kontrol ve Depolama Dashboard 🚀

Bu uygulama, bilgisayarınızı tarayıcı üzerinden yönetmenizi sağlayan, şık **"Liquid Glass" (Cam Morfizm)** temalı, responsive bir dashboard projesidir. Frontend tarafı HTML, CSS ve vanilla JS ile; backend tarafı ise Python ve Flask ile yazılmıştır.

## Özellikler

1.  **Sistem İzleme (Dashboard):**
    *   Gerçek zamanlı CPU, RAM ve Disk (C:) durum takibi (neon görünümlü halka göstergelerle).
    *   Sistem çalışma süresi (Uptime).
    *   Akıllı selamlama widget'ı ve saat/tarih bilgisi.
2.  **Sistem Yönetimi (PC Controller):**
    *   **Disk Temizleyici:** Tek tıkla Windows Temp ve User Temp klasörlerini tarar, boyutu hesaplar ve güvenle temizler (kilitli dosyalara takılmaz).
    *   **Güç Zamanlayıcı:** Bilgisayarınızı belirlediğiniz süre (dakika) sonunda kapatır, yeniden başlatır veya uyutur. İptal etme ve geri sayım takibi mevcuttur.
3.  **Güvenli Yapışkan Notlar:**
    *   Klasörleme, renk seçimi, ekleme, düzenleme ve silme.
    *   **Yerel Şifreleme (AES-GCM 256-bit):** İstediğiniz notu parolanızla şifreleyebilirsiniz. Şifreli veri tarayıcıda çözülmedikçe tamamen anlamsız bir kod yığınıdır (Zero-Knowledge).
    *   **Bulut Senkronizasyonu:** Tüm not veritabanını "Yedek Şifreniz" ile encrypt edip tek tıkla Google Drive'ınıza (`antigravity_sticky_notes.enc` adıyla) kaydedip geri yükleyebilirsiniz.
4.  **Google Drive Entegrasyonu (5 TB Etkin Yönetimi):**
    *   **Depolama Göstergesi:** 5 TB (veya mevcut limitiniz) kapasiteyi, kullanılan alanı ve yüzdeyi dinamik grafik ile gösterir.
    *   **Bulut Gezgini:** Google Drive ana dizinindeki dosyaları listeler, dosya yüklemenizi sağlar.
    *   **Yerel Klasör Yedekleme:** Bilgisayarınızdaki herhangi bir klasörün yolunu girdiğinizde, backend klasörü zip dosyası haline getirir ve doğrudan Drive hesabınıza yükler.
5.  **Ücretsiz Oyun Fırsatları:**
    *   Epic Games, Steam ve diğer mağazalardaki güncel oyun giveaway (hediye) kampanyalarını çeker.
    *   Kalıcı ücretsiz oyunları listeler.
6.  **Görünüm Ayarları:**
    *   Aydınlık (Light) ve Karanlık (Dark) tema desteği.
    *   Drift animasyonlu arka plan ışık küreleri (ambient light blobs).
    *   Duvar kağıdı değiştirme (hazır şık duvar kağıtları veya özel resim URL'si).
    *   Windows slayt gösterisi modu: Belirlenen saniye aralıklarında duvar kağıdını otomatik değiştirme.

---

## Kurulum ve Çalıştırma

### 1. Gereksinimler
*   Python 3.9 veya üzeri
*   Pip paket yöneticisi

### 2. Google Drive API Kurulumu (OAuth Yetkilendirmesi İçin)
Uygulamanın Google Drive hesabınıza erişebilmesi için Google Cloud Console üzerinden kendi istemci kimliğinizi oluşturmalısınız. Bu tamamen ücretsizdir.

1.  [Google Cloud Console](https://console.cloud.google.com/)'a gidin.
2.  Yeni bir proje oluşturun.
3.  Sol menüden **API'ler ve Hizmetler** > **Kitaplık** kısmına gidin. **Google Drive API**'yi aratıp projeniz için **Etkinleştir** butonuna basın.
4.  **API'ler ve Hizmetler** > **OAuth onay ekranı** (OAuth consent screen) sayfasına gidin:
    *   Uygulama Türü: **External** seçin.
    *   Gerekli alanları doldurun.
    *   Test Kullanıcıları (Test users) aşamasına kendi Gmail adresinizi eklemeyi unutmayın!
5.  **API'ler ve Hizmetler** > **Kimlik Bilgileri** (Credentials) sayfasına gidin:
    *   **Kimlik Bilgisi Oluştur** > **OAuth istemci kimliği** seçin.
    *   Uygulama Türü: **Masaüstü Uygulaması** (Desktop App) seçin.
    *   İsim verip oluşturun.
6.  Oluşturulan istemcinin sağ tarafındaki **İndir** (Download JSON) butonuna basarak JSON dosyasını indirin.
7.  İndirdiğiniz dosyanın adını tam olarak **`credentials.json`** yapın ve bu projenin ana klasörüne (yani `app.py` ile yan yana) taşıyın.

### 3. Uygulamayı Başlatma

1.  Terminal (PowerShell veya Komut Satırı) açın ve proje klasörüne gidin.
2.  Gerekli kütüphaneleri yükleyin:
    ```bash
    pip install -r requirements.txt --trusted-host pypi.org --trusted-host files.pythonhosted.org
    ```
3.  Flask backend sunucusunu çalıştırın:
    ```bash
    python app.py
    ```
4.  Tarayıcınızdan **`http://localhost:5000`** adresine gidin.
5.  Dashboard açıldığında Google Drive sekmesine girip **Hesabı Bağla** butonuna tıklayarak hesabınızı güvenle yetkilendirebilirsiniz. (Giriş yaptıktan sonra tarayıcınızda kimlik doğrulandı uyarısı görünecek ve dashboard otomatik olarak güncellenecektir).
