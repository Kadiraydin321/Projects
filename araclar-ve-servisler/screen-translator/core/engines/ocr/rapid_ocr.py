from typing import List, Any
import logging

try:
    import numpy as np
except ImportError:
    np = None

try:
    from core.interfaces.ocr_base import BaseOCREngine, TextBlock
except ImportError:
    from ...interfaces.ocr_base import BaseOCREngine, TextBlock

logger = logging.getLogger("RapidOCREngine")

class RapidOCREngine(BaseOCREngine):
    """
    Çapraz platform (Windows, Linux, Android) ONNX tabanlı RapidOCR motoru.
    Donanım hızlandırma (DirectML/CUDA/CPU) destekler.
    """

    def __init__(self, language: str = "en", **kwargs):
        self.language = language
        self.engine = None
        self.initialize(language)

    def initialize(self, language: str = "en") -> bool:
        self.language = language
        try:
            from rapidocr_onnxruntime import RapidOCR
            self.engine = RapidOCR()
            return True
        except ImportError:
            logger.debug("rapidocr_onnxruntime kütüphanesi bulunamadı (isteğe bağlı eklenti).")
            self.engine = None
            return False
        except Exception as e:
            logger.error(f"RapidOCR başlatma hatası: {e}")
            self.engine = None
            return False

    def get_supported_languages(self) -> List[str]:
        return ["en", "ch", "japan", "korean", "latin"]

    def recognize(self, image: Any) -> List[TextBlock]:
        if self.engine is None or image is None:
            return []

        try:
            result, _ = self.engine(image)
            if not result:
                return []

            blocks: List[TextBlock] = []
            for item in result:
                box, text, score = item
                xs = [pt[0] for pt in box]
                ys = [pt[1] for pt in box]
                min_x = int(min(xs))
                min_y = int(min(ys))
                max_x = int(max(xs))
                max_y = int(max(ys))

                blocks.append(TextBlock(
                    text=text,
                    x=min_x,
                    y=min_y,
                    width=max_x - min_x,
                    height=max_y - min_y,
                    confidence=float(score),
                    language=self.language
                ))
            return blocks

        except Exception as e:
            logger.error(f"RapidOCR tanıma hatası: {e}")
            return []
