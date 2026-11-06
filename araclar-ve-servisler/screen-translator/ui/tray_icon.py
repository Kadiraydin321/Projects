import pystray
from PIL import Image, ImageDraw
from pystray import MenuItem as item

def create_image():
    # Generate a simple icon
    width = 64
    height = 64
    image = Image.new('RGBA', (width, height), (0, 0, 0, 0))
    dc = ImageDraw.Draw(image)
    dc.rectangle((8, 8, 56, 56), fill=(64, 156, 255))
    dc.text((18, 20), "TR", fill="white")
    return image

class TrayIcon:
    def __init__(self, main_app):
        self.main_app = main_app
        self.icon = None
        
    def run(self):
        menu = (
            item('Başlat / Durdur', self.on_toggle),
            item('Bölge Seç', self.on_select_region),
            item('Ayarlar', self.on_settings),
            item('Çıkış', self.on_quit)
        )
        self.icon = pystray.Icon("AntiGravityTranslator", create_image(), "Screen Translator", menu)
        self.icon.run()
        
    def on_toggle(self):
        self.main_app.toggle_translation()
        
    def on_select_region(self):
        self.main_app.start_region_selection()
        
    def on_settings(self):
        self.main_app.show_settings()
        
    def on_quit(self):
        self.main_app.quit()
        if self.icon:
            self.icon.stop()
