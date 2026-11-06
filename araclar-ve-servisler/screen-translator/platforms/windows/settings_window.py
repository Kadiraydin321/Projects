from PyQt5.QtWidgets import (
    QDialog, QVBoxLayout, QHBoxLayout, QLabel, QComboBox, QCheckBox,
    QSlider, QPushButton, QTabWidget, QWidget, QKeySequenceEdit,
    QFormLayout, QLineEdit, QGroupBox
)
from PyQt5.QtCore import Qt
from PyQt5.QtGui import QKeySequence

try:
    from core.config import ConfigManager
except ImportError:
    from ...core.config import ConfigManager

LANGUAGES = {
    "Otomatik Algıla": "auto",
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

class ModernSettingsDialog(QDialog):
    """
    Modern koyu temalı ayarlar iletişim kutusu.
    Gemini API, OCR motoru, FPS ve Google Lens katman tercihlerini yapılandırır.
    """

    def __init__(self, config: ConfigManager, on_save_callback=None):
        super().__init__()
        self.config = config
        self.on_save_callback = on_save_callback
        self.initUI()
        self.applyModernStyle()

    def applyModernStyle(self):
        try:
            from ui.theme import MODERN_DARK_STYLESHEET
            self.setStyleSheet(MODERN_DARK_STYLESHEET)
        except Exception:
            pass

    def initUI(self):
        self.setWindowTitle("Screen Translator AI - Gelişmiş Ayarlar")
        self.resize(540, 500)
        
        import os, sys
        from PyQt5.QtGui import QIcon
        base_dir = getattr(sys, '_MEIPASS', os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
        icon_path = os.path.join(base_dir, "icon.png")
        if not os.path.exists(icon_path):
            icon_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "icon.png")
        if os.path.exists(icon_path):
            self.setWindowIcon(QIcon(icon_path))

        main_layout = QVBoxLayout()
        tabs = QTabWidget()

        # 1. Sekme: Çeviri & Yapay Zeka
        ai_tab = QWidget()
        ai_layout = QFormLayout()

        self.trans_engine_combo = QComboBox()
        self.trans_engine_combo.addItem("Google Gemini AI (Ultra Hızlı Flash)", "gemini")
        self.trans_engine_combo.addItem("Google Translate (Ücretsiz / Standart)", "google")
        self.trans_engine_combo.addItem("Ollama (Yerel / Offline LLM)", "ollama")
        self._select_combo_data(self.trans_engine_combo, self.config.get("translation_engine", "gemini"))
        self.trans_engine_combo.currentIndexChanged.connect(self._toggle_ai_fields)
        ai_layout.addRow("Çeviri Motoru:", self.trans_engine_combo)

        # Gemini Alanları
        self.gemini_group = QGroupBox("Google Gemini Ayarları")
        g_layout = QFormLayout()
        self.api_key_input = QLineEdit()
        self.api_key_input.setEchoMode(QLineEdit.Password)
        self.api_key_input.setText(self.config.get("gemini_api_key", ""))
        self.api_key_input.setPlaceholderText("AI Studio API anahtarınızı girin...")
        g_layout.addRow("Gemini API Key:", self.api_key_input)

        self.model_combo = QComboBox()
        self.model_combo.addItems(["gemini-2.0-flash", "gemini-1.5-flash", "gemini-1.5-pro"])
        self.model_combo.setCurrentText(self.config.get("gemini_model", "gemini-2.0-flash"))
        g_layout.addRow("Model Seçimi:", self.model_combo)
        self.gemini_group.setLayout(g_layout)
        ai_layout.addRow(self.gemini_group)

        # Dil Seçimleri
        self.src_combo = QComboBox()
        for name, code in LANGUAGES.items():
            self.src_combo.addItem(name, code)
        self._select_combo_data(self.src_combo, self.config.get("source_lang", "auto"))
        ai_layout.addRow("Kaynak Dil:", self.src_combo)

        self.tgt_combo = QComboBox()
        for name, code in LANGUAGES.items():
            if code != "auto":
                self.tgt_combo.addItem(name, code)
        self._select_combo_data(self.tgt_combo, self.config.get("target_lang", "tr"))
        ai_layout.addRow("Hedef Dil:", self.tgt_combo)

        ai_tab.setLayout(ai_layout)
        tabs.addTab(ai_tab, "Yapay Zeka & Çeviri")

        # 2. Sekme: OCR & Performans
        perf_tab = QWidget()
        perf_layout = QFormLayout()

        self.ocr_combo = QComboBox()
        self.ocr_combo.addItem("Windows Media OCR (Donanım Hızlandırmalı - 15ms)", "winrt")
        self.ocr_combo.addItem("RapidOCR ONNX (Platform Bağımsız)", "rapidocr")
        self._select_combo_data(self.ocr_combo, self.config.get("ocr_engine", "winrt"))
        perf_layout.addRow("OCR Motoru:", self.ocr_combo)

        # FPS Ayarı
        fps_box = QHBoxLayout()
        self.fps_slider = QSlider(Qt.Horizontal)
        self.fps_slider.setRange(1, 15)
        self.fps_slider.setValue(self.config.get("fps", 5))
        self.fps_label = QLabel(f"{self.fps_slider.value()} FPS")
        self.fps_slider.valueChanged.connect(lambda v: self.fps_label.setText(f"{v} FPS"))
        fps_box.addWidget(self.fps_slider)
        fps_box.addWidget(self.fps_label)
        perf_layout.addRow("Tarama Hızı (FPS):", fps_box)

        # Cümle Kümeleme
        self.cluster_cb = QCheckBox("Akıllı Cümle/Paragraf Birleştirme (Daha doğal AI çevirisi)")
        self.cluster_cb.setChecked(self.config.get("enable_clustering", True))
        perf_layout.addRow(self.cluster_cb)

        perf_tab.setLayout(perf_layout)
        tabs.addTab(perf_tab, "OCR & Performans")

        # 3. Sekme: Google Lens & Katman
        lens_tab = QWidget()
        lens_layout = QFormLayout()

        self.swipe_cb = QCheckBox("Google Lens Kaydırmalı Karşılaştırma Modu (Swipe Slider)")
        self.swipe_cb.setChecked(self.config.get("overlay.swipe_mode", True))
        lens_layout.addRow(self.swipe_cb)

        self.click_cb = QCheckBox("Başlangıçta Tıklama Geçirgenliği Açık (Click-through)")
        self.click_cb.setChecked(self.config.get("overlay.click_through", False))
        lens_layout.addRow(self.click_cb)

        # Kısayollar
        self.toggle_hk = QKeySequenceEdit(QKeySequence(self.config.get("hotkeys.toggle_translation", "ctrl+shift+t")))
        lens_layout.addRow("Çeviriyi Aç/Kapat Kısayolu:", self.toggle_hk)

        self.region_hk = QKeySequenceEdit(QKeySequence(self.config.get("hotkeys.select_region", "ctrl+shift+r")))
        lens_layout.addRow("Bölge Seçme Kısayolu:", self.region_hk)

        self.click_hk = QKeySequenceEdit(QKeySequence(self.config.get("hotkeys.toggle_clickthrough", "ctrl+shift+s")))
        lens_layout.addRow("Tıklama Geçirgenliği Kısayolu:", self.click_hk)

        lens_tab.setLayout(lens_layout)
        tabs.addTab(lens_tab, "Arayüz & Kısayollar")

        main_layout.addWidget(tabs)

        # Butonlar
        btn_layout = QHBoxLayout()
        btn_layout.addStretch()
        cancel_btn = QPushButton("İptal")
        cancel_btn.clicked.connect(self.reject)
        save_btn = QPushButton("Kaydet ve Uygula")
        save_btn.setDefault(True)
        save_btn.clicked.connect(self.save_settings)
        btn_layout.addWidget(cancel_btn)
        btn_layout.addWidget(save_btn)

        main_layout.addLayout(btn_layout)
        self.setLayout(main_layout)

        self._toggle_ai_fields()

    def _select_combo_data(self, combo: QComboBox, val):
        idx = combo.findData(val)
        if idx >= 0:
            combo.setCurrentIndex(idx)

    def _toggle_ai_fields(self):
        is_gemini = (self.trans_engine_combo.currentData() == "gemini")
        self.gemini_group.setVisible(is_gemini)

    def save_settings(self):
        self.config.set("translation_engine", self.trans_engine_combo.currentData())
        self.config.set("gemini_api_key", self.api_key_input.text().strip())
        self.config.set("gemini_model", self.model_combo.currentText())
        self.config.set("source_lang", self.src_combo.currentData())
        self.config.set("target_lang", self.tgt_combo.currentData())

        self.config.set("ocr_engine", self.ocr_combo.currentData())
        self.config.set("fps", self.fps_slider.value())
        self.config.set("enable_clustering", self.cluster_cb.isChecked())

        self.config.set("overlay.swipe_mode", self.swipe_cb.isChecked())
        self.config.set("overlay.click_through", self.click_cb.isChecked())

        self.config.set("hotkeys.toggle_translation", self.toggle_hk.keySequence().toString().lower())
        self.config.set("hotkeys.select_region", self.region_hk.keySequence().toString().lower())
        self.config.set("hotkeys.toggle_clickthrough", self.click_hk.keySequence().toString().lower())

        self.config.save()
        if self.on_save_callback:
            self.on_save_callback()
        self.accept()
