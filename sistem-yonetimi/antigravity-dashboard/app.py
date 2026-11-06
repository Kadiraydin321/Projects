import os
import sys
import shutil
import tempfile
import threading
import time
import subprocess
import json
import requests
import ctypes
from flask import Flask, jsonify, request, render_template, send_from_directory

# Google API imports
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from google.auth.transport.requests import Request
from googleapiclient.discovery import build
from googleapiclient.http import MediaFileUpload, MediaIoBaseDownload

if getattr(sys, 'frozen', False):
    template_folder = os.path.join(sys._MEIPASS, 'templates')
    static_folder = os.path.join(sys._MEIPASS, 'static')
    app = Flask(__name__, template_folder=template_folder, static_folder=static_folder)
else:
    app = Flask(__name__, static_folder='static', template_folder='templates')

# Configuration
PORT = 5000
CREDS_FILE = 'credentials.json'
TOKEN_FILE = 'token.json'
SCOPES = ['https://www.googleapis.com/auth/drive']

# Global State for PC Power Scheduler
ES_CONTINUOUS = 0x80000000
ES_SYSTEM_REQUIRED = 0x00000001
ES_DISPLAY_REQUIRED = 0x00000002

class PCScheduler:
    def __init__(self):
        self.timer_thread = None
        self.target_time = None
        self.action = None
        self.lock = threading.Lock()
        self.cancel_event = threading.Event()

    def set_keep_awake(self, enable):
        try:
            if enable:
                ctypes.windll.kernel32.SetThreadExecutionState(ES_CONTINUOUS | ES_SYSTEM_REQUIRED | ES_DISPLAY_REQUIRED)
            else:
                ctypes.windll.kernel32.SetThreadExecutionState(ES_CONTINUOUS)
        except Exception:
            pass

    def schedule(self, action, delay_seconds):
        with self.lock:
            self.cancel()
            self.action = action
            self.target_time = time.time() + delay_seconds
            self.cancel_event.clear()
            self.set_keep_awake(True)
            self.timer_thread = threading.Thread(target=self._run, args=(delay_seconds,))
            self.timer_thread.daemon = True
            self.timer_thread.start()

    def _run(self, delay):
        cancelled = self.cancel_event.wait(delay)
        
        with self.lock:
            act = self.action
            self.target_time = None
            self.action = None
            self.timer_thread = None
            self.set_keep_awake(False)

        if cancelled:
            return  # Cancelled

        if act == "shutdown":
            subprocess.run(["shutdown", "/s", "/t", "0", "/f"])
        elif act == "restart":
            subprocess.run(["shutdown", "/r", "/t", "0", "/f"])
        elif act == "sleep":
            # Standard Windows Sleep command using PowerShell (reliable Sleep suspension, respects state even if hibernate is enabled)
            subprocess.run(["powershell", "-Command", "Add-Type -Assembly System.Windows.Forms; [System.Windows.Forms.Application]::SetSuspendState('Suspend', $false, $false)"])

    def cancel(self):
        self.cancel_event.set()
        self.target_time = None
        self.action = None
        self.timer_thread = None
        self.set_keep_awake(False)

    def get_status(self):
        with self.lock:
            if self.target_time is not None:
                remaining = max(0, int(self.target_time - time.time()))
                return {"active": True, "action": self.action, "remaining": remaining}
            return {"active": False, "action": None, "remaining": 0}

scheduler = PCScheduler()

# Google Drive Helper Functions
def get_drive_service():
    creds = None
    if os.path.exists(TOKEN_FILE):
        try:
            creds = Credentials.from_authorized_user_file(TOKEN_FILE, SCOPES)
        except Exception:
            pass
            
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            try:
                creds.refresh(Request())
                with open(TOKEN_FILE, 'w') as token:
                    token.write(creds.to_json())
            except Exception:
                return None
        else:
            return None
            
    try:
        return build('drive', 'v3', credentials=creds)
    except Exception:
        return None

# Routes
@app.route('/')
def home():
    return render_template('index.html')

