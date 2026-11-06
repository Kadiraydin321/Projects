from typing import Optional, Tuple, Any
import logging

try:
    import numpy as np
except ImportError:
    np = None

try:
    from core.interfaces.capture_base import BaseCaptureEngine
except ImportError:
    from ...interfaces.capture_base import BaseCaptureEngine

logger = logging.getLogger("MSSCaptureEngine")

class MSSCaptureEngine(BaseCaptureEngine):
    """
    Python `mss` kütüphanesini kullanarak ultra hızlı ekran yakalama motoru.
    Windows, Linux ve macOS üzerinde donanım hızlandırmalı yakalama sağlar.
    """

    def __init__(self):
        self._sct = None
        self._init_sct()

    def _init_sct(self):
        try:
            import mss
            self._sct = mss.mss()
        except ImportError:
            logger.debug("mss modülü yüklü değil.")
            self._sct = None

    def capture_region(self, x: int, y: int, width: int, height: int) -> Optional[Any]:
        if self._sct is None:
            self._init_sct()
            if self._sct is None:
                return None

        monitor = {"top": int(y), "left": int(x), "width": int(width), "height": int(height)}
        try:
            sct_img = self._sct.grab(monitor)
            if np is not None:
                img = np.array(sct_img)
                return img[:, :, :3]
            return sct_img.raw
        except Exception as e:
            logger.error(f"Ekran yakalama hatası: {e}")
            return None

    def capture_full_screen(self) -> Optional[Any]:
        if self._sct is None:
            self._init_sct()
            if self._sct is None:
                return None

        try:
            monitor = self._sct.monitors[0]
            sct_img = self._sct.grab(monitor)
            if np is not None:
                img = np.array(sct_img)
                return img[:, :, :3]
            return sct_img.raw
        except Exception as e:
            logger.error(f"Tam ekran yakalama hatası: {e}")
            return None

    def get_screen_size(self) -> Tuple[int, int]:
        if self._sct and len(self._sct.monitors) > 1:
            m = self._sct.monitors[1]
            return m["width"], m["height"]
        return 1920, 1080

    def close(self):
        if self._sct:
            try:
                self._sct.close()
            except Exception:
                pass
            self._sct = None
