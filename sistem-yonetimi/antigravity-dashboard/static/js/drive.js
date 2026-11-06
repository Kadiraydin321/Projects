/**
 * Google Drive module for AntiGravity Dashboard
 * Manages UI updates for storage quota, cloud file listings, folder backup utility, and OAuth triggers.
 */

const DriveApp = {
    isAuthenticated: false,
    
    init: function() {
        this.checkAuthStatus();
        this.setupEventListeners();
    },

    setupEventListeners: function() {
        const self = this;

        // Connect Drive button
        document.getElementById('connect-drive-btn').addEventListener('click', () => {
            self.startAuthFlow();
        });

        // Refresh file list button
        document.getElementById('refresh-files-btn').addEventListener('click', () => {
            self.loadFiles();
        });

        // File upload input change
        document.getElementById('file-upload-input').addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                self.uploadFile(e.target.files[0]);
            }
        });

        // Start local backup button
        document.getElementById('start-backup-btn').addEventListener('click', () => {
            const folderPath = document.getElementById('backup-folder-input').value.trim();
            if (folderPath) {
                self.backupFolder(folderPath);
            } else {
                alert("Lütfen yedeklemek istediğiniz klasörün tam yolunu girin.");
            }
        });
    },

    checkAuthStatus: async function() {
        try {
            const response = await fetch('/api/drive/status');
            const data = await response.json();
            
            const unauthView = document.getElementById('drive-unauth-view');
            const authView = document.getElementById('drive-auth-view');
            const driveQuickWidget = document.getElementById('drive-quick-widget');

            if (data.authenticated) {
                this.isAuthenticated = true;
                
                // Show authenticated view
                unauthView.classList.add('hidden');
                authView.classList.remove('hidden');
                
                // Update User Info
                document.getElementById('drive-user-name').textContent = data.user || 'Kullanıcı';
                document.getElementById('drive-user-email').textContent = data.email || '';
                
                // Update Quota / Storage representation
                const limitBytes = data.quota.limit;
                const usedBytes = data.quota.usage;
                
                const limitGB = (limitBytes / (1024 * 1024 * 1024)).toFixed(1);
                const usedGB = (usedBytes / (1024 * 1024 * 1024)).toFixed(2);
                
                const usedPct = limitBytes > 0 ? ((usedBytes / limitBytes) * 100).toFixed(2) : 0;
                
                document.getElementById('drive-total-space').textContent = limitGB + " GB";
                document.getElementById('drive-used-space').textContent = usedGB + " GB";
                document.getElementById('drive-quota-fill').style.width = usedPct + "%";
                document.getElementById('quota-pct').textContent = `5 TB alanınızın %${usedPct}'si (${usedGB} GB) kullanılıyor.`;
                
                // Update Home Quick Card
                driveQuickWidget.innerHTML = `
                    <div style="display:flex; flex-direction:column; gap:10px; text-align:left; width: 100%;">
                        <div style="display:flex; justify-content:space-between; font-size:12px;">
                            <span>${usedGB} GB kullanıldı</span>
                            <span>${limitGB} GB</span>
                        </div>
                        <div class="quota-progress-bar" style="height:6px;">
                            <div class="quota-fill" style="width: ${usedPct}%"></div>
                        </div>
                        <p style="font-size:11px; color:var(--text-muted);">Bağlı Hesap: ${data.email}</p>
                    </div>
                `;

                // Load files since authenticated
                this.loadFiles();
                
                // Proactively try to sync notes from cloud on startup
                NotesApp.loadFromCloud();
                
            } else {
                this.isAuthenticated = false;
                unauthView.classList.remove('hidden');
                authView.classList.add('hidden');
                
                // Update Home Quick Card
                driveQuickWidget.innerHTML = `
                    <div class="drive-connection-state">
                        <i class="fa-solid fa-link-slash"></i>
                        <p>Drive Bağlı Değil</p>
                        <button class="glass-btn small-btn" onclick="navigateToTab('drive')">Hesabı Bağla</button>
                    </div>
                `;
                
                // Show Guide modal if credentials.json is missing
                if (data.setup_needed) {
                    document.getElementById('drive-setup-modal').classList.remove('hidden');
                }
            }
            return data;
        } catch(e) {
            console.error("Failed to check auth status:", e);
            return { authenticated: false };
        }
    },

    startAuthFlow: async function() {
        try {
            const response = await fetch('/api/drive/auth-url');
            const data = await response.json();
            
            if (response.status === 200) {
                alert("Tarayıcınızda Google hesap onay sayfası açıldı. Lütfen yetkilendirmeyi tamamlayın ve ardından bu sayfayı yenileyin.");
                
                // Poll auth status every 3 seconds to auto-detect login completion
                const pollInterval = setInterval(async () => {
                    const status = await this.checkAuthStatus();
                    if (status.authenticated) {
                        clearInterval(pollInterval);
                        alert("Google Drive başarıyla bağlandı!");
                    }
                }, 3000);
                
                // Auto-stop polling after 2 minutes
                setTimeout(() => clearInterval(pollInterval), 120000);
            } else {
                // Check if credentials setup guide is needed
                if (data.setup_needed) {
                    document.getElementById('drive-setup-modal').classList.remove('hidden');
                } else {
                    alert("OAuth hatası: " + data.message);
                }
            }
        } catch (e) {
            alert("Google Drive bağlantısı başlatılamadı. Backend ayarlarını kontrol edin.");
        }
    },

    loadFiles: async function() {
        if (!this.isAuthenticated) return;

        const filesList = document.getElementById('drive-files-list');
        filesList.innerHTML = `
            <div class="loading-state">
                <div class="spinner"></div>
                <p>Dosyalar listeleniyor...</p>
            </div>
        `;

        try {
            const response = await fetch('/api/drive/files');
            const data = await response.json();

            if (data.status === 'success') {
                filesList.innerHTML = '';
                const files = data.files;

                if (files.length === 0) {
                    filesList.innerHTML = `
                        <div class="list-empty">
                            <i class="fa-solid fa-folder-open"></i>
                            <p>Drive ana dizininde dosya bulunamadı.</p>
                        </div>
                    `;
                    return;
                }

                files.forEach(file => {
                    const isFolder = file.mimeType === 'application/vnd.google-apps.folder';
                    const iconClass = isFolder ? 'fa-solid fa-folder' : 'fa-solid fa-file';
                    const sizeText = file.size ? (file.size / (1024 * 1024)).toFixed(2) + " MB" : "-";
                    
                    const fileItem = document.createElement('div');
                    fileItem.className = 'file-list-item';
                    fileItem.innerHTML = `
                        <span class="col-name"><i class="${iconClass}"></i> ${file.name}</span>
                        <span class="col-type">${isFolder ? 'Klasör' : 'Dosya'}</span>
                        <span class="col-size">${sizeText}</span>
                        <span class="col-actions">
                            ${!isFolder ? `<button class="file-action-btn" onclick="window.open('https://drive.google.com/open?id=${file.id}', '_blank')" title="Aç"><i class="fa-solid fa-up-right-from-square"></i></button>` : ''}
                        </span>
                    `;
                    filesList.appendChild(fileItem);
                });
            } else {
                filesList.innerHTML = `
                    <div class="list-empty">
                        <i class="fa-solid fa-triangle-exclamation" style="color:var(--danger)"></i>
                        <p>Dosya listesi yüklenemedi: ${data.message}</p>
                    </div>
                `;
            }
        } catch (err) {
            filesList.innerHTML = `
                <div class="list-empty">
                    <i class="fa-solid fa-triangle-exclamation" style="color:var(--danger)"></i>
                    <p>Bağlantı hatası.</p>
                </div>
            `;
        }
    },

    uploadFile: async function(file) {
        if (!this.isAuthenticated) return;

        const filesList = document.getElementById('drive-files-list');
        const uploadBtn = document.querySelector('label[for="file-upload-input"]');
        const originalText = uploadBtn.innerHTML;

        try {
            uploadBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Yükleniyor...`;
            uploadBtn.style.pointerEvents = 'none';

            const formData = new FormData();
            formData.append('file', file);

            const response = await fetch('/api/drive/upload', {
                method: 'POST',
                body: formData
            });

            const data = await response.json();
            if (data.status === 'success') {
                alert(`"${file.name}" başarıyla Google Drive'a yüklendi.`);
                this.loadFiles();
                this.checkAuthStatus();
            } else {
                alert("Dosya yükleme hatası: " + data.message);
            }
        } catch (err) {
            alert("Yükleme sırasında bir hata oluştu.");
        } finally {
            uploadBtn.innerHTML = originalText;
            uploadBtn.style.pointerEvents = 'auto';
            document.getElementById('file-upload-input').value = '';
        }
    },

    backupFolder: async function(folderPath) {
        if (!this.isAuthenticated) return;

        const backupStatus = document.getElementById('backup-status');
        const backupBtn = document.getElementById('start-backup-btn');

        backupStatus.classList.remove('hidden');
        backupBtn.disabled = true;

        try {
            const response = await fetch('/api/drive/backup-folder', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ folder_path: folderPath })
            });

            const data = await response.json();
            if (data.status === 'success') {
                alert(`"${folderPath}" klasörü sıkıştırıldı ve Google Drive'a başarıyla yedeklendi.`);
                this.loadFiles();
                this.checkAuthStatus();
            } else {
                alert("Yedekleme hatası: " + data.message);
            }
        } catch (err) {
            alert("Yedekleme işlemi başarısız oldu.");
        } finally {
            backupStatus.classList.add('hidden');
            backupBtn.disabled = false;
        }
    }
};
