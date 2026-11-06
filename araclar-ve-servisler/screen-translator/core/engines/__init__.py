from ..registry import PluginRegistry
from .ocr.winrt_ocr import WinRTOCREngine
from .ocr.rapid_ocr import RapidOCREngine
from .ocr.mock_ocr import MockOCREngine
from .translation.gemini_translator import GeminiTranslator
from .translation.google_translator import GoogleTranslatorEngine
from .translation.ollama_translator import OllamaTranslator
from .capture.mss_capture import MSSCaptureEngine
from .capture.mock_capture import MockCaptureEngine

def register_default_plugins():
    """Tüm yerleşik motorları PluginRegistry'ye kaydeder."""
    # OCR Motorları
    PluginRegistry.register_ocr("winrt", WinRTOCREngine)
    PluginRegistry.register_ocr("rapidocr", RapidOCREngine)
    PluginRegistry.register_ocr("mock", MockOCREngine)

    # Çeviri Motorları
    PluginRegistry.register_translator("gemini", GeminiTranslator)
    PluginRegistry.register_translator("google", GoogleTranslatorEngine)
    PluginRegistry.register_translator("ollama", OllamaTranslator)

    # Ekran Yakalama Motorları
    PluginRegistry.register_capture("mss", MSSCaptureEngine)
    PluginRegistry.register_capture("mock", MockCaptureEngine)

# Modül yüklendiğinde otomatik kaydet
register_default_plugins()
