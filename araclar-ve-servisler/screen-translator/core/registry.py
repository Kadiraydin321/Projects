from typing import Dict, Type, Any, List, Optional
import logging
from .interfaces.ocr_base import BaseOCREngine
from .interfaces.translator_base import BaseTranslatorEngine
from .interfaces.capture_base import BaseCaptureEngine

logger = logging.getLogger("PluginRegistry")

class PluginRegistry:
    """
    Uygulama eklentilerini (OCR, Çeviri, Yakalama) dinamik olarak yöneten merkezi kayıt defteri.
    Yeni özellikler/motorlar tek bir satırla (.register_*) sisteme dahil edilebilir veya çıkarılabilir.
    """
    _ocr_engines: Dict[str, Type[BaseOCREngine]] = {}
    _translator_engines: Dict[str, Type[BaseTranslatorEngine]] = {}
    _capture_engines: Dict[str, Type[BaseCaptureEngine]] = {}

    # --- OCR Motor Kayıtları ---
    @classmethod
    def register_ocr(cls, name: str, engine_cls: Type[BaseOCREngine]):
        cls._ocr_engines[name.lower()] = engine_cls
        logger.info(f"OCR motoru kaydedildi: {name}")

    @classmethod
    def get_ocr_class(cls, name: str) -> Optional[Type[BaseOCREngine]]:
        return cls._ocr_engines.get(name.lower())

    @classmethod
    def create_ocr(cls, name: str, *args, **kwargs) -> Optional[BaseOCREngine]:
        engine_cls = cls.get_ocr_class(name)
        if engine_cls:
            return engine_cls(*args, **kwargs)
        logger.warning(f"Kayıtlı olmayan OCR motoru istendi: {name}")
        return None

    @classmethod
    def list_ocr_engines(cls) -> List[str]:
        return list(cls._ocr_engines.keys())

    # --- Çeviri Motor Kayıtları ---
    @classmethod
    def register_translator(cls, name: str, engine_cls: Type[BaseTranslatorEngine]):
        cls._translator_engines[name.lower()] = engine_cls
        logger.info(f"Çeviri motoru kaydedildi: {name}")

    @classmethod
    def get_translator_class(cls, name: str) -> Optional[Type[BaseTranslatorEngine]]:
        return cls._translator_engines.get(name.lower())

    @classmethod
    def create_translator(cls, name: str, *args, **kwargs) -> Optional[BaseTranslatorEngine]:
        engine_cls = cls.get_translator_class(name)
        if engine_cls:
            return engine_cls(*args, **kwargs)
        logger.warning(f"Kayıtlı olmayan çeviri motoru istendi: {name}")
        return None

    @classmethod
    def list_translator_engines(cls) -> List[str]:
        return list(cls._translator_engines.keys())

    # --- Yakalama Motor Kayıtları ---
    @classmethod
    def register_capture(cls, name: str, engine_cls: Type[BaseCaptureEngine]):
        cls._capture_engines[name.lower()] = engine_cls
        logger.info(f"Yakalama motoru kaydedildi: {name}")

    @classmethod
    def get_capture_class(cls, name: str) -> Optional[Type[BaseCaptureEngine]]:
        return cls._capture_engines.get(name.lower())

    @classmethod
    def create_capture(cls, name: str, *args, **kwargs) -> Optional[BaseCaptureEngine]:
        engine_cls = cls.get_capture_class(name)
        if engine_cls:
            return engine_cls(*args, **kwargs)
        logger.warning(f"Kayıtlı olmayan yakalama motoru istendi: {name}")
        return None

    @classmethod
    def list_capture_engines(cls) -> List[str]:
        return list(cls._capture_engines.keys())

    # --- Temizleme (Testler İçin) ---
    @classmethod
    def clear(cls):
        cls._ocr_engines.clear()
        cls._translator_engines.clear()
        cls._capture_engines.clear()
