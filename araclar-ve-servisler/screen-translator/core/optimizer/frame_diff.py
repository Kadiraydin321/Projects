from typing import Optional, Any
import logging

try:
    import numpy as np
except ImportError:
    np = None

logger = logging.getLogger("FrameDiffDetector")

class FrameDiffDetector:
    """
    Ekran görüntüsünde anlamlı bir değişiklik olup olmadığını
    mikrosaniyeler seviyesinde tespit eden optimizasyon motoru.
    Görüntüyü 32x32 boyutuna indirgeyip normalized farkı hesaplar.
    Eğer ekran durağansa OCR ve Çeviri adımlarını tamamen atlayarak 0ms gecikme sağlar.
    NumPy yüklüyse donanım vektör işlemlerini, değilse saf Python fallback'ini kullanır.
    """
    def __init__(self, threshold: float = 0.02, sample_size: tuple = (32, 32)):
        self.threshold = threshold
        self.sample_size = sample_size
        self.last_fingerprint: Optional[Any] = None

    def _compute_fingerprint_numpy(self, image: Any) -> Any:
        if image is None or image.size == 0:
            return np.zeros(self.sample_size, dtype=np.float32)

        # 1. Kanalları gri tona çevir (Genişlik ve yüksekliğe göre hızlı adım atarak veya basit ortalamayla)
        if len(image.shape) == 3 and image.shape[2] >= 3:
            b = image[:, :, 0].astype(np.float32)
            g = image[:, :, 1].astype(np.float32)
            r = image[:, :, 2].astype(np.float32)
            gray = 0.114 * b + 0.587 * g + 0.299 * r
        else:
            gray = image.astype(np.float32)

        # 2. Hızlı alt örnekleme (Downsampling)
        h, w = gray.shape
        target_h, target_w = self.sample_size
        step_y = max(1, h // target_h)
        step_x = max(1, w // target_w)
        
        sample = gray[::step_y, ::step_x]
        sample = sample[:target_h, :target_w]
        if sample.shape != self.sample_size:
            padded = np.zeros(self.sample_size, dtype=np.float32)
            padded[:sample.shape[0], :sample.shape[1]] = sample
            sample = padded

        # 3. Normalize et [0.0 - 1.0]
        max_val = np.max(sample)
        if max_val > 0:
            sample /= 255.0

        return sample

    def _compute_fingerprint_pure_python(self, image: Any) -> list:
        # Saf Python yedekleme: image liste veya bytes/bytearray olabilir
        target_h, target_w = self.sample_size
        total_samples = target_h * target_w

        if isinstance(image, (bytes, bytearray)):
            step = max(1, len(image) // total_samples)
            sampled = [image[i] / 255.0 for i in range(0, min(len(image), total_samples * step), step)]
            while len(sampled) < total_samples:
                sampled.append(0.0)
            return sampled[:total_samples]
        elif isinstance(image, list):
            # 2D veya 3D liste
            flat = []
            for row in image:
                if isinstance(row, list):
                    for val in row:
                        flat.append(val[0] if isinstance(val, (list, tuple)) else val)
                else:
                    flat.append(row)
            step = max(1, len(flat) // total_samples)
            sampled = [flat[i] / 255.0 for i in range(0, min(len(flat), total_samples * step), step)]
            while len(sampled) < total_samples:
                sampled.append(0.0)
            return sampled[:total_samples]

        return [0.0] * total_samples

    def has_changed(self, current_image: Any) -> bool:
        """
        Kare değiştiyse True, sabitse False döner.
        """
        if current_image is None:
            return False

        if np is not None and isinstance(current_image, np.ndarray):
            current_fingerprint = self._compute_fingerprint_numpy(current_image)
            if self.last_fingerprint is None:
                self.last_fingerprint = current_fingerprint
                return True
            diff = float(np.mean(np.abs(current_fingerprint - self.last_fingerprint)))
        else:
            current_fingerprint = self._compute_fingerprint_pure_python(current_image)
            if self.last_fingerprint is None:
                self.last_fingerprint = current_fingerprint
                return True
            diff = sum(abs(a - b) for a, b in zip(current_fingerprint, self.last_fingerprint)) / float(len(current_fingerprint))

        if diff > self.threshold:
            self.last_fingerprint = current_fingerprint
            return True

        return False

    def reset(self):
        """Önceki kare hafızasını sıfırlar."""
        self.last_fingerprint = None
