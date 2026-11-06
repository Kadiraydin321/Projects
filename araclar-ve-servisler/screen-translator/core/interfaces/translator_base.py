from abc import ABC, abstractmethod
from typing import List, Optional

class BaseTranslatorEngine(ABC):
    """
    Tüm çeviri motorları (Gemini, Google, DeepL, Ollama) için standart soyut arayüz.
    """

    def __init__(self, source_lang: str = "auto", target_lang: str = "tr"):
        self.source_lang = source_lang
        self.target_lang = target_lang

    @abstractmethod
    def translate(self, text: str) -> str:
        """Tek bir metni çevirir."""
        pass

    @abstractmethod
    def translate_batch(self, texts: List[str]) -> List[str]:
        """
        Birden çok metin bloğunu toplu (batch) olarak çevirir.
        Gecikmeyi ve API çağrı sayısını minimize etmek için esastır.
        """
        pass

    def update_languages(self, source_lang: str, target_lang: str):
        """Kaynak ve hedef dilleri günceller."""
        self.source_lang = source_lang
        self.target_lang = target_lang

    @abstractmethod
    def get_engine_name(self) -> str:
        """Motorun kullanıcı dostu adını döner."""
        pass
