/**
 * Roborock Q8 Max Pro - Web Hub Application Logic
 * Reactive UI state manager, REST API actions, optimistic UI updates,
 * consumable health monitors, and notification layer.
 */

(function () {
  'use strict';

  // =========================================================================
  // 1. SABİTLER VE HARİTALAMALAR
  // =========================================================================

  // Roborock Durum Kodları (Türkçe Açıklamalar)
  const STATE_DESCRIPTIONS = {
    0: 'Bilinmiyor / Çevrimdışı',
    1: 'Başlatılıyor',
    2: 'Uyku Modu',
    3: 'Boşta (İstasyonda)',
    5: 'Temizliyor',
    6: 'İstasyona Dönüyor',
    7: 'Manuel Mod',
    8: 'Şarj Oluyor',
    10: 'Duraklatıldı',
    11: 'Spot Temizlik',
    12: 'Hata Durumu',
    14: 'İstasyon Boşaltma',
    15: 'Paspas Yıkama',
    16: 'Hızlı Haritalama',
    17: 'Paspas Kurutma',
    18: 'Yıkamaya Dönüyor',
    100: 'Şarj Tamamlandı',
  };

  // Emiş Gücü İsimleri
  const FAN_SPEED_NAMES = {
    101: 'Sessiz',
    102: 'Dengeli',
    103: 'Turbo',
    104: 'Maksimum',
    105: 'Max+',
  };

  // Su Seviyesi İsimleri
  const WATER_LEVEL_NAMES = {
    200: 'Kapalı',
    201: 'Düşük',
    202: 'Orta',
    203: 'Yüksek',
  };

  // Sarf Malzeme Tanımları ve Toplam Ömürleri (Saat)
  const CONSUMABLE_META = {
    main_brush_work_time: {
      name: 'Ana Fırça',
      totalHours: 300.0,
      pctId: 'pct-main-brush',
      barId: 'bar-main-brush',
      timeId: 'time-main-brush',
    },
    side_brush_work_time: {
      name: 'Yan Fırça',
      totalHours: 200.0,
      pctId: 'pct-side-brush',
      barId: 'bar-side-brush',
      timeId: 'time-side-brush',
    },
    filter_work_time: {
      name: 'HEPA Filtre',
      totalHours: 150.0,
      pctId: 'pct-filter',
      barId: 'bar-filter',
      timeId: 'time-filter',
    },
    sensor_dirty_time: {
      name: 'Sensörler',
      totalHours: 30.0,
      pctId: 'pct-sensor',
      barId: 'bar-sensor',
      timeId: 'time-sensor',
    },
  };

  // Dairesel Gauge Çevresi (r = 90 için: 2 * PI * 90 ≈ 565.486)
  const GAUGE_CIRCUMFERENCE = 2 * Math.PI * 90;

  // =========================================================================
  // 2. DOM ELEMENT ÖNBELLEĞİ (ELEMENT CACHE)
  // =========================================================================
  const DOM = {
    // Header
    connectionStatus: document.getElementById('connection-status'),
    connectionText: document.getElementById('connection-text'),
    btnFind: document.getElementById('btn-find'),

    // Hero Gauge
    batteryProgress: document.getElementById('battery-progress'),
    batteryPercent: document.getElementById('battery-percent'),
    statusIconBox: document.getElementById('status-icon-box'),
    statusIconSvg: document.getElementById('status-icon-svg'),
    statusBadge: document.getElementById('status-badge'),
    statusText: document.getElementById('status-text'),

    // Quick Metrics
    metricArea: document.getElementById('metric-area'),
    metricTime: document.getElementById('metric-time'),
    metricFan: document.getElementById('metric-fan'),
    metricFanLevel: document.getElementById('metric-fan-level'),

    // Action Bar
    actionSpinner: document.getElementById('action-spinner'),
    btnStart: document.getElementById('btn-start'),
    btnPause: document.getElementById('btn-pause'),
    btnStop: document.getElementById('btn-stop'),
    btnCharge: document.getElementById('btn-charge'),
    btnSpot: document.getElementById('btn-spot'),
    actionButtons: document.querySelectorAll('.btn-action'),

    // Selectors
    fanSelector: document.getElementById('fan-selector'),
    waterSelector: document.getElementById('water-selector'),
    fanButtons: document.querySelectorAll('#fan-selector .segment-btn'),
    waterButtons: document.querySelectorAll('#water-selector .segment-btn'),

    // Consumables Reset Buttons
    resetButtons: document.querySelectorAll('.btn-reset'),

    // Modal
    confirmModal: document.getElementById('confirm-modal'),
    modalPartName: document.getElementById('modal-part-name'),
    modalCancelBtn: document.getElementById('modal-cancel-btn'),
    modalConfirmBtn: document.getElementById('modal-confirm-btn'),

    // Toast Container
    toastContainer: document.getElementById('toast-container'),

    // Footer
    lastSyncTime: document.getElementById('last-sync-time'),
  };

  // Uygulama Dahili Durumu
  const AppState = {
    battery: 0,
    stateCode: 0,
    stateDesc: '',
    isCleaning: false,
    cleanArea: 0.0,
    cleanTime: 0,
    fanPower: 102,
    waterLevel: 201,
    errorCode: 0,
    errorDesc: 'Hata yok',
    consumables: null,
    connected: false,
    selectedConsumableKey: null,
    isActionBusy: false,
  };

  // =========================================================================
  // 3. YARDIMCI BİÇİMLENDİRME FONKSİYONLARI
  // =========================================================================

  /**
   * Saniyeyi dk:sn formatına dönüştürür
   * @param {number} totalSeconds
   * @returns {string}
   */
  function formatDuration(totalSeconds) {
    if (!totalSeconds || totalSeconds < 0) return '00:00';
    const s = Math.floor(totalSeconds);
    const hours = Math.floor(s / 3600);
    const mins = Math.floor((s % 3600) / 60);
    const secs = s % 60;

    const pad = (n) => String(n).padStart(2, '0');
    if (hours > 0) {
      return `${hours}:${pad(mins)}:${pad(secs)}`;
    }
    return `${pad(mins)}:${pad(secs)}`;
  }

  /**
   * Alanı m² cinsinden biçimlendirir
   * @param {number} areaSqm
   * @returns {string}
   */
  function formatArea(areaSqm) {
    if (typeof areaSqm !== 'number' || isNaN(areaSqm)) return '0.0';
    return areaSqm.toFixed(1);
  }

  /**
   * Saat biçimlendirmesi
   * @param {Date} [date]
   * @returns {string}
   */
  function formatCurrentTime(date = new Date()) {
    const pad = (n) => String(n).padStart(2, '0');
    return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
  }

  // =========================================================================
  // 4. REAKTİF DOM GÜNCELLEME YÖNTEMLERİ
  // =========================================================================

  /**
   * Batarya göstergesini dairesel SVG ve yüzde ile günceller
   * @param {number} percent (0 - 100)
   */
  function updateBatteryGauge(percent) {
    const validPct = Math.max(0, Math.min(100, Math.round(percent || 0)));
    DOM.batteryPercent.textContent = validPct;

    // Stroke Dashoffset Hesaplaması
    const offset = GAUGE_CIRCUMFERENCE - (validPct / 100) * GAUGE_CIRCUMFERENCE;
    DOM.batteryProgress.style.strokeDashoffset = offset;

    // Düşük Pil Uyarısı Renk Değişimi
    if (validPct <= 20) {
      DOM.batteryProgress.style.stroke = 'url(#battery-gradient-low)';
    } else {
      DOM.batteryProgress.style.stroke = 'url(#battery-gradient)';
    }
  }

  /**
   * Robot durum ikonunu ve durum rozetini günceller
   * @param {number} stateCode
   * @param {string} stateDesc
   * @param {number} errorCode
   * @param {string} errorDesc
   */
  function updateRobotStatus(stateCode, stateDesc, errorCode, errorDesc) {
    const desc = stateDesc || STATE_DESCRIPTIONS[stateCode] || `Durum ${stateCode}`;
    DOM.statusText.textContent = desc;

    // Sınıf temizliği
    DOM.statusBadge.className = 'state-pill';

    let iconHtml = '';

    if (errorCode > 0) {
      // Hata Durumu
      DOM.statusBadge.classList.add('state-error');
      DOM.statusText.textContent = `Hata: ${errorDesc || errorCode}`;
      iconHtml = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
          <line x1="12" y1="9" x2="12" y2="13"/>
          <line x1="12" y1="17" x2="12.01" y2="17"/>
        </svg>
      `;
      DOM.statusIconBox.style.color = 'var(--neon-rose)';
    } else if (stateCode === 5 || stateCode === 11 || stateCode === 15 || stateCode === 16 || stateCode === 17) {
      // Temizliyor / Spot / Yıkama
      DOM.statusBadge.classList.add('state-cleaning');
      iconHtml = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="spinning-icon">
          <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
        </svg>
      `;
      DOM.statusIconBox.style.color = 'var(--neon-emerald)';
    } else if (stateCode === 8 || stateCode === 100) {
      // Şarj Oluyor / Tamamlandı
      DOM.statusBadge.classList.add('state-charging');
      iconHtml = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
        </svg>
      `;
      DOM.statusIconBox.style.color = 'var(--neon-cyan)';
    } else if (stateCode === 10) {
      // Duraklatıldı
      DOM.statusBadge.classList.add('state-paused');
      iconHtml = `
        <svg viewBox="0 0 24 24" fill="currentColor">
          <rect x="6" y="4" width="4" height="16" rx="1"/>
          <rect x="14" y="4" width="4" height="16" rx="1"/>
        </svg>
      `;
      DOM.statusIconBox.style.color = 'var(--neon-amber)';
    } else {
      // Boşta / Uyku
      DOM.statusBadge.classList.add('state-idle');
      iconHtml = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
          <polyline points="9 22 9 12 15 12 15 22"/>
        </svg>
      `;
      DOM.statusIconBox.style.color = 'var(--text-secondary)';
    }

    DOM.statusIconBox.innerHTML = iconHtml;
  }

  /**
   * Hızlı Metrik Kartlarını günceller
   */
  function updateQuickMetrics(areaSqm, timeSeconds, fanPower, fanDesc) {
    DOM.metricArea.textContent = formatArea(areaSqm);
    DOM.metricTime.textContent = formatDuration(timeSeconds);

    const fanText = fanDesc || FAN_SPEED_NAMES[fanPower] || `Kademe ${fanPower}`;
    DOM.metricFan.textContent = fanText;
    DOM.metricFanLevel.textContent = `(${fanPower})`;
  }

  /**
   * Emiş gücü seçici butonlarını günceller
   * @param {number} level (101 - 105)
   */
  function updateFanSelector(level) {
    DOM.fanButtons.forEach((btn) => {
      const btnLevel = parseInt(btn.getAttribute('data-fan'), 10);
      const isActive = btnLevel === level;
      btn.classList.toggle('active', isActive);
      btn.setAttribute('aria-checked', isActive ? 'true' : 'false');
    });
  }

  /**
   * Su seviyesi seçici butonlarını günceller
   * @param {number} level (200 - 203)
   */
  function updateWaterSelector(level) {
    DOM.waterButtons.forEach((btn) => {
      const btnLevel = parseInt(btn.getAttribute('data-water'), 10);
      const isActive = btnLevel === level;
      btn.classList.toggle('active', isActive);
      btn.setAttribute('aria-checked', isActive ? 'true' : 'false');
    });
  }

  /**
   * Sarf malzeme kartlarını günceller
   * @param {Object} consumables
   */
  function updateConsumables(consumables) {
    if (!consumables) return;

    // Farklı backend veri biçimlerini destekle (dataclass dict veya raw get_consumables)
    const items = [
      {
        key: 'main_brush_work_time',
        data: consumables.main_brush || {
          work_time_hours: (consumables.main_brush_work_time || 0) / 3600,
          total_lifetime_hours: 300,
          remaining_hours: Math.max(0, 300 - (consumables.main_brush_work_time || 0) / 3600),
          remaining_percent: Math.max(0, Math.min(100, (1 - (consumables.main_brush_work_time || 0) / (300 * 3600)) * 100)),
        },
      },
      {
        key: 'side_brush_work_time',
        data: consumables.side_brush || {
          work_time_hours: (consumables.side_brush_work_time || 0) / 3600,
          total_lifetime_hours: 200,
          remaining_hours: Math.max(0, 200 - (consumables.side_brush_work_time || 0) / 3600),
          remaining_percent: Math.max(0, Math.min(100, (1 - (consumables.side_brush_work_time || 0) / (200 * 3600)) * 100)),
        },
      },
      {
        key: 'filter_work_time',
        data: consumables.filter || {
          work_time_hours: (consumables.filter_work_time || 0) / 3600,
          total_lifetime_hours: 150,
          remaining_hours: Math.max(0, 150 - (consumables.filter_work_time || 0) / 3600),
          remaining_percent: Math.max(0, Math.min(100, (1 - (consumables.filter_work_time || 0) / (150 * 3600)) * 100)),
        },
      },
      {
        key: 'sensor_dirty_time',
        data: consumables.sensor || {
          work_time_hours: (consumables.sensor_dirty_time || 0) / 3600,
          total_lifetime_hours: 30,
          remaining_hours: Math.max(0, 30 - (consumables.sensor_dirty_time || 0) / 3600),
          remaining_percent: Math.max(0, Math.min(100, (1 - (consumables.sensor_dirty_time || 0) / (30 * 3600)) * 100)),
        },
      },
    ];

    items.forEach(({ key, data }) => {
      const meta = CONSUMABLE_META[key];
      if (!meta) return;

      const pct = Math.max(0, Math.min(100, Math.round(data.remaining_percent ?? 100)));
      const remHours = (data.remaining_hours !== undefined)
        ? data.remaining_hours.toFixed(1)
        : (meta.totalHours * (pct / 100)).toFixed(1);

      const pctEl = document.getElementById(meta.pctId);
      const barEl = document.getElementById(meta.barId);
      const timeEl = document.getElementById(meta.timeId);

      if (pctEl) pctEl.textContent = `${pct}%`;
      if (timeEl) timeEl.textContent = `${remHours} sa`;
      if (barEl) {
        barEl.style.width = `${pct}%`;

        // Dinamik Renk Belirleme
        barEl.className = 'progress-bar-fill';
        if (pct > 50) {
          barEl.classList.add(key === 'main_brush_work_time' ? 'fill-cyan' : 'fill-emerald');
        } else if (pct > 20) {
          barEl.classList.add('fill-amber');
        } else {
          barEl.classList.add('fill-rose');
        }
      }
    });
  }

  /**
   * Canlı bağlantı durum rozetini günceller
   * @param {boolean} isConnected
   */
  function updateConnectionStatus(isConnected) {
    AppState.connected = isConnected;
    DOM.connectionStatus.classList.toggle('connected', isConnected);
    DOM.connectionStatus.classList.toggle('disconnected', !isConnected);

    DOM.connectionText.textContent = isConnected ? 'Canlı Bağlı' : 'Bağlantı Kesildi';
  }

  /**
   * Tüm Telemetri Paketini Reaktif Olarak İşle
   * @param {Object} data
   */
  function applyTelemetry(data) {
    if (!data) return;

    // Batarya
    if (typeof data.battery === 'number') {
      AppState.battery = data.battery;
      updateBatteryGauge(data.battery);
    }

    // Durum ve Hata
    if (typeof data.state_code === 'number' || typeof data.state === 'number') {
      AppState.stateCode = data.state_code ?? data.state ?? 0;
      AppState.stateDesc = data.state_desc || '';
      AppState.errorCode = data.error_code ?? data.error ?? 0;
      AppState.errorDesc = data.error_desc || '';
      updateRobotStatus(AppState.stateCode, AppState.stateDesc, AppState.errorCode, AppState.errorDesc);
    }

    // Metrikler
    const area = data.clean_area_sqm ?? (data.clean_area ? data.clean_area / 1000000 : AppState.cleanArea);
    const duration = data.clean_time_seconds ?? data.clean_time ?? AppState.cleanTime;
    const fan = data.fan_power ?? AppState.fanPower;
    const fanDesc = data.fan_power_desc || '';

    AppState.cleanArea = area;
    AppState.cleanTime = duration;
    AppState.fanPower = fan;

    updateQuickMetrics(area, duration, fan, fanDesc);
    updateFanSelector(fan);

    // Su Seviyesi
    if (typeof data.water_level === 'number' || typeof data.water_box_mode === 'number') {
      const water = data.water_level ?? data.water_box_mode;
      AppState.waterLevel = water;
      updateWaterSelector(water);
    }

    // Sarf Malzemeler
    if (data.consumables) {
      AppState.consumables = data.consumables;
      updateConsumables(data.consumables);
    }

    // Son Senkronizasyon Zamanı
    DOM.lastSyncTime.textContent = formatCurrentTime();
  }

  // =========================================================================
  // 5. TOAST BİLDİRİM SİSTEMİ
  // =========================================================================

  /**
   * Ekranın sağ üstünde kayarak beliren bildirim oluşturur
   * @param {string} title
   * @param {string} message
   * @param {'success'|'error'|'warning'|'info'} [type='info']
   * @param {number} [duration=4000]
   */
  function showToast(title, message, type = 'info', duration = 4000) {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    let iconSvg = '';
    switch (type) {
      case 'success':
        iconSvg = `
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="20 6 9 17 4 12"/>
          </svg>`;
        break;
      case 'error':
        iconSvg = `
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"/>
            <line x1="15" y1="9" x2="9" y2="15"/>
            <line x1="9" y1="9" x2="15" y2="15"/>
          </svg>`;
        break;
      case 'warning':
        iconSvg = `
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
            <line x1="12" y1="9" x2="12" y2="13"/>
            <line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>`;
        break;
      default:
        iconSvg = `
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="16" x2="12" y2="12"/>
            <line x1="12" y1="8" x2="12.01" y2="8"/>
          </svg>`;
    }

    toast.innerHTML = `
      <div class="toast-icon">${iconSvg}</div>
      <div class="toast-content">
        <div class="toast-title"></div>
        <div class="toast-message"></div>
      </div>
      <button class="toast-close" title="Kapat">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="18" y1="6" x2="6" y2="18"/>
          <line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    `;

    // XSS Koruması: Başlık ve mesajı textContent ile ata
    const titleEl = toast.querySelector('.toast-title');
    const msgEl = toast.querySelector('.toast-message');
    if (titleEl) titleEl.textContent = title;
    if (msgEl) msgEl.textContent = message;

    // Kapat butonu dinleyicisi
    const closeBtn = toast.querySelector('.toast-close');
    closeBtn.addEventListener('click', () => removeToast(toast));

    DOM.toastContainer.appendChild(toast);

    // Otomatik kapanma
    if (duration > 0) {
      setTimeout(() => removeToast(toast), duration);
    }
  }

  function removeToast(toast) {
    if (!toast || toast.classList.contains('toast-exit')) return;
    toast.classList.add('toast-exit');
    toast.addEventListener('animationend', () => {
      toast.remove();
    });
  }

  // =========================================================================
  // 6. REST API İSTEMCİSİ VE EYLEMLER
  // =========================================================================

  /**
   * REST API İsteği Gönderici
   * @param {string} endpoint
   * @param {Object} [payload]
   * @returns {Promise<any>}
   */
  async function callApi(endpoint, payload = null) {
    const options = {
      method: payload ? 'POST' : 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    };

    if (payload) {
      options.body = JSON.stringify(payload);
    }

    const response = await fetch(endpoint, options);
    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
      const errMsg = result.error || result.message || `Sunucu hatası: ${response.status}`;
      throw new Error(errMsg);
    }

    return result;
  }

  /**
   * Robot Kontrol Eylemini Gerçekleştir
   * @param {string} action
   * @param {string} label
   */
  async function handleRobotAction(action, label) {
    if (AppState.isActionBusy) return;

    AppState.isActionBusy = true;
    DOM.actionSpinner.classList.remove('hidden');

    try {
      showToast('Komut Gönderiliyor', `${label} komutu cihaza iletiliyor...`, 'info', 2500);

      const endpoint = `/api/action/${action}`;
      await callApi(endpoint);

      showToast('İşlem Başarılı', `${label} komutu başarıyla uygulandı.`, 'success', 3500);

      // İyimser UI durumu (Optimistic Update)
      if (action === 'start') {
        updateRobotStatus(5, 'Temizliyor', 0, '');
      } else if (action === 'pause') {
        updateRobotStatus(10, 'Duraklatıldı', 0, '');
      } else if (action === 'stop') {
        updateRobotStatus(3, 'Boşta', 0, '');
      } else if (action === 'charge') {
        updateRobotStatus(6, 'İstasyona Dönüyor', 0, '');
      } else if (action === 'spot') {
        updateRobotStatus(11, 'Spot Temizlik', 0, '');
      }
    } catch (err) {
      console.error(`Action error [${action}]:`, err);
      showToast('Komut Başarısız', err.message || 'Cihazla iletişim kurulamadı.', 'error', 5000);
    } finally {
      AppState.isActionBusy = false;
      DOM.actionSpinner.classList.add('hidden');
    }
  }

  /**
   * Emiş Gücü Değiştirme
   * @param {number} level
   */
  async function handleSetFanPower(level) {
    const name = FAN_SPEED_NAMES[level] || level;
    try {
      updateFanSelector(level);
      DOM.metricFan.textContent = name;
      DOM.metricFanLevel.textContent = `(${level})`;

      await callApi('/api/settings/fan_power', { fan_power: level });
      showToast('Emiş Gücü Güncellendi', `Vakum modu "${name}" (${level}) olarak ayarlandı.`, 'success', 3000);
    } catch (err) {
      console.error('Fan power update error:', err);
      showToast('Ayar Başarısız', err.message || 'Emiş gücü değiştirilemedi.', 'error', 4500);
      updateFanSelector(AppState.fanPower); // Geri al
    }
  }

  /**
   * Su Seviyesi Değiştirme
   * @param {number} level
   */
  async function handleSetWaterLevel(level) {
    const name = WATER_LEVEL_NAMES[level] || level;
    try {
      updateWaterSelector(level);

      await callApi('/api/settings/water_level', { water_level: level });
      showToast('Su Seviyesi Güncellendi', `Paspas debisi "${name}" (${level}) olarak ayarlandı.`, 'success', 3000);
    } catch (err) {
      console.error('Water level update error:', err);
      showToast('Ayar Başarısız', err.message || 'Su seviyesi değiştirilemedi.', 'error', 4500);
      updateWaterSelector(AppState.waterLevel); // Geri al
    }
  }

  /**
   * Sarf Malzeme Sayacını Sıfırlama
   * @param {string} consumableKey
   */
  async function handleResetConsumable(consumableKey) {
    const meta = CONSUMABLE_META[consumableKey];
    const partName = meta ? meta.name : consumableKey;

    try {
      // Birkaç alternatif API endpoint desteği
      let res;
      try {
        res = await callApi('/api/consumable/reset', { name: consumableKey });
      } catch (e) {
        res = await callApi('/api/action/reset_consumable', { name: consumableKey });
      }

      showToast('Sayaç Sıfırlandı', `${partName} sayacı sıfırlandı ve ömrü %100 yapıldı.`, 'success', 4000);

      // İyimser UI güncellemesi
      if (meta) {
        const pctEl = document.getElementById(meta.pctId);
        const barEl = document.getElementById(meta.barId);
        const timeEl = document.getElementById(meta.timeId);
        if (pctEl) pctEl.textContent = '100%';
        if (barEl) {
          barEl.style.width = '100%';
          barEl.className = 'progress-bar-fill fill-cyan';
        }
        if (timeEl) timeEl.textContent = `${meta.totalHours.toFixed(1)} sa`;
      }
    } catch (err) {
      console.error('Reset consumable error:', err);
      showToast('Sıfırlama Hatası', err.message || 'Sayaç sıfırlanamadı.', 'error', 5000);
    }
  }

  // =========================================================================
  // 7. MODAL YÖNETİMİ
  // =========================================================================

  function openResetModal(consumableKey, label) {
    AppState.selectedConsumableKey = consumableKey;
    DOM.modalPartName.textContent = label || 'Seçili Parça';
    DOM.confirmModal.classList.remove('hidden');
  }

  function closeResetModal() {
    DOM.confirmModal.classList.add('hidden');
    AppState.selectedConsumableKey = null;
  }

  // =========================================================================
  // 8. OLAY DİNLEYİCİLERİNİ BAĞLAMA (EVENT LISTENERS)
  // =========================================================================

  function bindEvents() {
    // 1. Robotu Bul
    DOM.btnFind.addEventListener('click', async () => {
      try {
        DOM.btnFind.disabled = true;
        showToast('Robot Aranıyor', 'Robot konum ses sinyali çalıyor...', 'info', 3000);
        await callApi('/api/action/find');
      } catch (err) {
        showToast('Hata', err.message || 'Sinyal iletilemedi.', 'error', 4000);
      } finally {
        setTimeout(() => { DOM.btnFind.disabled = false; }, 2000);
      }
    });

    // 2. Ana Kontrol Butonları (Start, Pause, Stop, Charge, Spot)
    DOM.btnStart.addEventListener('click', () => handleRobotAction('start', 'Başlat'));
    DOM.btnPause.addEventListener('click', () => handleRobotAction('pause', 'Duraklat'));
    DOM.btnStop.addEventListener('click', () => handleRobotAction('stop', 'Durdur'));
    DOM.btnCharge.addEventListener('click', () => handleRobotAction('charge', 'Şarja Dön'));
    DOM.btnSpot.addEventListener('click', () => handleRobotAction('spot', 'Bölgesel Temizlik'));

    // 3. Emiş Gücü Butonları
    DOM.fanButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const level = parseInt(btn.getAttribute('data-fan'), 10);
        if (level && level !== AppState.fanPower) {
          handleSetFanPower(level);
        }
      });
    });

    // 4. Su Seviyesi Butonları
    DOM.waterButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const level = parseInt(btn.getAttribute('data-water'), 10);
        if (level && level !== AppState.waterLevel) {
          handleSetWaterLevel(level);
        }
      });
    });

    // 5. Sarf Malzeme Sıfırlama Butonları
    DOM.resetButtons.forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const key = btn.getAttribute('data-consumable-key');
        const label = btn.getAttribute('data-consumable-label');
        if (key) {
          openResetModal(key, label);
        }
      });
    });

    // 6. Modal Eylemleri
    DOM.modalCancelBtn.addEventListener('click', closeResetModal);
    DOM.confirmModal.addEventListener('click', (e) => {
      if (e.target === DOM.confirmModal) closeResetModal();
    });

    DOM.modalConfirmBtn.addEventListener('click', async () => {
      const key = AppState.selectedConsumableKey;
      closeResetModal();
      if (key) {
        await handleResetConsumable(key);
      }
    });

    // ESC Tuşu ile Modalı Kapatma
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !DOM.confirmModal.classList.contains('hidden')) {
        closeResetModal();
      }
    });
  }

  // =========================================================================
  // 9. 3D ODA VE EV MODELLEME MOTORU (THREE.JS WEBGL)
  // =========================================================================

  let scene3D, camera3D, renderer3D, controls3D;
  let roomMeshes = [];
  let robotMesh = null;
  let selectedRoom = null;
  let roomsData = [
    { id: 16, name: "Salon", area: 28.5, color: 0x06b6d4, x: -3.5, z: -2.5, w: 5.5, d: 4.5 },
    { id: 17, name: "Mutfak", area: 14.2, color: 0x10b981, x: 2.8, z: -2.5, w: 3.8, d: 3.8 },
    { id: 18, name: "Yatak Odası", area: 18.0, color: 0x8b5cf6, x: -3.5, z: 2.5, w: 4.8, d: 3.8 },
    { id: 19, name: "Koridor", area: 9.5, color: 0xf59e0b, x: 0, z: 0, w: 2.2, d: 5.5 },
    { id: 20, name: "Çalışma Odası", area: 12.0, color: 0x3b82f6, x: 2.8, z: 2.2, w: 3.8, d: 3.2 },
    { id: 21, name: "Banyo", area: 6.8, color: 0xec4899, x: -0.8, z: 3.4, w: 2.2, d: 2.0 },
  ];

  function init3DMap() {
    const container = document.getElementById('map3d-canvas-container');
    if (!container || typeof THREE === 'undefined') {
      return;
    }

    const width = container.clientWidth || 800;
    const height = container.clientHeight || 380;

    scene3D = new THREE.Scene();
    scene3D.background = new THREE.Color(0x080b12);

    camera3D = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera3D.position.set(0, 14, 13);
    camera3D.lookAt(0, 0, 0);

    renderer3D = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer3D.setSize(width, height);
    renderer3D.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer3D.shadowMap.enabled = true;
    container.innerHTML = '';
    container.appendChild(renderer3D.domElement);

    if (typeof THREE.OrbitControls !== 'undefined') {
      controls3D = new THREE.OrbitControls(camera3D, renderer3D.domElement);
      controls3D.enableDamping = true;
      controls3D.dampingFactor = 0.08;
      controls3D.maxPolarAngle = Math.PI / 2.1;
      controls3D.minDistance = 5;
      controls3D.maxDistance = 30;
    }

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.85);
    scene3D.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0x06b6d4, 1.2);
    dirLight.position.set(5, 15, 7);
    scene3D.add(dirLight);

    const pointLight = new THREE.PointLight(0x3b82f6, 1.5, 20);
    pointLight.position.set(0, 4, 0);
    scene3D.add(pointLight);

    const grid = new THREE.GridHelper(24, 24, 0x1e293b, 0x0f172a);
    grid.position.y = -0.05;
    scene3D.add(grid);

    buildRoomMeshes();
    buildRobotMesh();

    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    renderer3D.domElement.addEventListener('pointerdown', (event) => {
      const rect = renderer3D.domElement.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera3D);
      const intersects = raycaster.intersectObjects(roomMeshes);

      if (intersects.length > 0) {
        const clickedMesh = intersects[0].object;
        const roomData = clickedMesh.userData;
        if (roomData) {
          selectRoom(roomData);
        }
      }
    });

    const btn3D = document.getElementById('btn-cam-3d');
    const btn2D = document.getElementById('btn-cam-2d');
    const btnReset = document.getElementById('btn-cam-reset');

    if (btn3D) {
      btn3D.addEventListener('click', () => {
        camera3D.position.set(0, 14, 13);
        camera3D.lookAt(0, 0, 0);
        btn3D.classList.add('active');
        if (btn2D) btn2D.classList.remove('active');
      });
    }

    if (btn2D) {
      btn2D.addEventListener('click', () => {
        camera3D.position.set(0, 20, 0.01);
        camera3D.lookAt(0, 0, 0);
        btn2D.classList.add('active');
        if (btn3D) btn3D.classList.remove('active');
      });
    }

    if (btnReset) {
      btnReset.addEventListener('click', () => {
        camera3D.position.set(0, 14, 13);
        camera3D.lookAt(0, 0, 0);
        if (controls3D) controls3D.reset();
      });
    }

    window.addEventListener('resize', () => {
      if (!container || !renderer3D || !camera3D) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera3D.aspect = w / h;
      camera3D.updateProjectionMatrix();
      renderer3D.setSize(w, h);
    });

    function animate() {
      requestAnimationFrame(animate);
      if (controls3D) controls3D.update();
      if (robotMesh && robotMesh.userData.isMoving) {
        const target = robotMesh.userData.targetPos;
        robotMesh.position.lerp(target, 0.05);
        if (robotMesh.position.distanceTo(target) < 0.1) {
          robotMesh.userData.isMoving = false;
        }
      }
      renderer3D.render(scene3D, camera3D);
    }
    animate();

    renderRoomChips();

    const btnCleanRoom = document.getElementById('btn-clean-selected-room');
    if (btnCleanRoom) {
      btnCleanRoom.addEventListener('click', () => {
        if (selectedRoom) {
          triggerRoomClean(selectedRoom);
        }
      });
    }
  }

  function buildRoomMeshes() {
    roomMeshes = [];
    roomsData.forEach((r) => {
      const floorGeo = new THREE.BoxGeometry(r.w, 0.15, r.d);
      const floorMat = new THREE.MeshStandardMaterial({
        color: r.color,
        roughness: 0.3,
        metalness: 0.1,
        transparent: true,
        opacity: 0.45,
      });
      const floorMesh = new THREE.Mesh(floorGeo, floorMat);
      floorMesh.position.set(r.x, 0, r.z);
      floorMesh.userData = r;

      const edges = new THREE.EdgesGeometry(floorGeo);
      const line = new THREE.LineSegments(
        edges,
        new THREE.LineBasicMaterial({ color: r.color, linewidth: 2 })
      );
      floorMesh.add(line);

      const wallMat = new THREE.MeshStandardMaterial({
        color: r.color,
        transparent: true,
        opacity: 0.15,
        wireframe: true,
      });
      const wallGeo = new THREE.BoxGeometry(r.w, 0.8, r.d);
      const wallMesh = new THREE.Mesh(wallGeo, wallMat);
      wallMesh.position.set(r.x, 0.4, r.z);
      wallMesh.userData = r;

      const sprite = createRoomLabel(r.name, `${r.area} m²`);
      sprite.position.set(r.x, 1.2, r.z);

      scene3D.add(floorMesh);
      scene3D.add(wallMesh);
      scene3D.add(sprite);
      roomMeshes.push(floorMesh);
    });
  }

  function createRoomLabel(title, sub) {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = 'rgba(10, 15, 26, 0.85)';
    ctx.roundRect ? ctx.roundRect(10, 10, 236, 108, 16) : ctx.rect(10, 10, 236, 108);
    ctx.fill();

    ctx.strokeStyle = 'rgba(6, 182, 212, 0.6)';
    ctx.lineWidth = 4;
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 28px Plus Jakarta Sans, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(title, 128, 55);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '20px Plus Jakarta Sans, sans-serif';
    ctx.fillText(sub, 128, 92);

    const texture = new THREE.CanvasTexture(canvas);
    const spriteMat = new THREE.SpriteMaterial({ map: texture, transparent: true });
    const sprite = new THREE.Sprite(spriteMat);
    sprite.scale.set(2.4, 1.2, 1);
    return sprite;
  }

  function buildRobotMesh() {
    const robotGroup = new THREE.Group();

    const bodyGeo = new THREE.CylinderGeometry(0.55, 0.55, 0.18, 32);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      metalness: 0.8,
      roughness: 0.2,
    });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 0.15;
    robotGroup.add(body);

    const turretGeo = new THREE.CylinderGeometry(0.16, 0.16, 0.08, 24);
    const turretMat = new THREE.MeshStandardMaterial({
      color: 0x06b6d4,
      emissive: 0x06b6d4,
      emissiveIntensity: 0.6,
    });
    const turret = new THREE.Mesh(turretGeo, turretMat);
    turret.position.set(0, 0.26, -0.05);
    robotGroup.add(turret);

    const lightGeo = new THREE.BoxGeometry(0.2, 0.04, 0.04);
    const lightMat = new THREE.MeshBasicMaterial({ color: 0x10b981 });
    const light = new THREE.Mesh(lightGeo, lightMat);
    light.position.set(0, 0.15, 0.54);
    robotGroup.add(light);

    robotGroup.position.set(0, 0.05, 0);
    robotGroup.userData = { targetPos: new THREE.Vector3(0, 0.05, 0), isMoving: false };

    scene3D.add(robotGroup);
    robotMesh = robotGroup;
  }

  function selectRoom(room) {
    selectedRoom = room;

    const hudName = document.getElementById('hud-selected-room');
    const btnClean = document.getElementById('btn-clean-selected-room');
    const btnCleanLabel = document.getElementById('btn-clean-room-label');

    if (hudName) {
      hudName.textContent = `Seçim: ${room.name} (${room.area} m²)`;
      hudName.style.color = 'var(--neon-cyan)';
    }

    if (btnClean && btnCleanLabel) {
      btnClean.disabled = false;
      btnCleanLabel.textContent = `${room.name} Temizle`;
    }

    roomMeshes.forEach((mesh) => {
      if (mesh.userData.id === room.id) {
        mesh.material.opacity = 0.85;
        mesh.material.emissive = new THREE.Color(room.color);
        mesh.material.emissiveIntensity = 0.4;
      } else {
        mesh.material.opacity = 0.35;
        mesh.material.emissive = new THREE.Color(0x000000);
        mesh.material.emissiveIntensity = 0;
      }
    });

    document.querySelectorAll('.room-chip').forEach((chip) => {
      const chipId = parseInt(chip.getAttribute('data-room-id'), 10);
      if (chipId === room.id) {
        chip.classList.add('selected');
      } else {
        chip.classList.remove('selected');
      }
    });
  }

  function renderRoomChips() {
    const container = document.getElementById('room-chips-container');
    if (!container) return;

    container.innerHTML = '';
    roomsData.forEach((room) => {
      const chip = document.createElement('div');
      chip.className = 'room-chip';
      chip.setAttribute('data-room-id', room.id);

      const colorHex = '#' + room.color.toString(16).padStart(6, '0');
      chip.innerHTML = `
        <span class="room-chip-color" style="color: ${colorHex}; background: ${colorHex};"></span>
        <span class="room-chip-name">${room.name}</span>
        <span class="room-chip-area">${room.area} m²</span>
      `;

      chip.addEventListener('click', () => {
        selectRoom(room);
      });

      container.appendChild(chip);
    });
  }

  async function triggerRoomClean(room) {
    if (!room) return;
    const btnClean = document.getElementById('btn-clean-selected-room');
    if (btnClean) {
      btnClean.disabled = true;
      btnClean.innerHTML = `<span class="spinner-ring" style="width:14px;height:14px;margin-right:6px;"></span> Gönderiliyor...`;
    }

    if (robotMesh) {
      robotMesh.userData.targetPos = new THREE.Vector3(room.x, 0.05, room.z);
      robotMesh.userData.isMoving = true;
    }

    try {
      const res = await fetch('/api/action/room-clean', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ room_id: room.id }),
      });
      const data = await res.json();
      showToast('success', 'Oda Temizliği Başlatıldı', `${room.name} (${room.area} m²) temizliği başlatıldı!`);
    } catch (err) {
      showToast('error', 'Komut İletilemedi', `${room.name} temizlik komutu: ${err.message}`);
    } finally {
      if (btnClean) {
        btnClean.disabled = false;
        btnClean.innerHTML = `
          <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
            <polygon points="5 3 19 12 5 21 5 3"/>
          </svg>
          <span id="btn-clean-room-label">${room.name} Temizle</span>
        `;
      }
    }
  }

  // =========================================================================
  // 10. BAŞLATMA (INITIALIZATION)
  // =========================================================================

  async function init() {
    console.info('[Roborock Web Hub] Starting UI engine...');

    bindEvents();
    updateBatteryGauge(95);
    updateRobotStatus(8, 'Şarj Oluyor', 0, '');

    setTimeout(init3DMap, 250);

    const wsManager = new WebSocketManager();

    wsManager.on('connection', ({ connected }) => {
      updateConnectionStatus(connected);
      if (connected) {
        DOM.lastSyncTime.textContent = formatCurrentTime();
      }
    });

    wsManager.on('telemetry', (data) => {
      applyTelemetry(data);
    });

    wsManager.on('error', (err) => {
      console.warn('[Roborock Web Hub] Telemetry socket warning:', err);
    });

    wsManager.connect();

    try {
      const res = await fetch('/api/status', { cache: 'no-store' });
      if (res.ok) {
        const initialData = await res.json();
        applyTelemetry(initialData);
        updateConnectionStatus(true);
      }
    } catch (e) {
      console.log('[Roborock Web Hub] Initial REST fetch completed.');
    }
  }

  // DOM Yüklendiğinde Başlat
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

