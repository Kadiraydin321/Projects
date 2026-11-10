package com.omnibackup.transfer.core.web

object WebAssets {

    /**
     * AirDrop ve LocalSend kalitesinde ultra modern, responsive, Türkçe Web Kontrol Paneli (SPA).
     * HTML5, modern CSS3 (Glassmorphism & Neon) ve vanilla JavaScript ile harici bağımlılık olmadan çalışır.
     */
    fun getIndexHtml(serverIp: String, serverPort: Int): String {
        return """
<!DOCTYPE html>
<html lang="tr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>OmniBackup Transfer • Kablosuz Hızlı Yedekleme</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;700&display=swap" rel="stylesheet">
    <style>
        :root {
            --bg-base: #070d12;
            --bg-surface: #0e171f;
            --bg-card: rgba(19, 31, 41, 0.7);
            --bg-card-hover: rgba(28, 44, 58, 0.85);
            --bg-glass: rgba(16, 26, 36, 0.65);
            --border-glass: rgba(255, 255, 255, 0.08);
            --border-focus: rgba(0, 230, 118, 0.4);

            --accent-green: #00E676;
            --accent-green-rgb: 0, 230, 118;
            --primary-emerald: #10B981;
            --wa-green: #25D366;
            --cyan: #38BDF8;
            --purple: #A855F7;
            --orange: #FB923C;
            --amber: #FBBF24;
            --rose: #F43F5E;

            --text-main: #F1F5F9;
            --text-muted: #94A3B8;
            --text-dim: #64748B;

            --radius-lg: 20px;
            --radius-md: 14px;
            --radius-sm: 10px;

            --font-sans: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            --font-mono: 'JetBrains Mono', monospace;
            --shadow-glass: 0 8px 32px 0 rgba(0, 0, 0, 0.37);
        }

        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
            font-family: var(--font-sans);
            -webkit-tap-highlight-color: transparent;
        }

        body {
            background-color: var(--bg-base);
            background-image:
                radial-gradient(at 0% 0%, rgba(0, 230, 118, 0.08) 0px, transparent 50%),
                radial-gradient(at 100% 100%, rgba(56, 189, 248, 0.06) 0px, transparent 50%);
            background-attachment: fixed;
            color: var(--text-main);
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            align-items: center;
            padding: 20px 16px 40px;
        }

        .container {
            width: 100%;
            max-width: 1040px;
            display: flex;
            flex-direction: column;
            gap: 20px;
        }

        /* Üst Başlık ve Cihaz Durum Barı */
        header {
            background: var(--bg-glass);
            backdrop-filter: blur(20px);
            -webkit-backdrop-filter: blur(20px);
            border: 1px solid var(--border-glass);
            border-radius: var(--radius-lg);
            padding: 18px 24px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            box-shadow: var(--shadow-glass);
            flex-wrap: wrap;
            gap: 14px;
        }

        .brand-box {
            display: flex;
            align-items: center;
            gap: 12px;
        }

        .brand-logo {
            width: 44px;
            height: 44px;
            border-radius: 12px;
            background: linear-gradient(135deg, var(--accent-green), var(--primary-emerald));
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 22px;
            box-shadow: 0 4px 16px rgba(0, 230, 118, 0.3);
        }

        .brand-text h1 {
            font-size: 20px;
            font-weight: 800;
            color: #FFFFFF;
            letter-spacing: -0.5px;
            display: flex;
            align-items: center;
            gap: 6px;
        }

        .brand-text h1 span {
            background: linear-gradient(90deg, var(--accent-green), var(--cyan));
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }

        .brand-text p {
            font-size: 13px;
            color: var(--text-muted);
            display: flex;
            align-items: center;
            gap: 6px;
        }

        .header-actions {
            display: flex;
            align-items: center;
            gap: 10px;
            flex-wrap: wrap;
        }

        .badge-chip {
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid var(--border-glass);
            border-radius: 20px;
            padding: 6px 14px;
            font-size: 13px;
            font-weight: 600;
            display: flex;
            align-items: center;
            gap: 8px;
            color: var(--text-main);
        }

        .pulse-indicator {
            width: 8px;
            height: 8px;
            border-radius: 50%;
            background: var(--accent-green);
            box-shadow: 0 0 10px var(--accent-green);
            animation: pulse-ring 1.8s infinite;
        }

        @keyframes pulse-ring {
            0% { transform: scale(0.9); opacity: 0.8; }
            50% { transform: scale(1.3); opacity: 1; }
            100% { transform: scale(0.9); opacity: 0.8; }
        }

        .pin-chip {
            background: rgba(0, 230, 118, 0.12);
            border: 1px solid rgba(0, 230, 118, 0.3);
            color: var(--accent-green);
            cursor: pointer;
            transition: all 0.2s;
        }

        .pin-chip:hover {
            background: rgba(0, 230, 118, 0.2);
            border-color: var(--accent-green);
        }

        /* Ana Navigasyon Sekmeleri */
        .nav-tabs {
            display: flex;
            background: var(--bg-glass);
            backdrop-filter: blur(16px);
            border: 1px solid var(--border-glass);
            border-radius: var(--radius-md);
            padding: 4px;
            gap: 4px;
        }

        .nav-tab {
            flex: 1;
            padding: 10px 16px;
            border-radius: var(--radius-sm);
            border: none;
            background: transparent;
            color: var(--text-muted);
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            transition: all 0.2s;
        }

        .nav-tab.active {
            background: var(--bg-surface);
            color: #FFFFFF;
            border: 1px solid var(--border-glass);
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
        }

        .nav-tab:hover:not(.active) {
            color: var(--text-main);
            background: rgba(255, 255, 255, 0.03);
        }

        /* Canlı Transfer HUD Monitörü */
        .hud-monitor {
            background: linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(56, 189, 248, 0.05));
            backdrop-filter: blur(20px);
            border: 1px solid rgba(0, 230, 118, 0.3);
            border-radius: var(--radius-lg);
            padding: 18px 22px;
            display: none;
            box-shadow: 0 0 30px rgba(0, 230, 118, 0.15);
            animation: fadeIn 0.3s ease;
        }

        .hud-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 12px;
        }

        .hud-title {
            font-size: 14px;
            font-weight: 700;
            color: var(--accent-green);
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .hud-speed {
            font-family: var(--font-mono);
            font-size: 16px;
            font-weight: 700;
            color: #FFFFFF;
            background: rgba(0, 0, 0, 0.3);
            padding: 4px 12px;
            border-radius: 8px;
            border: 1px solid var(--border-glass);
        }

        .progress-bar-wrap {
            height: 10px;
            background: rgba(255, 255, 255, 0.06);
            border-radius: 5px;
            overflow: hidden;
            position: relative;
            margin-bottom: 8px;
        }

        .progress-bar-fill {
            height: 100%;
            width: 0%;
            background: linear-gradient(90deg, var(--accent-green), var(--cyan));
            border-radius: 5px;
            transition: width 0.2s ease;
            box-shadow: 0 0 12px rgba(0, 230, 118, 0.8);
        }

        .hud-meta {
            display: flex;
            justify-content: space-between;
            font-size: 12px;
            color: var(--text-muted);
            font-family: var(--font-mono);
        }

        /* 1. Drag & Drop Dosya Yükleme Alanı */
        .dropzone-card {
            background: var(--bg-glass);
            backdrop-filter: blur(20px);
            border: 2px dashed rgba(0, 230, 118, 0.3);
            border-radius: var(--radius-lg);
            padding: 36px 20px;
            text-align: center;
            cursor: pointer;
            transition: all 0.25s ease;
            position: relative;
            box-shadow: var(--shadow-glass);
        }

        .dropzone-card:hover, .dropzone-card.dragover {
            border-color: var(--accent-green);
            background: rgba(0, 230, 118, 0.05);
            transform: translateY(-2px);
            box-shadow: 0 12px 32px rgba(0, 230, 118, 0.15);
        }

        .dropzone-icon {
            width: 64px;
            height: 64px;
            margin: 0 auto 16px;
            border-radius: 20px;
            background: rgba(0, 230, 118, 0.12);
            color: var(--accent-green);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 30px;
            transition: transform 0.2s;
        }

        .dropzone-card:hover .dropzone-icon {
            transform: scale(1.1);
        }

        .dropzone-card h2 {
            font-size: 20px;
            font-weight: 700;
            color: #FFFFFF;
            margin-bottom: 6px;
        }

        .dropzone-card p {
            font-size: 14px;
            color: var(--text-muted);
            max-width: 480px;
            margin: 0 auto 20px;
        }

        .dropzone-buttons {
            display: flex;
            justify-content: center;
            gap: 12px;
            flex-wrap: wrap;
        }

        .btn {
            background: linear-gradient(135deg, var(--accent-green), var(--primary-emerald));
            color: #070D12;
            border: none;
            padding: 10px 20px;
            border-radius: var(--radius-sm);
            font-size: 14px;
            font-weight: 700;
            cursor: pointer;
            display: inline-flex;
            align-items: center;
            gap: 8px;
            transition: all 0.2s;
            box-shadow: 0 4px 14px rgba(0, 230, 118, 0.25);
        }

        .btn:hover {
            transform: translateY(-1px);
            box-shadow: 0 6px 20px rgba(0, 230, 118, 0.4);
            filter: brightness(1.05);
        }

        .btn-outline {
            background: rgba(255, 255, 255, 0.05);
            color: var(--text-main);
            border: 1px solid var(--border-glass);
            box-shadow: none;
        }

        .btn-outline:hover {
            background: rgba(255, 255, 255, 0.1);
            border-color: rgba(255, 255, 255, 0.2);
            box-shadow: none;
        }

        /* Yükleme Listesi & İlerlemesi */
        .upload-queue {
            margin-top: 16px;
            display: flex;
            flex-direction: column;
            gap: 10px;
            text-align: left;
        }

        .upload-item {
            background: var(--bg-surface);
            border: 1px solid var(--border-glass);
            border-radius: var(--radius-sm);
            padding: 12px 16px;
            display: flex;
            flex-direction: column;
            gap: 8px;
        }

        .upload-item-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .upload-item-name {
            font-size: 14px;
            font-weight: 600;
            color: var(--text-main);
            display: flex;
            align-items: center;
            gap: 8px;
            max-width: 70%;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }

        .upload-item-status {
            font-size: 12px;
            font-family: var(--font-mono);
            color: var(--accent-green);
        }

        /* 2. Kategori Bazlı İndirme Izgarası */
        .section-title {
            font-size: 18px;
            font-weight: 800;
            color: #FFFFFF;
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 4px;
        }

        .section-title span {
            font-size: 13px;
            font-weight: 500;
            color: var(--text-muted);
        }

        .grid-cards {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(290px, 1fr));
            gap: 14px;
        }

        .category-card {
            background: var(--bg-glass);
            backdrop-filter: blur(16px);
            border: 1px solid var(--border-glass);
            border-radius: var(--radius-md);
            padding: 18px;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            transition: all 0.2s ease;
            box-shadow: var(--shadow-glass);
            position: relative;
            overflow: hidden;
        }

        .category-card:hover {
            transform: translateY(-2px);
            border-color: rgba(255, 255, 255, 0.18);
            background: var(--bg-card-hover);
        }

        .category-card-top {
            display: flex;
            align-items: flex-start;
            gap: 14px;
            margin-bottom: 16px;
        }

        .category-icon {
            width: 48px;
            height: 48px;
            border-radius: 14px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 24px;
            flex-shrink: 0;
        }

        .category-info h3 {
            font-size: 16px;
            font-weight: 700;
            color: #FFFFFF;
            margin-bottom: 4px;
        }

        .category-info p {
            font-size: 13px;
            color: var(--text-muted);
            line-height: 1.4;
        }

        .category-card-action {
            display: flex;
            align-items: center;
            justify-content: space-between;
            border-top: 1px solid var(--border-glass);
            padding-top: 14px;
        }

        .category-badge {
            font-size: 12px;
            font-family: var(--font-mono);
            font-weight: 600;
            padding: 4px 10px;
            border-radius: 6px;
            background: rgba(255, 255, 255, 0.05);
            color: var(--text-main);
        }

        .btn-download {
            background: rgba(0, 230, 118, 0.15);
            border: 1px solid rgba(0, 230, 118, 0.4);
            color: var(--accent-green);
            padding: 8px 16px;
            border-radius: var(--radius-sm);
            font-size: 13px;
            font-weight: 700;
            cursor: pointer;
            display: inline-flex;
            align-items: center;
            gap: 6px;
            transition: all 0.2s;
        }

        .btn-download:hover {
            background: var(--accent-green);
            color: #070D12;
            box-shadow: 0 4px 14px rgba(0, 230, 118, 0.3);
        }

        /* 3. Dosya Gezgini Sekmesi */
        .explorer-card {
            background: var(--bg-glass);
            backdrop-filter: blur(16px);
            border: 1px solid var(--border-glass);
            border-radius: var(--radius-lg);
            padding: 20px;
            box-shadow: var(--shadow-glass);
            display: flex;
            flex-direction: column;
            gap: 14px;
        }

        .explorer-bar {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 10px;
            flex-wrap: wrap;
        }

        .breadcrumb {
            display: flex;
            align-items: center;
            gap: 6px;
            font-size: 13px;
            font-family: var(--font-mono);
            color: var(--text-muted);
            overflow-x: auto;
            white-space: nowrap;
            max-width: 70%;
        }

        .file-list {
            display: flex;
            flex-direction: column;
            gap: 6px;
            max-height: 480px;
            overflow-y: auto;
            padding-right: 4px;
        }

        .file-item {
            background: var(--bg-surface);
            border: 1px solid var(--border-glass);
            border-radius: var(--radius-sm);
            padding: 10px 14px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            transition: background 0.15s;
        }

        .file-item:hover {
            background: var(--bg-card-hover);
        }

        .file-item-left {
            display: flex;
            align-items: center;
            gap: 12px;
            overflow: hidden;
        }

        .file-icon {
            font-size: 20px;
        }

        .file-name {
            font-size: 14px;
            font-weight: 600;
            color: var(--text-main);
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }

        .file-item-right {
            display: flex;
            align-items: center;
            gap: 12px;
            font-family: var(--font-mono);
            font-size: 12px;
            color: var(--text-muted);
            flex-shrink: 0;
        }

        /* 4. PIN Güvenlik Modalı */
        .modal-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.75);
            backdrop-filter: blur(8px);
            display: none;
            align-items: center;
            justify-content: center;
            z-index: 1000;
            padding: 20px;
        }

        .modal-overlay.active {
            display: flex;
        }

        .modal-box {
            background: var(--bg-surface);
            border: 1px solid var(--border-glass);
            border-radius: var(--radius-lg);
            padding: 28px 24px;
            max-width: 380px;
            width: 100%;
            text-align: center;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.6);
        }

        .modal-box h2 {
            font-size: 20px;
            font-weight: 800;
            margin-bottom: 8px;
            color: #FFFFFF;
        }

        .modal-box p {
            font-size: 14px;
            color: var(--text-muted);
            margin-bottom: 20px;
        }

        .pin-input-group {
            display: flex;
            justify-content: center;
            gap: 10px;
            margin-bottom: 20px;
        }

        .pin-digit {
            width: 52px;
            height: 60px;
            background: var(--bg-base);
            border: 2px solid var(--border-glass);
            border-radius: 12px;
            font-size: 26px;
            font-weight: 800;
            text-align: center;
            color: var(--accent-green);
            font-family: var(--font-mono);
            outline: none;
            transition: all 0.2s;
        }

        .pin-digit:focus {
            border-color: var(--accent-green);
            box-shadow: 0 0 16px rgba(0, 230, 118, 0.3);
        }

        /* Toast Bildirimleri */
        .toast-container {
            position: fixed;
            bottom: 24px;
            right: 24px;
            display: flex;
            flex-direction: column;
            gap: 10px;
            z-index: 2000;
        }

        .toast {
            background: var(--bg-surface);
            border: 1px solid var(--border-glass);
            border-left: 4px solid var(--accent-green);
            border-radius: var(--radius-sm);
            padding: 12px 18px;
            color: var(--text-main);
            font-size: 13px;
            font-weight: 600;
            box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
            display: flex;
            align-items: center;
            gap: 10px;
            animation: slideInRight 0.3s ease;
        }

        .toast.error {
            border-left-color: var(--rose);
        }

        @keyframes slideInRight {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }

        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(-6px); }
            to { opacity: 1; transform: translateY(0); }
        }

        /* Gizli iframe (İndirmeler için) */
        #download-frame {
            display: none;
            width: 0;
            height: 0;
            border: none;
        }

        @media (max-width: 640px) {
            header {
                flex-direction: column;
                align-items: flex-start;
            }
            .header-actions {
                width: 100%;
                justify-content: space-between;
            }
            .grid-cards {
                grid-template-columns: 1fr;
            }
        }
    </style>
</head>
<body>

<div class="container">

    <!-- Üst Başlık & Cihaz Durum Barı -->
    <header>
        <div class="brand-box">
            <div class="brand-logo">⚡</div>
            <div class="brand-text">
                <h1>OmniBackup <span>Transfer</span></h1>
                <p id="device-info-text">📱 Cihaz taranıyor...</p>
            </div>
        </div>

        <div class="header-actions">
            <div class="badge-chip">
                <span class="pulse-indicator"></span>
                <span id="ws-status-text">Canlı Bağlantı</span>
            </div>
            <div class="badge-chip pin-chip" onclick="showPinModal()" title="PIN Kodunu Değiştir">
                <span>🔑 PIN:</span>
                <span id="current-pin-display">----</span>
            </div>
        </div>
    </header>

    <!-- Ana Sekmeler (Yükleme / İndirme / Dosya Gezgini) -->
    <div class="nav-tabs">
        <button class="nav-tab active" onclick="switchTab('transfer')">
            <span>⚡</span> Hızlı Aktarım & Yedekleme
        </button>
        <button class="nav-tab" onclick="switchTab('explorer')">
            <span>📁</span> Dosya Yöneticisi Gezgini
        </button>
        <button class="nav-tab" onclick="switchTab('received')">
            <span>📥</span> Gelen Dosyalar (<span id="received-count">0</span>)
        </button>
    </div>

    <!-- Canlı Transfer HUD Göstergesi -->
    <div id="hud-monitor" class="hud-monitor">
        <div class="hud-header">
            <div class="hud-title">
                <span class="pulse-indicator"></span>
                <span id="hud-status-text">Canlı Veri Akışı</span>
            </div>
            <div id="hud-speed" class="hud-speed">0.0 MB/s</div>
        </div>
        <div class="progress-bar-wrap">
            <div id="hud-progress-fill" class="progress-bar-fill"></div>
        </div>
        <div class="hud-meta">
            <span id="hud-file-name">Dosya hazırlanıyor...</span>
            <span id="hud-bytes-info">0 MB / 0 MB (%0)</span>
        </div>
    </div>

    <!-- SEKMELER: 1. HIZLI AKTARIM & YEDEKLEME -->
    <div id="tab-transfer" class="tab-content" style="display: flex; flex-direction: column; gap: 20px;">

        <!-- PC'den Telefona Dosya Yükleme (Drag & Drop Zone) -->
        <div class="dropzone-card" id="dropzone" onclick="document.getElementById('file-input').click()">
            <div class="dropzone-icon">🚀</div>
            <h2>PC veya Mac'ten Telefona Dosya Atın</h2>
            <p>Dosyaları buraya sürükleyip bırakın veya seçin. Doğrudan telefonun <b>Download/OmniBackup</b> klasörüne kaydedilir.</p>

            <div class="dropzone-buttons" onclick="event.stopPropagation()">
                <button class="btn" onclick="document.getElementById('file-input').click()">
                    <span>📄</span> Dosyaları Seç
                </button>
                <button class="btn btn-outline" onclick="document.getElementById('folder-input').click()">
                    <span>📁</span> Klasör Yükle
                </button>
            </div>

            <input type="file" id="file-input" multiple style="display: none;" onchange="handleFileSelect(this.files)">
            <input type="file" id="folder-input" webkitdirectory directory multiple style="display: none;" onchange="handleFileSelect(this.files)">

            <!-- Yükleme Kuyruğu -->
            <div id="upload-queue" class="upload-queue"></div>
        </div>

        <!-- Kategori Bazlı İndirme Kartları (Grid) -->
        <div>
            <div class="section-title">
                <span>Kategori Bazlı Canlı ZIP İndirme</span>
                <span>Telefonda 0-bayt disk maliyetiyle anlık sıkıştırma</span>
            </div>

            <div class="grid-cards">
                <!-- 1. WhatsApp & WhatsApp Business -->
                <div class="category-card" style="border-top: 3px solid var(--wa-green);">
                    <div class="category-card-top">
                        <div class="category-icon" style="background: rgba(37, 211, 102, 0.15); color: var(--wa-green);">💬</div>
                        <div class="category-info">
                            <h3>WhatsApp & Business</h3>
                            <p>Mesaj veritabanları (crypt14/15), fotoğraflar, videolar, sesli notlar ve belgeler.</p>
                        </div>
                    </div>
                    <div class="category-card-action">
                        <span class="category-badge" id="badge-whatsapp">Taranıyor...</span>
                        <button class="btn-download" onclick="downloadCategory('whatsapp', 'WhatsApp_Backup.zip')">
                            <span>⚡</span> Canlı ZIP İndir
                        </button>
                    </div>
                </div>

                <!-- 2. Fotoğraflar -->
                <div class="category-card" style="border-top: 3px solid var(--cyan);">
                    <div class="category-card-top">
                        <div class="category-icon" style="background: rgba(56, 189, 248, 0.15); color: var(--cyan);">📸</div>
                        <div class="category-info">
                            <h3>Fotoğraflar & Galeri</h3>
                            <p>Kamera çekimleri (DCIM), ekran görüntüleri ve indirilen görseller (JPG, PNG, HEIC, RAW).</p>
                        </div>
                    </div>
                    <div class="category-card-action">
                        <span class="category-badge" id="badge-photos">Taranıyor...</span>
                        <button class="btn-download" onclick="downloadCategory('photos', 'Photos_Backup.zip')">
                            <span>⚡</span> Canlı ZIP İndir
                        </button>
                    </div>
                </div>

                <!-- 3. Videolar -->
                <div class="category-card" style="border-top: 3px solid var(--purple);">
                    <div class="category-card-top">
                        <div class="category-icon" style="background: rgba(168, 85, 247, 0.15); color: var(--purple);">🎥</div>
                        <div class="category-info">
                            <h3>Videolar & Filmler</h3>
                            <p>Cihazla kaydedilen videolar, indirilen filmler ve klipler (MP4, MKV, MOV).</p>
                        </div>
                    </div>
                    <div class="category-card-action">
                        <span class="category-badge" id="badge-videos">Taranıyor...</span>
                        <button class="btn-download" onclick="downloadCategory('videos', 'Videos_Backup.zip')">
                            <span>⚡</span> Canlı ZIP İndir
                        </button>
                    </div>
                </div>

                <!-- 4. Ses ve Müzik -->
                <div class="category-card" style="border-top: 3px solid var(--orange);">
                    <div class="category-card-top">
                        <div class="category-icon" style="background: rgba(251, 146, 60, 0.15); color: var(--orange);">🎵</div>
                        <div class="category-info">
                            <h3>Ses ve Müzik Arşivi</h3>
                            <p>Müzik parçaları, ses kayıtları ve podcastler (MP3, FLAC, M4A, WAV).</p>
                        </div>
                    </div>
                    <div class="category-card-action">
                        <span class="category-badge" id="badge-audio">Taranıyor...</span>
                        <button class="btn-download" onclick="downloadCategory('audio', 'Music_Backup.zip')">
                            <span>⚡</span> Canlı ZIP İndir
                        </button>
                    </div>
                </div>

                <!-- 5. Belgeler ve İndirilenler -->
                <div class="category-card" style="border-top: 3px solid var(--amber);">
                    <div class="category-card-top">
                        <div class="category-icon" style="background: rgba(251, 191, 36, 0.15); color: var(--amber);">📄</div>
                        <div class="category-info">
                            <h3>Belgeler & İndirilenler</h3>
                            <p>PDF kitaplar, Word belgeleri, Excel tabloları ve indirilen dosyalar.</p>
                        </div>
                    </div>
                    <div class="category-card-action">
                        <span class="category-badge" id="badge-documents">Taranıyor...</span>
                        <button class="btn-download" onclick="downloadCategory('documents', 'Documents_Backup.zip')">
                            <span>⚡</span> Canlı ZIP İndir
                        </button>
                    </div>
                </div>

                <!-- 6. Yüklü Uygulamalar (APK) -->
                <div class="category-card" style="border-top: 3px solid var(--primary-emerald);">
                    <div class="category-card-top">
                        <div class="category-icon" style="background: rgba(168, 85, 247, 0.15); color: var(--primary-emerald);">📦</div>
                        <div class="category-info">
                            <h3>Yüklü Uygulamalar (APK)</h3>
                            <p>Cihazdaki kullanıcı uygulamalarının APK kurulum paketleri arşivi.</p>
                        </div>
                    </div>
                    <div class="category-card-action">
                        <span class="category-badge" id="badge-apps">Taranıyor...</span>
                        <button class="btn-download" onclick="downloadCategory('apps', 'Apps_Backup.zip')">
                            <span>⚡</span> Canlı ZIP İndir
                        </button>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <!-- SEKMELER: 2. DOSYA YÖNETİCİSİ GEZGİNİ -->
    <div id="tab-explorer" class="tab-content" style="display: none;">
        <div class="explorer-card">
            <div class="explorer-bar">
                <div class="breadcrumb" id="explorer-breadcrumb">
                    <span>📁 /sdcard</span>
                </div>
                <div style="display: flex; gap: 8px;">
                    <button class="btn btn-outline" style="padding: 6px 12px; font-size: 13px;" onclick="navigateUp()">
                        ⬆️ Üst Klasör
                    </button>
                    <button class="btn btn-outline" style="padding: 6px 12px; font-size: 13px;" onclick="refreshFiles()">
                        🔄 Yenile
                    </button>
                </div>
            </div>

            <div class="file-list" id="explorer-file-list">
                <div style="padding: 24px; text-align: center; color: var(--text-muted);">Klasör yükleniyor...</div>
            </div>
        </div>
    </div>

    <!-- SEKMELER: 3. GELEN DOSYALAR -->
    <div id="tab-received" class="tab-content" style="display: none;">
        <div class="explorer-card">
            <div class="explorer-bar">
                <div style="font-weight: 700; color: #FFFFFF;">📥 PC'den Telefona Alınan Dosyalar (Download/OmniBackup)</div>
                <button class="btn btn-outline" style="padding: 6px 12px; font-size: 13px;" onclick="fetchReceivedFiles()">
                    🔄 Yenile
                </button>
            </div>
            <div class="file-list" id="received-file-list">
                <div style="padding: 24px; text-align: center; color: var(--text-muted);">Henüz dosya alınmadı.</div>
            </div>
        </div>
    </div>

</div>

<!-- PIN Güvenlik Doğrulama Modalı -->
<div class="modal-overlay" id="pin-modal">
    <div class="modal-box">
        <div style="font-size: 40px; margin-bottom: 12px;">🔐</div>
        <h2>Güvenlik PIN Kodu</h2>
        <p>Telefondaki OmniBackup ekranında görüntülenen 4 haneli PIN kodunu girin:</p>

        <div class="pin-input-group">
            <input type="password" maxlength="1" class="pin-digit" id="p1" onkeyup="handlePinKey(this, 'p2', '')">
            <input type="password" maxlength="1" class="pin-digit" id="p2" onkeyup="handlePinKey(this, 'p3', 'p1')">
            <input type="password" maxlength="1" class="pin-digit" id="p3" onkeyup="handlePinKey(this, 'p4', 'p2')">
            <input type="password" maxlength="1" class="pin-digit" id="p4" onkeyup="handlePinKey(this, '', 'p3')">
        </div>

        <button class="btn" style="width: 100%; justify-content: center; height: 46px;" onclick="submitPin()">
            Doğrula ve Bağlan
        </button>
    </div>
</div>

<!-- Toast Bildirim Alanı -->
<div class="toast-container" id="toast-container"></div>

<!-- Gizli İndirme iframe'i (Sayfa kilitlenmesini engeller) -->
<iframe id="download-frame"></iframe>

<script>
    const serverHost = window.location.hostname || '$serverIp';
    const serverPort = window.location.port || '$serverPort';
    let currentPin = '';
    let currentPath = '';
    let ws = null;
    let reconnectTimeout = null;

    // 1. PIN Başlatma
    function initPin() {
        const urlParams = new URLSearchParams(window.location.search);
        const queryPin = urlParams.get('pin');
        if (queryPin && queryPin.length === 4) {
            currentPin = queryPin;
            localStorage.setItem('omnibackup_pin', currentPin);
        } else {
            currentPin = localStorage.getItem('omnibackup_pin') || '';
        }

        if (currentPin && currentPin.length === 4) {
            document.getElementById('current-pin-display').innerText = currentPin;
            verifyAuth();
        } else {
            showPinModal();
        }
    }

    function showPinModal() {
        document.getElementById('pin-modal').classList.add('active');
        document.getElementById('p1').focus();
    }

    function hidePinModal() {
        document.getElementById('pin-modal').classList.remove('active');
    }

    function handlePinKey(input, nextId, prevId) {
        if (input.value.length === 1 && nextId) {
            document.getElementById(nextId).focus();
        } else if (input.value.length === 0 && prevId && event.key === 'Backspace') {
            document.getElementById(prevId).focus();
        }
        if (input.id === 'p4' && input.value.length === 1) {
            submitPin();
        }
    }

    function submitPin() {
        const p1 = document.getElementById('p1').value;
        const p2 = document.getElementById('p2').value;
        const p3 = document.getElementById('p3').value;
        const p4 = document.getElementById('p4').value;
        const pin = p1 + p2 + p3 + p4;

        if (pin.length !== 4) {
            showToast('Lütfen 4 haneli PIN kodunu eksiksiz girin.', true);
            return;
        }

        currentPin = pin;
        verifyAuth(true);
    }

    async function verifyAuth(fromModal = false) {
        try {
            const res = await fetch('/api/v1/auth?pin=' + encodeURIComponent(currentPin), { method: 'POST' });
            if (res.ok) {
                localStorage.setItem('omnibackup_pin', currentPin);
                document.getElementById('current-pin-display').innerText = currentPin;
                hidePinModal();
                showToast('Bağlantı başarılı! Cihaz eşleşti.');
                loadDeviceInfo();
                loadCategoryStats();
                connectWebSocket();
                fetchReceivedFiles();
            } else {
                showToast('Geçersiz PIN kodu! Lütfen kontrol edin.', true);
                if (fromModal) {
                    document.getElementById('p1').value = '';
                    document.getElementById('p2').value = '';
                    document.getElementById('p3').value = '';
                    document.getElementById('p4').value = '';
                    document.getElementById('p1').focus();
                } else {
                    showPinModal();
                }
            }
        } catch (e) {
            console.error(e);
            showToast('Sunucuya bağlanılamadı.', true);
        }
    }

    // 2. Cihaz Bilgisi ve WhatsApp Özeti
    async function loadDeviceInfo() {
        try {
            const res = await fetch('/api/v1/info?pin=' + encodeURIComponent(currentPin));
            if (!res.ok) return;
            const data = await res.json();

            const deviceText = data.deviceModel + ' • ' + data.androidVersion + ' • Boş: ' + data.freeStorageFormatted;
            document.getElementById('device-info-text').innerText = deviceText;
        } catch (e) {
            console.error('Info yüklenemedi', e);
        }
    }

    // 2.1. Canlı Kategori İstatistikleri (Fotoğraf, Video, Müzik, Belge, WhatsApp, APK)
    async function loadCategoryStats() {
        if (!currentPin) return;
        try {
            const res = await fetch('/api/v1/categories/stats?pin=' + encodeURIComponent(currentPin));
            if (!res.ok) return;
            const statsList = await res.json();

            statsList.forEach(item => {
                const badgeEl = document.getElementById('badge-' + item.categoryId);
                if (badgeEl) {
                    badgeEl.innerText = item.filesCount.toLocaleString('tr-TR') + ' dosya • ' + item.formattedSize;
                }
            });
        } catch (e) {
            console.error('Kategori istatistikleri alınamadı', e);
        }
    }

    // 3. Canlı WebSocket Dinleyicisi
    function connectWebSocket() {
        if (!currentPin) return;
        if (ws) {
            try { ws.close(); } catch(e){}
        }

        const wsProto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = wsProto + '//' + window.location.host + '/api/v1/events?pin=' + encodeURIComponent(currentPin);

        ws = new WebSocket(wsUrl);

        ws.onopen = function () {
            document.getElementById('ws-status-text').innerText = 'Canlı Bağlı';
            document.getElementById('ws-status-text').style.color = 'var(--accent-green)';
        };

        ws.onmessage = function (event) {
            try {
                const metric = JSON.parse(event.data);
                handleMetricUpdate(metric);
            } catch (e) {
                console.error(e);
            }
        };

        ws.onclose = function () {
            document.getElementById('ws-status-text').innerText = 'Bağlantı Kesildi';
            document.getElementById('ws-status-text').style.color = 'var(--text-dim)';
            clearTimeout(reconnectTimeout);
            reconnectTimeout = setTimeout(connectWebSocket, 3000);
        };

        ws.onerror = function () {
            ws.close();
        };
    }

    function handleMetricUpdate(m) {
        const hud = document.getElementById('hud-monitor');
        if (m.bytesTransferred > 0 && !m.isCompleted) {
            hud.style.display = 'block';
            document.getElementById('hud-speed').innerText = m.speedMBps.toFixed(1) + ' MB/s';
            document.getElementById('hud-progress-fill').style.width = Math.min(100, Math.max(0, m.percentage)) + '%';
            document.getElementById('hud-file-name').innerText = m.currentFile || 'Veri aktarılıyor...';
            document.getElementById('hud-bytes-info').innerText = formatBytes(m.bytesTransferred) + ' / ' + formatBytes(m.totalBytes) + ' (%%' + Math.round(m.percentage) + ')';
        } else if (m.isCompleted) {
            document.getElementById('hud-progress-fill').style.width = '100%';
            document.getElementById('hud-speed').innerText = 'Tamamlandı';
            setTimeout(() => {
                hud.style.display = 'none';
            }, 3000);
        } else {
            hud.style.display = 'none';
        }
    }

    // 4. Kategori Bazlı Canlı ZIP İndirme (Hidden Iframe ile Sayfa Kilitlenmez)
    function downloadCategory(category, defaultFileName) {
        if (!currentPin) {
            showPinModal();
            return;
        }

        const url = '/api/v1/backup/category?category=' + encodeURIComponent(category) + '&type=' + encodeURIComponent(category) + '&pin=' + encodeURIComponent(currentPin);
        showToast('📦 ' + (defaultFileName || 'Canlı ZIP') + ' hazırlanıyor ve indirme başlatılıyor...');

        triggerDownload(url, defaultFileName);
    }

    function triggerDownload(url, fileName) {
        // Yöntem: Hidden iframe src ile indirme tetikleme (Masaüstü Chrome/Safari/Firefox popup engelleyicilerini aşar ve sayfa kilitlenmez)
        const frame = document.getElementById('download-frame');
        if (frame) {
            frame.src = url;
        } else {
            const a = document.createElement('a');
            a.href = url;
            if (fileName) a.download = fileName;
            a.style.display = 'none';
            document.body.appendChild(a);
            a.click();
            setTimeout(() => document.body.removeChild(a), 2000);
        }
    }

    // 5. PC'den Telefona Dosya Yükleme (Drag & Drop + XHR onprogress)
    const dropzone = document.getElementById('dropzone');

    ['dragenter', 'dragover'].forEach(eventName => {
        dropzone.addEventListener(eventName, (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropzone.classList.add('dragover');
        }, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropzone.addEventListener(eventName, (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropzone.classList.remove('dragover');
        }, false);
    });

    dropzone.addEventListener('drop', (e) => {
        const files = e.dataTransfer.files;
        handleFileSelect(files);
    });

    function handleFileSelect(files) {
        if (!files || files.length === 0) return;
        if (!currentPin) {
            showPinModal();
            return;
        }

        const queueContainer = document.getElementById('upload-queue');
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            uploadSingleFile(file, queueContainer);
        }
    }

    function uploadSingleFile(file, container) {
        const itemId = 'upload-' + Math.random().toString(36).substr(2, 9);
        const itemEl = document.createElement('div');
        itemEl.className = 'upload-item';
        itemEl.id = itemId;
        itemEl.innerHTML = `
            <div class="upload-item-header">
                <span class="upload-item-name">📄 ` + escapeHtml(file.name) + `</span>
                <span class="upload-item-status" id="` + itemId + `-status">Hazırlanıyor...</span>
            </div>
            <div class="progress-bar-wrap" style="height: 6px; margin: 0;">
                <div class="progress-bar-fill" id="` + itemId + `-bar" style="width: 0%;"></div>
            </div>
        `;
        container.prepend(itemEl);

        const xhr = new XMLHttpRequest();
        const startTime = Date.now();
        let lastLoaded = 0;
        let lastTime = startTime;

        xhr.upload.onprogress = function (e) {
            if (e.lengthComputable) {
                const percent = Math.round((e.loaded / e.total) * 100);
                const now = Date.now();
                const deltaT = (now - lastTime) / 1000;
                let speedText = '';
                if (deltaT > 0.3) {
                    const deltaB = e.loaded - lastLoaded;
                    const speedMBps = (deltaB / (1024 * 1024)) / deltaT;
                    speedText = ' • ' + speedMBps.toFixed(1) + ' MB/s';
                    lastLoaded = e.loaded;
                    lastTime = now;
                }

                document.getElementById(itemId + '-bar').style.width = percent + '%';
                document.getElementById(itemId + '-status').innerText = '%%' + percent + speedText;
            }
        };

        xhr.onload = function () {
            if (xhr.status >= 200 && xhr.status < 300) {
                document.getElementById(itemId + '-bar').style.width = '100%';
                document.getElementById(itemId + '-status').innerText = '✅ Yüklendi';
                document.getElementById(itemId + '-status').style.color = 'var(--accent-green)';
                showToast('✅ ' + file.name + ' başarıyla yüklendi!');
                fetchReceivedFiles();
            } else {
                document.getElementById(itemId + '-status').innerText = '❌ Hata (' + xhr.status + ')';
                document.getElementById(itemId + '-status').style.color = 'var(--rose)';
                showToast('Yükleme hatası: ' + file.name, true);
            }
        };

        xhr.onerror = function () {
            document.getElementById(itemId + '-status').innerText = '❌ Bağlantı Hatası';
            document.getElementById(itemId + '-status').style.color = 'var(--rose)';
            showToast('Ağ hatası: ' + file.name, true);
        };

        const formData = new FormData();
        formData.append('file', file, file.name);

        xhr.open('POST', '/api/v1/upload?pin=' + encodeURIComponent(currentPin), true);
        xhr.setRequestHeader('X-Auth-PIN', currentPin);
        xhr.send(formData);
    }

    // 6. Dosya Yöneticisi Gezgini (Storage Explorer)
    async function loadDirectory(path = '') {
        try {
            const listEl = document.getElementById('explorer-file-list');
            listEl.innerHTML = '<div style="padding: 24px; text-align: center; color: var(--text-muted);">Yükleniyor...</div>';

            const res = await fetch('/api/v1/files?path=' + encodeURIComponent(path) + '&pin=' + encodeURIComponent(currentPin));
            if (!res.ok) {
                listEl.innerHTML = '<div style="padding: 24px; text-align: center; color: var(--rose);">Dizin okunamadı.</div>';
                return;
            }

            const files = await res.json();
            currentPath = path;
            document.getElementById('explorer-breadcrumb').innerText = '📁 ' + (path || '/sdcard');

            if (!files || files.length === 0) {
                listEl.innerHTML = '<div style="padding: 24px; text-align: center; color: var(--text-muted);">Bu klasör boş.</div>';
                return;
            }

            listEl.innerHTML = '';
            files.forEach(f => {
                const item = document.createElement('div');
                item.className = 'file-item';
                if (f.isDirectory) {
                    item.innerHTML = `
                        <div class="file-item-left" style="cursor: pointer;" onclick="loadDirectory('` + escapeAttr(f.path) + `')">
                            <span class="file-icon">📁</span>
                            <span class="file-name">` + escapeHtml(f.name) + `</span>
                        </div>
                        <div class="file-item-right">
                            <span>Klasör</span>
                        </div>
                    `;
                } else {
                    item.innerHTML = `
                        <div class="file-item-left">
                            <span class="file-icon">📄</span>
                            <span class="file-name">` + escapeHtml(f.name) + `</span>
                        </div>
                        <div class="file-item-right">
                            <span>` + f.formattedSize + `</span>
                            <button class="btn-download" style="padding: 4px 10px; font-size: 11px;" onclick="downloadSingleFile('` + escapeAttr(f.path) + `', '` + escapeAttr(f.name) + `')">
                                İndir
                            </button>
                        </div>
                    `;
                }
                listEl.appendChild(item);
            });
        } catch (e) {
            console.error(e);
        }
    }

    function navigateUp() {
        if (!currentPath || currentPath === '/' || currentPath === '/sdcard') {
            loadDirectory('');
            return;
        }
        const lastSlash = currentPath.lastIndexOf('/');
        if (lastSlash <= 0) {
            loadDirectory('');
        } else {
            loadDirectory(currentPath.substring(0, lastSlash));
        }
    }

    function refreshFiles() {
        loadDirectory(currentPath);
    }

    function downloadSingleFile(filePath, fileName) {
        const url = '/api/v1/download?path=' + encodeURIComponent(filePath) + '&pin=' + encodeURIComponent(currentPin);
        showToast('⬇️ İndirme başlatılıyor: ' + fileName);
        triggerDownload(url, fileName);
    }

    // 7. Gelen Dosyalar Listesi
    async function fetchReceivedFiles() {
        try {
            const res = await fetch('/api/v1/uploads?pin=' + encodeURIComponent(currentPin));
            if (!res.ok) return;
            const files = await res.json();

            document.getElementById('received-count').innerText = files.length;
            const listEl = document.getElementById('received-file-list');

            if (!files || files.length === 0) {
                listEl.innerHTML = '<div style="padding: 24px; text-align: center; color: var(--text-muted);">Henüz dosya alınmadı.</div>';
                return;
            }

            listEl.innerHTML = '';
            files.forEach(f => {
                const item = document.createElement('div');
                item.className = 'file-item';
                item.innerHTML = `
                    <div class="file-item-left">
                        <span class="file-icon">📥</span>
                        <div>
                            <div class="file-name">` + escapeHtml(f.fileName) + `</div>
                            <div style="font-size: 11px; color: var(--text-dim); font-family: var(--font-mono);">` + f.uploadDateFormatted + `</div>
                        </div>
                    </div>
                    <div class="file-item-right">
                        <span>` + f.formattedSize + `</span>
                        <button class="btn-download" style="padding: 4px 10px; font-size: 11px;" onclick="downloadSingleFile('` + escapeAttr(f.filePath) + `', '` + escapeAttr(f.fileName) + `')">
                            Tekrar İndir
                        </button>
                    </div>
                `;
                listEl.appendChild(item);
            });
        } catch (e) {
            console.error(e);
        }
    }

    // 8. Sekme Yönetimi
    function switchTab(tabId) {
        document.querySelectorAll('.tab-content').forEach(el => el.style.display = 'none');
        document.querySelectorAll('.nav-tab').forEach(el => el.classList.remove('active'));

        document.getElementById('tab-' + tabId).style.display = tabId === 'transfer' ? 'flex' : 'block';
        event.currentTarget.classList.add('active');

        if (tabId === 'transfer') {
            loadCategoryStats();
        } else if (tabId === 'explorer' && !currentPath) {
            loadDirectory('');
        } else if (tabId === 'received') {
            fetchReceivedFiles();
        }
    }

    // 9. Yardımcı Fonksiyonlar (Toast, Format, Escape)
    function showToast(message, isError = false) {
        const container = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = 'toast' + (isError ? ' error' : '');
        toast.innerHTML = (isError ? '⚠️ ' : '⚡ ') + escapeHtml(message);
        container.appendChild(toast);
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateY(10px)';
            toast.style.transition = 'all 0.3s ease';
            setTimeout(() => toast.remove(), 300);
        }, 4000);
    }

    function formatBytes(bytes) {
        if (!bytes || bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    }

    function escapeHtml(str) {
        if (!str) return '';
        return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    function escapeAttr(str) {
        if (!str) return '';
        return str.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/"/g, '&quot;');
    }

    // Sayfa Yüklendiğinde Başlat
    window.addEventListener('DOMContentLoaded', () => {
        initPin();
        // 20 saniyede bir kategori istatistiklerini canlı güncelle
        setInterval(() => {
            if (currentPin) {
                loadCategoryStats();
            }
        }, 20000);
    });
</script>

</body>
</html>
        """.trimIndent()
    }
}
