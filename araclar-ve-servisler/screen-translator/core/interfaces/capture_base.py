from abc import ABC, abstractmethod
from typing import Optional, Tuple, Any

class BaseCaptureEngine(ABC):
    """
    Ekran yakalama sağlayıcıları için ortak arayüz.
    Windows (MSS/DXGI) veya Android (MediaProjection) bu arayüzü uygular.
    """

    @abstractmethod
    def capture_region(self, x: int, y: int, width: int, height: int) -> Optional[Any]:
        """
        Belirtilen ekran bölgesini yakalayıp görüntü matrisi veya bayt dizisi döner.
        """
        pass

    @abstractmethod
    def capture_full_screen(self) -> Optional[Any]:
        """Tüm ekranı yakalar."""
        pass

    @abstractmethod
    def get_screen_size(self) -> Tuple[int, int]:
        """Ekran çözünürlüğünü (genişlik, yükseklik) döner."""
        pass

    @abstractmethod
    def close(self):
        """Kaynakları serbest bırakır."""
        pass
