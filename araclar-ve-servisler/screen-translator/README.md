# Screen Translator AI (Google Lens Stili Anlık Ekran Çevirici)

Ekrandaki yazıları gerçek zamanlı olarak algılayıp yapay zekaya (Google Gemini Flash AI) aktaran, kullanıcının okuduğu metnin üzerinde yerinde ve **Google Lens benzeri kaydırmalı (swipe slider)** perde efektiyle gösteren ultra optimize edilmiş anlık ekran çeviri uygulaması.

Windows masaüstü ve Android telefon ile tam uyumludur. **Kotlin, Node.js ve Electron kullanılmadan** saf, hafif ve yüksek performanslı mimarilerle (Python + Pure Java 17) inşa edilmiştir.

---

## 🚀 Öne Çıkan Özellikler

1. **Google Lens Kaydırma Çubuğu (Swipe Slider Mode)**:
   - Ekran üzerinde sürüklenebilir dikey perde çizgisi ve tutamağı (`◀ ▶`).
   - Perdenin sağında yapay zeka çevirisi, solunda orijinal ekran içeriği dinamik olarak gösterilir.
   - İstenirse tam ekran yerinde ikame (In-place replacement) moduna geçirilebilir.
2. **Google Lens'ten Daha Hızlı Optimizasyon (0ms / 0% CPU Durağanlık)**:
   - **Kare Farkı Dedektörü (FrameDiffDetector)**: Ekran sabitken veya kullanıcı okurken OCR ve Çeviri adımlarını atlayarak gereksiz CPU/GPU yükünü ve API maliyetini sıfıra indirir.
   - **İki Kademeli LRU Önbellek**: Aynı metinler ve benzer koordinatlar 0ms içinde anında ekrana yansıtılır.
   - **Akıllı Cümle/Paragraf Kümeleme**: Parçalanmış satırları anlamlı cümlelere birleştirerek yapay zekaya tek seferde gönderir (daha doğal çeviri + minimum API çağrısı).
3. **Yapay Zeka ve Çeviri Motorları**:
   - **Google Gemini 2.0 / 1.5 Flash**: ~150-200ms ultra düşük gecikme, ekran bağlamını ve terimleri koruyan toplu (batch) JSON çevirisi.
   - **Google Translate**: Ücretsiz ve API anahtarsız yedek motor.
   - **Ollama**: Yerel (offline) çalışan LLM'ler (Llama 3.2, Qwen vb.) ile çevrimdışı kullanım.
4. **Çoklu OCR Motorları**:
   - **Windows Media OCR (WinRT)**: Donanım hızlandırmalı yerel Windows OCR (~15ms).
   - **RapidOCR (ONNX Runtime)**: Çapraz platform CPU/GPU ONNX OCR.
5. **Modüler Eklenti Mimarisi (Plugin Registry)**:
   - Yeni bir OCR, Çeviri veya Yakalama motoru tek bir sınıf miras alınarak (`BaseOCREngine`, `BaseTranslatorEngine`, `BaseCaptureEngine`) tek satırda sisteme kaydedilebilir veya çıkarılabilir.
6. **Tıklama Geçirgenliği (Click-Through)**:
   - `Ctrl + Shift + S` ile katman tıklama geçirgen hale gelir; kullanıcı arkadaki oyunu, videoyu veya uygulamayı kesintisiz kullanabilir.

---

## 📁 Proje Dizin Yapısı

