import time
import threading
import logging
from typing import Optional, List, Callable, Dict, Any

from .config import ConfigManager
from .registry import PluginRegistry
from .optimizer.frame_diff import FrameDiffDetector
from .optimizer.cache_manager import CacheManager
from .optimizer.text_clusterer import TextClusterer
from .interfaces.ocr_base import TextBlock

# Eklentilerin kayıtlı olduğundan emin ol
from . import engines

logger = logging.getLogger("TranslationPipeline")

class TranslationPipeline:
    """
    Ekran yakalama, kare farkı filtreleme, OCR, kümeleme, önbellekleme
    ve yapay zeka çeviri adımlarını yöneten optimize edilmiş eşzamansız işlem hattı.
    """

    def __init__(self, config: ConfigManager, on_update_callback: Optional[Callable[[List[TextBlock]], None]] = None):
        self.config = config
        self.on_update_callback = on_update_callback

        # Optimizasyon motorları
        threshold = float(self.config.get("frame_diff_threshold", 0.02))
        self.diff_detector = FrameDiffDetector(threshold=threshold)
        self.cache_manager = CacheManager(capacity=3000)
        self.clusterer = TextClusterer()

        # Motor nesneleri
        self.capture_engine = None
        self.ocr_engine = None
        self.translator_engine = None

        self.region: Optional[Dict[str, int]] = self.config.get("last_region")
        self.is_running = False
        self.is_paused = False
        self._thread: Optional[threading.Thread] = None

        self.reload_engines()

    def reload_engines(self):
        """Konfigürasyondaki motor seçimlerine göre nesneleri yeniden oluşturur."""
        # Yakalama
        cap_name = self.config.get("capture_engine", "mss")
        self.capture_engine = PluginRegistry.create_capture(cap_name) or PluginRegistry.create_capture("mss")

        # OCR
        ocr_name = self.config.get("ocr_engine", "winrt")
        src_lang = self.config.get("source_lang", "auto")
        ocr_lang = "en" if src_lang == "auto" else src_lang
        self.ocr_engine = PluginRegistry.create_ocr(ocr_name, language=ocr_lang) or PluginRegistry.create_ocr("winrt")

        # Çevirmen
        trans_name = self.config.get("translation_engine", "gemini")
        tgt_lang = self.config.get("target_lang", "tr")

        if trans_name == "gemini":
            api_key = self.config.get("gemini_api_key", "")
            model = self.config.get("gemini_model", "gemini-2.0-flash")
            self.translator_engine = PluginRegistry.create_translator(
                "gemini", api_key=api_key, model=model, source_lang=src_lang, target_lang=tgt_lang
            )
        else:
            self.translator_engine = PluginRegistry.create_translator(
                trans_name, source_lang=src_lang, target_lang=tgt_lang
            )

        if not self.translator_engine:
            self.translator_engine = PluginRegistry.create_translator(
                "google", source_lang=src_lang, target_lang=tgt_lang
            )

        logger.info(f"Pipeline motorları güncellendi -> Yakalama: {cap_name}, OCR: {ocr_name}, Çevirmen: {trans_name}")

    def start(self):
        if self.is_running:
            return
        self.is_running = True
        self.is_paused = False
        self._thread = threading.Thread(target=self._run_loop, daemon=True)
        self._thread.start()
        logger.info("Pipeline başlatıldı.")

    def pause(self):
        self.is_paused = True

    def resume(self):
        self.is_paused = False
        self.diff_detector.reset()

    def stop(self):
        self.is_running = False
        if self._thread and self._thread.is_alive():
            self._thread.join(timeout=1.0)
        if self.capture_engine:
            self.capture_engine.close()
        logger.info("Pipeline durduruldu.")

    def set_region(self, x: int, y: int, w: int, h: int):
        self.region = {"x": x, "y": y, "w": w, "h": h}
        self.config.set("last_region", self.region)
        self.diff_detector.reset()

    def _run_loop(self):
        while self.is_running:
            fps = max(1, int(self.config.get("fps", 5)))
            interval = 1.0 / fps

            if self.is_paused or not self.region:
                time.sleep(0.1)
                continue

            loop_start = time.time()

            try:
                self._process_frame()
            except Exception as e:
                logger.error(f"Pipeline döngü hatası: {e}")

            elapsed = time.time() - loop_start
            sleep_duration = interval - elapsed
            if sleep_duration > 0:
                time.sleep(sleep_duration)

    def _process_frame(self):
        if not self.capture_engine or not self.ocr_engine or not self.translator_engine:
            return

        x, y, w, h = self.region["x"], self.region["y"], self.region["w"], self.region["h"]

        # 1. Adım: Ekran Yakalama
        frame = self.capture_engine.capture_region(x, y, w, h)
        if frame is None or (hasattr(frame, "size") and frame.size == 0) or len(frame) == 0:
            return

        # 2. Adım: Hızlı Kare Değişim Kontrolü (Optimizasyon - Google Lens'ten daha hızlı)
        if not self.diff_detector.has_changed(frame):
            # Kare değişmedi; gereksiz OCR ve Çeviri hesaplamalarını tamamen atla!
            return

        # 3. Adım: OCR
        blocks = self.ocr_engine.recognize(frame)
        if not blocks:
            # Ekranda yazı kalmadıysa temizleme bildirimi gönder
            if self.on_update_callback:
                self.on_update_callback([])
            return

        # 4. Adım: Cümle/Paragraf Kümeleme (Akıllı bağlam oluşturma)
        if self.config.get("enable_clustering", True):
            blocks = self.clusterer.cluster_blocks(blocks)

        # 5. Adım: Önbellekten kontrol et
        uncached_indices = []
        uncached_texts = []

        for idx, block in enumerate(blocks):
            cached_trans = self.cache_manager.get_translation(block.text)
            if cached_trans is not None:
                block.translated_text = cached_trans
            else:
                uncached_indices.append(idx)
                uncached_texts.append(block.text)

        # 6. Adım: Yeni metinleri Yapay Zeka ile Toplu (Batch) Çevir
        if uncached_texts:
            translations = self.translator_engine.translate_batch(uncached_texts)
            for orig_idx, trans in zip(uncached_indices, translations):
                blocks[orig_idx].translated_text = trans
                self.cache_manager.put_translation(blocks[orig_idx].text, trans)

        # 7. Adım: Arayüz Katmanına Güncellemeyi İlet
        self.cache_manager.update_last_blocks(blocks)
        if self.on_update_callback:
            self.on_update_callback(blocks)
