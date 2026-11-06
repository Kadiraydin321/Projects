import pystray
from PIL import Image, ImageDraw
from pystray import MenuItem as item
import threading

import os

def create_tray_icon_image():
    import sys
    base_dir = getattr(sys, '_MEIPASS', os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
    icon_path = os.path.join(base_dir, "icon.png")
    if not os.path.exists(icon_path):
        icon_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "icon.png")
    if os.path.exists(icon_path):
        try:
            return Image.open(icon_path).resize((64, 64))
        except Exception:
            pass

    width = 64
    height = 64
    image = Image.new('RGBA', (width, height), (0, 0, 0, 0))
    dc = ImageDraw.Draw(image)
    # Modern gradient benzeri rozet
    dc.rounded_rectangle([2, 2, 62, 62], radius=14, fill=(15, 23, 42, 255), outline=(99, 102, 241, 255), width=2)
    dc.ellipse([14, 14, 50, 50], fill=(79, 70, 229, 255))
    dc.text((22, 22), "AI", fill=(255, 255, 255))
    return image

class TrayManager:
    """
    Sistem tepsisi (System Tray) menüsü ve arka plan yönetimi.
    """
    def __init__(self, main_app):
        self.main_app = main_app
        self.icon = None
        self._thread = None

    def start(self):
        menu = (
            item('Çeviriyi Başlat / Duraklat', self.on_toggle),
            item('Bölge Seç (Google Lens)', self.on_select_region),
            item('Kaydırma Modunu Değiştir (Swipe)', self.on_toggle_swipe),
            item('Ayarlar', self.on_settings),
            item('Çıkış', self.on_quit)
        )
        self.icon = pystray.Icon("ScreenTranslatorAI", create_tray_icon_image(), "Screen Translator AI", menu)
        self._thread = threading.Thread(target=self.icon.run, daemon=True)
        self._thread.start()

    def on_toggle(self):
        self.main_app.toggle_translation()

    def on_select_region(self):
        self.main_app.start_region_selection()

    def on_toggle_swipe(self):
        self.main_app.toggle_swipe_mode()

    def on_settings(self):
        self.main_app.show_settings()

    def on_quit(self):
        self.main_app.quit()
        if self.icon:
            self.icon.stop()