@app.route('/api/system/stats')
def system_stats():
    import psutil
    try:
        cpu = psutil.cpu_percent(interval=0.1)
        ram = psutil.virtual_memory()
        disk = psutil.disk_usage('C:')
        
        # Calculate uptime
        boot_time = psutil.boot_time()
        uptime_seconds = int(time.time() - boot_time)
        
        return jsonify({
            "status": "success",
            "cpu": cpu,
            "ram": {
                "percent": ram.percent,
                "used": ram.used,
                "total": ram.total
            },
            "disk": {
                "percent": disk.percent,
                "used": disk.used,
                "total": disk.total
            },
            "uptime": uptime_seconds
        })
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/api/system/temp/scan')
def scan_temp():
    try:
        total_size = 0
        file_count = 0
        dirs = [tempfile.gettempdir(), r"C:\Windows\Temp"]
        
        for d in dirs:
            if os.path.exists(d):
                for root, _, files in os.walk(d):
                    for f in files:
                        fp = os.path.join(root, f)
                        if not os.path.islink(fp):
                            try:
                                total_size += os.path.getsize(fp)
                                file_count += 1
                            except OSError:
                                pass
        return jsonify({
            "status": "success",
            "size_bytes": total_size,
            "file_count": file_count
        })
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/api/system/temp/clean', methods=['POST'])
def clean_temp():
    try:
        dirs = [tempfile.gettempdir(), r"C:\Windows\Temp"]
        cleaned_size = 0
        cleaned_count = 0
        errors = 0
        
        for d in dirs:
            if os.path.exists(d):
                for item in os.listdir(d):
                    item_path = os.path.join(d, item)
                    try:
                        if os.path.isfile(item_path) or os.path.islink(item_path):
                            size = os.path.getsize(item_path)
                            os.unlink(item_path)
                            cleaned_size += size
                            cleaned_count += 1
                        elif os.path.isdir(item_path):
                            folder_size = 0
                            for root, _, files in os.walk(item_path):
                                for f in files:
                                    fp = os.path.join(root, f)
                                    try:
                                        folder_size += os.path.getsize(fp)
                                    except OSError:
                                        pass
                            shutil.rmtree(item_path)
                            cleaned_size += folder_size
                            cleaned_count += 1
                    except Exception:
                        errors += 1
                        
        return jsonify({
            "status": "success",
            "cleaned_size_bytes": cleaned_size,
            "cleaned_count": cleaned_count,
            "errors_count": errors
        })
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/api/system/shutdown', methods=['POST'])
def schedule_shutdown():
    try:
        data = request.json or {}
        action = data.get('action')
        delay = int(data.get('delay', 0))
        
        if action not in ['shutdown', 'restart', 'sleep']:
            return jsonify({"status": "error", "message": "Invalid action"}), 400
            
        scheduler.schedule(action, delay)
        return jsonify({"status": "success", "message": f"{action.capitalize()} scheduled in {delay} seconds"})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/api/system/shutdown/status')
def shutdown_status():
    return jsonify(scheduler.get_status())

@app.route('/api/system/shutdown/cancel', methods=['POST'])
def cancel_shutdown():
    scheduler.cancel()
    return jsonify({"status": "success", "message": "Power action cancelled"})

# Games Aggregator
@app.route('/api/games/free')
def free_games():
    try:
        # GamerPower API for free giveaways (Epic, Steam, etc.)
        gamerpower_url = "https://www.gamerpower.com/api/giveaways"
        # FreeToGame API for general free-to-play games
        freetogame_url = "https://www.freetogame.com/api/games"
        
        giveaways = []
        f2p_games = []
        
        # 1. Fetch giveaways
        try:
            r = requests.get(gamerpower_url, timeout=5)
            if r.status_code == 200:
                giveaways = r.json()
        except Exception:
            pass
            
        # 2. Fetch Free-to-play
        try:
            r = requests.get(freetogame_url, timeout=5)
            if r.status_code == 200:
                f2p_games = r.json()
        except Exception:
            pass
            
        return jsonify({
            "status": "success",
            "giveaways": giveaways,
            "freetoplay": f2p_games
        })
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

# Google Drive Sync
@app.route('/api/drive/auth-url')
def get_auth_url():
    if not os.path.exists(CREDS_FILE):
        return jsonify({
            "status": "error",
            "message": "credentials.json is missing in the backend root directory.",
            "setup_needed": True
        }), 400
        
    try:
        flow = InstalledAppFlow.from_client_secrets_file(CREDS_FILE, SCOPES)
        # We run the server on a temporary port, return status when done
        # To avoid blocking the Flask main thread, we run InstalledAppFlow on a helper thread
        # and notify the client. But wait, InstalledAppFlow's run_local_server can block.
        # Alternatively, we can let run_local_server complete in a background thread.
        
        def run_oauth():
            try:
                creds = flow.run_local_server(port=0, open_browser=True, prompt='consent')
                with open(TOKEN_FILE, 'w') as token:
                    token.write(creds.to_json())
            except Exception as e:
                print("OAuth Flow Error:", e)
                
        threading.Thread(target=run_oauth).start()
        
        return jsonify({
            "status": "success",
            "message": "OAuth flow started in your default browser."
        })
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/api/drive/status')
def drive_status():
    service = get_drive_service()
    if not service:
        return jsonify({
            "authenticated": False,
            "setup_needed": not os.path.exists(CREDS_FILE)
        })
        
    try:
        about = service.about().get(fields="storageQuota, user").execute()
        quota = about.get('storageQuota', {})
        user = about.get('user', {})
        
        return jsonify({
            "authenticated": True,
            "user": user.get('displayName'),
            "email": user.get('emailAddress'),
            "quota": {
                "limit": int(quota.get('limit', 0)),
                "usage": int(quota.get('usage', 0)),
                "usageInDrive": int(quota.get('usageInDrive', 0))
            }
        })
    except Exception as e:
        return jsonify({"authenticated": False, "error": str(e)})

@app.route('/api/drive/files')
def list_drive_files():
    service = get_drive_service()
    if not service:
        return jsonify({"status": "error", "message": "Not authenticated"}), 401
        
    try:
        results = service.files().list(
            pageSize=100,
            fields="nextPageToken, files(id, name, mimeType, size, createdTime, modifiedTime)",
            orderBy="folder, name"
        ).execute()
        items = results.get('files', [])
        return jsonify({"status": "success", "files": items})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/api/drive/upload', methods=['POST'])