```
screen_translator/
│
├── core/                         # Platform Bağımsız Çekirdek
│   ├── config.py                 # Yapılandırma Yöneticisi (JSON)
│   ├── registry.py               # Dinamik Eklenti Kayıt Defteri (PluginRegistry)
│   ├── pipeline.py               # Eşzamansız Optimizasyon & Çeviri Hattı
│   │
│   ├── interfaces/               # Soyut Taban Sınıflar (Modüler Arayüzler)
│   │   ├── capture_base.py       # BaseCaptureEngine
│   │   ├── ocr_base.py           # BaseOCREngine, TextBlock
│   │   └── translator_base.py    # BaseTranslatorEngine
│   │
│   ├── optimizer/                # Performans Motoru
│   │   ├── frame_diff.py         # Ekran değişim dedektörü (pHash/diff)
│   │   ├── cache_manager.py      # İki kademeli LRU önbellek
│   │   └── text_clusterer.py     # Satır & paragraf birleştirici
│   │
│   └── engines/                  # Takılabilir Motor Eklentileri
│       ├── capture/              # MSS / Mock
│       ├── ocr/                  # WinRT / RapidOCR ONNX / Mock
│       └── translation/          # Google Gemini Flash / Google / Ollama
│
├── platforms/
│   ├── windows/                  # Windows Masaüstü Bileşenleri
│   │   ├── lens_overlay.py       # Google Lens Kaydırmalı Katman (PyQt5)
│   │   ├── region_selector.py    # Şeffaf Alan Seçici
│   │   ├── settings_window.py    # Koyu Temalı Ayarlar İletişim Kutusu
│   │   └── tray_manager.py       # Sistem Tepsisi (pystray)
│   │
│   └── android/                  # Android Platformu (Saf Java, Kotlin'siz)
│       ├── app/                  # Android Studio / Gradle Projesi
│       │   ├── src/main/AndroidManifest.xml
│       │   └── src/main/java/com/translator/lens/
│       │       ├── MainActivity.java            # Başlatıcı aktivite
│       │       ├── LensOverlayService.java      # Kayan pencere (Floating overlay)
│       │       ├── LensSliderView.java          # Google Lens dokunmatik kaydırıcı
│       │       ├── ScreenCaptureService.java    # MediaProjection ekran yakalama
│       │       ├── TranslationBridgeClient.java # Asenkron çeviri köprüsü
│       │       └── TextBlockModel.java          # Veri modeli
│       └── python_bridge/
│           └── bridge_server.py  # Android için hafif Python HTTP köprüsü
│
├── tests/                        # Birim ve Entegrasyon Testleri
│   ├── test_optimizer.py
│   ├── test_registry.py
│   ├── test_translators.py
│   └── test_pipeline.py
│
├── main_app.py                   # Ana Masaüstü Uygulaması
├── run_translator.py             # Başlatıcı Script
├── Baslat_ScreenTranslator.bat   # Windows Çift Tıklama Başlatıcısı
└── translator_requirements.txt   # Bağımlılıklar
```

---

## 💻 Kurulum ve Çalıştırma

### 1. Windows Masaüstü

```bash
# Bağımlılıkları yükleyin
pip install -r translator_requirements.txt

# Uygulamayı başlatın
python run_translator.py
# veya doğrudan:
Baslat_ScreenTranslator.bat
```

#### Varsayılan Kısayollar:
- `Ctrl + Shift + R`: Çevrilecek ekran alanını seç (Google Lens bölgesi).
- `Ctrl + Shift + T`: Çeviriyi başlat / duraklat.
- `Ctrl + Shift + S`: Tıklama geçirgenliğini (Click-through) aç / kapat.

---

### 2. Android Telefon (Saf Java 17, 0% Kotlin)

1. `platforms/android/app` projesini **Android Studio** ile açın.
2. Derleyip cihazınıza veya emülatöre yükleyin (`./gradlew assembleDebug`).
3. Uygulamayı açtığınızda:
   - "Diğer uygulamaların üzerinde gösterme" (Overlay) iznini verin.
   - "Ekran yakalama" (MediaProjection) iznini onaylayın.
4. Ekranda beliren Google Lens katmanında parmağınızı kaydırarak canlı çeviriyi okuyun.
5. İsteğe bağlı: Python motoruna bağlanmak için `platforms/android/python_bridge/bridge_server.py` sunucusunu çalıştırabilirsiniz.

---

## 🧩 Kolayca Yeni Özellik / Motor Ekleme

Yeni bir çevirmen veya OCR motoru eklemek yalnızca birkaç satırdır:

```python
from core.registry import PluginRegistry
from core.interfaces.translator_base import BaseTranslatorEngine

class MyDeepLTranslator(BaseTranslatorEngine):
    def get_engine_name(self):
        return "DeepL Pro AI"

    def translate(self, text: str) -> str:
        # Kendi API çağrınızı buraya yazın
        return f"TR: {text}"

    def translate_batch(self, texts: list) -> list:
        return [self.translate(t) for t in texts]

# Kayıt defterine kaydet:
PluginRegistry.register_translator("deepl", MyDeepLTranslator)
```

Artık `config.json` veya Ayarlar panelinden motor olarak `"deepl"` seçilebilir!

---

## 🧪 Testlerin Çalıştırılması

Tüm optimizasyon, kayıt defteri, çeviri ve işlem hattı testlerini çalıştırmak için:

```bash
python3 -m unittest discover tests
```
