from typing import List, Optional
import logging
from PyQt5.QtWidgets import QWidget, QApplication
from PyQt5.QtCore import Qt, QRect, QPoint, pyqtSignal
from PyQt5.QtGui import QPainter, QColor, QFont, QPen, QBrush, QCursor, QPainterPath

try:
    from core.interfaces.ocr_base import TextBlock
    from core.config import ConfigManager
except ImportError:
    from ...core.interfaces.ocr_base import TextBlock
    from ...core.config import ConfigManager

logger = logging.getLogger("LensOverlayWindow")

class LensOverlayWindow(QWidget):
    """
    Google Lens stili kaydırmalı (swipe slider) ve yerinde (in-place)
    çeviri katmanı penceresi.
    - Sürüklenebilir perdeleme çubuğu ile orijinal ekran vs. çevrilmiş metin karşılaştırması.
    - Şeffaf ve tıklama geçirgen (click-through) mod desteği.
    - Dinamik font boyutlandırma ve kutu arka planı.
    """
    slider_moved_signal = pyqtSignal(float)

    def __init__(self, config: ConfigManager):
        super().__init__()
        self.config = config
        self.blocks: List[TextBlock] = []
        
        # Bölge koordinatları (x, y, w, h)
        self.region_x = 0
        self.region_y = 0
        self.region_w = 800
        self.region_h = 600

        # Google Lens Kaydırıcı (Slider) Durumu
        self.swipe_mode = self.config.get("overlay.swipe_mode", True)
        self.slider_ratio = float(self.config.get("overlay.slider_ratio", 0.5))
        self.is_dragging_slider = False
        self.slider_handle_width = 16

        self.initUI()

    def initUI(self):
        # Şeffaf, çerçevesiz ve her zaman üstte pencere
        self.setWindowFlags(
            Qt.WindowStaysOnTopHint |
            Qt.FramelessWindowHint |
            Qt.Tool |
            Qt.NoDropShadowWindowHint
        )
        self.setAttribute(Qt.WA_TranslucentBackground)
        self.setMouseTracking(True)

        click_through = self.config.get("overlay.click_through", False)
        self.set_click_through(click_through)

    def set_click_through(self, enable: bool):
        """Win32 API ile tıklama geçirgenliğini ayarlar."""
        try:
            import win32gui
            import win32con
            hwnd = int(self.winId())
            ex_style = win32gui.GetWindowLong(hwnd, win32con.GWL_EXSTYLE)
            if enable:
                win32gui.SetWindowLong(hwnd, win32con.GWL_EXSTYLE, 
                                       ex_style | win32con.WS_EX_LAYERED | win32con.WS_EX_TRANSPARENT)
            else:
                win32gui.SetWindowLong(hwnd, win32con.GWL_EXSTYLE, 
                                       (ex_style | win32con.WS_EX_LAYERED) & ~win32con.WS_EX_TRANSPARENT)
        except Exception as e:
            logger.debug(f"Click-through ayarlanırken (Windows dışı veya başlatma öncesi): {e}")

    def update_region(self, x: int, y: int, w: int, h: int):
        self.region_x = x
        self.region_y = y
        self.region_w = max(10, w)
        self.region_h = max(10, h)
        self.setGeometry(x, y, w, h)

    def update_blocks(self, blocks: List[TextBlock]):
        self.blocks = blocks
        self.update()

    def set_swipe_mode(self, enabled: bool):
        self.swipe_mode = enabled
        self.config.set("overlay.swipe_mode", enabled)
        self.update()

    @property
    def slider_x(self) -> int:
        return int(self.width() * self.slider_ratio)

    def paintEvent(self, event):
        painter = QPainter(self)
        painter.setRenderHint(QPainter.Antialiasing)
        painter.setRenderHint(QPainter.TextAntialiasing)

        w = self.width()
        h = self.height()
        slider_x = self.slider_x

        # 1. Çeviri Metinlerini Çiz (Google Lens Perde Mantığı)
        # Eğer swipe_mode aktifse, slider_x'in sağ tarafına (veya kaydırılan alana) çizilir
        if self.swipe_mode:
            # Sadece slider_x'ten sağa kalan kısmı çeviriyle kapla, sol taraf orijinal kalsın
            painter.save()
            clip_rect = QRect(slider_x, 0, w - slider_x, h)
            painter.setClipRect(clip_rect)
            self._draw_translated_blocks(painter)
            painter.restore()

            # 2. Google Lens Perde Kaydırıcı Çizgisi ve Tutamağını Çiz
            self._draw_lens_slider_handle(painter, slider_x, h)
        else:
            # Tam ekran yerinde metin ikamesi modu
            self._draw_translated_blocks(painter)

        painter.end()

    def _draw_translated_blocks(self, painter: QPainter):
        bg_c = self.config.get("overlay.bg_color", [15, 23, 42, 210])
        text_c = self.config.get("overlay.text_color", [248, 250, 252, 255])
        font_family = self.config.get("overlay.font_family", "Segoe UI")
        min_font_size = self.config.get("overlay.min_font_size", 9)

        bg_color = QColor(*bg_c)
        text_color = QColor(*text_c)

        for block in self.blocks:
            translated = block.translated_text
            if not translated or not translated.strip():
                continue

            rect = QRect(block.x, block.y, block.width, block.height)

            # Arka plan kutusunu orijinal metnin üzerine çiz (hafif genişletilmiş dolgu)
            bg_rect = rect.adjusted(-3, -2, 3, 2)
            painter.setPen(Qt.NoPen)
            painter.setBrush(QBrush(bg_color))
            painter.drawRoundedRect(bg_rect, 4, 4)

            # İnce kenar çizgisi (Modern Google Lens efekti)
            border_pen = QPen(QColor(99, 102, 241, 140), 1) # Indigo vurgusu
            painter.setPen(border_pen)
            painter.setBrush(Qt.NoBrush)
            painter.drawRoundedRect(bg_rect, 4, 4)

            # Yazı tipini kutuya sığacak şekilde optimize et
            font_size = max(min_font_size, int(block.height * 0.7))
            font = QFont(font_family, font_size, QFont.Bold)
            painter.setFont(font)

            fm = painter.fontMetrics()
            while fm.boundingRect(rect, Qt.AlignCenter | Qt.TextWordWrap, translated).height() > (rect.height() + 10) and font_size > min_font_size:
                font_size -= 1
                font.setPointSize(font_size)
                painter.setFont(font)
                fm = painter.fontMetrics()

            painter.setPen(QPen(text_color))
            painter.drawText(rect, Qt.AlignCenter | Qt.TextWordWrap, translated)

    def _draw_lens_slider_handle(self, painter: QPainter, sx: int, h: int):
        # Yarı saydam dikey perde çizgisi ve ışıma (glow)
        glow_pen = QPen(QColor(99, 102, 241, 60), 6, Qt.SolidLine)
        painter.setPen(glow_pen)
        painter.drawLine(sx, 0, sx, h)

        line_pen = QPen(QColor(255, 255, 255, 240), 2, Qt.SolidLine)
        painter.setPen(line_pen)
        painter.drawLine(sx, 0, sx, h)

        # Ortadaki sürüklenebilir modern tutamak (Google Lens rozet stili)
        center_y = h // 2
        handle_radius = 20

        # Tutamak dış halka (Glow)
        painter.setPen(Qt.NoPen)
        painter.setBrush(QBrush(QColor(79, 70, 229, 80)))
        painter.drawEllipse(QPoint(sx, center_y), handle_radius + 4, handle_radius + 4)

        # Ana tutamak gövdesi
        painter.setPen(QPen(QColor(129, 140, 248, 255), 2)) # Aydınlık indigo kenarlık
        painter.setBrush(QBrush(QColor(15, 23, 42, 250)))   # Derin koyu dolgu
        painter.drawEllipse(QPoint(sx, center_y), handle_radius, handle_radius)

        # Tutamak içindeki iki yönlü ok simgesi (◀ ▶)
        font = QFont("Segoe UI", 8, QFont.Bold)
        painter.setFont(font)
        painter.setPen(QPen(QColor(248, 250, 252, 255)))
        painter.drawText(QRect(sx - handle_radius, center_y - handle_radius, handle_radius * 2, handle_radius * 2),
                         Qt.AlignCenter, "◀ ▶")

    # --- Fare Olayları (Kaydırıcıyı Sürükleme) ---
    def mousePressEvent(self, event):
        if not self.swipe_mode:
            return

        if event.button() == Qt.LeftButton:
            sx = self.slider_x
            if abs(event.x() - sx) <= (self.slider_handle_width * 2):
                self.is_dragging_slider = True
                self.setCursor(QCursor(Qt.SizeHorCursor))

    def mouseMoveEvent(self, event):
        if not self.swipe_mode:
            return

        sx = self.slider_x
        # Tutamağın üzerindeyse yatay yeniden boyutlandırma imleci göster
        if abs(event.x() - sx) <= (self.slider_handle_width * 2):
            self.setCursor(QCursor(Qt.SizeHorCursor))
        else:
            self.unsetCursor()

        if self.is_dragging_slider:
            new_ratio = max(0.05, min(0.95, event.x() / float(self.width())))
            self.slider_ratio = new_ratio
            self.config.set("overlay.slider_ratio", new_ratio)
            self.slider_moved_signal.emit(new_ratio)
            self.update()

    def mouseReleaseEvent(self, event):
        if event.button() == Qt.LeftButton and self.is_dragging_slider:
            self.is_dragging_slider = False
            self.unsetCursor()
