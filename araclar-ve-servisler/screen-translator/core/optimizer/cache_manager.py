from collections import OrderedDict
from typing import Optional, List, Dict
import hashlib
try:
    from core.interfaces.ocr_base import TextBlock
except ImportError:
    from ..interfaces.ocr_base import TextBlock

class CacheManager:
    """
    İki kademeli akıllı önbellek:
    1. Metin Hash LRU Önbelleği (Aynı metin ekranın neresinde çıkarsa çıksın 0ms çeviri)
    2. Konumsal / Titreme Önleyici Kararlılık (Anti-Flicker & Spatial Persistence)
    """

    def __init__(self, capacity: int = 2000):
        self.capacity = capacity
        self._text_cache: OrderedDict[str, str] = OrderedDict()
        self._last_blocks: List[TextBlock] = []

    def _hash_text(self, text: str) -> str:
        cleaned = text.strip().lower()
        return hashlib.md5(cleaned.encode('utf-8')).hexdigest()

    def get_translation(self, text: str) -> Optional[str]:
        if not text or not text.strip():
            return text

        key = self._hash_text(text)
        if key in self._text_cache:
            self._text_cache.move_to_end(key)
            return self._text_cache[key]
        return None

    def put_translation(self, text: str, translated: str):
        if not text or not translated:
            return

        key = self._hash_text(text)
        self._text_cache[key] = translated
        self._text_cache.move_to_end(key)

        if len(self._text_cache) > self.capacity:
            self._text_cache.popitem(last=False)

    def populate_cached_translations(self, blocks: List[TextBlock]) -> List[TextBlock]:
        """
        Algılanan blokların önbellekte olanlarını hemen doldurur.
        Doldurulmamış olanlar için `translated_text` None kalır.
        """
        for block in blocks:
            cached = self.get_translation(block.text)
            if cached:
                block.translated_text = cached
        return blocks

    def update_last_blocks(self, blocks: List[TextBlock]):
        self._last_blocks = blocks

    def get_last_blocks(self) -> List[TextBlock]:
        return self._last_blocks

    def clear(self):
        self._text_cache.clear()
        self._last_blocks.clear()
