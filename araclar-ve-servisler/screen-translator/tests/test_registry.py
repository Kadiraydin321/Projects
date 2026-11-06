import unittest
import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from core.registry import PluginRegistry
from core.interfaces.ocr_base import BaseOCREngine, TextBlock
from core.interfaces.translator_base import BaseTranslatorEngine
from core.interfaces.capture_base import BaseCaptureEngine

class CustomTestOCR(BaseOCREngine):
    def initialize(self, language="en"): return True
    def recognize(self, image): return [TextBlock("Test", 0, 0, 50, 20)]
    def get_supported_languages(self): return ["en"]

class CustomTestTranslator(BaseTranslatorEngine):
    def get_engine_name(self): return "Custom AI"
    def translate(self, text): return f"TR_{text}"
    def translate_batch(self, texts): return [f"TR_{t}" for t in texts]

class TestPluginRegistry(unittest.TestCase):

    def test_dynamic_registration(self):
        # OCR Ekleme ve Çağırma
        PluginRegistry.register_ocr("custom_ocr", CustomTestOCR)
        self.assertIn("custom_ocr", PluginRegistry.list_ocr_engines())
        ocr_inst = PluginRegistry.create_ocr("custom_ocr")
        self.assertIsInstance(ocr_inst, CustomTestOCR)
        blocks = ocr_inst.recognize(None)
        self.assertEqual(blocks[0].text, "Test")

        # Çevirmen Ekleme ve Çağırma
        PluginRegistry.register_translator("custom_ai", CustomTestTranslator)
        self.assertIn("custom_ai", PluginRegistry.list_translator_engines())
        trans_inst = PluginRegistry.create_translator("custom_ai")
        self.assertIsInstance(trans_inst, CustomTestTranslator)
        res = trans_inst.translate_batch(["hello", "world"])
        self.assertEqual(res, ["TR_hello", "TR_world"])

if __name__ == '__main__':
    unittest.main()
