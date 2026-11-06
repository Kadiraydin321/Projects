import sys
import logging
from typing import Optional
from PyQt5.QtWidgets import QApplication
from PyQt5.QtCore import QObject, pyqtSignal

try:
    from core.config import config_manager
    from core.pipeline import TranslationPipeline
    from platforms.windows.lens_overlay import LensOverlayWindow
    from platforms.windows.region_selector import RegionSelector
    from platforms.windows.settings_window import ModernSettingsDialog
    from platforms.windows.tray_manager import TrayManager
except ImportError:
    from .core.config import config_manager
    from .core.pipeline import TranslationPipeline
    from .platforms.windows.lens_overlay import LensOverlayWindow
    from .platforms.windows.region_selector import RegionSelector
    from .platforms.windows.settings_window import ModernSettingsDialog
    from .platforms.windows.tray_manager import TrayManager

# Loglama ayarları
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("ScreenTranslatorApp")

class SignalBridge(QObject):
    """Pipeline arka plan iş parçacığından PyQt UI ana iş parçacığına güvenli sinyal köprüsü."""
    update_overlay_signal = pyqtSignal(list)

class MainApplication:
    def __init__(self):
        self.app = QApplication(sys.argv)
        self.app.setQuitOnLastWindowClosed(False)

        import os
        from PyQt5.QtGui import QIcon
        base_dir = getattr(sys, '_MEIPASS', os.path.dirname(os.path.abspath(__file__)))
        icon_path = os.path.join(base_dir, "icon.png")
        if not os.path.exists(icon_path):
            icon_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "icon.png")
        if os.path.exists(icon_path):
            self.app.setWindowIcon(QIcon(icon_path))

        try:
            from ui.theme import MODERN_DARK_STYLESHEET
            self.app.setStyleSheet(MODERN_DARK_STYLESHEET)
        except Exception:
            pass

        self.config = config_manager
        self.bridge = SignalBridge()
        self.bridge.update_overlay_signal.connect(self.on_overlay_update)

        # 1. Google Lens Kaydırmalı Katman Penceresi
        self.overlay = LensOverlayWindow(self.config)

        # 2. Optimize Edilmiş Çekirdek İşlem Hattı (Pipeline)
        self.pipeline = TranslationPipeline(
            config=self.config,
            on_update_callback=lambda blocks: self.bridge.update_overlay_signal.emit(blocks)
        )

        # 3. Son seçilen bölge varsa yükle
        last_reg = self.config.get("last_region")
        if last_reg:
            self.overlay.update_region(last_reg["x"], last_reg["y"], last_reg["w"], last_reg["h"])
            self.pipeline.set_region(last_reg["x"], last_reg["y"], last_reg["w"], last_reg["h"])

        # 4. Arayüz ve Sistem Tepsisi
        self.region_selector: Optional[RegionSelector] = None
        self.settings_dialog: Optional[ModernSettingsDialog] = None
        self.tray = TrayManager(self)
        self.tray.start()

        self.setup_hotkeys()

        # Son bölge varsa ve duraklatılmamışsa hemen başlat
        if last_reg:
            self.pipeline.start()
            self.overlay.show()
        
        # İlk açılışta kullanıcının uygulamanın başladığını görmesi için ayarları aç
        self.show_settings()

    def setup_hotkeys(self):
        try:
            import keyboard
            keyboard.unhook_all()

            toggle_hk = self.config.get("hotkeys.toggle_translation", "ctrl+shift+t")
            region_hk = self.config.get("hotkeys.select_region", "ctrl+shift+r")
            click_hk = self.config.get("hotkeys.toggle_clickthrough", "ctrl+shift+s")

            keyboard.add_hotkey(toggle_hk, self.toggle_translation)
            keyboard.add_hotkey(region_hk, self.start_region_selection)
            keyboard.add_hotkey(click_hk, self.toggle_clickthrough)
            logger.info(f"Kısayollar kaydedildi: Aç/Kapat ({toggle_hk}), Bölge ({region_hk}), Geçirgenlik ({click_hk})")
        except Exception as e:
            logger.warning(f"Klavye kısayolları kaydedilemedi (Yönetici izni veya Linux ortamı): {e}")

    def toggle_translation(self):
        if self.pipeline.is_paused:
            self.pipeline.resume()
            self.overlay.show()
            logger.info("Çeviri devam ettirildi.")
        else:
            self.pipeline.pause()
            self.overlay.hide()
            logger.info("Çeviri duraklatıldı.")

    def toggle_swipe_mode(self):
        current_mode = self.overlay.swipe_mode
        self.overlay.set_swipe_mode(not current_mode)
        logger.info(f"Google Lens kaydırma modu: {not current_mode}")

    def toggle_clickthrough(self):
        current_ct = self.config.get("overlay.click_through", False)
        new_ct = not current_ct
        self.config.set("overlay.click_through", new_ct)
        self.overlay.set_click_through(new_ct)
        logger.info(f"Tıklama geçirgenliği (Click-through): {new_ct}")

    def start_region_selection(self):
        if self.region_selector is None:
            self.region_selector = RegionSelector()
            self.region_selector.region_selected.connect(self.on_region_selected)

        self.pipeline.pause()
        self.overlay.hide()
        self.region_selector.show()

    def on_region_selected(self, x, y, w, h):
        logger.info(f"Yeni ekran bölgesi seçildi: ({x}, {y}, {w}x{h})")
        self.pipeline.set_region(x, y, w, h)
        self.overlay.update_region(x, y, w, h)
        self.overlay.show()
        self.pipeline.resume()
        if not self.pipeline.is_running:
            self.pipeline.start()

    def show_settings(self):
        if self.settings_dialog is None:
            self.settings_dialog = ModernSettingsDialog(
                self.config,
                on_save_callback=self.on_settings_saved
            )
        self.settings_dialog.exec_()

    def on_settings_saved(self):
        self.pipeline.reload_engines()
        self.setup_hotkeys()
        self.overlay.update()
        logger.info("Ayarlar güncellendi ve uygulandı.")

    def on_overlay_update(self, blocks):
        if not self.pipeline.is_paused:
            self.overlay.update_blocks(blocks)

    def quit(self):
        logger.info("Uygulama kapatılıyor...")
        self.pipeline.stop()
        try:
            import keyboard
            keyboard.unhook_all()
        except Exception:
            pass
        self.app.quit()

    def run(self):
        sys.exit(self.app.exec_())

_instance_mutex = None

def check_single_instance():
    global _instance_mutex
    if sys.platform == "win32":
        try:
            import win32event, win32api, winerror
            mutex_name = "Global\\ScreenTranslatorAI_App_Mutex"
            _instance_mutex = win32event.CreateMutex(None, False, mutex_name)
            if win32api.GetLastError() == winerror.ERROR_ALREADY_EXISTS:
                return False
            return True
        except Exception:
            pass
    return True

def main():
    if not check_single_instance():
        from PyQt5.QtWidgets import QApplication, QMessageBox
        tmp_app = QApplication(sys.argv)
        QMessageBox.information(
            None,
            "Screen Translator AI",
            "Screen Translator AI zaten arka planda çalışıyor!\n\n"
            "• Kısayol (Çeviriyi Aç/Kapat): Ctrl + Shift + T\n"
            "• Kısayol (Bölge Seçimi): Ctrl + Shift + R\n\n"
            "Ayarlara sağ alt köşedeki Sistem Tepsisi (Tray) simgesinden ulaşabilirsiniz."
        )
        sys.exit(0)

    app = MainApplication()
    app.run()

if __name__ == "__main__":
    main()
