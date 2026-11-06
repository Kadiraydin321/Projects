import sys
from PyQt5.QtWidgets import QWidget, QApplication, QApplication
from PyQt5.QtCore import Qt, QRect, pyqtSignal
from PyQt5.QtGui import QPainter, QColor, QPen, QCursor

class RegionSelector(QWidget):
    # Signal emitted when selection is complete: (x, y, w, h)
    region_selected = pyqtSignal(int, int, int, int)
    
    def __init__(self):
        super().__init__()
        self.start_point = None
        self.end_point = None
        self.is_drawing = False
        
        self.initUI()
        
    def initUI(self):
        # Cover all screens
        screens = QApplication.screens()
        x_min = min(screen.geometry().x() for screen in screens)
        y_min = min(screen.geometry().y() for screen in screens)
        x_max = max(screen.geometry().right() for screen in screens)
        y_max = max(screen.geometry().bottom() for screen in screens)
        
        self.setGeometry(x_min, y_min, x_max - x_min, y_max - y_min)
        
        # Transparent window, stay on top
        self.setWindowFlags(Qt.WindowStaysOnTopHint | Qt.FramelessWindowHint | Qt.Tool)
        self.setAttribute(Qt.WA_TranslucentBackground)
        
        # Set crosshair cursor
        self.setCursor(QCursor(Qt.CrossCursor))
        
    def paintEvent(self, event):
        painter = QPainter(self)
        
        # Fill screen with semi-transparent black
        painter.fillRect(self.rect(), QColor(0, 0, 0, 100))
        
        if self.start_point and self.end_point:
            # Draw the selection rectangle (clear it by drawing transparent or drawing border)
            rect = QRect(self.start_point, self.end_point).normalized()
            
            # Clear the selected area to make it fully transparent (cut out)
            painter.setCompositionMode(QPainter.CompositionMode_Clear)
            painter.fillRect(rect, Qt.transparent)
            
            # Restore composition mode to draw border
            painter.setCompositionMode(QPainter.CompositionMode_SourceOver)
            
            # Draw red border
            pen = QPen(QColor(255, 0, 0), 2, Qt.DashLine)
            painter.setPen(pen)
            painter.drawRect(rect)
            
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
            if rect.width() > 10 and rect.height() > 10:
                # Need absolute screen coordinates
                # Since this widget covers all screens, widget local coords are global screen coords offset by x_min/y_min
                # QWidget pos is already mapped if parent=None
                global_start = self.mapToGlobal(rect.topLeft())
                self.region_selected.emit(global_start.x(), global_start.y(), rect.width(), rect.height())
            
            self.close()

    def keyPressEvent(self, event):
        if event.key() == Qt.Key_Escape:
            self.close()

# For testing independently:
# if __name__ == '__main__':
#     app = QApplication(sys.argv)
#     selector = RegionSelector()
#     selector.region_selected.connect(lambda x, y, w, h: print(f"Selected: {x},{y} {w}x{h}"))
#     selector.show()
#     sys.exit(app.exec_())
