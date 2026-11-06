from dataclasses import dataclass
from abc import ABC, abstractmethod
import numpy as np
from typing import List

@dataclass
class TextBlock:
    text: str
    x: int
    y: int
    width: int
    height: int
    confidence: float

class OCREngine(ABC):
    @abstractmethod
    async def recognize_async(self, image: np.ndarray) -> List[TextBlock]:
        """
        Recognize text from an image.
        Returns a list of TextBlock objects.
        """
        pass
    
    @abstractmethod
    def recognize(self, image: np.ndarray) -> List[TextBlock]:
        """
        Synchronous wrapper for recognize_async.
        """
        pass
