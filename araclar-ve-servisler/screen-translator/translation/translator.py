from deep_translator import GoogleTranslator
from collections import OrderedDict

class LRUCache:
    def __init__(self, capacity: int):
        self.cache = OrderedDict()
        self.capacity = capacity

    def get(self, key):
        if key not in self.cache:
            return None
        else:
            self.cache.move_to_end(key)
            return self.cache[key]

    def put(self, key, value):
        self.cache[key] = value
        self.cache.move_to_end(key)
        if len(self.cache) > self.capacity:
            self.cache.popitem(last=False)


class TranslatorEngine:
    def __init__(self, source="en", target="tr"):
        self.source = "auto" if source == "auto" else source
        self.target = target
        self.translator = GoogleTranslator(source=self.source, target=self.target)
        self.cache = LRUCache(1000) # Cache last 1000 translations to save API calls

    def update_languages(self, source, target):
        self.source = "auto" if source == "auto" else source
        self.target = target
        self.translator = GoogleTranslator(source=self.source, target=self.target)

    def translate(self, text: str) -> str:
        if not text or not text.strip():
            return text
            
        cached = self.cache.get(text)
        if cached:
            return cached
            
        try:
            translated = self.translator.translate(text)
            self.cache.put(text, translated)
            return translated
        except Exception as e:
            print(f"Translation error: {e}")
            return text

    def translate_batch(self, texts: list[str]) -> list[str]:
        if not texts:
            return []
            
        results = []
        to_translate = []
        to_translate_indices = []
        
        # Check cache first
        for i, text in enumerate(texts):
            cached = self.cache.get(text)
            if cached:
                results.append(cached)
            else:
                results.append(None)
                if text.strip():
                    to_translate.append(text)
                    to_translate_indices.append(i)
        
        if to_translate:
            try:
                # Batch translation request
                translated_batch = self.translator.translate_batch(to_translate)
                for i, translated in zip(to_translate_indices, translated_batch):
                    results[i] = translated
                    self.cache.put(texts[i], translated)
            except Exception as e:
                print(f"Batch translation error: {e}")
                # Fallback to individual or return original
                for i in to_translate_indices:
                    results[i] = texts[i]
                    
        return results
