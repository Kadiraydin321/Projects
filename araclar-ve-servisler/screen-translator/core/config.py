import os
import json
import logging
from typing import Any, Dict

logger = logging.getLogger("ConfigManager")

CONFIG_FILE = "screen_translator_config.json"

DEFAULT_CONFIG: Dict[str, Any] = {
    "source_lang": "auto",
    "target_lang": "tr",
    "ocr_engine": "winrt",
    "translation_engine": "gemini",
    "capture_engine": "mss",
    "gemini_api_key": "",
    "gemini_model": "gemini-2.0-flash",
    "fps": 5,
    "frame_diff_threshold": 0.02,
    "enable_clustering": True,
    "overlay": {
        "bg_color": [15, 23, 42, 210],      # Modern slate dark background
        "text_color": [248, 250, 252, 255], # Crisp white text
        "font_family": "Segoe UI",
        "min_font_size": 9,
        "swipe_mode": True,                 # Google Lens kaydırmalı karşılaştırma modu
        "slider_ratio": 0.5,                # Başlangıç perde konumu (%50)
        "click_through": False              # Tıklama geçirgenliği
    },
    "hotkeys": {
        "toggle_translation": "ctrl+shift+t",
        "select_region": "ctrl+shift+r",
        "toggle_clickthrough": "ctrl+shift+s"
    },
    "last_region": None # {"x": 100, "y": 100, "w": 800, "h": 600}
}

class ConfigManager:
    def __init__(self, config_path: str = CONFIG_FILE):
        self.config_path = config_path
        self.config = json.loads(json.dumps(DEFAULT_CONFIG)) # Deep copy
        self.load()

    def load(self):
        if os.path.exists(self.config_path):
            try:
                with open(self.config_path, "r", encoding="utf-8") as f:
                    loaded = json.load(f)
                    self._merge(self.config, loaded)
            except Exception as e:
                logger.error(f"Konfigürasyon okunamadı: {e}")

    def _merge(self, base: dict, override: dict):
        for k, v in override.items():
            if k in base and isinstance(base[k], dict) and isinstance(v, dict):
                self._merge(base[k], v)
            else:
                base[k] = v

    def save(self):
        try:
            with open(self.config_path, "w", encoding="utf-8") as f:
                json.dump(self.config, f, indent=4, ensure_ascii=False)
        except Exception as e:
            logger.error(f"Konfigürasyon kaydedilemedi: {e}")

    def get(self, key: str, default: Any = None) -> Any:
        keys = key.split(".")
        val = self.config
        for k in keys:
            if isinstance(val, dict) and k in val:
                val = val[k]
            else:
                return default
        return val

    def set(self, key: str, value: Any):
        keys = key.split(".")
        val = self.config
        for k in keys[:-1]:
            if k not in val:
                val[k] = {}
            val = val[k]
        val[keys[-1]] = value
        self.save()

# Global config instance
config_manager = ConfigManager()
