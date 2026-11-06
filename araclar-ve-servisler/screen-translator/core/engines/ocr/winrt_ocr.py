import asyncio
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

logger = logging.getLogger("WinRTOCREngine")

class WinRTOCREngine(BaseOCREngine):
    """
    Windows 10/11 yerleşik donanım hızlandırmalı Windows.Media.Ocr motoru.
    Gecikme süresi yaklaşık 10-20ms'dir ve sistem kaynaklarını minimum tüketir.
    """

    def __init__(self, language: str = "en", language_tag: str = None, **kwargs):
        self.language_tag = language_tag or language
        self.engine = None
        self.initialize(self.language_tag)

    def initialize(self, language: str = "en") -> bool:
        self.language_tag = language
        try:
            import winrt.windows.media.ocr as ocr
            import winrt.windows.globalization as globalization

            lang = globalization.Language(language)
            if not ocr.OcrEngine.is_language_supported(lang):
                logger.warning(f"WinRT OCR dili ({language}) yüklü değil, varsayılan profil dili kullanılıyor.")
                self.engine = ocr.OcrEngine.try_create_from_user_profile_languages()
            else:
                self.engine = ocr.OcrEngine.try_create_from_language(lang)
            return self.engine is not None
        except Exception as e:
            logger.debug(f"WinRT OCR başlatılamadı (Windows ortamı olmayabilir): {e}")
            self.engine = None
            return False

    def get_supported_languages(self) -> List[str]:
        try:
            import winrt.windows.media.ocr as ocr
            languages = ocr.OcrEngine.get_available_recognizer_languages()
            return [l.language_tag for l in languages]
        except Exception:
            return ["en", "tr", "de", "fr", "es", "ru", "zh-Hans", "ja", "ko"]

    async def _recognize_async(self, image: Any) -> List[TextBlock]:
        if self.engine is None or image is None or np is None:
            return []

        import winrt.windows.graphics.imaging as imaging
        import winrt.windows.storage.streams as streams

        height, width = image.shape[:2]

        rgba_image = np.zeros((height, width, 4), dtype=np.uint8)
        rgba_image[:, :, 0] = image[:, :, 2] # R
        rgba_image[:, :, 1] = image[:, :, 1] # G
        rgba_image[:, :, 2] = image[:, :, 0] # B
        rgba_image[:, :, 3] = 255            # A

        image_bytes = rgba_image.tobytes()

        data_writer = streams.DataWriter()
        data_writer.write_bytes(list(image_bytes))
        buffer = data_writer.detach_buffer()

        software_bitmap = imaging.SoftwareBitmap.create_copy_from_buffer(
            buffer,
            imaging.BitmapPixelFormat.RGBA8,
            width,
            height
        )

        try:
            result = await self.engine.recognize_async(software_bitmap)
        except Exception as e:
            logger.error(f"WinRT OCR İşleme Hatası: {e}")
            return []

        text_blocks: List[TextBlock] = []
        if result and result.lines:
            for line in result.lines:
                if not line.words:
                    continue

                min_x = min(w.bounding_rect.x for w in line.words)
                min_y = min(w.bounding_rect.y for w in line.words)
                max_x = max(w.bounding_rect.x + w.bounding_rect.width for w in line.words)
                max_y = max(w.bounding_rect.y + w.bounding_rect.height for w in line.words)

                text_blocks.append(TextBlock(
                    text=line.text,
                    x=int(min_x),
                    y=int(min_y),
                    width=int(max_x - min_x),
                    height=int(max_y - min_y),
                    confidence=1.0,
                    language=self.language_tag
                ))

        return text_blocks

    def recognize(self, image: Any) -> List[TextBlock]:
        if self.engine is None or np is None:
            return []
            
        loop = asyncio.new_event_loop()
        try:
            asyncio.set_event_loop(loop)
            return loop.run_until_complete(self._recognize_async(image))
        finally:
            loop.close()
