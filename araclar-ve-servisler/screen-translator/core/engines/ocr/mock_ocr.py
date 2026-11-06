from typing import List, Any
try:
    from core.interfaces.ocr_base import BaseOCREngine, TextBlock
except ImportError:
    from ...interfaces.ocr_base import BaseOCREngine, TextBlock

class MockOCREngine(BaseOCREngine):
    """
    Test ve geliştirme ortamı için simülasyon OCR motoru.
    Görüntü analiz etmeden önceden belirlenen test metin bloklarını döner.
    """

    def __init__(self, predefined_blocks: List[TextBlock] = None, language: str = "en", **kwargs):
        self.language = language
        self.predefined_blocks = predefined_blocks or [
            TextBlock("Artificial Intelligence", 50, 100, 200, 30),
            TextBlock("Instant Screen Translation", 50, 140, 250, 30),
            TextBlock("Fast, smooth and accurate.", 50, 180, 220, 30)
        ]

    def initialize(self, language: str = "en") -> bool:
        return True

    def get_supported_languages(self) -> List[str]:
        return ["en", "tr", "de", "fr"]

    def recognize(self, image: Any) -> List[TextBlock]:
        return self.predefined_blocks
