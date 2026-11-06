import os
import json
import urllib.request
import urllib.error
import logging
from typing import List, Optional
try:
    from core.interfaces.translator_base import BaseTranslatorEngine
except ImportError:
    from ...interfaces.translator_base import BaseTranslatorEngine

logger = logging.getLogger("GeminiTranslator")

class GeminiTranslator(BaseTranslatorEngine):
    """
    Google Gemini 2.0 / 1.5 Flash API ile yüksek hızlı ve bağlamsal ekran çeviri motoru.
    Gereksiz harici kütüphane bağımlılığı olmaksızın ultra hızlı HTTP/JSON REST API ve SDK destekler.
    Tüm metinleri tek bir yapılandırılmış batch istekte çevirerek minimum gecikme (~150ms) sağlar.
    """

    def __init__(self, api_key: Optional[str] = None, model: str = "gemini-2.0-flash", 
                 source_lang: str = "auto", target_lang: str = "tr", **kwargs):
        super().__init__(source_lang, target_lang)
        self.api_key = api_key or os.environ.get("GEMINI_API_KEY", "")
        self.model = model
        self.base_url = f"https://generativelanguage.googleapis.com/v1beta/models/{self.model}:generateContent"

    def set_api_key(self, api_key: str):
        self.api_key = api_key

    def get_engine_name(self) -> str:
        return f"Google Gemini AI ({self.model})"

    def translate(self, text: str) -> str:
        batch_res = self.translate_batch([text])
        return batch_res[0] if batch_res else text

    def translate_batch(self, texts: List[str]) -> List[str]:
        if not texts:
            return []

        # Boş metinleri ayıkla
        non_empty = [(i, t) for i, t in enumerate(texts) if t and t.strip()]
        if not non_empty:
            return texts

        if not self.api_key:
            logger.warning("Gemini API Key tanımlanmamış! Orijinal metin döndürülüyor.")
            return texts

        prompt = (
            f"You are an ultra-fast, highly accurate screen OCR translator.\n"
            f"Translate the following text items from {self.source_lang} to {self.target_lang}.\n"
            f"Requirements:\n"
            f"- Preserve meaning, tone, UI terms, punctuation, and uppercase/lowercase styling.\n"
            f"- Return ONLY a valid JSON array of strings in the exact same order and length.\n"
            f"- Do not include markdown code blocks or explanations.\n"
            f"Input JSON: {json.dumps([t for _, t in non_empty], ensure_ascii=False)}"
        )

        payload = {
            "contents": [
                {
                    "parts": [{"text": prompt}]
                }
            ],
            "generationConfig": {
                "temperature": 0.1,
                "response_mime_type": "application/json"
            }
        }

        try:
            url = f"{self.base_url}?key={self.api_key}"
            req_data = json.dumps(payload).encode("utf-8")
            req = urllib.request.Request(
                url,
                data=req_data,
                headers={"Content-Type": "application/json"},
                method="POST"
            )

            with urllib.request.urlopen(req, timeout=5) as response:
                resp_json = json.loads(response.read().decode("utf-8"))
                
                candidates = resp_json.get("candidates", [])
                if not candidates:
                    return texts

                raw_text = candidates[0].get("content", {}).get("parts", [{}])[0].get("text", "")
                translations = json.loads(raw_text)

                results = list(texts)
                for (orig_idx, _), trans in zip(non_empty, translations):
                    results[orig_idx] = trans

                return results

        except Exception as e:
            logger.error(f"Gemini API Çeviri Hatası: {e}")
            return texts
