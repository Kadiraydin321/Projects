import unittest
import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from core.optimizer.frame_diff import FrameDiffDetector
from core.optimizer.cache_manager import CacheManager
from core.optimizer.text_clusterer import TextClusterer
from core.interfaces.ocr_base import TextBlock

class TestOptimizerModules(unittest.TestCase):

    def test_frame_diff_pure_python(self):
        """NumPy olmadan da FrameDiffDetector'ın çalıştığını doğrular."""
        detector = FrameDiffDetector(threshold=0.02)
        frame1 = bytearray([128] * 1024)
        frame2 = bytearray([128] * 1024)
        frame3 = bytearray([250] * 1024)

        # İlk kare referans kaydedilir -> True
        self.assertTrue(detector.has_changed(frame1))
        # İkinci aynı kare değişmedi -> False (OCR ve Çeviri atlanır)
        self.assertFalse(detector.has_changed(frame2))
        # Farklı kare değişti -> True
        self.assertTrue(detector.has_changed(frame3))

    def test_cache_manager(self):
        """Önbellek metinleri doğru saklamalı ve kapasite aşımında LRU kuralını işletmeli."""
        cache = CacheManager(capacity=2)
        cache.put_translation("Hello", "Merhaba")
        cache.put_translation("World", "Dünya")

        # World'e eriştik; en eski eleman Hello oldu
        self.assertEqual(cache.get_translation("World"), "Dünya")

        # Yeni eleman eklenince en eski (Hello) atılmalı
        cache.put_translation("Screen", "Ekran")
        self.assertEqual(cache.get_translation("Screen"), "Ekran")
        self.assertEqual(cache.get_translation("World"), "Dünya")
        self.assertIsNone(cache.get_translation("Hello"))

    def test_text_clusterer(self):
        """Alt alta ve yakın koordinattaki metin satırları tek blokta birleştirilmeli."""
        clusterer = TextClusterer()
        blocks = [
            TextBlock("This is the first line", 100, 50, 200, 20),
            TextBlock("and this is the second line.", 100, 75, 220, 20),
            TextBlock("Different separate title", 100, 250, 180, 25) # Uzak blok
        ]

        clustered = clusterer.cluster_blocks(blocks)
        self.assertEqual(len(clustered), 2)
        self.assertIn("This is the first line and this is the second line.", clustered[0].text)
        self.assertEqual(clustered[1].text, "Different separate title")
        self.assertEqual(clustered[0].x, 100)
        self.assertEqual(clustered[0].y, 50)
        self.assertEqual(clustered[0].height, 45) # 50'den 95'e kadar (75 + 20)

if __name__ == '__main__':
    unittest.main()
