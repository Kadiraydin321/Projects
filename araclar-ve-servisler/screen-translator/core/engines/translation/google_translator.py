import urllib.request
import urllib.parse
import json
import logging
from typing import List
try:
    from core.interfaces.translator_base import BaseTranslatorEngine
except ImportError:
    from ...interfaces.translator_base import BaseTranslatorEngine

logger = logging.getLogger("GoogleTranslator")

class GoogleTranslatorEngine(BaseTranslatorEngine):
    """
    Ücretsiz ve API anahtarı gerektirmeyen Google Translate motoru.
    Eğer deep-translator yüklüyse onu kullanır, yüklü değilse
    doğrudan hafif HTTP servisini çağırır.
    """

    def __init__(self, source_lang: str = "auto", target_lang: str = "tr", **kwargs):
        super().__init__(source_lang, target_lang)
        self._deep_translator = None
        try:
            from deep_translator import GoogleTranslator
            src = "auto" if self.source_lang == "auto" else self.source_lang
            self._deep_translator = GoogleTranslator(source=src, target=self.target_lang)
        except ImportError:
            self._deep_translator = None

    def get_engine_name(self) -> str:
        return "Google Translate (Standart)"

    def update_languages(self, source_lang: str, target_lang: str):
        super().update_languages(source_lang, target_lang)
        if self._deep_translator:
            src = "auto" if source_lang == "auto" else source_lang
            try:
                self._deep_translator.source = src
                self._deep_translator.target = target_lang
            except Exception:
                pass

    def translate(self, text: str) -> str:
        if not text or not text.strip():
            return text

        if self._deep_translator:
            try:
                return self._deep_translator.translate(text)
            except Exception as e:
                logger.warning(f"deep_translator hatası: {e}, yerel HTTP fallback kullanılıyor.")

        # Hafif HTTP Fallback
        try:
            sl = self.source_lang if self.source_lang else "auto"
            tl = self.target_lang
            query = urllib.parse.quote(text)
            url = f"https://translate.googleapis.com/translate_a/single?client=gtx&sl={sl}&tl={tl}&dt=t&q={query}"
            
            req = urllib.request.Request(
                url,
                headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"}
            )
            with urllib.request.urlopen(req, timeout=4) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                translated = "".join(part[0] for part in data[0] if part and part[0])
                return translated if translated else text
        except Exception as e:
            logger.error(f"Google Çeviri Fallback Hatası: {e}")
            return text

    def translate_batch(self, texts: List[str]) -> List[str]:
        if not texts:
            return []
        return [self.translate(t) for t in texts]
