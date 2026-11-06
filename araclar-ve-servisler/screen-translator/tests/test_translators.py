import unittest
import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from core.engines.translation.gemini_translator import GeminiTranslator
from core.engines.translation.google_translator import GoogleTranslatorEngine
from core.engines.translation.ollama_translator import OllamaTranslator

class TestTranslators(unittest.TestCase):

    def test_gemini_without_api_key_fallback(self):
        """API anahtarı verilmediğinde uygulamanın çökmediğini ve metni koruduğunu doğrular."""
        gemini = GeminiTranslator(api_key="")
        res = gemini.translate_batch(["Play Game", "Settings", "Exit"])
        self.assertEqual(res, ["Play Game", "Settings", "Exit"])

    def test_gemini_empty_texts(self):
        gemini = GeminiTranslator(api_key="fake-key")
        res = gemini.translate_batch([])
        self.assertEqual(res, [])
        res2 = gemini.translate_batch(["", "  "])
        self.assertEqual(res2, ["", "  "])

    def test_google_translator_fallback(self):
        """Google Translate motorunun boş metinleri ve temel batch yapısını doğru ele aldığını doğrular."""
        gtrans = GoogleTranslatorEngine(source_lang="en", target_lang="tr")
        self.assertEqual(gtrans.translate(""), "")
        self.assertEqual(gtrans.translate("   "), "   ")

    def test_ollama_translator_empty(self):
        ollama = OllamaTranslator()
        self.assertEqual(ollama.translate(""), "")

if __name__ == '__main__':
    unittest.main()