def upload_file():
    service = get_drive_service()
    if not service:
        return jsonify({"status": "error", "message": "Not authenticated"}), 401
        
    try:
        if 'file' not in request.files:
            return jsonify({"status": "error", "message": "No file provided"}), 400
            
        file = request.files['file']
        if file.filename == '':
            return jsonify({"status": "error", "message": "Empty filename"}), 400
            
        temp_dir = tempfile.mkdtemp()
        temp_path = os.path.join(temp_dir, file.filename)
        file.save(temp_path)
        
        file_metadata = {'name': file.filename}
        media = MediaFileUpload(temp_path, resumable=True)
        
        uploaded_file = service.files().create(
            body=file_metadata,
            media_body=media,
            fields='id, name, size'
        ).execute()
        
        # Cleanup temp file
        try:
            os.remove(temp_path)
            os.rmdir(temp_dir)
        except Exception:
            pass
            
        return jsonify({
            "status": "success",
            "file": uploaded_file
        })
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/api/drive/sync-notes', methods=['POST'])
def sync_notes():
    # Sync sticky notes from client (encrypted payload)
    service = get_drive_service()
    if not service:
        return jsonify({"status": "error", "message": "Not authenticated"}), 401
        
    try:
        data = request.json or {}
        encrypted_payload = data.get('payload', '')
        
        # Search for existing notes file
        query = "name = 'antigravity_sticky_notes.enc' and trashed = false"
        results = service.files().list(q=query, fields="files(id, name)").execute()
        files = results.get('files', [])
        
        # Write payload to a temporary file
        temp_dir = tempfile.mkdtemp()
        temp_path = os.path.join(temp_dir, 'notes.enc')
        with open(temp_path, 'w', encoding='utf-8') as f:
            f.write(encrypted_payload)
            
        media = MediaFileUpload(temp_path, mimetype='text/plain', resumable=True)
        
        if files:
            # Update existing file
            file_id = files[0]['id']
            updated_file = service.files().update(
                fileId=file_id,
                media_body=media,
                fields='id'
            ).execute()
            msg = "Updated existing backup on Google Drive."
        else:
            # Create new file
            file_metadata = {'name': 'antigravity_sticky_notes.enc'}
            created_file = service.files().create(
                body=file_metadata,
                media_body=media,
                fields='id'
            ).execute()
            msg = "Created new backup on Google Drive."
            
        # Cleanup
        try:
            os.remove(temp_path)
            os.rmdir(temp_dir)
        except Exception:
            pass
            
        return jsonify({"status": "success", "message": msg})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/api/drive/get-notes')
def get_notes():
    service = get_drive_service()
    if not service:
        return jsonify({"status": "error", "message": "Not authenticated"}), 401
        
    try:
        query = "name = 'antigravity_sticky_notes.enc' and trashed = false"
        results = service.files().list(q=query, fields="files(id, name)").execute()
        files = results.get('files', [])
        
        if not files:
            return jsonify({"status": "not_found", "message": "No encrypted backup found on Google Drive."})
            
        file_id = files[0]['id']
        
        # Download content
        import io
        request_obj = service.files().get_media(fileId=file_id)
        fh = io.BytesIO()
        downloader = MediaIoBaseDownload(fh, request_obj)
        done = False
        while not done:
            status, done = downloader.next_chunk()
            
        content = fh.getvalue().decode('utf-8')
        return jsonify({
            "status": "success",
            "payload": content
        })
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/api/drive/backup-folder', methods=['POST'])
def backup_folder():
    service = get_drive_service()
    if not service:
        return jsonify({"status": "error", "message": "Not authenticated"}), 401
        
    try:
        data = request.json or {}
        local_dir = data.get('folder_path')
        
        if not local_dir or not os.path.exists(local_dir) or not os.path.isdir(local_dir):
            return jsonify({"status": "error", "message": "Invalid directory path"}), 400
            
        # Create a zip archive of the directory in the system temp folder
        folder_name = os.path.basename(os.path.normpath(local_dir)) or "backup"
        temp_dir = tempfile.mkdtemp()
        archive_name = f"{folder_name}_backup_{int(time.time())}"
        archive_path = shutil.make_archive(os.path.join(temp_dir, archive_name), 'zip', local_dir)
        
        file_metadata = {'name': os.path.basename(archive_path)}
        media = MediaFileUpload(archive_path, resumable=True)
        
        uploaded_file = service.files().create(
            body=file_metadata,
            media_body=media,
            fields='id, name, size'
        ).execute()
        
        # Cleanup
        try:
            os.remove(archive_path)
            os.rmdir(temp_dir)
        except Exception:
            pass
            
        return jsonify({
            "status": "success",
            "message": "Folder zipped and uploaded successfully",
            "file": uploaded_file
        })
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

if __name__ == '__main__':
    print(f"Starting server on http://localhost:{PORT}")
    app.run(host='0.0.0.0', port=PORT, debug=True)
