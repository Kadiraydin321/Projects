"""
Screen Translator AI - Modern Karanlık Tema ve Stil Tanımları
Google Lens & Apple estetiği ile harmanlanmış profesyonel tasarım sistemi.
"""

MODERN_DARK_STYLESHEET = """
/* Genel Pencere & Arka Plan */
QWidget {
    background-color: #0f172a;
    color: #f8fafc;
    font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, sans-serif;
    font-size: 13px;
    selection-background-color: #4f46e5;
    selection-color: #ffffff;
}

QDialog {
    background-color: #0f172a;
    border: 1px solid #334155;
    border-radius: 12px;
}

/* Başlık ve Gruplar */
QGroupBox {
    background-color: #1e293b;
    border: 1px solid #334155;
    border-radius: 10px;
    margin-top: 14px;
    padding-top: 16px;
    font-weight: 600;
    color: #cbd5e1;
}

QGroupBox::title {
    subcontrol-origin: margin;
    subcontrol-position: top left;
    left: 14px;
    padding: 0 6px;
    color: #818cf8;
    background-color: transparent;
}

/* Sekmeler (QTabWidget) */
QTabWidget::pane {
    border: 1px solid #334155;
    background-color: #1e293b;
    border-radius: 10px;
    top: -1px;
    padding: 12px;
}

QTabBar::tab {
    background: #0f172a;
    color: #94a3b8;
    border: 1px solid #334155;
    border-bottom: none;
    border-top-left-radius: 8px;
    border-top-right-radius: 8px;
    padding: 9px 18px;
    margin-right: 4px;
    font-weight: 500;
}

QTabBar::tab:selected {
    background: #1e293b;
    color: #ffffff;
    border-color: #4f46e5;
    border-bottom: 2px solid #6366f1;
    font-weight: 600;
}

QTabBar::tab:hover:!selected {
    background: #1e293b;
    color: #cbd5e1;
}

/* Giriş Kutuları (QLineEdit, QKeySequenceEdit) */
QLineEdit, QKeySequenceEdit {
    background-color: #0f172a;
    color: #f8fafc;
    border: 1.5px solid #334155;
    border-radius: 8px;
    padding: 7px 12px;
    font-size: 13px;
}

QLineEdit:focus, QKeySequenceEdit:focus {
    border-color: #6366f1;
    background-color: #0f172a;
}

/* Açılır Menüler (QComboBox) */
QComboBox {
    background-color: #0f172a;
    color: #f8fafc;
    border: 1.5px solid #334155;
    border-radius: 8px;
    padding: 7px 12px;
    min-width: 140px;
}

QComboBox:hover {
    border-color: #4f46e5;
}

QComboBox:on {
    border-color: #6366f1;
}

QComboBox::drop-down {
    subcontrol-origin: padding;
    subcontrol-position: top right;
    width: 24px;
    border-left: none;
}

QComboBox QAbstractItemView {
    background-color: #1e293b;
    color: #f8fafc;
    border: 1px solid #334155;
    border-radius: 8px;
    selection-background-color: #4f46e5;
    selection-color: #ffffff;
    padding: 4px;
}

/* Onay Kutuları (QCheckBox) */
QCheckBox {
    spacing: 9px;
    color: #e2e8f0;
    font-weight: 500;
}

QCheckBox::indicator {
    width: 18px;
    height: 18px;
    border-radius: 5px;
    border: 1.5px solid #475569;
    background: #0f172a;
}

QCheckBox::indicator:hover {
    border-color: #6366f1;
}

QCheckBox::indicator:checked {
    background: #4f46e5;
    border-color: #6366f1;
}

/* Kaydırıcı (QSlider) */
QSlider::groove:horizontal {
    height: 6px;
    background: #334155;
    border-radius: 3px;
}

QSlider::sub-page:horizontal {
    background: qlineargradient(x1:0, y1:0, x2:1, y2:0, stop:0 #4f46e5, stop:1 #818cf8);
    border-radius: 3px;
}

QSlider::handle:horizontal {
    background: #ffffff;
    border: 2px solid #6366f1;
    width: 16px;
    margin-top: -5px;
    margin-bottom: -5px;
    border-radius: 8px;
}

QSlider::handle:horizontal:hover {
    background: #e0e7ff;
    border-color: #4338ca;
}

/* Butonlar (QPushButton) */
QPushButton {
    background-color: #334155;
    color: #ffffff;
    border: none;
    border-radius: 8px;
    padding: 8px 18px;
    font-weight: 600;
    min-height: 20px;
}

QPushButton:hover {
    background-color: #475569;
}

QPushButton:pressed {
    background-color: #1e293b;
}

QPushButton[primary="true"], QPushButton:default {
    background: qlineargradient(x1:0, y1:0, x2:1, y2:0, stop:0 #4f46e5, stop:1 #6366f1);
    color: #ffffff;
    border: 1px solid #4338ca;
}

QPushButton[primary="true"]:hover, QPushButton:default:hover {
    background: qlineargradient(x1:0, y1:0, x2:1, y2:0, stop:0 #4338ca, stop:1 #4f46e5);
}

/* Etiketler (QLabel) */
QLabel {
    color: #cbd5e1;
}
"""
