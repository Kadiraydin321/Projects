/**
 * Notes module for AntiGravity Dashboard
 * Handles folder management, sticky note CRUD operations, note-level encryption, drag-and-drop, and sync prep.
 */

const NotesApp = {
    notes: [],
    folders: [],
    activeFolderId: 'all',
    
    // Modal states
    editingFolderId: null,
    selectedFolderIcon: 'fa-folder',
    selectedFolderColor: 'accent-blue',

    // Key names for local storage
    STORAGE_NOTES: 'antigravity_notes',
    STORAGE_FOLDERS: 'antigravity_folders',
    
    init: function() {
        this.loadLocalData();
        this.setupEventListeners();
        this.setupFolderModalEvents();
        this.renderFolders();
        this.renderNotes();
    },

    loadLocalData: function() {
        // Load notes
        const localNotes = localStorage.getItem(this.STORAGE_NOTES);
        if (localNotes) {
            try {
                this.notes = JSON.parse(localNotes);
                // Ensure all notes have createdAt and isPinned properties
                this.notes.forEach(n => {
                    if (!n.createdAt) n.createdAt = Date.now();
                    if (n.isPinned === undefined) n.isPinned = false;
                });
            } catch(e) {
                this.notes = [];
            }
        } else {
            // Seed data if empty
            this.notes = [
                {
                    id: 'note-seed-1',
                    title: 'Fikir Defteri 💡',
                    content: 'AntiGravity kontrol panelinde her şeyi yönetebilirim. Sticky notları kilitlemek için kilit butonuna tıkla!',
                    color: 'note-yellow',
                    folderId: 'folder-personal',
                    isLocked: false,
                    isMinimized: false,
                    isHidden: false,
                    isPinned: true,
                    createdAt: Date.now() - 60000
                },
                {
                    id: 'note-seed-2',
                    title: 'Sunucu Şifreleri 🔒',
                    content: 'Bu not kilitlidir. Gizli şifrelerinizi ve verilerinizi bu şekilde yerel olarak şifreleyerek saklayabilirsiniz.',
                    color: 'note-pink',
                    folderId: 'folder-work',
                    isLocked: false,
                    isMinimized: false,
                    isHidden: false,
                    isPinned: false,
                    createdAt: Date.now()
                }
            ];
            this.saveLocalData();
        }

        // Load folders
        const localFolders = localStorage.getItem(this.STORAGE_FOLDERS);
        if (localFolders) {
            try {
                this.folders = JSON.parse(localFolders);
            } catch(e) {
                this.folders = [];
            }
        } else {
            this.folders = [
                { id: 'folder-work', name: 'İş', icon: 'fa-briefcase', color: 'accent-purple' },
                { id: 'folder-personal', name: 'Kişisel', icon: 'fa-user', color: 'accent-pink' }
            ];
            this.saveLocalData();
        }
    },

    saveLocalData: function() {
        localStorage.setItem(this.STORAGE_NOTES, JSON.stringify(this.notes));
        localStorage.setItem(this.STORAGE_FOLDERS, JSON.stringify(this.folders));
    },

    setupEventListeners: function() {
        const self = this;
        
        // Add note button
        document.getElementById('add-note-btn').addEventListener('click', () => {
            self.createNote();
        });

        // Add folder button (Opens Modal now instead of Prompt)
        document.getElementById('add-folder-btn').addEventListener('click', () => {
            self.openFolderModal(null);
        });

        // Sync notes to Google Drive
        document.getElementById('sync-notes-btn').addEventListener('click', async () => {
            await self.syncToCloud();
        });

        // Real-time search filter input
        document.getElementById('search-notes-input').addEventListener('input', () => {
            self.renderNotes();
        });

        // Color filter change
        document.getElementById('filter-notes-color').addEventListener('change', () => {
            self.renderNotes();
        });

        // Security filter change
        document.getElementById('filter-notes-security').addEventListener('change', () => {
            self.renderNotes();
        });

        // Date filter change
        document.getElementById('filter-notes-date').addEventListener('change', () => {
            self.renderNotes();
        });

        // Sort filter dropdown change
        document.getElementById('sort-notes-select').addEventListener('change', () => {
            self.renderNotes();
        });
    },

    // --- FOLDER MODAL CONTROLS ---
    setupFolderModalEvents: function() {
        const self = this;
        const modal = document.getElementById('folder-modal');
        const closeBtn = document.getElementById('close-folder-modal-btn');
        const cancelBtn = document.getElementById('cancel-folder-btn');
        const saveBtn = document.getElementById('save-folder-btn');
        const nameInput = document.getElementById('folder-name-input');

        // Close functions
        const closeModal = () => {
            modal.classList.add('hidden');
            self.editingFolderId = null;
        };
        closeBtn.onclick = closeModal;
        cancelBtn.onclick = closeModal;

        // Save folder button
        saveBtn.onclick = () => {
            const name = nameInput.value.trim();
            if (!name) {
                alert("Lütfen geçerli bir klasör adı girin.");
                return;
            }

            if (self.editingFolderId) {
                // Edit existing folder
                const folder = self.folders.find(f => f.id === self.editingFolderId);
                if (folder) {
                    folder.name = name;
                    folder.icon = self.selectedFolderIcon;
                    folder.color = self.selectedFolderColor;
                }
            } else {
                // Create new folder
                const newFolder = {
                    id: 'folder-' + Date.now(),
                    name: name,
                    icon: self.selectedFolderIcon,
                    color: self.selectedFolderColor
                };
                self.folders.push(newFolder);
            }

            self.saveLocalData();
            self.renderFolders();
            self.renderNotes();
            closeModal();
        };

        // Icon grid clicks
        document.querySelectorAll('.folder-icon-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.folder-icon-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                self.selectedFolderIcon = btn.getAttribute('data-icon');
            });
        });

        // Color grid clicks
        document.querySelectorAll('.folder-color-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.folder-color-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                self.selectedFolderColor = btn.getAttribute('data-color');
            });
        });

        // Backdrop click close
        window.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeModal();
            }
        });
    },

    openFolderModal: function(folderId = null) {
        const modal = document.getElementById('folder-modal');
        const title = document.getElementById('folder-modal-title');
        const nameInput = document.getElementById('folder-name-input');

        modal.classList.remove('hidden');
        nameInput.value = '';
        nameInput.focus();

        if (folderId) {
            // Edit mode
            this.editingFolderId = folderId;
            const folder = this.folders.find(f => f.id === folderId);
            if (folder) {
                title.textContent = "Klasör Düzenle";
                nameInput.value = folder.name;
                this.selectedFolderIcon = folder.icon || 'fa-folder';
                this.selectedFolderColor = folder.color || 'accent-blue';
            }
        } else {
            // Create mode
            this.editingFolderId = null;
            title.textContent = "Klasör Oluştur";
            this.selectedFolderIcon = 'fa-folder';
            this.selectedFolderColor = 'accent-blue';
        }

        // Highlight active icon
        document.querySelectorAll('.folder-icon-btn').forEach(b => {
            if (b.getAttribute('data-icon') === this.selectedFolderIcon) {
                b.classList.add('active');
            } else {
                b.classList.remove('active');
            }
        });

        // Highlight active color
        document.querySelectorAll('.folder-color-btn').forEach(b => {
            if (b.getAttribute('data-color') === this.selectedFolderColor) {
                b.classList.add('active');
            } else {
                b.classList.remove('active');
            }
        });
    },

    renderFolders: function() {
        const foldersList = document.getElementById('folders-list');
        foldersList.innerHTML = '';

        const setupDropZone = (element, folderId) => {
            element.addEventListener('dragover', (e) => {
                e.preventDefault();
                element.classList.add('drag-hover');
            });
            element.addEventListener('dragleave', () => {
                element.classList.remove('drag-hover');
            });
            element.addEventListener('drop', (e) => {
                e.preventDefault();
                element.classList.remove('drag-hover');
                const noteId = e.dataTransfer.getData('text/plain');
                const note = this.notes.find(n => n.id === noteId);
                if (note && note.folderId !== folderId) {
                    note.folderId = folderId;
                    this.saveLocalData();
                    this.renderFolders();
                    this.renderNotes();
                }
            });
        };

        // 1. Add "All" folder (Non-trash)
        const allItem = document.createElement('div');
        allItem.className = `folder-item ${this.activeFolderId === 'all' ? 'active' : ''}`;
        const totalNonTrashNotes = this.notes.filter(n => n.folderId !== 'trash').length;
        allItem.innerHTML = `
            <span><i class="fa-solid fa-folder-open"></i> Hepsi</span>
            <span class="count">${totalNonTrashNotes}</span>
        `;
        allItem.addEventListener('click', () => {
            this.activeFolderId = 'all';
            this.renderFolders();
            this.renderNotes();
        });
        setupDropZone(allItem, 'folder-work'); // Fallback folder on drop
        foldersList.appendChild(allItem);

        // 2. Render user folders
        this.folders.forEach(folder => {
            const folderNotesCount = this.notes.filter(n => n.folderId === folder.id).length;
            const folderItem = document.createElement('div');
            // Apply folder color accent styling
            folderItem.className = `folder-item ${folder.color || 'accent-blue'} ${this.activeFolderId === folder.id ? 'active' : ''}`;
            folderItem.innerHTML = `
                <span><i class="fa-solid ${folder.icon || 'fa-folder'}"></i> ${folder.name}</span>
                <div style="display: flex; align-items: center; gap: 8px;">
                    <span class="count">${folderNotesCount}</span>
                    <i class="fa-solid fa-pen edit-folder-btn" title="Düzenle"></i>
                    <i class="fa-solid fa-trash-can delete-folder-btn" title="Sil"></i>
                </div>
            `;

            // Edit folder action
            folderItem.querySelector('.edit-folder-btn').addEventListener('click', (e) => {
                e.stopPropagation();
                this.openFolderModal(folder.id);
            });
            
            // Delete folder action
            folderItem.querySelector('.delete-folder-btn').addEventListener('click', (e) => {
                e.stopPropagation();
                if (confirm(`"${folder.name}" klasörünü silmek istiyor musunuz? İçindeki notlar silinmeyip "İş" kategorisine taşınacaktır.`)) {
                    this.deleteFolder(folder.id);
                }
            });

            folderItem.addEventListener('click', () => {
                this.activeFolderId = folder.id;
                this.renderFolders();
                this.renderNotes();
            });

            setupDropZone(folderItem, folder.id);
            foldersList.appendChild(folderItem);
        });

        // 3. Add default Trash folder
        const trashItem = document.createElement('div');
        trashItem.className = `folder-item accent-yellow ${this.activeFolderId === 'trash' ? 'active' : ''}`;
        const trashNotesCount = this.notes.filter(n => n.folderId === 'trash').length;
        trashItem.innerHTML = `
            <span><i class="fa-solid fa-trash-arrow-up"></i> Çöp Kutusu</span>
            <span class="count" style="background-color: rgba(248, 113, 113, 0.15); color: var(--danger);">${trashNotesCount}</span>
        `;
        trashItem.addEventListener('click', () => {
            this.activeFolderId = 'trash';
            this.renderFolders();
            this.renderNotes();
        });
        setupDropZone(trashItem, 'trash');
        foldersList.appendChild(trashItem);
    },

    renderNotes: function() {
        const notesGrid = document.getElementById('notes-grid');
        notesGrid.innerHTML = '';

        // 1. Filter notes by folder
        let filteredNotes = [];
        if (this.activeFolderId === 'all') {
            filteredNotes = this.notes.filter(n => n.folderId !== 'trash');
        } else if (this.activeFolderId === 'trash') {
            filteredNotes = this.notes.filter(n => n.folderId === 'trash');
        } else {
            filteredNotes = this.notes.filter(n => n.folderId === this.activeFolderId);
        }

        // 2. Filter notes by Search Query
        const searchQuery = document.getElementById('search-notes-input').value.toLowerCase().trim();
        if (searchQuery) {
            filteredNotes = filteredNotes.filter(note => {
                const titleMatch = note.title && note.title.toLowerCase().includes(searchQuery);
                const contentMatch = note.content && note.content.toLowerCase().includes(searchQuery);
                return titleMatch || contentMatch;
            });
        }

        // 2a. Filter notes by Color Accent
        const colorFilter = document.getElementById('filter-notes-color').value;
        if (colorFilter !== 'all') {
            filteredNotes = filteredNotes.filter(note => note.color === colorFilter);
        }

        // 2b. Filter notes by Lock (Security) status
        const securityFilter = document.getElementById('filter-notes-security').value;
        if (securityFilter !== 'all') {
            filteredNotes = filteredNotes.filter(note => {
                if (securityFilter === 'locked') {
                    return note.isLocked === true;
                } else if (securityFilter === 'unlocked') {
                    return note.isLocked === false;
                }
                return true;
            });
        }

        // 2c. Filter notes by Date
        const dateFilter = document.getElementById('filter-notes-date').value;
        if (dateFilter !== 'all') {
            const now = Date.now();
            const oneDayMs = 24 * 60 * 60 * 1000;
            filteredNotes = filteredNotes.filter(note => {
                const noteTime = note.createdAt || Date.now();
                if (dateFilter === 'today') {
                    return (now - noteTime) <= oneDayMs;
                } else if (dateFilter === 'week') {
                    return (now - noteTime) <= (7 * oneDayMs);
                } else if (dateFilter === 'month') {
                    return (now - noteTime) <= (30 * oneDayMs);
                }
                return true;
            });
        }

        // 3. Sort notes
        const sortBy = document.getElementById('sort-notes-select').value;
        filteredNotes.sort((a, b) => {
            if (sortBy === 'pinned') {
                // Pin logic: pinned notes first, then newest first
                if (a.isPinned && !b.isPinned) return -1;
                if (!a.isPinned && b.isPinned) return 1;
                return b.createdAt - a.createdAt; // newest first
            } else if (sortBy === 'newest') {
                return b.createdAt - a.createdAt;
            } else if (sortBy === 'oldest') {
                return a.createdAt - b.createdAt;
            } else if (sortBy === 'title') {
                const titleA = (a.title || '').toLowerCase();
                const titleB = (b.title || '').toLowerCase();
                return titleA.localeCompare(titleB);
            }
            return 0;
        });

        if (filteredNotes.length === 0) {
            notesGrid.innerHTML = `
                <div class="list-empty" style="grid-column: 1/-1;">
                    <i class="fa-solid fa-sticky-note"></i>
                    <p>Gösterilecek not bulunamadı.</p>
                </div>
            `;
            return;
        }

        filteredNotes.forEach(note => {
            const noteEl = document.createElement('div');
            noteEl.className = `sticky-note ${note.color} ${note.isPinned ? 'pinned' : ''}`;
            noteEl.dataset.id = note.id;
            
            // Enable HTML5 Drag & Drop (unless in Trash)
            if (note.folderId !== 'trash') {
                noteEl.setAttribute('draggable', 'true');
                noteEl.addEventListener('dragstart', (e) => {
                    e.dataTransfer.setData('text/plain', note.id);
                    noteEl.style.opacity = '0.4';
                });
                noteEl.addEventListener('dragend', () => {
                    noteEl.style.opacity = '1';
                });
            }

            if (note.folderId === 'trash') {
                // Render note inside Trash (Restore / Permanent Delete)
                noteEl.innerHTML = `
                    <div class="note-header">
                        <i class="fa-solid fa-trash-can-arrow-up restore-note" title="Geri Yükle"></i>
                        <i class="fa-solid fa-circle-xmark delete-permanent" title="Kalıcı Olarak Sil"></i>
                    </div>
                    <div class="note-body" style="opacity: 0.6;">
                        <input type="text" class="note-title-input" value="${note.title || 'Başlıksız'}" disabled>
                        <textarea class="note-textarea" disabled>${note.content || ''}</textarea>
                    </div>
                `;

                noteEl.querySelector('.restore-note').addEventListener('click', () => {
                    note.folderId = 'folder-work'; // Restore to default folder
                    this.saveLocalData();
                    this.renderFolders();
                    this.renderNotes();
                });

                noteEl.querySelector('.delete-permanent').addEventListener('click', () => {
                    if (confirm('Bu notu kalıcı olarak silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.')) {
                        this.notes = this.notes.filter(n => n.id !== note.id);
                        this.saveLocalData();
                        this.renderFolders();
                        this.renderNotes();
                    }
                });

            } else if (note.isLocked) {
                // Render Locked State
                noteEl.innerHTML = `
                    <div class="note-locked-overlay">
                        <i class="fa-solid fa-lock lock-icon"></i>
                        <span style="font-size: 13px; font-weight:600;">Kilitli Not</span>
                        <button class="glass-btn small-btn lock-btn"><i class="fa-solid fa-lock-open"></i> Kilidi Aç</button>
                    </div>
                    <div class="note-header">
                        <i class="fa-solid fa-trash delete-note"></i>
                    </div>
                `;
                // Add Unlock Event
                noteEl.querySelector('.lock-btn').addEventListener('click', () => {
                    this.promptUnlock(note.id);
                });
                noteEl.querySelector('.delete-note').addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.deleteNote(note.id); // Triggers move to Trash
                });
            } else {
                // Render Unlocked State
                noteEl.innerHTML = `
                    <div class="note-header">
                        <i class="fa-solid fa-thumbtack pin-note ${note.isPinned ? 'active' : ''}" title="Sabitle"></i>
                        <i class="fa-solid fa-palette change-color" title="Renk Değiştir"></i>
                        <i class="fa-solid fa-lock lock-note" title="Notu Şifrele"></i>
                        <i class="fa-solid fa-trash delete-note" title="Sil"></i>
                    </div>
                    <div class="note-body">
                        <input type="text" class="note-title-input" value="${note.title}" placeholder="Başlık...">
                        <textarea class="note-textarea" placeholder="İçerik yazın...">${note.content}</textarea>
                    </div>
                `;

                // Title and Body change event listeners
                const titleInput = noteEl.querySelector('.note-title-input');
                const textarea = noteEl.querySelector('.note-textarea');

                titleInput.addEventListener('input', (e) => {
                    note.title = e.target.value;
                    this.saveLocalData();
                });

                textarea.addEventListener('input', (e) => {
                    note.content = e.target.value;
                    this.saveLocalData();
                });

                // Pin toggle action
                noteEl.querySelector('.pin-note').addEventListener('click', () => {
                    note.isPinned = !note.isPinned;
                    this.saveLocalData();
                    this.renderNotes();
                });

                // Color switch action
                noteEl.querySelector('.change-color').addEventListener('click', () => {
                    const colors = ['note-yellow', 'note-blue', 'note-pink', 'note-green', 'note-purple'];
                    const currentIndex = colors.indexOf(note.color);
                    const nextIndex = (currentIndex + 1) % colors.length;
                    note.color = colors[nextIndex];
                    this.saveLocalData();
                    this.renderNotes();
                });

                // Lock note action
                noteEl.querySelector('.lock-note').addEventListener('click', () => {
                    this.promptLock(note.id);
                });

                // Delete note action
                noteEl.querySelector('.delete-note').addEventListener('click', () => {
                    this.deleteNote(note.id);
                });
            }

            notesGrid.appendChild(noteEl);
        });
    },

    createNote: function() {
        const newNote = {
            id: 'note-' + Date.now(),
            title: '',
            content: '',
            color: 'note-yellow',
            // Default folder is active folder (unless it is 'all' or 'trash', then use first folder or work)
            folderId: (this.activeFolderId === 'all' || this.activeFolderId === 'trash') 
                ? (this.folders[0] ? this.folders[0].id : 'folder-work') 
                : this.activeFolderId,
            isLocked: false,
            isMinimized: false,
            isHidden: false,
            isPinned: false,
            createdAt: Date.now()
        };
        this.notes.unshift(newNote);
        this.saveLocalData();
        this.renderFolders();
        this.renderNotes();
    },

    deleteNote: function(id) {
        const note = this.notes.find(n => n.id === id);
        if (note) {
            // Instead of deleting permanently, move it to trash folder
            note.folderId = 'trash';
            note.isPinned = false; // unpin on delete
            this.saveLocalData();
            this.renderFolders();
            this.renderNotes();
            
            // Temporary confirmation alert (non blocking toast is preferred, doing simple console log / feedback)
            console.log("Not çöp kutusuna taşındı.");
        }
    },

    createFolder: function(name) {
        // Obsolete: replaced by openFolderModal
        this.openFolderModal(null);
    },

    deleteFolder: function(id) {
        // Remove folder
        this.folders = this.folders.filter(f => f.id !== id);
        // Move notes inside this folder to first available user folder or work folder
        const fallbackFolder = this.folders[0] ? this.folders[0].id : 'folder-work';
        this.notes.forEach(n => {
            if (n.folderId === id) {
                n.folderId = fallbackFolder;
            }
        });
        this.activeFolderId = 'all';
        this.saveLocalData();
        this.renderFolders();
        this.renderNotes();
    },

    // --- ENCRYPTION DIALOGS ---
    promptLock: function(noteId) {
        const self = this;
        const passwordModal = document.getElementById('password-modal');
        const confirmBtn = document.getElementById('confirm-pwd-btn');
        const cancelBtn = document.getElementById('cancel-pwd-btn');
        const closeBtn = document.getElementById('close-pwd-btn');
        const input = document.getElementById('note-password-input');
        const title = document.getElementById('pwd-modal-title');
        const desc = document.getElementById('pwd-modal-desc');

        title.textContent = "Notu Şifrele";
        desc.textContent = "Bu notu kilitlemek için bir parola girin. Bu parola sadece bu notu açmak için kullanılacaktır.";
        input.value = '';
        
        passwordModal.classList.remove('hidden');

        // Cleanup previous handlers
        const cleanup = () => {
            passwordModal.classList.add('hidden');
            confirmBtn.onclick = null;
            cancelBtn.onclick = null;
            closeBtn.onclick = null;
        };

        cancelBtn.onclick = cleanup;
        closeBtn.onclick = cleanup;

        confirmBtn.onclick = async () => {
            const password = input.value;
            if (!password || password.length < 4) {
                alert("Parola en az 4 karakter olmalıdır.");
                return;
            }

            const note = self.notes.find(n => n.id === noteId);
            if (note) {
                try {
                    const payload = JSON.stringify({
                        title: note.title,
                        content: note.content
                    });
                    const encrypted = await SecureCrypto.encrypt(payload, password);
                    note.encryptedData = encrypted;
                    note.title = '';
                    note.content = '';
                    note.isLocked = true;
                    self.saveLocalData();
                    self.renderNotes();
                    cleanup();
                } catch (err) {
                    alert("Şifreleme hatası: " + err.message);
                }
            }
        };
    },

    promptUnlock: function(noteId) {
        const self = this;
        const passwordModal = document.getElementById('password-modal');
        const confirmBtn = document.getElementById('confirm-pwd-btn');
        const cancelBtn = document.getElementById('cancel-pwd-btn');
        const closeBtn = document.getElementById('close-pwd-btn');
        const input = document.getElementById('note-password-input');
        const title = document.getElementById('pwd-modal-title');
        const desc = document.getElementById('pwd-modal-desc');

        title.textContent = "Kilidi Aç";
        desc.textContent = "Şifreli notu açmak için oluşturduğunuz parolayı girin.";
        input.value = '';
        
        passwordModal.classList.remove('hidden');

        const cleanup = () => {
            passwordModal.classList.add('hidden');
            confirmBtn.onclick = null;
            cancelBtn.onclick = null;
            closeBtn.onclick = null;
        };

        cancelBtn.onclick = cleanup;
        closeBtn.onclick = cleanup;

        confirmBtn.onclick = async () => {
            const password = input.value;
            const note = self.notes.find(n => n.id === noteId);
            if (note && note.encryptedData) {
                try {
                    const decryptedString = await SecureCrypto.decrypt(note.encryptedData, password);
                    const originalData = JSON.parse(decryptedString);
                    note.title = originalData.title;
                    note.content = originalData.content;
                    note.isLocked = false;
                    note.encryptedData = null;
                    self.saveLocalData();
                    self.renderNotes();
                    cleanup();
                } catch (err) {
                    alert("Şifre çözülemedi: Parola yanlış olabilir.");
                }
            }
        };
    },

    // --- GOOGLE DRIVE BACKUP/RESTORE ---
    syncToCloud: async function() {
        const self = this;
        
        const authStatus = await DriveApp.checkAuthStatus();
        if (!authStatus.authenticated) {
            alert("Önce Google Drive hesabınızı bağlamalısınız.");
            navigateToTab('drive');
            return;
        }

        const syncPassword = prompt("Bulut yedeklemesini şifrelemek için bir parolanız olmalıdır.\nYedek şifresi girin:");
        if (!syncPassword) return;

        try {
            document.getElementById('sync-notes-btn').innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Yedekleniyor...`;
            
            // Build database object
            const db = {
                notes: this.notes,
                folders: this.folders
            };

            // Encrypt database payload
            const encryptedDb = await SecureCrypto.encrypt(JSON.stringify(db), syncPassword);
            
            // Send to backend to upload
            const response = await fetch('/api/drive/sync-notes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ payload: encryptedDb })
            });

            const result = await response.json();
            if (result.status === 'success') {
                alert("Başarılı! Notlarınız Google Drive'a şifreli bir şekilde kaydedildi.");
            } else {
                alert("Yedekleme hatası: " + result.message);
            }
        } catch (err) {
            alert("Hata oluştu: " + err.message);
        } finally {
            document.getElementById('sync-notes-btn').innerHTML = `<i class="fa-solid fa-cloud-arrow-up"></i> Buluta Yedekle`;
        }
    },

    loadFromCloud: async function() {
        const self = this;
        const authStatus = await DriveApp.checkAuthStatus();
        if (!authStatus.authenticated) {
            return;
        }

        try {
            const response = await fetch('/api/drive/get-notes');
            const data = await response.json();
            
            if (data.status === 'not_found') {
                console.log("Bulutta yedek not bulunamadı.");
                return;
            }

            if (data.status === 'success') {
                const syncPassword = prompt("Google Drive'da şifreli yedek bulundu!\nYedeği açmak için şifrenizi girin:");
                if (!syncPassword) return;

                const decryptedString = await SecureCrypto.decrypt(data.payload, syncPassword);
                const db = JSON.parse(decryptedString);

                if (db.notes && db.folders) {
                    if (confirm("Buluttaki notlar indirilsin mi? Mevcut yerel notlarınızın üzerine yazılacaktır.")) {
                        this.notes = db.notes;
                        this.folders = db.folders;
                        this.saveLocalData();
                        this.renderFolders();
                        this.renderNotes();
                        alert("Notlarınız başarıyla buluttan geri yüklendi!");
                    }
                }
            }
        } catch (err) {
            alert("Bulut yedeği yükleme hatası: Şifre yanlış olabilir veya dosya bozuk.");
        }
    }
};