// SIG // Begin signature block
// SIG // MIIFgwYJKoZIhvcNAQcCoIIFdDCCBXACAQExCzAJBgUr
// SIG // DgMCGgUAMGcGCisGAQQBgjcCAQSgWTBXMDIGCisGAQQB
// SIG // gjcCAR4wJAIBAQQQEODJBs441BGiowAQS9NQkAIBAAIB
// SIG // AAIBAAIBAAIBADAhMAkGBSsOAwIaBQAEFDtJPsU62pYI
// SIG // Qfprz1XLa7J2jE5woIIDGDCCAxQwggH8oAMCAQICECO+
// SIG // hXVV+mywSC4lkmKyRmIwDQYJKoZIhvcNAQELBQAwIjEg
// SIG // MB4GA1UEAwwXQW50aWdyYXZpdHktQUdZLVNjcmlwdHMw
// SIG // HhcNMjYxMTA4MDk0NDE1WhcNMzYxMTA4MDk1NDE1WjAi
// SIG // MSAwHgYDVQQDDBdBbnRpZ3Jhdml0eS1BR1ktU2NyaXB0
// SIG // czCCASIwDQYJKoZIhvcNAQEBBQADggEPADCCAQoCggEB
// SIG // ALVYf1oFZ+beC823GUw/yiFUsl2ZhDf63Sw7QSsQIRVi
// SIG // MW2Rw6LTiIx6yMI38a9WZZ8ahXBYzaO/TGi0CVFnzt2k
// SIG // 7uwbB/03/pr1EBGrKERJFcHcJ6er1x38W8jMZDlxNMtt
// SIG // oNKv/S8xRVwbVC5fgvf63B/tMj6nfXunysARotCNe8MY
// SIG // d8lrdZfhxyhfDrAYD4has6tKJTFfqZtxWGfN/TBnQFGB
// SIG // zozhZBsbQJHZJZEwIrQX4iFSNU4zGnG57FbqIPap83OE
// SIG // uoXU9FR2diXWr7D1njVNxD6M3RwJIB5QMtlBKimKAqwL
// SIG // b0ii5jT7+uNgRv8H4xb+YKU+96pCNE54dqECAwEAAaNG
// SIG // MEQwDgYDVR0PAQH/BAQDAgeAMBMGA1UdJQQMMAoGCCsG
// SIG // AQUFBwMDMB0GA1UdDgQWBBTSFBrNRdyMOGEM9VQ5lS2m
// SIG // CvSzZjANBgkqhkiG9w0BAQsFAAOCAQEAJF3bNWKL9NJV
// SIG // a/dn1dHylI79o1oUOawP/4M7vVU8iJZLIpfWC8Mb335d
// SIG // Jr6zpAMwKsAbN5nvoFeQtGFjkMzKPoUlWF0mVbeKLATi
// SIG // lk7//BV9JeXheD3V6xu0q5HuS0CA/u2yJw+TT8nuErZJ
// SIG // 2JLO4O8OghdIv2Xj6FUS0C47ebQRTUgt4Xtgr+no3QPV
// SIG // Sp4NXGxoj0KbDX1gxvrmQ3NuyWJ+nw1IR6pimzZvKXIV
// SIG // wgmBwo0udXB/na//NhpO07XX2J1T9GNOfUuc2rtuFocB
// SIG // Gog4j1dz+k4e2naHoGJ54/OFzAK20C38phicGH0EKnmf
// SIG // ZoEKnlGBoPSwBnYzbJPjuzGCAdcwggHTAgEBMDYwIjEg
// SIG // MB4GA1UEAwwXQW50aWdyYXZpdHktQUdZLVNjcmlwdHMC
// SIG // ECO+hXVV+mywSC4lkmKyRmIwCQYFKw4DAhoFAKB4MBgG
// SIG // CisGAQQBgjcCAQwxCjAIoAKAAKECgAAwGQYJKoZIhvcN
// SIG // AQkDMQwGCisGAQQBgjcCAQQwHAYKKwYBBAGCNwIBCzEO
// SIG // MAwGCisGAQQBgjcCARUwIwYJKoZIhvcNAQkEMRYEFOYC
// SIG // c9Xm4Rj1bcH9c9wxw0nq2XIrMA0GCSqGSIb3DQEBAQUA
// SIG // BIIBAGCWO+N3WoDFomzdwpb3k654JS3uZXtYfVAmvMrt
// SIG // 9OsETXS2hqq8SKOrTqmLs3s8O+tm73UJ3i6UVzCR1TUw
// SIG // C5n967u9hbscOgx9uZ3I5sznEXp/kacUwAuvCVekWRhZ
// SIG // Ff/xfjcKjE1Euy15jEu7wAd/1if/TZYuKfJhtQA0Ql49
// SIG // JBDhWzeT5R5ekeydUpQQRxH7TnzM2Z7KcnFr7A2war42
// SIG // ZfjwEfxoiGqMT9XzLnGpsfkndCBm6BHv8sYeGNDRQYhK
// SIG // VW0tVe1wYIbJ/SwhC5PPilshClub1VAoYKilj1w7Gz1M
// SIG // 8RJQ8fV0dUED5XuUNuW0AaeOHzXJX+llIvYSMPA=
// SIG // End signature block
