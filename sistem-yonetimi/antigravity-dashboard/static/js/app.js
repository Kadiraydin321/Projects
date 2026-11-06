/**
 * AntiGravity Dashboard Main Orchestrator
 * Coordinates metrics polling, routing, power timers, free games UI, wallpaper customization, and theme toggles.
 */

// Navigation helper
function navigateToTab(tabId) {
    // Update sidebar active state
    document.querySelectorAll('.nav-item').forEach(item => {
        if (item.getAttribute('data-tab') === tabId) {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }
    });

    // Update content section active state
    document.querySelectorAll('.tab-content').forEach(content => {
        if (content.id === 'tab-' + tabId) {
            content.classList.add('active');
        } else {
            content.classList.remove('active');
        }
    });

    // Specific tab activations
    if (tabId === 'games') {
        DashboardApp.loadGames();
    } else if (tabId === 'drive') {
        DriveApp.loadFiles();
    }
}

const DashboardApp = {
    statsInterval: null,
    timerStatusInterval: null,
    localSecondsRemaining: 0,
    localCountdownTimer: null,
    gamesCache: { giveaways: [], freetoplay: [] },
    f2pPage: 1,
    f2pLimit: 20,
    activeGameTab: 'giveaways',
    
    // Wallpapers Preset array
    presets: {
        preset1: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1600&auto=format&fit=crop&q=80',
        preset2: 'https://images.unsplash.com/photo-1634017839464-5c339ebe3cb4?w=1600&auto=format&fit=crop&q=80',
        preset3: 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=1600&auto=format&fit=crop&q=80'
    },
    
    slideshowTimer: null,
    currentSlideshowIndex: 0,
    
    init: function() {
        this.setupClock();
        this.setupNavigation();
        this.setupTheme();
        this.setupWallpaper();
        this.setupSystemMetrics();
        this.setupPCControls();
        this.setupGamesEvents();
        this.setupModals();
        this.setupLayoutAndFullscreen();
        
        // Initial data loads
        NotesApp.init();
        DriveApp.init();
        
        // Start metric polling
        this.statsInterval = setInterval(() => this.pollSystemStats(), 3000);
        this.pollSystemStats();
        
        // Start shutdown scheduler status checking
        this.timerStatusInterval = setInterval(() => this.checkShutdownStatus(), 2000);
        this.checkShutdownStatus();
    },

    // --- CLOCK AND DATE ---
    setupClock: function() {
        const timeEl = document.getElementById('widget-time');
        const dateEl = document.getElementById('widget-date');
        const greetingEl = document.getElementById('greeting');

        const updateClock = () => {
            const now = new Date();
            
            // Format time: HH:MM:SS
            timeEl.textContent = now.toLocaleTimeString('tr-TR', { hour12: false });
            
            // Format date: Date Month Year Day
            const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
            dateEl.textContent = now.toLocaleDateString('tr-TR', options);

            // Greet according to hours
            const hours = now.getHours();
            if (hours >= 5 && hours < 12) {
                greetingEl.textContent = "Günaydın! ☀️";
            } else if (hours >= 12 && hours < 17) {
                greetingEl.textContent = "İyi Günler! 🌤️";
            } else if (hours >= 17 && hours < 22) {
                greetingEl.textContent = "İyi Akşamlar! 🌙";
            } else {
                greetingEl.textContent = "İyi Geceler! 🌌";
            }
        };

        setInterval(updateClock, 1000);
        updateClock();
    },

    // --- TAB NAVIGATION ---
    setupNavigation: function() {
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const tabId = item.getAttribute('data-tab');
                navigateToTab(tabId);
                window.location.hash = tabId;
            });
        });

        // Handle URL hash on load
        const hash = window.location.hash.substring(1);
        if (hash) {
            navigateToTab(hash);
        }
    },

    // --- WALLPAPER & SLIDESHOW SYSTEM ---
    setupWallpaper: function() {
        const bgLayer = document.getElementById('wallpaper-background');
        
        // Load settings from LocalStorage
        let currentBg = localStorage.getItem('antigravity_bg') || 'preset1';
        let customBgUrl = localStorage.getItem('antigravity_custom_bg_url') || '';
        let slideshowEnabled = localStorage.getItem('antigravity_slideshow') === 'true';
        let slideshowInterval = parseInt(localStorage.getItem('antigravity_slideshow_interval') || '30');

        const applyWallpaper = (bg) => {
            let url = '';
            if (bg.startsWith('http')) {
                url = bg;
            } else if (this.presets[bg]) {
                url = this.presets[bg];
            } else {
                url = this.presets.preset1;
            }
            bgLayer.style.backgroundImage = `url('${url}')`;
            
            // Highlight thumbnail in settings
            document.querySelectorAll('.wallpaper-thumb').forEach(thumb => {
                if (thumb.getAttribute('data-bg') === bg) {
                    thumb.classList.add('active');
                } else {
                    thumb.classList.remove('active');
                }
            });
        };

        // Custom Wallpaper URL handling
        document.getElementById('apply-custom-bg').addEventListener('click', () => {
            const url = document.getElementById('custom-bg-url').value.trim();
            if (url) {
                localStorage.setItem('antigravity_bg', url);
                localStorage.setItem('antigravity_custom_bg_url', url);
                applyWallpaper(url);
                document.getElementById('custom-bg-form').classList.add('hidden');
            }
        });

        document.getElementById('custom-bg-trigger').addEventListener('click', () => {
            document.getElementById('custom-bg-form').classList.toggle('hidden');
            if (customBgUrl) {
                document.getElementById('custom-bg-url').value = customBgUrl;
            }
        });

        // Set up preset thumbnail clicks
        document.querySelectorAll('.wallpaper-thumb').forEach(thumb => {
            const bg = thumb.getAttribute('data-bg');
            if (bg && bg !== 'custom') {
                thumb.addEventListener('click', () => {
                    localStorage.setItem('antigravity_bg', bg);
                    applyWallpaper(bg);
                });
            }
        });

        // Slideshow Toggle
        const ssToggle = document.getElementById('slideshow-toggle');
        const ssIntervalGroup = document.getElementById('slideshow-interval-group');
        const ssIntervalSelect = document.getElementById('slideshow-interval');

        ssToggle.checked = slideshowEnabled;
        ssIntervalSelect.value = slideshowInterval;

        if (slideshowEnabled) {
            ssIntervalGroup.classList.remove('hidden');
        }

        const startSlideshow = (intervalSec) => {
            if (this.slideshowTimer) clearInterval(this.slideshowTimer);
            const presetKeys = Object.keys(this.presets);
            
            this.slideshowTimer = setInterval(() => {
                this.currentSlideshowIndex = (this.currentSlideshowIndex + 1) % presetKeys.length;
                const nextBg = presetKeys[this.currentSlideshowIndex];
                applyWallpaper(nextBg);
            }, intervalSec * 1000);
        };

        const stopSlideshow = () => {
            if (this.slideshowTimer) {
                clearInterval(this.slideshowTimer);
                this.slideshowTimer = null;
            }
        };

        ssToggle.addEventListener('change', (e) => {
            const active = e.target.checked;
            localStorage.setItem('antigravity_slideshow', active);
            
            if (active) {
                ssIntervalGroup.classList.remove('hidden');
                startSlideshow(parseInt(ssIntervalSelect.value));
            } else {
                ssIntervalGroup.classList.add('hidden');
                stopSlideshow();
                // Re-apply static wallpaper
                applyWallpaper(localStorage.getItem('antigravity_bg') || 'preset1');
            }
        });

        ssIntervalSelect.addEventListener('change', (e) => {
            const val = parseInt(e.target.value);
            localStorage.setItem('antigravity_slideshow_interval', val);
            if (ssToggle.checked) {
                startSlideshow(val);
            }
        });

        // Initial apply
        applyWallpaper(currentBg);
        if (slideshowEnabled) {
            startSlideshow(slideshowInterval);
        }
    },

    // --- DARK & LIGHT THEME ---
    setupTheme: function() {
        const themeToggle = document.getElementById('theme-toggle');
        let currentTheme = localStorage.getItem('antigravity_theme') || 'dark';

        const applyTheme = (theme) => {
            if (theme === 'light') {
                document.body.classList.add('light-theme');
                document.body.classList.remove('dark-theme');
                themeToggle.innerHTML = `<i class="fa-solid fa-sun"></i>`;
            } else {
                document.body.classList.remove('light-theme');
                document.body.classList.add('dark-theme');
                themeToggle.innerHTML = `<i class="fa-solid fa-moon"></i>`;
            }
        };

        themeToggle.addEventListener('click', () => {
            let targetTheme = document.body.classList.contains('light-theme') ? 'dark' : 'light';
            localStorage.setItem('antigravity_theme', targetTheme);
            applyTheme(targetTheme);
        });

        applyTheme(currentTheme);
    },

    // --- PAGE WIDTH LAYOUT & FULLSCREEN ---
    setupLayoutAndFullscreen: function() {
        const dashboard = document.querySelector('.dashboard-container');
        const layoutBtn = document.getElementById('layout-toggle');
        const fullscreenBtn = document.getElementById('fullscreen-toggle');

        // Restore maximized layout from storage
        const isMaximized = localStorage.getItem('antigravity_layout_maximized') === 'true';
        if (isMaximized) {
            dashboard.classList.add('maximized');
            layoutBtn.innerHTML = `<i class="fa-solid fa-compress"></i>`;
        }

        // Layout Toggle Click
        layoutBtn.addEventListener('click', () => {
            const nowMaximized = dashboard.classList.toggle('maximized');
            localStorage.setItem('antigravity_layout_maximized', nowMaximized);
            if (nowMaximized) {
                layoutBtn.innerHTML = `<i class="fa-solid fa-compress"></i>`;
            } else {
                layoutBtn.innerHTML = `<i class="fa-solid fa-expand"></i>`;
            }
        });

        // Fullscreen Toggle Click
        fullscreenBtn.addEventListener('click', () => {
            if (!document.fullscreenElement) {
                document.documentElement.requestFullscreen().then(() => {
                    fullscreenBtn.innerHTML = `<i class="fa-solid fa-minimize"></i>`;
                }).catch(err => {
                    console.error("Fullscreen error:", err);
                });
            } else {
                document.exitFullscreen().then(() => {
                    fullscreenBtn.innerHTML = `<i class="fa-solid fa-maximize"></i>`;
                });
            }
        });

        // Listen for OS fullscreen change
        document.addEventListener('fullscreenchange', () => {
            if (document.fullscreenElement) {
                fullscreenBtn.innerHTML = `<i class="fa-solid fa-minimize"></i>`;
            } else {
                fullscreenBtn.innerHTML = `<i class="fa-solid fa-maximize"></i>`;
            }
        });
    },

    // --- PROGRESS RINGS & SYSTEM STATS ---
    setupSystemMetrics: function() {
        // Initialize rings circumference
        const radius = 50;
        const circumference = 2 * Math.PI * radius; // 314.16

        document.querySelectorAll('.progress-ring__circle').forEach(circle => {
            circle.style.strokeDasharray = `${circumference} ${circumference}`;
            circle.style.strokeDashoffset = circumference;
        });
    },

    setRingPercentage: function(ringId, percent) {
        const circle = document.getElementById(ringId);
        if (!circle) return;

        const radius = 50;
        const circumference = 2 * Math.PI * radius;
        const offset = circumference - (percent / 100) * circumference;
        circle.style.strokeDashoffset = offset;
    },

    pollSystemStats: async function() {
        try {
            const response = await fetch('/api/system/stats');
            const data = await response.json();
            
            if (data.status === 'success') {
                // Update CPU ring & text
                const cpuVal = Math.round(data.cpu);
                this.setRingPercentage('cpu-ring', cpuVal);
                document.getElementById('cpu-val').textContent = cpuVal + "%";

                // Update RAM ring & text
                const ramPercent = Math.round(data.ram.percent);
                this.setRingPercentage('ram-ring', ramPercent);
                document.getElementById('ram-val').textContent = ramPercent + "%";
                
                const ramUsed = (data.ram.used / (1024 * 1024 * 1024)).toFixed(1);
                const ramTotal = (data.ram.total / (1024 * 1024 * 1024)).toFixed(1);
                document.getElementById('ram-text').textContent = `Kullanılan: ${ramUsed} GB / ${ramTotal} GB`;

                // Update Disk ring & text
                const diskPercent = Math.round(data.disk.percent);
                this.setRingPercentage('disk-ring', diskPercent);
                document.getElementById('disk-val').textContent = diskPercent + "%";
                
                const diskFree = ((data.disk.total - data.disk.used) / (1024 * 1024 * 1024)).toFixed(0);
                const diskTotal = (data.disk.total / (1024 * 1024 * 1024)).toFixed(0);
                document.getElementById('disk-text').textContent = `Boş: ${diskFree} GB / ${diskTotal} GB`;

                // Update Uptime
                const totalSeconds = data.uptime;
                const hours = Math.floor(totalSeconds / 3600);
                const minutes = Math.floor((totalSeconds % 3600) / 60);
                document.getElementById('uptime-val').textContent = `${hours}s ${minutes}dk`;
            }
        } catch (err) {
            console.error("Error polling system stats:", err);
        }
    },

    // --- PC CONTROLLER ACTIONS ---
    setupPCControls: function() {
        const self = this;
        
        // 1. Cleaner Events
        const scanBtn = document.getElementById('scan-temp-btn');
        const cleanBtn = document.getElementById('clean-temp-btn');
        const resultBox = document.getElementById('clean-result');
        const logBox = document.getElementById('clean-log');

        const scanTemp = async () => {
            scanBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Taranıyor...`;
            scanBtn.disabled = true;
            
            try {
                const response = await fetch('/api/system/temp/scan');
                const data = await response.json();
                
                if (data.status === 'success') {
                    const sizeMB = (data.size_bytes / (1024 * 1024)).toFixed(1);
                    document.getElementById('scan-count').textContent = data.file_count;
                    document.getElementById('scan-size').textContent = sizeMB + " MB";
                    
                    resultBox.classList.remove('hidden');
                    cleanBtn.disabled = data.file_count === 0;
                    
                    logBox.classList.remove('hidden');
                    logBox.textContent = `[SİSTEM] Tarama tamamlandı. Bulunan gereksiz dosya: ${data.file_count} (${sizeMB} MB).`;
                }
            } catch(e) {
                alert("Geçici dosyalar taranamadı.");
            } finally {
                scanBtn.innerHTML = `<i class="fa-solid fa-magnifying-glass"></i> Tara`;
                scanBtn.disabled = false;
            }
        };

        const cleanTemp = async () => {
            cleanBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Temizleniyor...`;
            cleanBtn.disabled = true;
            
            try {
                const response = await fetch('/api/system/temp/clean', { method: 'POST' });
                const data = await response.json();
                
                if (data.status === 'success') {
                    const clearedMB = (data.cleaned_size_bytes / (1024 * 1024)).toFixed(1);
                    
                    logBox.innerHTML += `\n[SİSTEM] Temizlik tamamlandı! Serbest bırakılan alan: ${clearedMB} MB.`;
                    logBox.innerHTML += `\n[SİSTEM] Silinen öğe: ${data.cleaned_count}, atlanan kilitli dosya: ${data.errors_count}.`;
                    logBox.scrollTop = logBox.scrollHeight;
                    
                    // Reset stats
                    document.getElementById('scan-count').textContent = '0';
                    document.getElementById('scan-size').textContent = '0 MB';
                    cleanBtn.disabled = true;
                    
                    // Poll stats immediately to show updated disk free space
                    self.pollSystemStats();
                }
            } catch(e) {
                alert("Temizleme sırasında bir hata oluştu.");
            } finally {
                cleanBtn.innerHTML = `<i class="fa-solid fa-trash"></i> Temizle`;
            }
        };

        scanBtn.addEventListener('click', scanTemp);
        cleanBtn.addEventListener('click', cleanTemp);
        
        // Quick Action clean trigger from dashboard
        document.getElementById('quick-scan-btn').addEventListener('click', () => {
            navigateToTab('pc-control');
            scanTemp();
        });

        // 2. Power Time Scheduler Events
        const timerSlider = document.getElementById('timer-slider');
        const timerDisplay = document.getElementById('timer-display-val');
        const startTimerBtn = document.getElementById('start-timer-btn');
        const cancelTimerBtn = document.getElementById('cancel-timer-btn');
        const quickShutdownBtn = document.getElementById('quick-shutdown-btn');
        
        const sliderContainer = document.getElementById('slider-container');
        const customTimerContainer = document.getElementById('custom-timer-container');
        const customHoursInput = document.getElementById('custom-hours');
        const customMinutesInput = document.getElementById('custom-minutes');

        let selectedAction = 'shutdown';
        let selectedMinutes = 60; // Default: 1 hour

        // Update range value label
        timerSlider.addEventListener('input', (e) => {
            timerDisplay.textContent = e.target.value + " dk";
            selectedMinutes = parseInt(e.target.value);
            
            // Sync with preset buttons: remove active unless matches slider value
            document.querySelectorAll('.timer-presets .preset-time-btn').forEach(btn => {
                const mins = btn.getAttribute('data-minutes');
                if (mins === String(selectedMinutes)) {
                    btn.classList.add('active');
                } else {
                    btn.classList.remove('active');
                }
            });
        });

        // Selector buttons (Shutdown, Restart, Sleep)
        document.querySelectorAll('.action-selector .selector-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.action-selector .selector-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                selectedAction = btn.getAttribute('data-action');
            });
        });

        // Timer Presets click handler
        document.querySelectorAll('.timer-presets .preset-time-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.timer-presets .preset-time-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                
                const val = btn.getAttribute('data-minutes');
                if (val === 'custom') {
                    sliderContainer.classList.add('hidden');
                    customTimerContainer.classList.remove('hidden');
                } else {
                    sliderContainer.classList.remove('hidden');
                    customTimerContainer.classList.add('hidden');
                    
                    const minutes = parseInt(val);
                    timerSlider.value = minutes;
                    timerDisplay.textContent = minutes + " dk";
                    selectedMinutes = minutes;
                }
            });
        });

        // Start timer
        startTimerBtn.addEventListener('click', async () => {
            let delaySeconds = 0;
            const activePreset = document.querySelector('.timer-presets .preset-time-btn.active');
            
            if (activePreset && activePreset.getAttribute('data-minutes') === 'custom') {
                const hours = parseInt(customHoursInput.value) || 0;
                const minutes = parseInt(customMinutesInput.value) || 0;
                delaySeconds = (hours * 3600) + (minutes * 60);
            } else {
                delaySeconds = selectedMinutes * 60;
            }

            if (delaySeconds <= 0) {
                alert("Lütfen geçerli bir süre girin.");
                return;
            }
            
            await this.schedulePowerAction(selectedAction, delaySeconds);
        });

        // Cancel timer
        cancelTimerBtn.addEventListener('click', async () => {
            await this.cancelPowerAction();
        });

        // Dashboard quick shutdown (1 hour)
        quickShutdownBtn.addEventListener('click', async () => {
            if (confirm("Bilgisayarınız 1 saat sonra kapatılacaktır. Onaylıyor musunuz?")) {
                await this.schedulePowerAction('shutdown', 3600);
            }
        });
    },

    schedulePowerAction: async function(action, seconds) {
        try {
            const response = await fetch('/api/system/shutdown', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: action, delay: seconds })
            });

            const data = await response.json();
            if (data.status === 'success') {
                this.checkShutdownStatus();
                navigateToTab('pc-control');
            } else {
                alert("Zamanlayıcı başlatılamadı: " + data.message);
            }
        } catch (e) {
            alert("Sunucu bağlantı hatası.");
        }
    },

    cancelPowerAction: async function() {
        try {
            const response = await fetch('/api/system/shutdown/cancel', { method: 'POST' });
            const data = await response.json();
            if (data.status === 'success') {
                this.checkShutdownStatus();
                alert("Zamanlayıcı iptal edildi.");
            }
        } catch(e) {
            alert("İptal işlemi başarısız oldu.");
        }
    },

    checkShutdownStatus: async function() {
        try {
            const response = await fetch('/api/system/shutdown/status');
            const data = await response.json();
            
            const activeBox = document.getElementById('active-timer-box');
            const controlBox = document.querySelector('.scheduler-controls');
            const quickBtn = document.getElementById('quick-shutdown-btn');

            if (data.active) {
                activeBox.classList.remove('hidden');
                controlBox.classList.add('hidden');
                
                // Set remaining seconds
                this.localSecondsRemaining = data.remaining;
                
                // Format and update immediate display
                this.updateCountdownUI(data.action);
                
                // Start a smooth client-side interval if not already running
                if (!this.localCountdownTimer) {
                    this.localCountdownTimer = setInterval(() => {
                        if (this.localSecondsRemaining > 0) {
                            this.localSecondsRemaining--;
                            this.updateCountdownUI(data.action);
                        } else {
                            clearInterval(this.localCountdownTimer);
                            this.localCountdownTimer = null;
                            this.checkShutdownStatus(); // refresh UI
                        }
                    }, 1000);
                }

                // Quick dashboard button update
                const hrs = Math.floor(data.remaining / 3600);
                const mins = Math.floor((data.remaining % 3600) / 60);
                const formatNum = (n) => String(n).padStart(2, '0');
                quickBtn.classList.add('active');
                quickBtn.querySelector('span').textContent = `İptal Et (${formatNum(hrs)}:${formatNum(mins)})`;
                
                // Override quick button behavior to trigger cancel directly when active
                quickBtn.onclick = async (e) => {
                    e.stopPropagation();
                    if (confirm("Aktif kapatma zamanlayıcısını iptal etmek istiyor musunuz?")) {
                        await this.cancelPowerAction();
                        quickBtn.onclick = null; // restore original handler
                        window.location.reload();
                    }
                };

            } else {
                activeBox.classList.add('hidden');
                controlBox.classList.remove('hidden');
                
                // Stop local timer if running
                if (this.localCountdownTimer) {
                    clearInterval(this.localCountdownTimer);
                    this.localCountdownTimer = null;
                }
                
                // Restore dashboard quick button
                quickBtn.classList.remove('active');
                quickBtn.querySelector('span').textContent = "1 Saat Sonra Kapat";
                quickBtn.onclick = null;
            }
        } catch(e) {
            // Silently ignore status polling failures
        }
    },

    updateCountdownUI: function(action) {
        const remaining = this.localSecondsRemaining;
        const hrs = Math.floor(remaining / 3600);
        const mins = Math.floor((remaining % 3600) / 60);
        const secs = remaining % 60;
        
        const formatNum = (n) => String(n).padStart(2, '0');
        const text = `${formatNum(hrs)}:${formatNum(mins)}:${formatNum(secs)}`;
        document.getElementById('countdown-text').textContent = text;
        
        let actionTurkish = "Kapatma";
        if (action === 'restart') actionTurkish = "Yeniden Başlatma";
        if (action === 'sleep') actionTurkish = "Uyku Modu";
        
        const countdownAction = document.getElementById('countdown-action');
        countdownAction.textContent = `${actionTurkish} Aktif`;
        
        const activeBox = document.getElementById('active-timer-box');
        // If less than 60 seconds are remaining, make it visual warning (red flashing background)
        if (remaining <= 60 && remaining > 0) {
            activeBox.style.background = 'rgba(248, 113, 113, 0.2)';
            activeBox.style.borderColor = 'rgba(248, 113, 113, 0.6)';
            activeBox.style.boxShadow = '0 0 20px rgba(248, 113, 113, 0.4)';
            countdownAction.textContent = `${actionTurkish} Yaklaşıyor!`;
            countdownAction.style.color = '#f87171';
            countdownAction.style.fontWeight = '700';
        } else {
            activeBox.style.background = '';
            activeBox.style.borderColor = '';
            activeBox.style.boxShadow = '';
            countdownAction.style.color = '';
            countdownAction.style.fontWeight = '';
        }
    },

    // --- GAMES AGGREGATOR ---
    loadGames: async function() {
        const refreshBtn = document.getElementById('refresh-games-btn');
        const giveawaysContainer = document.getElementById('games-giveaways-container');
        const f2pContainer = document.getElementById('games-f2p-container');

        giveawaysContainer.innerHTML = `
            <div class="loading-state">
                <div class="spinner"></div>
                <p>Kampanyalar yükleniyor...</p>
            </div>
        `;
        f2pContainer.innerHTML = `
            <div class="loading-state">
                <div class="spinner"></div>
                <p>Kalıcı ücretsiz oyunlar yükleniyor...</p>
            </div>
        `;

        refreshBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Yükleniyor...`;
        refreshBtn.disabled = true;

        try {
            const response = await fetch('/api/games/free');
            const data = await response.json();

            if (data.status === 'success') {
                this.gamesCache.giveaways = data.giveaways || [];
                this.gamesCache.freetoplay = data.freetoplay || [];
                this.f2pPage = 1;
                this.renderGames();
            } else {
                giveawaysContainer.innerHTML = `<p class="list-empty">Veriler yüklenemedi: ${data.message}</p>`;
                f2pContainer.innerHTML = giveawaysContainer.innerHTML;
            }
        } catch (e) {
            console.error(e);
            giveawaysContainer.innerHTML = `<p class="list-empty">Veriler alınırken hata oluştu.</p>`;
            f2pContainer.innerHTML = giveawaysContainer.innerHTML;
        } finally {
            refreshBtn.innerHTML = `<i class="fa-solid fa-rotate"></i> Yenile`;
            refreshBtn.disabled = false;
        }
    },

    setupGamesEvents: function() {
        const self = this;
        
        // Search query filter
        document.getElementById('search-games-input').addEventListener('input', () => {
            self.f2pPage = 1;
            self.renderGames();
        });

        // Platform filter
        document.getElementById('filter-game-platform').addEventListener('change', () => {
            self.f2pPage = 1;
            self.renderGames();
        });

        // Giveaway Type filter
        document.getElementById('filter-game-type').addEventListener('change', () => {
            self.f2pPage = 1;
            self.renderGames();
        });

        // Genre filter
        document.getElementById('filter-game-genre').addEventListener('change', () => {
            self.f2pPage = 1;
            self.renderGames();
        });

        // Sort filter
        document.getElementById('sort-games-select').addEventListener('change', () => {
            self.f2pPage = 1;
            self.renderGames();
        });

        // Load more F2P games button
        document.getElementById('load-more-f2p-btn').addEventListener('click', () => {
            self.f2pPage++;
            self.renderGames();
        });
    },

    renderGames: function() {
        const tab = this.activeGameTab;
        const searchQuery = document.getElementById('search-games-input').value.toLowerCase().trim();
        const platform = document.getElementById('filter-game-platform').value;

        // Truncate text helper function (max length 500)
        const truncateText = (text, maxLength = 500) => {
            if (!text) return '';
            return text.length > maxLength ? text.substring(0, maxLength - 3) + '...' : text;
        };

        if (tab === 'giveaways') {
            const container = document.getElementById('games-giveaways-container');
            container.innerHTML = '';
            
            // Filter giveaways
            let list = [...this.gamesCache.giveaways];
            
            if (searchQuery) {
                list = list.filter(g => 
                    (g.title && g.title.toLowerCase().includes(searchQuery)) ||
                    (g.description && g.description.toLowerCase().includes(searchQuery))
                );
            }
            
            if (platform !== 'all') {
                list = list.filter(g => {
                    const platStr = (g.platforms || '').toLowerCase();
                    if (platform === 'pc') {
                        return platStr.includes('pc') || platStr.includes('windows') || platStr.includes('steam') || platStr.includes('epic') || platStr.includes('gog') || platStr.includes('origin') || platStr.includes('ubisoft');
                    } else if (platform === 'steam') {
                        return platStr.includes('steam');
                    } else if (platform === 'epic') {
                        return platStr.includes('epic');
                    } else if (platform === 'gog') {
                        return platStr.includes('gog');
                    } else if (platform === 'console') {
                        return platStr.includes('ps4') || platStr.includes('ps5') || platStr.includes('xbox') || platStr.includes('switch') || platStr.includes('playstation') || platStr.includes('nintendo');
                    } else if (platform === 'mobile') {
                        return platStr.includes('android') || platStr.includes('ios');
                    } else if (platform === 'browser') {
                        return platStr.includes('web') || platStr.includes('browser');
                    }
                    return true;
                });
            }

            // Giveaway type filter (game, dlc, loot, beta)
            const giveawayType = document.getElementById('filter-game-type').value;
            if (giveawayType !== 'all') {
                list = list.filter(g => (g.type || '').toLowerCase() === giveawayType);
            }

            // Sort giveaways
            const sortBy = document.getElementById('sort-games-select').value;
            if (sortBy === 'alpha') {
                list.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
            } else if (sortBy === 'alpha-desc') {
                list.sort((a, b) => (b.title || '').localeCompare(a.title || ''));
            } else if (sortBy === 'popularity') {
                list.sort((a, b) => (parseInt(b.users) || 0) - (parseInt(a.users) || 0));
            }

            if (list.length === 0) {
                container.innerHTML = `<p class="list-empty" style="grid-column: 1/-1;">Kriterlere uygun aktif kampanya bulunamadı.</p>`;
                return;
            }

            list.forEach(game => {
                const card = document.createElement('div');
                card.className = 'game-card';
                const truncatedDesc = truncateText(game.description || '', 500);
                card.innerHTML = `
                    <div class="game-thumb" style="background-image: url('${game.image}')"></div>
                    <div class="game-card-body">
                        <h4>${game.title}</h4>
                        <p>${truncatedDesc}</p>
                        <div class="game-card-footer">
                            <span class="game-tag">${game.platforms}</span>
                            <button class="glass-btn small-btn primary-btn" onclick="window.open('${game.open_giveaway_url}', '_blank')">Al</button>
                        </div>
                    </div>
                `;
                container.appendChild(card);
            });

        } else {
            const container = document.getElementById('games-f2p-container');
            const loadMoreBtnContainer = document.getElementById('f2p-load-more-container');
            container.innerHTML = '';
            
            const genre = document.getElementById('filter-game-genre').value;
            
            // Filter F2P
            let list = [...this.gamesCache.freetoplay];
            
            if (searchQuery) {
                list = list.filter(g => 
                    (g.title && g.title.toLowerCase().includes(searchQuery)) ||
                    (g.short_description && g.short_description.toLowerCase().includes(searchQuery))
                );
            }
            
            if (platform !== 'all') {
                list = list.filter(g => {
                    const platStr = (g.platform || '').toLowerCase();
                    if (platform === 'pc') {
                        return platStr.includes('pc') || platStr.includes('windows');
                    } else if (platform === 'steam') {
                        return platStr.includes('pc') || platStr.includes('windows');
                    } else if (platform === 'epic') {
                        return platStr.includes('pc') || platStr.includes('windows');
                    } else if (platform === 'gog') {
                        return platStr.includes('pc') || platStr.includes('windows');
                    } else if (platform === 'console') {
                        return platStr.includes('playstation') || platStr.includes('xbox') || platStr.includes('nintendo');
                    } else if (platform === 'mobile') {
                        return platStr.includes('android') || platStr.includes('ios');
                    } else if (platform === 'browser') {
                        return platStr.includes('web') || platStr.includes('browser');
                    }
                    return true;
                });
            }
            
            if (genre !== 'all') {
                list = list.filter(g => (g.genre || '').toLowerCase().includes(genre));
            }

            // Sort F2P
            const sortBy = document.getElementById('sort-games-select').value;
            if (sortBy === 'alpha') {
                list.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
            } else if (sortBy === 'alpha-desc') {
                list.sort((a, b) => (b.title || '').localeCompare(a.title || ''));
            }

            if (list.length === 0) {
                container.innerHTML = `<p class="list-empty" style="grid-column: 1/-1;">Kriterlere uygun oyun bulunamadı.</p>`;
                loadMoreBtnContainer.style.display = 'none';
                return;
            }

            // Paginated render
            const totalMatching = list.length;
            const limit = this.f2pPage * this.f2pLimit;
            const paginatedList = list.slice(0, limit);

            paginatedList.forEach(game => {
                const card = document.createElement('div');
                card.className = 'game-card';
                const truncatedDesc = truncateText(game.short_description || '', 500);
                card.innerHTML = `
                    <div class="game-thumb" style="background-image: url('${game.thumbnail}')"></div>
                    <div class="game-card-body">
                        <h4>${game.title}</h4>
                        <p>${truncatedDesc}</p>
                        <div class="game-card-footer">
                            <span class="game-tag">${game.platform} | ${game.genre}</span>
                            <button class="glass-btn small-btn primary-btn" onclick="window.open('${game.game_url}', '_blank')">Oyna</button>
                        </div>
                    </div>
                `;
                container.appendChild(card);
            });

            // Toggle load more visibility
            if (totalMatching > limit) {
                loadMoreBtnContainer.style.display = 'flex';
            } else {
                loadMoreBtnContainer.style.display = 'none';
            }
        }
    },

    // --- MODALS (SETTINGS / DIALOGS) ---
    setupModals: function() {
        // Settings Modal trigger
        const settingsModal = document.getElementById('settings-modal');
        const settingsBtn = document.getElementById('settings-btn');
        const closeSettingsBtn = document.getElementById('close-settings-btn');

        settingsBtn.addEventListener('click', () => {
            settingsModal.classList.remove('hidden');
        });

        closeSettingsBtn.addEventListener('click', () => {
            settingsModal.classList.add('hidden');
        });

        // Close guide modal
        document.getElementById('close-setup-btn').addEventListener('click', () => {
            document.getElementById('drive-setup-modal').classList.add('hidden');
        });

        // Close when clicking modal backdrop
        window.addEventListener('click', (e) => {
            if (e.target === settingsModal) {
                settingsModal.classList.add('hidden');
            }
            if (e.target === document.getElementById('password-modal')) {
                document.getElementById('password-modal').classList.add('hidden');
            }
            if (e.target === document.getElementById('drive-setup-modal')) {
                document.getElementById('drive-setup-modal').classList.add('hidden');
            }
        });

        // Games view tab switcher
        document.querySelectorAll('.game-tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.game-tab-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                
                const type = btn.getAttribute('data-game-type');
                DashboardApp.activeGameTab = type;
                DashboardApp.f2pPage = 1;
                
                const genreFilterBox = document.getElementById('genre-filter-box');
                const typeFilterBox = document.getElementById('giveaway-type-filter-box');
                const giveawaysContainer = document.getElementById('games-giveaways-container');
                const f2pTabContent = document.getElementById('games-f2p-tab-content');
                
                if (type === 'giveaways') {
                    genreFilterBox.style.display = 'none';
                    typeFilterBox.style.display = 'block';
                    giveawaysContainer.style.display = 'grid';
                    f2pTabContent.style.display = 'none';
                } else {
                    genreFilterBox.style.display = 'block';
                    typeFilterBox.style.display = 'none';
                    giveawaysContainer.style.display = 'none';
                    f2pTabContent.style.display = 'flex';
                }
                
                // Reset search query and selections on tab switch
                document.getElementById('search-games-input').value = '';
                document.getElementById('filter-game-platform').value = 'all';
                document.getElementById('filter-game-genre').value = 'all';
                document.getElementById('filter-game-type').value = 'all';
                document.getElementById('sort-games-select').value = 'default';
                
                DashboardApp.renderGames();
            });
        });

        // Refresh Games button
        document.getElementById('refresh-games-btn').addEventListener('click', () => {
            this.loadGames();
        });
    }
};

// Initialize app when DOM is fully loaded
window.addEventListener('DOMContentLoaded', () => {
    DashboardApp.init();
});
