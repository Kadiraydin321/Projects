#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
NoteVault Kurtarma Aracı - Web Arayüzü & Yerel Sunucu
Tek tıkla çalışır, harici kütüphane gerektirmez, modern ve hızlı web arayüzü sunar.
"""

import cgi
import io
import json
import os
import sys
import time
import uuid
import urllib.parse
import webbrowser
import zipfile
from http.server import ThreadingHTTPServer, BaseHTTPRequestHandler
from typing import Dict, Any

from notevault_core import NoteVaultFile, create_unencrypted_noteapp_backup
from variations import generate_variations

PORT = 7890
JOBS: Dict[str, Dict[str, Any]] = {}

HTML_TEMPLATE = """<!DOCTYPE html>
<html lang="tr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>NoteVault Şifre Kurtarıcı & Kasa Açıcı</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;600&display=swap" rel="stylesheet">
    <style>
        :root {
            --bg: #0b0f19;
            --surface: #131b2e;
            --surface-hover: #1b253e;
            --border: #232f4e;
            --primary: #3b82f6;
            --primary-glow: rgba(59, 130, 246, 0.25);
            --success: #10b981;
            --success-glow: rgba(16, 185, 129, 0.2);
            --danger: #ef4444;
            --text-main: #f8fafc;
            --text-muted: #94a3b8;
            --accent: #8b5cf6;
        }

        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
            font-family: 'Plus Jakarta Sans', sans-serif;
        }

        body {
            background-color: var(--bg);
            color: var(--text-main);
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            background-image: 
                radial-gradient(circle at 15% 15%, rgba(59, 130, 246, 0.12) 0%, transparent 40%),
                radial-gradient(circle at 85% 85%, rgba(139, 92, 246, 0.1) 0%, transparent 40%);
        }

        header {
            padding: 1.25rem 2rem;
            display: flex;
            align-items: center;
            justify-content: space-between;
            border-bottom: 1px solid var(--border);
            backdrop-filter: blur(12px);
            background: rgba(19, 27, 46, 0.7);
            position: sticky;
            top: 0;
            z-index: 50;
        }

        .logo {
            display: flex;
            align-items: center;
            gap: 0.75rem;
            font-size: 1.25rem;
            font-weight: 800;
            letter-spacing: -0.02em;
            color: #fff;
        }

        .logo-icon {
            width: 38px;
            height: 38px;
            background: linear-gradient(135deg, #3b82f6, #8b5cf6);
            border-radius: 10px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 1.25rem;
            box-shadow: 0 4px 14px var(--primary-glow);
        }

        .badge-safe {
            font-size: 0.75rem;
            padding: 0.25rem 0.6rem;
            background: rgba(16, 185, 129, 0.15);
            color: var(--success);
            border: 1px solid rgba(16, 185, 129, 0.3);
            border-radius: 999px;
            font-weight: 600;
        }

        main {
            flex: 1;
            max-width: 1100px;
            width: 100%;
            margin: 0 auto;
            padding: 2.5rem 1.5rem;
            display: flex;
            flex-direction: column;
            gap: 2rem;
        }

        .hero-text {
            text-align: center;
            max-width: 650px;
            margin: 0 auto 0.5rem auto;
        }

        .hero-text h1 {
            font-size: 2.25rem;
            font-weight: 800;
            letter-spacing: -0.03em;
            margin-bottom: 0.75rem;
            background: linear-gradient(135deg, #ffffff 30%, #94a3b8 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }

        .hero-text p {
            color: var(--text-muted);
            font-size: 1rem;
            line-height: 1.6;
        }

        .card {
            background: var(--surface);
            border: 1px solid var(--border);
            border-radius: 18px;
            padding: 2rem;
            box-shadow: 0 10px 30px -10px rgba(0, 0, 0, 0.5);
            transition: all 0.2s ease;
        }

        /* Upload Zone */
        .dropzone {
            border: 2px dashed var(--border);
            border-radius: 14px;
            padding: 2.5rem 1.5rem;
            text-align: center;
            cursor: pointer;
            transition: all 0.2s ease;
            background: rgba(11, 15, 25, 0.4);
            position: relative;
        }

        .dropzone:hover, .dropzone.dragover {
            border-color: var(--primary);
            background: rgba(59, 130, 246, 0.05);
            box-shadow: 0 0 20px var(--primary-glow);
        }

        .dropzone input[type="file"] {
            position: absolute;
            inset: 0;
            opacity: 0;
            cursor: pointer;
            width: 100%;
            height: 100%;
        }

        .drop-icon {
            font-size: 2.8rem;
            margin-bottom: 0.75rem;
            display: inline-block;
        }

        .file-loaded-info {
            display: none;
            background: rgba(59, 130, 246, 0.1);
            border: 1px solid rgba(59, 130, 246, 0.3);
            border-radius: 12px;
            padding: 1rem 1.25rem;
            margin-top: 1rem;
            align-items: center;
            justify-content: space-between;
        }

        /* Form Controls */
        .form-grid {
            display: grid;
            grid-template-columns: 1fr;
            gap: 1.5rem;
            margin-top: 1.5rem;
        }

        .form-group {
            display: flex;
            flex-direction: column;
            gap: 0.5rem;
        }

        .form-group label {
            font-size: 0.9rem;
            font-weight: 600;
            color: #e2e8f0;
            display: flex;
            align-items: center;
            gap: 0.5rem;
        }

        .input-text {
            background: #0b0f19;
            border: 1px solid var(--border);
            color: #fff;
            padding: 0.9rem 1.1rem;
            border-radius: 12px;
            font-size: 0.95rem;
            outline: none;
            transition: all 0.2s ease;
        }

        .input-text:focus {
            border-color: var(--primary);
            box-shadow: 0 0 0 3px var(--primary-glow);
        }

        /* Radio Options */
        .level-options {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 1rem;
        }

        .level-card {
            background: #0b0f19;
            border: 1px solid var(--border);
            border-radius: 12px;
            padding: 1rem;
            cursor: pointer;
            transition: all 0.2s;
            display: flex;
            flex-direction: column;
            gap: 0.35rem;
        }

        .level-card:hover {
            border-color: #3b82f6;
            background: rgba(59, 130, 246, 0.05);
        }

        .level-card.selected {
            border-color: var(--primary);
            background: rgba(59, 130, 246, 0.12);
            box-shadow: 0 0 14px var(--primary-glow);
        }

        .level-title {
            font-weight: 700;
            font-size: 0.95rem;
            display: flex;
            align-items: center;
            gap: 0.4rem;
        }

        .level-desc {
            font-size: 0.78rem;
            color: var(--text-muted);
            line-height: 1.4;
        }

        /* Action Button */
        .btn-primary {
            background: linear-gradient(135deg, #3b82f6, #2563eb);
            color: #fff;
            border: none;
            border-radius: 14px;
            padding: 1rem 2rem;
            font-size: 1.05rem;
            font-weight: 700;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 0.6rem;
            box-shadow: 0 6px 20px var(--primary-glow);
            transition: all 0.2s;
            width: 100%;
            margin-top: 1rem;
        }

        .btn-primary:hover:not(:disabled) {
            transform: translateY(-2px);
            box-shadow: 0 8px 25px rgba(59, 130, 246, 0.4);
        }

        .btn-primary:disabled {
            opacity: 0.6;
            cursor: not-allowed;
            transform: none;
        }

        /* Progress Card */
        .progress-card {
            display: none;
            background: var(--surface);
            border: 1px solid var(--border);
            border-radius: 18px;
            padding: 2rem;
            text-align: center;
        }

        .progress-bar-container {
            width: 100%;
            height: 12px;
            background: #0b0f19;
            border-radius: 999px;
            overflow: hidden;
            margin: 1.5rem 0;
            position: relative;
        }

        .progress-bar-fill {
            height: 100%;
            width: 0%;
            background: linear-gradient(90deg, #3b82f6, #8b5cf6);
            border-radius: 999px;
            transition: width 0.1s linear;
        }

        .stats-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 1rem;
            margin-top: 1rem;
        }

        .stat-box {
            background: #0b0f19;
            padding: 0.85rem;
            border-radius: 12px;
            border: 1px solid var(--border);
        }

        .stat-value {
            font-size: 1.35rem;
            font-weight: 800;
            color: #fff;
            font-family: 'JetBrains Mono', monospace;
        }

        .stat-label {
            font-size: 0.75rem;
            color: var(--text-muted);
            margin-top: 0.2rem;
            text-transform: uppercase;
            letter-spacing: 0.05em;
        }

        .current-cand-text {
            font-family: 'JetBrains Mono', monospace;
            font-size: 0.85rem;
            color: #94a3b8;
            margin-top: 1rem;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }

        /* Success & Decrypted Content */
        .result-card {
            display: none;
            background: var(--surface);
            border: 1px solid rgba(16, 185, 129, 0.4);
            border-radius: 18px;
            padding: 2rem;
            box-shadow: 0 10px 40px var(--success-glow);
        }

        .pwd-reveal-box {
            background: rgba(16, 185, 129, 0.1);
            border: 1px solid rgba(16, 185, 129, 0.3);
            border-radius: 14px;
            padding: 1.25rem 1.75rem;
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 2rem;
        }

        .pwd-reveal-val {
            font-family: 'JetBrains Mono', monospace;
            font-size: 1.6rem;
            font-weight: 800;
            color: #34d399;
            letter-spacing: 0.02em;
        }

        .btn-copy {
            background: #10b981;
            color: #0b0f19;
            font-weight: 700;
            padding: 0.6rem 1.2rem;
            border-radius: 10px;
            border: none;
            cursor: pointer;
            transition: all 0.2s;
        }

        .btn-copy:hover {
            background: #34d399;
        }

        /* Note Explorer Layout */
        .note-explorer {
            display: grid;
            grid-template-columns: 320px 1fr;
            gap: 1.5rem;
            min-height: 480px;
            background: #0b0f19;
            border: 1px solid var(--border);
            border-radius: 14px;
            overflow: hidden;
        }

        .notes-list-pane {
            border-right: 1px solid var(--border);
            display: flex;
            flex-direction: column;
            background: rgba(19, 27, 46, 0.4);
        }

        .notes-search-box {
            padding: 0.85rem;
            border-bottom: 1px solid var(--border);
        }

        .notes-list-scroll {
            flex: 1;
            overflow-y: auto;
            max-height: 460px;
        }

        .note-item {
            padding: 0.85rem 1rem;
            border-bottom: 1px solid rgba(35, 47, 78, 0.5);
            cursor: pointer;
            transition: all 0.15s;
        }

        .note-item:hover {
            background: rgba(59, 130, 246, 0.08);
        }

        .note-item.active {
            background: rgba(59, 130, 246, 0.18);
            border-left: 3px solid var(--primary);
        }

        .note-item-title {
            font-weight: 600;
            font-size: 0.92rem;
            color: #f1f5f9;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }

        .note-item-snippet {
            font-size: 0.78rem;
            color: var(--text-muted);
            margin-top: 0.25rem;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }

        .note-reader-pane {
            padding: 1.5rem;
            overflow-y: auto;
            max-height: 520px;
            display: flex;
            flex-direction: column;
            gap: 1rem;
        }

        .note-detail-title {
            font-size: 1.4rem;
            font-weight: 700;
            color: #fff;
        }

        .note-detail-meta {
            font-size: 0.8rem;
            color: var(--text-muted);
            display: flex;
            gap: 1rem;
            align-items: center;
        }

        .note-detail-content {
            font-size: 0.95rem;
            line-height: 1.7;
            color: #cbd5e1;
            white-space: pre-wrap;
            background: rgba(255, 255, 255, 0.02);
            padding: 1rem;
            border-radius: 10px;
            border: 1px solid rgba(255, 255, 255, 0.05);
            flex: 1;
        }

        .download-actions {
            display: flex;
            gap: 1rem;
            flex-wrap: wrap;
            margin-top: 1.5rem;
        }

        .btn-outline {
            background: transparent;
            border: 1px solid var(--border);
            color: #e2e8f0;
            padding: 0.75rem 1.25rem;
            border-radius: 12px;
            font-size: 0.9rem;
            font-weight: 600;
            cursor: pointer;
            display: inline-flex;
            align-items: center;
            gap: 0.5rem;
            transition: all 0.2s;
            text-decoration: none;
        }

        .btn-outline:hover {
            border-color: var(--primary);
            color: #fff;
            background: rgba(59, 130, 246, 0.08);
        }

        /* Not Found */
        .notfound-card {
            display: none;
            background: var(--surface);
            border: 1px solid var(--danger);
            border-radius: 18px;
            padding: 2rem;
            text-align: center;
        }

        @media (max-width: 768px) {
            .note-explorer {
                grid-template-columns: 1fr;
            }
            .notes-list-pane {
                border-right: none;
                border-bottom: 1px solid var(--border);
                max-height: 250px;
            }
            .stats-grid {
                grid-template-columns: 1fr;
            }
        }
    </style>
</head>
<body>

    <header>
        <div class="logo">
            <div class="logo-icon">🔐</div>
            <span>NoteVault Kurtarıcı</span>
        </div>
        <div class="badge-safe">🛡️ %100 Çevrimdışı & Güvenli</div>
    </header>

    <main>
        <div class="hero-text">
            <h1>Şifrenizi Hatırlamıyor Musunuz?</h1>
            <p>.notevault dosyanızı yükleyin ve aklınızda kalan yaklaşık parolaları yazın. Akıllı mutasyon motoru binlerce varyasyonu milisaniyeler içinde deneyip kasanızı açacaktır.</p>
        </div>

        <!-- Yükleme & Yapılandırma Kartı -->
        <div class="card" id="configCard">
            <!-- Dosya Yükleme Alanı -->
            <div class="dropzone" id="dropzone">
                <input type="file" id="vaultFileInput" accept=".notevault">
                <div class="drop-icon">📦</div>
                <h3 style="font-size: 1.15rem; margin-bottom: 0.4rem;">.notevault dosyasını buraya sürükleyin</h3>
                <p style="color: var(--text-muted); font-size: 0.85rem;">veya dosya seçmek için tıklayın</p>
            </div>

            <div class="file-loaded-info" id="fileInfoBox">
                <div>
                    <span style="font-weight: 700; color: #fff;" id="fileNameDisplay">dosya.notevault</span>
                    <span style="color: var(--text-muted); font-size: 0.85rem; margin-left: 0.5rem;" id="fileSizeDisplay"></span>
                </div>
                <span class="badge-safe">✓ Geçerli NoteVault Başlığı</span>
            </div>

            <div class="form-grid">
                <!-- Tahminler Girişi -->
                <div class="form-group">
                    <label>
                        <span>💡 Tahmini Şifre / Anahtar Kelimeler:</span>
                        <span style="color: var(--text-muted); font-weight: 400; font-size: 0.8rem;">(Virgülle ayırarak birden fazla girebilirsiniz)</span>
                    </label>
                    <input type="text" id="guessesInput" class="input-text" placeholder="Örn: ahmet, 1905, gizliNot, 1234">
                </div>

                <!-- Seviye Seçimi -->
                <div class="form-group">
                    <label>⚡ Tarama Derinliği Seviyesi:</label>
                    <div class="level-options">
                        <div class="level-card" onclick="selectLevel('fast')">
                            <input type="radio" name="level" value="fast" id="lvlFast" style="display:none;">
                            <div class="level-title">⚡ Hızlı (Fast)</div>
                            <div class="level-desc">Büyük/küçük harf, Türkçe karakterler ve yaygın son ekler. (~1.000 - 25.000 kombinasyon)</div>
                        </div>
                        <div class="level-card selected" onclick="selectLevel('standard')">
                            <input type="radio" name="level" value="standard" id="lvlStandard" checked style="display:none;">
                            <div class="level-title">🎯 Standart (Önerilen)</div>
                            <div class="level-desc">Leet speak (a->4, e->3), yıllar, şehir plakaları, takım yılları, semboller. (~150.000 kombinasyon)</div>
                        </div>
                        <div class="level-card" onclick="selectLevel('deep')">
                            <input type="radio" name="level" value="deep" id="lvlDeep" style="display:none;">
                            <div class="level-title">🔬 Derinlemesine (Deep)</div>
                            <div class="level-desc">Klavye bitişik tuş hataları, harf eksik/fazla, geniş kombinasyonlar. (~700.000+ kombinasyon)</div>
                        </div>
                    </div>
                </div>

                <!-- Ek Ayarlar (İsteğe Bağlı) -->
                <div style="margin-top: 0.5rem;">
                    <details style="cursor: pointer; color: var(--text-muted); font-size: 0.85rem;">
                        <summary style="font-weight: 600; color: #94a3b8;">⚙️ Özel Ön Ek / Son Ek Ekle (İsteğe Bağlı)</summary>
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-top: 0.8rem;">
                            <div class="form-group">
                                <label style="font-size: 0.8rem;">Özel Ön Ekler (Virgülle):</label>
                                <input type="text" id="customPrefixes" class="input-text" placeholder="Örn: My, Pass_, !">
                            </div>
                            <div class="form-group">
                                <label style="font-size: 0.8rem;">Özel Son Ekler (Virgülle):</label>
                                <input type="text" id="customSuffixes" class="input-text" placeholder="Örn: 2024*, _kasa, .99">
                            </div>
                        </div>
                    </details>
                </div>

                <button class="btn-primary" id="startBtn" onclick="startRecovery()" disabled>
                    <span>🚀 Şifreyi Ara ve Kasayı Aç</span>
                </button>
            </div>
        </div>

        <!-- Canlı İlerleme Kartı -->
        <div class="progress-card" id="progressCard">
            <h2 style="font-size: 1.4rem; margin-bottom: 0.3rem;">Varyasyonlar Taranıyor...</h2>
            <p style="color: var(--text-muted); font-size: 0.9rem;">Akıllı mutasyon motoru adayları deniyor</p>

            <div class="progress-bar-container">
                <div class="progress-bar-fill" id="progressBarFill"></div>
            </div>

            <div class="stats-grid">
                <div class="stat-box">
                    <div class="stat-value" id="statTested">0</div>
                    <div class="stat-label">Denenen Varyasyon</div>
                </div>
                <div class="stat-box">
                    <div class="stat-value" id="statSpeed">0 /s</div>
                    <div class="stat-label">Arama Hızı</div>
                </div>
                <div class="stat-box">
                    <div class="stat-value" id="statElapsed">0.0s</div>
                    <div class="stat-label">Geçen Süre</div>
                </div>
            </div>

            <div class="current-cand-text">
                Son denenen: <span id="currentCandSpan" style="color: #60a5fa;">...</span>
            </div>
        </div>

        <!-- Başarı & Çözülmüş İçerik Kartı -->
        <div class="result-card" id="resultCard">
            <div style="text-align: center; margin-bottom: 1.5rem;">
                <span style="font-size: 2.5rem;">🎉</span>
                <h2 style="font-size: 1.8rem; font-weight: 800; margin-top: 0.5rem; color: #fff;">Tebrikler! Kasa Şifresi Bulundu</h2>
                <p style="color: var(--text-muted); font-size: 0.95rem;">Şifreniz başarıyla çözüldü ve notlarınız aşağıda listelendi.</p>
            </div>

            <div class="pwd-reveal-box">
                <div>
                    <div style="font-size: 0.8rem; text-transform: uppercase; color: #10b981; font-weight: 700; margin-bottom: 0.2rem;">Kasa Şifreniz</div>
                    <div class="pwd-reveal-val" id="foundPasswordDisplay">******</div>
                </div>
                <button class="btn-copy" onclick="copyPassword()">📋 Şifreyi Kopyala</button>
            </div>

            <!-- Not Gezgini -->
            <div class="note-explorer">
                <div class="notes-list-pane">
                    <div class="notes-search-box">
                        <input type="text" id="noteSearchInput" class="input-text" style="width: 100%; padding: 0.6rem 0.8rem; font-size: 0.85rem;" placeholder="Notlarda ara..." oninput="filterNotes()">
                    </div>
                    <div class="notes-list-scroll" id="notesListContainer">
                        <!-- Notlar JS ile buraya basılır -->
                    </div>
                </div>
                <div class="note-reader-pane">
                    <div class="note-detail-title" id="activeNoteTitle">Lütfen soldan bir not seçin</div>
                    <div class="note-detail-meta" id="activeNoteMeta"></div>
                    <div class="note-detail-content" id="activeNoteContent"></div>
                </div>
            </div>

            <!-- İndirme & Dışa Aktarma Butonları -->
            <div style="background: rgba(16, 185, 129, 0.08); border: 1px solid rgba(16, 185, 129, 0.25); border-radius: 14px; padding: 1.25rem; margin-top: 1.5rem;">
                <div style="font-weight: 700; color: #34d399; font-size: 1rem; margin-bottom: 0.35rem;">📱 NoteApp Uygulamasında Açmak İçin:</div>
                <div style="font-size: 0.85rem; color: #cbd5e1; margin-bottom: 1rem; line-height: 1.5;">
                    Aşağıdaki yeşil butondan şifresiz yedeği indirin. NoteApp uygulamasında <strong>Ayarlar ➔ Yedekten Geri Yükle</strong> bölümünden bu <code>.zip</code> dosyasını seçtiğinizde tüm notlarınız şifre sormadan doğrudan uygulamaya aktarılacaktır.
                </div>
                <div class="download-actions" style="margin-top: 0;">
                    <a class="btn-primary" id="dlAppZip" href="#" style="background: linear-gradient(135deg, #10b981, #059669); margin-top: 0; width: auto; text-decoration: none;" download>
                        <span>📥 NoteApp Şifresiz Yedek (.zip) İndir</span>
                    </a>
                    <a class="btn-outline" id="dlTxtZip" href="#" download>
                        <span>📁 Notları Metin (.txt) Olarak İndir (ZIP)</span>
                    </a>
                    <a class="btn-outline" id="dlJson" href="#" download>
                        <span>📄 JSON Olarak İndir</span>
                    </a>
                    <a class="btn-outline" id="dlOpenZip" href="#" style="display:none;" download>
                        <span>📦 Açık Ham Arşiv</span>
                    </a>
                    <button class="btn-outline" onclick="resetForm()" style="margin-left: auto;">
                        <span>🔄 Yeni Dosya Kurtar</span>
                    </button>
                </div>
            </div>
        </div>

        <!-- Bulunamadı Kartı -->
        <div class="notfound-card" id="notfoundCard">
            <span style="font-size: 2.5rem;">⚠️</span>
            <h2 style="font-size: 1.6rem; margin-top: 0.5rem; color: #f87171;">Şifre Bu Varyasyonlarda Bulunamadı</h2>
            <p style="color: var(--text-muted); margin: 0.8rem auto; max-width: 550px;">
                Belirtilen tahminler üzerinden üretilen tüm varyasyonlar denendi ancak eşleşme sağlanamadı.
            </p>
            <div style="background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.2); border-radius: 12px; padding: 1rem; max-width: 550px; margin: 1rem auto; text-align: left; font-size: 0.85rem; color: #fca5a5;">
                <strong>💡 Öneriler:</strong>
                <ul style="margin-left: 1.2rem; margin-top: 0.4rem; line-height: 1.6;">
                    <li>Aklınıza gelebilecek diğer eski şifrelerinizi, doğum yılınızı veya takma adlarınızı virgülle ekleyin.</li>
                    <li>Arama seviyesini <strong>"Derinlemesine (Deep)"</strong> olarak seçin.</li>
                    <li>Özel ön ek veya son ek alanına şüphe duyduğunuz sembolleri ekleyin.</li>
                </ul>
            </div>
            <button class="btn-outline" onclick="resetForm()" style="margin-top: 1rem;">
                <span>← Geri Dön ve Yeniden Dene</span>
            </button>
        </div>
    </main>

    <script>
        let currentJobId = null;
        let loadedFile = null;
        let selectedLevelVal = 'standard';
        let decryptedData = null;
        let allNotes = [];

        // Drag & Drop
        const dropzone = document.getElementById('dropzone');
        const fileInput = document.getElementById('vaultFileInput');
        const fileInfoBox = document.getElementById('fileInfoBox');
        const fileNameDisplay = document.getElementById('fileNameDisplay');
        const fileSizeDisplay = document.getElementById('fileSizeDisplay');
        const startBtn = document.getElementById('startBtn');

        ['dragenter', 'dragover'].forEach(name => {
            dropzone.addEventListener(name, (e) => {
                e.preventDefault();
                dropzone.classList.add('dragover');
            });
        });

        ['dragleave', 'drop'].forEach(name => {
            dropzone.addEventListener(name, (e) => {
                e.preventDefault();
                dropzone.classList.remove('dragover');
            });
        });

        dropzone.addEventListener('drop', (e) => {
            if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                handleFileSelect(e.dataTransfer.files[0]);
            }
        });

        fileInput.addEventListener('change', (e) => {
            if (e.target.files && e.target.files[0]) {
                handleFileSelect(e.target.files[0]);
            }
        });

        function handleFileSelect(file) {
            loadedFile = file;
            fileNameDisplay.textContent = file.name;
            fileSizeDisplay.textContent = '(' + (file.size / 1024).toFixed(1) + ' KB)';
            fileInfoBox.style.display = 'flex';
            checkReady();
        }

        document.getElementById('guessesInput').addEventListener('input', checkReady);

        function checkReady() {
            const guesses = document.getElementById('guessesInput').value.trim();
            startBtn.disabled = !(loadedFile && guesses.length > 0);
        }

        function selectLevel(lvl) {
            selectedLevelVal = lvl;
            document.querySelectorAll('.level-card').forEach(c => c.classList.remove('selected'));
            if (lvl === 'fast') document.querySelector('.level-card:nth-child(1)').classList.add('selected');
            if (lvl === 'standard') document.querySelector('.level-card:nth-child(2)').classList.add('selected');
            if (lvl === 'deep') document.querySelector('.level-card:nth-child(3)').classList.add('selected');
        }

        async function startRecovery() {
            if (!loadedFile) return;

            const guessesStr = document.getElementById('guessesInput').value.trim();
            const prefixesStr = document.getElementById('customPrefixes').value.trim();
            const suffixesStr = document.getElementById('customSuffixes').value.trim();

            // 1. Upload File
            const formData = new FormData();
            formData.append('file', loadedFile);

            document.getElementById('configCard').style.display = 'none';
            document.getElementById('progressCard').style.display = 'block';
            document.getElementById('resultCard').style.display = 'none';
            document.getElementById('notfoundCard').style.display = 'none';

            try {
                const upRes = await fetch('/api/upload', {
                    method: 'POST',
                    body: formData
                });
                const upData = await upRes.json();
                if (!upData.success) {
                    alert('Dosya yüklenemedi: ' + upData.error);
                    resetForm();
                    return;
                }
                currentJobId = upData.job_id;

                // 2. Stream Recovery
                const params = new URLSearchParams({
                    job_id: currentJobId,
                    guesses: guessesStr,
                    level: selectedLevelVal,
                    prefixes: prefixesStr,
                    suffixes: suffixesStr
                });

                const eventSource = new EventSource('/api/stream?' + params.toString());

                eventSource.addEventListener('progress', (e) => {
                    const data = JSON.parse(e.data);
                    document.getElementById('statTested').textContent = Number(data.tested).toLocaleString();
                    document.getElementById('statSpeed').textContent = Number(data.rate).toLocaleString() + ' /s';
                    document.getElementById('statElapsed').textContent = data.elapsed.toFixed(1) + 's';
                    document.getElementById('currentCandSpan').textContent = data.current;
                    // Pulsing fill
                    const fill = document.getElementById('progressBarFill');
                    fill.style.width = '100%';
                });

                eventSource.addEventListener('success', (e) => {
                    eventSource.close();
                    const data = JSON.parse(e.data);
                    showSuccess(data);
                });

                eventSource.addEventListener('not_found', (e) => {
                    eventSource.close();
                    document.getElementById('progressCard').style.display = 'none';
                    document.getElementById('notfoundCard').style.display = 'block';
                });

                eventSource.addEventListener('error', (e) => {
                    eventSource.close();
                    console.error('SSE Error:', e);
                });

            } catch (err) {
                alert('Hata oluştu: ' + err.message);
                resetForm();
            }
        }

        function showSuccess(data) {
            decryptedData = data;
            document.getElementById('progressCard').style.display = 'none';
            document.getElementById('resultCard').style.display = 'block';
            document.getElementById('foundPasswordDisplay').textContent = data.password;

            // İndirme linkleri
            document.getElementById('dlAppZip').href = '/api/download?job_id=' + currentJobId + '&format=app_zip';
            document.getElementById('dlTxtZip').href = '/api/download?job_id=' + currentJobId + '&format=txt_zip';
            document.getElementById('dlJson').href = '/api/download?job_id=' + currentJobId + '&format=json';
            
            if (data.payload_type === 'zip') {
                const openZipBtn = document.getElementById('dlOpenZip');
                openZipBtn.style.display = 'inline-flex';
                openZipBtn.href = '/api/download?job_id=' + currentJobId + '&format=open_zip';
            }

            allNotes = data.notes || [];
            renderNotesList(allNotes);
            if (allNotes.length > 0) {
                selectNote(0);
            }
        }

        function renderNotesList(notes) {
            const container = document.getElementById('notesListContainer');
            container.innerHTML = '';
            if (notes.length === 0) {
                container.innerHTML = '<div style="padding: 1rem; color: #64748b; font-size: 0.85rem; text-align: center;">Not bulunamadı.</div>';
                return;
            }

            notes.forEach((note, index) => {
                const item = document.createElement('div');
                item.className = 'note-item' + (index === 0 ? ' active' : '');
                item.onclick = () => selectNote(index);
                
                const catSpan = note.categoryName ? `<span style="font-size: 0.7rem; background: rgba(59,130,246,0.2); color:#60a5fa; padding: 2px 6px; border-radius: 4px; margin-left: 6px;">${escapeHtml(note.categoryName)}</span>` : '';
                const pinIcon = note.isPinned ? '📌 ' : '';

                item.innerHTML = `
                    <div class="note-item-title">${pinIcon}${escapeHtml(note.title || '(Başlıksız)')}${catSpan}</div>
                    <div class="note-item-snippet">${escapeHtml((note.content || '').substring(0, 60))}</div>
                `;
                container.appendChild(item);
            });
        }

        function selectNote(index) {
            document.querySelectorAll('.note-item').forEach((it, i) => {
                it.classList.toggle('active', i === index);
            });

            const note = allNotes[index];
            if (!note) return;

            document.getElementById('activeNoteTitle').textContent = note.title || '(Başlıksız)';
            
            let metaText = '';
            if (note.categoryName) metaText += '🏷️ Kategori: ' + note.categoryName + ' | ';
            if (note.createdAt) {
                const date = new Date(Number(note.createdAt));
                metaText += '📅 ' + date.toLocaleDateString('tr-TR') + ' ' + date.toLocaleTimeString('tr-TR', {hour: '2-digit', minute:'2-digit'});
            }
            if (note.isLocked) metaText += ' | 🔒 Kilitli Not';
            document.getElementById('activeNoteMeta').textContent = metaText;

            document.getElementById('activeNoteContent').textContent = note.content || '(İçerik boş)';
        }

        function filterNotes() {
            const query = document.getElementById('noteSearchInput').value.toLowerCase();
            const filtered = allNotes.filter(n => 
                (n.title && n.title.toLowerCase().includes(query)) ||
                (n.content && n.content.toLowerCase().includes(query)) ||
                (n.categoryName && n.categoryName.toLowerCase().includes(query))
            );
            renderNotesList(filtered);
            if (filtered.length > 0) {
                selectNote(0);
            }
        }

        function copyPassword() {
            const pwd = document.getElementById('foundPasswordDisplay').textContent;
            navigator.clipboard.writeText(pwd).then(() => {
                const btn = document.querySelector('.btn-copy');
                const old = btn.textContent;
                btn.textContent = '✓ Kopyalandı!';
                setTimeout(() => btn.textContent = old, 2000);
            });
        }

        function resetForm() {
            document.getElementById('configCard').style.display = 'block';
            document.getElementById('progressCard').style.display = 'none';
            document.getElementById('resultCard').style.display = 'none';
            document.getElementById('notfoundCard').style.display = 'none';
        }

        function escapeHtml(text) {
            const div = document.createElement('div');
            div.textContent = text || '';
            return div.innerHTML;
        }
    </script>
</body>
</html>
"""


class VaultRecoveryHandler(BaseHTTPRequestHandler):
    def log_message(self, format, *args):
        # Temiz terminal çıktısı için standart HTTP erişim loglarını sessize al
        pass

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        params = urllib.parse.parse_qs(parsed.query)

        if parsed.path == "/" or parsed.path == "/index.html":
            self.send_response(200)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.end_headers()
            self.wfile.write(HTML_TEMPLATE.encode("utf-8"))

        elif parsed.path == "/api/stream":
            job_id = params.get("job_id", [None])[0]
            guesses_raw = params.get("guesses", [""])[0]
            level = params.get("level", ["standard"])[0]
            prefixes_raw = params.get("prefixes", [""])[0]
            suffixes_raw = params.get("suffixes", [""])[0]

            if not job_id or job_id not in JOBS:
                self.send_response(400)
                self.end_headers()
                return

            job = JOBS[job_id]
            vault: NoteVaultFile = job["vault"]

            guesses = [g.strip() for g in guesses_raw.split(",") if g.strip()]
            prefixes = [p.strip() for p in prefixes_raw.split(",") if p.strip()]
            suffixes = [s.strip() for s in suffixes_raw.split(",") if s.strip()]

            self.send_response(200)
            self.send_header("Content-Type", "text/event-stream")
            self.send_header("Cache-Control", "no-cache")
            self.send_header("Connection", "keep-alive")
            self.end_headers()

            start_time = time.time()
            tested = 0
            found_pwd = None
            last_push = start_time

            generator = generate_variations(
                inputs=guesses,
                level=level,
                custom_prefixes=prefixes,
                custom_suffixes=suffixes
            )

            try:
                for cand in generator:
                    tested += 1
                    now = time.time()
                    if now - last_push > 0.12:
                        elapsed = now - start_time
                        rate = tested / elapsed if elapsed > 0 else 0
                        prog_payload = json.dumps({
                            "tested": tested,
                            "elapsed": elapsed,
                            "rate": int(rate),
                            "current": (cand[:24] + "...") if len(cand) > 24 else cand
                        })
                        self.wfile.write(f"event: progress\ndata: {prog_payload}\n\n".encode("utf-8"))
                        self.wfile.flush()
                        last_push = now

                    if vault.test_password(cand):
                        found_pwd = cand
                        break

                elapsed = time.time() - start_time
                if found_pwd:
                    plaintext, payload_type = vault.decrypt(found_pwd)
                    parsed_data = vault.parse_payload(plaintext, payload_type)
                    job["found_password"] = found_pwd
                    job["plaintext"] = plaintext
                    job["payload_type"] = payload_type
                    job["parsed"] = parsed_data

                    success_payload = json.dumps({
                        "password": found_pwd,
                        "payload_type": payload_type,
                        "notes": parsed_data.get("notes", []),
                        "categories": parsed_data.get("categories", []),
                        "metadata": parsed_data.get("metadata", {}),
                        "tested": tested,
                        "elapsed": elapsed
                    })
                    self.wfile.write(f"event: success\ndata: {success_payload}\n\n".encode("utf-8"))
                    self.wfile.flush()
                else:
                    nf_payload = json.dumps({"tested": tested, "elapsed": elapsed})
                    self.wfile.write(f"event: not_found\ndata: {nf_payload}\n\n".encode("utf-8"))
                    self.wfile.flush()

            except (BrokenPipeError, ConnectionResetError):
                pass

        elif parsed.path == "/api/download":
            job_id = params.get("job_id", [None])[0]
            fmt = params.get("format", ["txt_zip"])[0]

            if not job_id or job_id not in JOBS or "parsed" not in JOBS[job_id]:
                self.send_response(404)
                self.end_headers()
                return

            job = JOBS[job_id]
            parsed_data = job["parsed"]
            notes = parsed_data.get("notes", [])
            base_name = os.path.splitext(job["filename"])[0]

            if fmt == "json":
                out_bytes = json.dumps(parsed_data, ensure_ascii=False, indent=2).encode("utf-8")
                self.send_response(200)
                self.send_header("Content-Type", "application/json; charset=utf-8")
                self.send_header("Content-Disposition", f'attachment; filename="{base_name}_kurtarildi.json"')
                self.end_headers()
                self.wfile.write(out_bytes)

            elif fmt == "app_zip":
                app_zip_bytes = create_unencrypted_noteapp_backup(parsed_data, job.get("plaintext"))
                self.send_response(200)
                self.send_header("Content-Type", "application/zip")
                self.send_header("Content-Disposition", f'attachment; filename="{base_name}_NoteApp_SIFRESIZ_YEDEK.zip"')
                self.end_headers()
                self.wfile.write(app_zip_bytes)

            elif fmt == "open_zip" and job.get("payload_type") == "zip":
                self.send_response(200)
                self.send_header("Content-Type", "application/zip")
                self.send_header("Content-Disposition", f'attachment; filename="{base_name}_acik_yedek.zip"')
                self.end_headers()
                self.wfile.write(job["plaintext"])

            else:  # txt_zip (varsayılan)
                bio = io.BytesIO()
                with zipfile.ZipFile(bio, "w", zipfile.ZIP_DEFLATED) as zf:
                    # Şifre bilgi dosyası
                    zf.writestr(
                        "SIFRE_BILGISI.txt",
                        f"Dosya: {job['filename']}\nBulunan Şifre: {job.get('found_password')}\nToplam Not: {len(notes)}\n"
                    )
                    # Her not için txt
                    for idx, n in enumerate(notes):
                        safe_title = "".join(c for c in n.get('title', f'Not_{idx+1}') if c.isalnum() or c in (' ', '-', '_')).strip()
                        if not safe_title: safe_title = f"Not_{idx+1}"
                        content = f"Başlık: {n.get('title')}\n"
                        if n.get('categoryName'):
                            content += f"Kategori: {n.get('categoryName')}\n"
                        content += "-" * 40 + "\n\n" + (n.get('content') or "")
                        zf.writestr(f"Notlar/{idx+1:02d}_{safe_title[:35]}.txt", content.encode("utf-8"))

                zip_bytes = bio.getvalue()
                self.send_response(200)
                self.send_header("Content-Type", "application/zip")
                self.send_header("Content-Disposition", f'attachment; filename="{base_name}_notlar_txt.zip"')
                self.end_headers()
                self.wfile.write(zip_bytes)

        else:
            self.send_response(404)
            self.end_headers()

    def do_POST(self):
        parsed = urllib.parse.urlparse(self.path)
        if parsed.path == "/api/upload":
            content_type = self.headers.get("Content-Type")
            if not content_type or not content_type.startswith("multipart/form-data"):
                self.send_response(400)
                self.end_headers()
                return

            form = cgi.FieldStorage(
                fp=self.rfile,
                headers=self.headers,
                environ={
                    "REQUEST_METHOD": "POST",
                    "CONTENT_TYPE": self.headers["Content-Type"],
                }
            )

            if "file" not in form:
                self.send_response(400)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(json.dumps({"success": False, "error": "Dosya yüklenmedi."}).encode("utf-8"))
                return

            file_item = form["file"]
            file_bytes = file_item.file.read()
            filename = file_item.filename or "kasa.notevault"

            try:
                vault = NoteVaultFile(file_bytes, filename)
                job_id = str(uuid.uuid4())
                JOBS[job_id] = {
                    "vault": vault,
                    "filename": filename,
                    "size": len(file_bytes)
                }

                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(json.dumps({
                    "success": True,
                    "job_id": job_id,
                    "filename": filename,
                    "size": len(file_bytes)
                }).encode("utf-8"))

            except Exception as e:
                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(json.dumps({"success": False, "error": str(e)}).encode("utf-8"))
        else:
            self.send_response(404)
            self.end_headers()


def start_server():
    server = ThreadingHTTPServer(("0.0.0.0", PORT), VaultRecoveryHandler)
    url = f"http://localhost:{PORT}"
    print(f"\n=======================================================")
    print(f"  🔐 NoteVault Şifre Kurtarıcı Web Sunucusu Başlatıldı")
    print(f"  🌐 Tarayıcı Adresi: {url}")
    print(f"  (Durdurmak için terminalde Ctrl + C tuşlarına basın)")
    print(f"=======================================================\n")
    try:
        webbrowser.open(url)
    except Exception:
        pass
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n[!] Sunucu kapatıldı.")
        server.server_close()


if __name__ == "__main__":
    start_server()
