import win32gui
import win32con
import win32api
from PyQt5.QtWidgets import QWidget, QApplication
from PyQt5.QtCore import Qt, QRect, QTimer
from PyQt5.QtGui import QPainter, QColor, QFont, QPen, QBrush

class OverlayWindow(QWidget):
    def __init__(self, config_manager):
        super().__init__()
        self.config = config_manager
        self.text_blocks = [] # List of tuples (TextBlock, translated_text)
        self.region = {"x": 0, "y": 0, "w": 100, "h": 100}
        
        self.initUI()
        
    def initUI(self):
        # Setup as a transparent overlay window
        self.setWindowFlags(
            Qt.WindowStaysOnTopHint |
            Qt.FramelessWindowHint |
            Qt.Tool
        )
        self.setAttribute(Qt.WA_TranslucentBackground)
        
        # Make click-through using Win32 API
        self.make_click_through()
        
    def make_click_through(self):
        hwnd = int(self.winId())
        # Add WS_EX_LAYERED and WS_EX_TRANSPARENT to allow clicks to pass through
        ex_style = win32gui.GetWindowLong(hwnd, win32con.GWL_EXSTYLE)
        win32gui.SetWindowLong(hwnd, win32con.GWL_EXSTYLE, ex_style | win32con.WS_EX_LAYERED | win32con.WS_EX_TRANSPARENT)
        
    def update_region(self, x, y, w, h):
        self.region = {"x": x, "y": y, "w": w, "h": h}
        self.setGeometry(x, y, w, h)
        
    def update_blocks(self, blocks_with_translations):
        self.text_blocks = blocks_with_translations
        self.update() # Trigger paintEvent
        
    def clear(self):
        self.text_blocks = []
        self.update()

    def paintEvent(self, event):
        if not self.text_blocks:
            return

        painter = QPainter(self)
        painter.setRenderHint(QPainter.Antialiasing)
        
        # Load config colors
        bg_c = self.config.get("overlay.bg_color", [0, 0, 0, 180])
        text_c = self.config.get("overlay.text_color", [255, 255, 255, 255])
        font_family = self.config.get("overlay.font_family", "Arial")
        min_font_size = self.config.get("overlay.min_font_size", 8)

        bg_color = QColor(bg_c[0], bg_c[1], bg_c[2], bg_c[3])
        text_color = QColor(text_c[0], text_c[1], text_c[2], text_c[3])
        
        for block, translated in self.text_blocks:
            if not translated:
                continue
                
            # Block coordinates are relative to the capture region
            # So they map exactly to (0, 0) of this widget
            rect = QRect(block.x, block.y, block.width, block.height)
            
            # Draw background
            painter.setPen(Qt.NoPen)
            painter.setBrush(QBrush(bg_color))
            # Slightly expand background for better readability
            bg_rect = rect.adjusted(-2, -2, 2, 2)
            painter.drawRoundedRect(bg_rect, 3, 3)
            
            # Dynamically size font to fit the rect
            font_size = max(block.height - 4, min_font_size) # Start with block height
            font = QFont(font_family, font_size, QFont.Bold)
            painter.setFont(font)
            
            # Shrink font until it fits horizontally
            fm = painter.fontMetrics()
            while fm.width(translated) > rect.width() and font_size > min_font_size:
                font_size -= 1
                font.setPointSize(font_size)
                painter.setFont(font)
                fm = painter.fontMetrics()
            
            # Draw text
            painter.setPen(QPen(text_color))
            # If text is still too wide, use word wrap
            flags = Qt.AlignCenter | Qt.TextWordWrap
            painter.drawText(rect, flags, translated)
            
        painter.end()
