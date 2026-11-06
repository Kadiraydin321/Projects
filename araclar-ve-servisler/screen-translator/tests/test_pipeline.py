import unittest
import sys
import os
import time

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from core.config import ConfigManager
from core.pipeline import TranslationPipeline
from core.registry import PluginRegistry
from core.interfaces.ocr_base import BaseOCREngine, TextBlock
from core.interfaces.translator_base import BaseTranslatorEngine
from core.interfaces.capture_base import BaseCaptureEngine

class DummyCapture(BaseCaptureEngine):
    def __init__(self):
        self.counter = 0
    def capture_region(self, x, y, width, height):
        self.counter += 1
        return bytearray([(self.counter * 20 + i) % 256 for i in range(1024)])
    def capture_full_screen(self): return bytearray([128] * 1024)
    def get_screen_size(self): return 800, 600
    def close(self): pass

class DummyOCR(BaseOCREngine):
    def __init__(self, language="en"):
        self.language = language
    def initialize(self, language="en"): return True
    def recognize(self, image):
        return [
            TextBlock("Hello world", 10, 10, 100, 25),
            TextBlock("Instant screen translate", 10, 40, 180, 25)
        ]
    def get_supported_languages(self): return ["en"]

class DummyTranslator(BaseTranslatorEngine):
    def __init__(self, *args, **kwargs):
        super().__init__()
    def get_engine_name(self): return "Dummy Translator"
    def translate(self, text): return f"CEVIRI_{text}"
    def translate_batch(self, texts): return [f"CEVIRI_{t}" for t in texts]

class TestPipelineFlow(unittest.TestCase):

    def setUp(self):
        PluginRegistry.register_capture("dummy_cap", DummyCapture)
        PluginRegistry.register_ocr("dummy_ocr", DummyOCR)
        PluginRegistry.register_translator("dummy_trans", DummyTranslator)

        self.config = ConfigManager("test_config.json")
        self.config.set("capture_engine", "dummy_cap")
        self.config.set("ocr_engine", "dummy_ocr")
        self.config.set("translation_engine", "dummy_trans")
        self.config.set("frame_diff_threshold", 0.01)

    def tearDown(self):
        if os.path.exists("test_config.json"):
            os.remove("test_config.json")

    def test_pipeline_execution(self):
        emitted_results = []
        def on_update(blocks):
            emitted_results.append(blocks)

        pipeline = TranslationPipeline(self.config, on_update_callback=on_update)
        pipeline.set_region(0, 0, 800, 600)

        # 1 kare elle işlet
        pipeline._process_frame()

        self.assertTrue(len(emitted_results) > 0)
        blocks = emitted_results[0]
        self.assertTrue(len(blocks) > 0)
        self.assertTrue(any("CEVIRI_" in (b.translated_text or "") for b in blocks))

if __name__ == '__main__':
    unittest.main()
