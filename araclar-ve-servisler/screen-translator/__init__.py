"""
Screen Translator AI - Google Lens Stili Anlık Ekran Çeviri Paketi
"""

from .main_app import MainApplication, main
from .core.registry import PluginRegistry
from .core.config import config_manager
from .core.pipeline import TranslationPipeline

__all__ = [
    "MainApplication",
    "main",
    "PluginRegistry",
    "config_manager",
    "TranslationPipeline"
]
