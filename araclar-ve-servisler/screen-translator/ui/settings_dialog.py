from PyQt5.QtWidgets import (QDialog, QVBoxLayout, QHBoxLayout, QLabel, 
                             QComboBox, QCheckBox, QSlider, QPushButton, 
                             QTabWidget, QWidget, QKeySequenceEdit, QFormLayout)
from PyQt5.QtCore import Qt
from PyQt5.QtGui import QKeySequence

LANGUAGES = {
    "İngilizce": "en",
    "Türkçe": "tr",
    "Almanca": "de",
    "Fransızca": "fr",
    "İspanyolca": "es",
    "Rusça": "ru",
    "Japonca": "ja",
    "Korece": "ko",
    "Çince": "zh-CN"
}

class SettingsDialog(QDialog):
    def __init__(self, config_manager, pipeline_worker):
        super().__init__()
        self.config = config_manager
        self.pipeline = pipeline_worker
        self.initUI()
        
    def initUI(self):
        self.setWindowTitle("Screen Translator Ayarları")
        self.setMinimumWidth(400)
        
        layout = QVBoxLayout()
        tabs = QTabWidget()
        
        # --- Genel Sekmesi ---
        general_tab = QWidget()
        general_layout = QFormLayout()
        
        # Auto detect
        self.auto_detect_cb = QCheckBox("Kaynak dili otomatik algıla")
        self.auto_detect_cb.setChecked(self.config.get("auto_detect_source", False))
        self.auto_detect_cb.stateChanged.connect(self.toggle_source_lang)
        general_layout.addRow(self.auto_detect_cb)
        
        # Source lang
        self.source_combo = QComboBox()
        for name, code in LANGUAGES.items():
            self.source_combo.addItem(name, code)
        self.set_combo_value(self.source_combo, self.config.get("source_lang", "en"))
        self.source_combo.setEnabled(not self.auto_detect_cb.isChecked())
        general_layout.addRow("Kaynak Dil:", self.source_combo)
        
        # Target lang
        self.target_combo = QComboBox()
        for name, code in LANGUAGES.items():
            self.target_combo.addItem(name, code)
        self.set_combo_value(self.target_combo, self.config.get("target_lang", "tr"))
        general_layout.addRow("Hedef Dil:", self.target_combo)
        
        # FPS
        self.fps_slider = QSlider(Qt.Horizontal)
        self.fps_slider.setMinimum(1)
        self.fps_slider.setMaximum(10)
        self.fps_slider.setValue(self.config.get("fps", 3))
        self.fps_label = QLabel(f"{self.fps_slider.value()} FPS")
        self.fps_slider.valueChanged.connect(lambda v: self.fps_label.setText(f"{v} FPS"))
        fps_layout = QHBoxLayout()
        fps_layout.addWidget(self.fps_slider)
        fps_layout.addWidget(self.fps_label)
        general_layout.addRow("Tarama Hızı:", fps_layout)
        
        general_tab.setLayout(general_layout)
        tabs.addTab(general_tab, "Genel")
        
        # --- Kısayollar Sekmesi ---
        hotkeys_tab = QWidget()
        hotkeys_layout = QFormLayout()
        
        self.toggle_hotkey = QKeySequenceEdit()
        self.toggle_hotkey.setKeySequence(QKeySequence(self.config.get("hotkeys.toggle_translation", "ctrl+shift+t")))
        hotkeys_layout.addRow("Çeviriyi Aç/Kapat:", self.toggle_hotkey)
        
        self.region_hotkey = QKeySequenceEdit()
        self.region_hotkey.setKeySequence(QKeySequence(self.config.get("hotkeys.select_region", "ctrl+shift+r")))
        hotkeys_layout.addRow("Bölge Seç:", self.region_hotkey)
        
        # Not about keyboard module vs Qt format
        note = QLabel("<i>Not: Kısayollar yeniden başlatıldıktan sonra aktif olur.</i>")
        note.setTextFormat(Qt.RichText)
        hotkeys_layout.addRow(note)
        
        hotkeys_tab.setLayout(hotkeys_layout)
        tabs.addTab(hotkeys_tab, "Kısayollar")
        
        layout.addWidget(tabs)
        
        # Buttons
        btn_layout = QHBoxLayout()
        save_btn = QPushButton("Kaydet")
        save_btn.clicked.connect(self.save_settings)
        cancel_btn = QPushButton("İptal")
        cancel_btn.clicked.connect(self.reject)
        
        btn_layout.addStretch()
        btn_layout.addWidget(save_btn)
        btn_layout.addWidget(cancel_btn)
        
        layout.addLayout(btn_layout)
        self.setLayout(layout)

    def toggle_source_lang(self, state):
        self.source_combo.setEnabled(state != Qt.Checked)

    def set_combo_value(self, combo, val):
        index = combo.findData(val)
        if index >= 0:
            combo.setCurrentIndex(index)

    def convert_qt_shortcut_to_keyboard(self, qt_seq):
        # Convert PyQt QKeySequence format to keyboard module format
        seq = qt_seq.toString().lower()
        seq = seq.replace('+', '+') # Keyboard module uses '+'
        return seq

    def save_settings(self):
        # General
        self.config.set("auto_detect_source", self.auto_detect_cb.isChecked())
        self.config.set("source_lang", self.source_combo.currentData())
        self.config.set("target_lang", self.target_combo.currentData())
        self.config.set("fps", self.fps_slider.value())
        
        # Hotkeys
        toggle_str = self.convert_qt_shortcut_to_keyboard(self.toggle_hotkey.keySequence())
        region_str = self.convert_qt_shortcut_to_keyboard(self.region_hotkey.keySequence())
        self.config.set("hotkeys.toggle_translation", toggle_str)
        self.config.set("hotkeys.select_region", region_str)
        
        self.config.save()
        self.pipeline.update_config()
        self.accept()
