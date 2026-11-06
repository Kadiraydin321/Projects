import time
import queue
from PyQt5.QtCore import QThread, pyqtSignal

from ..capture.screen_capture import ScreenCapture
from ..ocr.winocr_engine import WinOCREngine
# from ..ocr.easyocr_engine import EasyOCREngine  # Add if implemented
from ..translation.translator import TranslatorEngine

class PipelineWorker(QThread):
    # Emits a list of tuples: (TextBlock, translated_text)
    update_overlay_signal = pyqtSignal(list)
    
    def __init__(self, config_manager):
        super().__init__()
        self.config = config_manager
        
        self.capture = ScreenCapture()
        
        # Initialize engines based on config
        ocr_type = self.config.get("ocr_engine", "winocr")
        source_lang = self.config.get("source_lang", "en")
        target_lang = self.config.get("target_lang", "tr")
        auto_detect = self.config.get("auto_detect_source", False)
        
        self.ocr_engine = WinOCREngine(language_tag=source_lang)
        
        trans_source = "auto" if auto_detect else source_lang
        self.translator = TranslatorEngine(source=trans_source, target=target_lang)
        
        self.is_running = False
        self.is_paused = False
        self.region = self.config.get("last_region")
        
        self.last_texts = [] # For anti-flicker

    def run(self):
        self.is_running = True
        fps = self.config.get("fps", 3)
        sleep_time = 1.0 / fps if fps > 0 else 0.3
        
        while self.is_running:
            if self.is_paused or not self.region:
                time.sleep(0.1)
                continue
                
            start_time = time.time()
            
            try:
                # 1. Capture
                img = self.capture.capture_region(
                    self.region["x"], 
                    self.region["y"], 
                    self.region["w"], 
                    self.region["h"]
                )
                
                # 2. OCR
                blocks = self.ocr_engine.recognize(img)
                
                # 3. Temporal stabilization (Anti-flicker)
                current_texts = [b.text for b in blocks]
                
                # Simple heuristic: if exact same texts, don't update translation
                # In a real scenario, use SequenceMatcher for better similarity check
                if current_texts != self.last_texts:
                    # 4. Translate
                    texts_to_translate = [b.text for b in blocks]
                    translated_texts = self.translator.translate_batch(texts_to_translate)
                    
                    # 5. Emit to GUI
                    results = list(zip(blocks, translated_texts))
                    self.update_overlay_signal.emit(results)
                    self.last_texts = current_texts
                
            except Exception as e:
                print(f"Pipeline error: {e}")
                
            # Sleep to maintain FPS
            elapsed = time.time() - start_time
            if elapsed < sleep_time:
                time.sleep(sleep_time - elapsed)

    def stop(self):
        self.is_running = False
        self.capture.close()

    def update_config(self):
        # Reload relevant config
        source_lang = self.config.get("source_lang", "en")
        target_lang = self.config.get("target_lang", "tr")
        auto_detect = self.config.get("auto_detect_source", False)
        
        trans_source = "auto" if auto_detect else source_lang
        self.translator.update_languages(trans_source, target_lang)
        
        # WinOCR doesn't support changing language easily, might need to re-instantiate
        self.ocr_engine = WinOCREngine(language_tag=source_lang)
