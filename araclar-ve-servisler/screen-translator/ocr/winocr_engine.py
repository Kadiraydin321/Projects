import asyncio
import numpy as np
from typing import List
from .ocr_base import OCREngine, TextBlock

import winrt.windows.media.ocr as ocr
import winrt.windows.graphics.imaging as imaging
import winrt.windows.storage.streams as streams
import winrt.windows.globalization as globalization

class WinOCREngine(OCREngine):
    def __init__(self, language_tag="en"):
        self.language_tag = language_tag
        self.language = globalization.Language(language_tag)
        
        if not ocr.OcrEngine.is_language_supported(self.language):
            print(f"Warning: OCR Language '{language_tag}' is not supported or not installed on this Windows system. Falling back to default.")
            self.engine = ocr.OcrEngine.try_create_from_user_profile_languages()
        else:
            self.engine = ocr.OcrEngine.try_create_from_language(self.language)

    async def recognize_async(self, image: np.ndarray) -> List[TextBlock]:
        if image is None or image.size == 0:
            return []

        # image is BGR from mss, convert to RGBA for SoftwareBitmap
        # SoftwareBitmap typically expects BGRA8 or RGBA8
        
        height, width, channels = image.shape
        
        # Add alpha channel
        rgba_image = np.zeros((height, width, 4), dtype=np.uint8)
        rgba_image[:, :, 0] = image[:, :, 2] # R
        rgba_image[:, :, 1] = image[:, :, 1] # G
        rgba_image[:, :, 2] = image[:, :, 0] # B
        rgba_image[:, :, 3] = 255            # A
        
        # Flatten and convert to bytes
        image_bytes = rgba_image.tobytes()
        
        # Create DataWriter to write bytes to stream
        data_writer = streams.DataWriter()
        data_writer.write_bytes(list(image_bytes))
        buffer = data_writer.detach_buffer()

        # Create SoftwareBitmap
        software_bitmap = imaging.SoftwareBitmap.create_copy_from_buffer(
            buffer,
            imaging.BitmapPixelFormat.RGBA8,
            width,
            height
        )

        try:
            result = await self.engine.recognize_async(software_bitmap)
        except Exception as e:
            print(f"WinOCR Error: {e}")
            return []

        text_blocks = []
        if result and result.lines:
            for line in result.lines:
                # Combine words in a line to form a single block for easier translation overlay
                if not line.words:
                    continue
                    
                line_text = line.text
                
                # Calculate bounding box for the entire line
                min_x = min(w.bounding_rect.x for w in line.words)
                min_y = min(w.bounding_rect.y for w in line.words)
                max_x = max(w.bounding_rect.x + w.bounding_rect.width for w in line.words)
                max_y = max(w.bounding_rect.y + w.bounding_rect.height for w in line.words)
                
                width = max_x - min_x
                height = max_y - min_y
                
                text_blocks.append(TextBlock(
                    text=line_text,
                    x=int(min_x),
                    y=int(min_y),
                    width=int(width),
                    height=int(height),
                    confidence=1.0 # WinOCR doesn't expose word-level confidence directly in older APIs
                ))

        return text_blocks

    def recognize(self, image: np.ndarray) -> List[TextBlock]:
        # Run async function in a synchronous way if needed
        # Note: In PyQt5 environment, it's better to use QThread or asyncio loop properly
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            result = loop.run_until_complete(self.recognize_async(image))
            return result
        finally:
            loop.close()
