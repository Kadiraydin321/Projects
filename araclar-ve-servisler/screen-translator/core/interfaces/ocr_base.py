from dataclasses import dataclass
from abc import ABC, abstractmethod
from typing import List, Optional, Any

@dataclass
class TextBlock:
    text: str
    x: int
    y: int
    width: int
    height: int
    confidence: float = 1.0
    language: Optional[str] = None
    translated_text: Optional[str] = None

    @property
    def right(self) -> int:
        return self.x + self.width

    @property
    def bottom(self) -> int:
        return self.y + self.height

    def contains_point(self, px: int, py: int) -> bool:
        return self.x <= px <= self.right and self.y <= py <= self.bottom


class BaseOCREngine(ABC):
    """
    Tüm OCR motorları (WinRT, RapidOCR, Tesseract vb.) için standart soyut arayüz.
    Yeni bir OCR motoru eklemek için bu sınıf miras alınır.
    """
    
    @abstractmethod
    def initialize(self, language: str = "en") -> bool:
        """Motoru başlatır ve dili yükler."""
        pass

    @abstractmethod
    def recognize(self, image: Any) -> List[TextBlock]:
        """Görüntüyü analiz edip algılanan metin bloklarını döndürür."""
        pass

    @abstractmethod
    def get_supported_languages(self) -> List[str]:
        """Desteklenen dil kodları listesini döndürür."""
        pass
