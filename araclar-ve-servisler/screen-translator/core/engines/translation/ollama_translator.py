import urllib.request
import json
import logging
from typing import List, Optional
try:
    from core.interfaces.translator_base import BaseTranslatorEngine
except ImportError:
    from ...interfaces.translator_base import BaseTranslatorEngine

logger = logging.getLogger("OllamaTranslator")

class OllamaTranslator(BaseTranslatorEngine):
    """
    Yerel (offline) çalışan açık kaynaklı LLM'ler (Ollama) ile çeviri motoru.
    Gereksinim: Yerel makinede Ollama'nın çalışıyor olması (`http://localhost:11434`).
    """

    def __init__(self, model: str = "llama3.2", host: str = "http://localhost:11434",
                 source_lang: str = "auto", target_lang: str = "tr", **kwargs):
        super().__init__(source_lang, target_lang)
        self.model = model
        self.host = host.rstrip('/')
        self.endpoint = f"{self.host}/api/generate"

    def get_engine_name(self) -> str:
        return f"Ollama Yerel Yapay Zeka ({self.model})"

    def translate(self, text: str) -> str:
        if not text or not text.strip():
            return text

        prompt = (
            f"You are a translation assistant. Translate the following text from {self.source_lang} to {self.target_lang}.\n"
            f"Only output the translated text without notes, quotes or explanations.\n\n"
            f"Text: {text}"
        )

        payload = {
            "model": self.model,
            "prompt": prompt,
            "stream": False,
            "options": {
                "temperature": 0.1
            }
        }

        try:
            req_data = json.dumps(payload).encode("utf-8")
            req = urllib.request.Request(
                self.endpoint,
                data=req_data,
                headers={"Content-Type": "application/json"},
                method="POST"
            )

            with urllib.request.urlopen(req, timeout=5) as response:
                resp_json = json.loads(response.read().decode("utf-8"))
                response_text = resp_json.get("response", "").strip()
                return response_text if response_text else text

        except Exception as e:
            logger.warning(f"Ollama bağlantı hatası: {e}")
            return text

    def translate_batch(self, texts: List[str]) -> List[str]:
        return [self.translate(t) for t in texts]
