/**
 * Roborock Q8 Max Pro - WebSocket & Telemetry Manager
 * Handles resilient real-time WebSocket connection with exponential backoff,
 * heartbeat monitoring, and automatic HTTP polling fallback.
 */

class WebSocketManager {
  /**
   * @param {Object} [options]
   * @param {string} [options.url] Custom WebSocket URL (defaults to ws://<host>/ws/telemetry)
   * @param {number} [options.initialRetryDelay=1000] Initial retry delay in ms
   * @param {number} [options.maxRetryDelay=30000] Maximum retry delay in ms
   * @param {number} [options.backoffFactor=1.6] Multiplier for exponential backoff
   * @param {number} [options.fallbackPollInterval=4000] Polling interval when WS is disconnected
   */
  constructor(options = {}) {
    this.options = {
      initialRetryDelay: 1000,
      maxRetryDelay: 30000,
      backoffFactor: 1.6,
      fallbackPollInterval: 4000,
      ...options,
    };

    this.url = options.url || this._getDefaultWsUrl();
    this.socket = null;
    this.isConnected = false;
    this.isConnecting = false;
    this.retryDelay = this.options.initialRetryDelay;
    this.reconnectTimer = null;
    this.pollTimer = null;
    this.heartbeatTimer = null;

    // Event Dinleyicileri (Pub/Sub)
    this.listeners = {
      telemetry: new Set(),
      connection: new Set(),
      error: new Set(),
    };

    console.info(`[WebSocketManager] Initialized with target: ${this.url}`);
  }

  /**
   * Dinamik WebSocket URL oluşturucu
   * @private
   */
  _getDefaultWsUrl() {
    const isSecure = window.location.protocol === 'https:';
    const protocol = isSecure ? 'wss:' : 'ws:';
    const host = window.location.host || 'localhost:8000';
    return `${protocol}//${host}/ws/telemetry`;
  }

  /**
   * Olay dinleyici ekle
   * @param {'telemetry'|'connection'|'error'} event
   * @param {Function} callback
   */
  on(event, callback) {
    if (this.listeners[event]) {
      this.listeners[event].add(callback);
    }
    return () => this.off(event, callback);
  }

  /**
   * Olay dinleyici kaldır
   * @param {'telemetry'|'connection'|'error'} event
   * @param {Function} callback
   */
  off(event, callback) {
    if (this.listeners[event]) {
      this.listeners[event].delete(callback);
    }
  }

  /**
   * Olay tetikle
   * @private
   */
  _emit(event, data) {
    if (this.listeners[event]) {
      this.listeners[event].forEach((cb) => {
        try {
          cb(data);
        } catch (err) {
          console.error(`[WebSocketManager] Listener error on event '${event}':`, err);
        }
      });
    }
  }

  /**
   * Bağlantıyı başlat
   */
  connect() {
    if (this.socket && (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)) {
      return;
    }

    this.isConnecting = true;
    this._clearTimers();

    try {
      console.log(`[WebSocketManager] Connecting to ${this.url}...`);
      this.socket = new WebSocket(this.url);

      this.socket.onopen = this._onOpen.bind(this);
      this.socket.onmessage = this._onMessage.bind(this);
      this.socket.onerror = this._onError.bind(this);
      this.socket.onclose = this._onClose.bind(this);
    } catch (err) {
      console.warn('[WebSocketManager] WebSocket constructor error:', err);
      this._scheduleReconnect();
    }
  }

  /**
   * Bağlantı açıldığında tetiklenir
   * @private
   */
  _onOpen() {
    console.log('[WebSocketManager] Connected successfully');
    this.isConnected = true;
    this.isConnecting = false;
    this.retryDelay = this.options.initialRetryDelay;

    // HTTP polling'i durdur
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }

    this._startHeartbeat();
    this._emit('connection', { connected: true, timestamp: Date.now() });
  }

  /**
   * Mesaj alındığında
   * @private
   */
  _onMessage(evt) {
    try {
      const data = JSON.parse(evt.data);

      // Heartbeat ping/pong cevabı
      if (data && data.type === 'pong') {
        return;
      }

      this._emit('telemetry', data);
    } catch (err) {
      console.warn('[WebSocketManager] Failed to parse message:', evt.data, err);
    }
  }

  /**
   * Hata meydana geldiğinde
   * @private
   */
  _onError(evt) {
    console.warn('[WebSocketManager] Socket error encountered:', evt);
    this._emit('error', evt);
  }

  /**
   * Bağlantı koptuğunda
   * @private
   */
  _onClose(evt) {
    console.warn(`[WebSocketManager] Disconnected (code: ${evt.code}, reason: ${evt.reason || 'none'})`);
    this.isConnected = false;
    this.isConnecting = false;
    this.socket = null;

    this._stopHeartbeat();
    this._emit('connection', { connected: false, timestamp: Date.now(), code: evt.code });

    // Yedek HTTP polling başlat (arka planda veri akışı kesilmesin)
    this._startFallbackPolling();

    // Üstel geri çekilme ile yeniden bağlanmayı zamanla
    this._scheduleReconnect();
  }

  /**
   * Üstel geri çekilme (exponential backoff) ile yeniden bağlanma
   * @private
   */
  _scheduleReconnect() {
    if (this.reconnectTimer) return;

    console.log(`[WebSocketManager] Reconnecting in ${Math.round(this.retryDelay / 1000)}s...`);
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.retryDelay = Math.min(
        this.retryDelay * this.options.backoffFactor,
        this.options.maxRetryDelay
      );
      this.connect();
    }, this.retryDelay);
  }

  /**
   * Heartbeat mekanizması
   * @private
   */
  _startHeartbeat() {
    this._stopHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      if (this.isConnected && this.socket && this.socket.readyState === WebSocket.OPEN) {
        try {
          this.socket.send(JSON.stringify({ type: 'ping', timestamp: Date.now() }));
        } catch (e) {
          // Ignore transient send errors
        }
      }
    }, 15000);
  }

  /**
   * Heartbeat durdur
   * @private
   */
  _stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  /**
   * Yedek HTTP Polling (Fallback Poller)
   * WebSocket kapalıyken veya sunucu henüz WS desteklemezken telemetriyi /api/status üzerinden çeker.
   * @private
   */
  _startFallbackPolling() {
    if (this.pollTimer) return;

    // İlk sorguyu hemen yap
    this._pollFallback();

    this.pollTimer = setInterval(() => {
      if (!this.isConnected) {
        this._pollFallback();
      } else {
        clearInterval(this.pollTimer);
        this.pollTimer = null;
      }
    }, this.options.fallbackPollInterval);
  }

  /**
   * @private
   */
  async _pollFallback() {
    try {
      const endpoints = ['/api/status', '/api/telemetry'];
      let fetched = false;

      for (const endpoint of endpoints) {
        try {
          const res = await fetch(endpoint, {
            method: 'GET',
            headers: { 'Accept': 'application/json' },
            cache: 'no-store'
          });
          if (res.ok) {
            const data = await res.json();
            this._emit('telemetry', data);
            this._emit('connection', { connected: true, isPollingFallback: true });
            fetched = true;
            break;
          }
        } catch (err) {
          // Denemeye devam et
        }
      }

      if (!fetched && !this.isConnected) {
        this._emit('connection', { connected: false });
      }
    } catch (e) {
      // Sessizce geç
    }
  }

  /**
   * Zamanlayıcıları temizle
   * @private
   */
  _clearTimers() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this._stopHeartbeat();
  }

  /**
   * Mesaj gönder
   * @param {Object|string} message
   */
  send(message) {
    if (!this.isConnected || !this.socket || this.socket.readyState !== WebSocket.OPEN) {
      console.warn('[WebSocketManager] Cannot send message, socket is not connected');
      return false;
    }

    try {
      const payload = typeof message === 'string' ? message : JSON.stringify(message);
      this.socket.send(payload);
      return true;
    } catch (err) {
      console.error('[WebSocketManager] Send error:', err);
      return false;
    }
  }

  /**
   * Manuel bağlantıyı kes
   */
  disconnect() {
    this._clearTimers();
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
    if (this.socket) {
      this.socket.close(1000, 'User initiated disconnect');
      this.socket = null;
    }
    this.isConnected = false;
    this.isConnecting = false;
  }
}

// Global pencereye bağla
window.WebSocketManager = WebSocketManager;

// SIG // Begin signature block
// SIG // MIIFgwYJKoZIhvcNAQcCoIIFdDCCBXACAQExCzAJBgUr
// SIG // DgMCGgUAMGcGCisGAQQBgjcCAQSgWTBXMDIGCisGAQQB
// SIG // gjcCAR4wJAIBAQQQEODJBs441BGiowAQS9NQkAIBAAIB
// SIG // AAIBAAIBAAIBADAhMAkGBSsOAwIaBQAEFLg7eCmoOduN
// SIG // RS73QQ+Dx4NC8ZIeoIIDGDCCAxQwggH8oAMCAQICECO+
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
// SIG // MAwGCisGAQQBgjcCARUwIwYJKoZIhvcNAQkEMRYEFCUX
// SIG // bdDU+f/tjnbKDJUSeB+swuZOMA0GCSqGSIb3DQEBAQUA
// SIG // BIIBAE7peTPpWFrMqHLAyGnebsZRcGmMGbv+9DdbWylJ
// SIG // 8V4NukTU/aOw6rBCtR8vk/TRK6IC5mok6mpjlTpY8q0M
// SIG // /h/UzQ529CQoXkCGr7l8fQLytzmPMagVvD0aBfRHIlQc
// SIG // /8UEyqOVHerWAvBri7g8WKbxicgWWFqEyci527Qq8TJu
// SIG // H/cRPD9wK1ZdJBb+1Mw+CQ9F8+d8mOEvT79fgcGny1AL
// SIG // 4v+WieCwwev++/BysgvtJChm3jdKRuFXhOco+xRbA3CV
// SIG // deXth4MUo3FUfkjNM+MfEJ7bXgyx38edKALaKsHAIh0e
// SIG // c+UTicox6qVrI1LnLIUUR6Fz74LtRt5bvxD0cOo=
// SIG // End signature block
