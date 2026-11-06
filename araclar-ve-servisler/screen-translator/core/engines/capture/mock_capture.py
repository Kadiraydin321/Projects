from typing import Optional, Tuple, Any
try:
    from core.interfaces.capture_base import BaseCaptureEngine
except ImportError:
    from ...interfaces.capture_base import BaseCaptureEngine

try:
    import numpy as np
except ImportError:
    np = None

class MockCaptureEngine(BaseCaptureEngine):
    """
    Testler için sanal ekran yakalayıcı.
    Sentetik bir görüntü matrisi veya bayt dizisi üretir.
    """

    def __init__(self, width: int = 800, height: int = 600):
        self.width = width
        self.height = height

    def capture_region(self, x: int, y: int, width: int, height: int) -> Optional[Any]:
        if np is not None:
            return np.full((height, width, 3), 200, dtype=np.uint8)
        return bytearray([200] * (width * height * 3))

    def capture_full_screen(self) -> Optional[Any]:
        if np is not None:
            return np.full((self.height, self.width, 3), 200, dtype=np.uint8)
        return bytearray([200] * (self.width * self.height * 3))

    def get_screen_size(self) -> Tuple[int, int]:
        return self.width, self.height

    def close(self):
        pass
