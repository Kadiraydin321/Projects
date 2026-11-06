from PyQt5.QtWidgets import QWidget, QApplication
from PyQt5.QtCore import Qt, QRect, pyqtSignal
from PyQt5.QtGui import QPainter, QColor, QPen, QCursor, QFont, QBrush

class RegionSelector(QWidget):
    """
    Ekranın istenen alanını fare ile sürükleyerek seçmeyi sağlayan
    tam ekran yarı saydam seçim aracı.
    """
    region_selected = pyqtSignal(int, int, int, int)

    def __init__(self):
        super().__init__()
        self.start_point = None
        self.end_point = None
        self.is_drawing = False
        self.initUI()

    def initUI(self):
        screens = QApplication.screens()
        x_min = min(s.geometry().x() for s in screens)
        y_min = min(s.geometry().y() for s in screens)
        x_max = max(s.geometry().right() for s in screens)
        y_max = max(s.geometry().bottom() for s in screens)

        self.setGeometry(x_min, y_min, x_max - x_min, y_max - y_min)
        self.setWindowFlags(Qt.WindowStaysOnTopHint | Qt.FramelessWindowHint | Qt.Tool)
        self.setAttribute(Qt.WA_TranslucentBackground)
        self.setCursor(QCursor(Qt.CrossCursor))

    def paintEvent(self, event):
        painter = QPainter(self)
        painter.fillRect(self.rect(), QColor(0, 0, 0, 110))

        if self.start_point and self.end_point:
            rect = QRect(self.start_point, self.end_point).normalized()

            # Seçilen alanı saydamlaştır (arkayı göster)
            painter.setCompositionMode(QPainter.CompositionMode_Clear)
            painter.fillRect(rect, Qt.transparent)

            # Kenarlık çiz
            painter.setCompositionMode(QPainter.CompositionMode_SourceOver)
            pen = QPen(QColor(99, 102, 241, 200), 2, Qt.SolidLine) # Canlı indigo çizgi
            painter.setPen(pen)
            painter.drawRect(rect)

            # Google Lens stili kalın köşe köşebentleri
            corner_pen = QPen(QColor(129, 140, 248, 255), 4, Qt.SolidLine)
            painter.setPen(corner_pen)
            c_len = min(20, min(rect.width(), rect.height()) // 4)
            # Sol üst
            painter.drawLine(rect.left(), rect.top(), rect.left() + c_len, rect.top())
            painter.drawLine(rect.left(), rect.top(), rect.left(), rect.top() + c_len)
            # Sağ üst
            painter.drawLine(rect.right(), rect.top(), rect.right() - c_len, rect.top())
            painter.drawLine(rect.right(), rect.top(), rect.right(), rect.top() + c_len)
            # Sol alt
            painter.drawLine(rect.left(), rect.bottom(), rect.left() + c_len, rect.bottom())
            painter.drawLine(rect.left(), rect.bottom(), rect.left(), rect.bottom() - c_len)
            # Sağ alt
            painter.drawLine(rect.right(), rect.bottom(), rect.right() - c_len, rect.bottom())
            painter.drawLine(rect.right(), rect.bottom(), rect.right(), rect.bottom() - c_len)

            # Boyut bilgi rozeti (Badge)
            badge_text = f"Google Lens: {rect.width()} x {rect.height()}"
            font = QFont("Segoe UI", 9, QFont.Bold)
            painter.setFont(font)
            fm = painter.fontMetrics()
            badge_w = fm.width(badge_text) + 16
            badge_h = 24
            badge_rect = QRect(rect.left() + 4, max(4, rect.top() - 28), badge_w, badge_h)

            painter.setPen(Qt.NoPen)
            painter.setBrush(QBrush(QColor(15, 23, 42, 230)))
            painter.drawRoundedRect(badge_rect, 6, 6)
            painter.setPen(QPen(QColor(248, 250, 252)))
            painter.drawText(badge_rect, Qt.AlignCenter, badge_text)

    def mousePressEvent(self, event):
        if event.button() == Qt.LeftButton:
            self.start_point = event.pos()
            self.end_point = self.start_point
            self.is_drawing = True

    def mouseMoveEvent(self, event):
        if self.is_drawing:
            self.end_point = event.pos()
            self.update()

    def mouseReleaseEvent(self, event):
        if event.button() == Qt.LeftButton and self.is_drawing:
            self.end_point = event.pos()
            self.is_drawing = False

            rect = QRect(self.start_point, self.end_point).normalized()
            if rect.width() > 20 and rect.height() > 20:
                global_pos = self.mapToGlobal(rect.topLeft())
                self.region_selected.emit(global_pos.x(), global_pos.y(), rect.width(), rect.height())

            self.close()

    def keyPressEvent(self, event):
        if event.key() == Qt.Key_Escape:
            self.close()
