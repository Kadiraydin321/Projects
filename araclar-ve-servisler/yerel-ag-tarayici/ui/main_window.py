import tkinter as tk
from tkinter import ttk, messagebox, filedialog
import threading
import queue
from typing import List, Dict

from core.models import Device, ScanProgress, DeviceType
from core.coordinator import NetworkScanCoordinator
from core.interface_detector import InterfaceDetector
from services.exporter import ScanExporter
from ui.theme import DARK_THEME, FONT_TITLE, FONT_HEADING, FONT_BODY, FONT_MONO

class NetworkScannerApp:
    def __init__(self, root: tk.Tk):
        self.root = root
        self.root.title("Yerel Ağ ve Sunucu Tarayıcı (LAN & Server Inspector)")
        self.root.geometry("1100x680")
        self.root.minsize(900, 550)
        self.root.configure(bg=DARK_THEME["bg_main"])

        self.coordinator = NetworkScanCoordinator(max_workers=50)
        self.devices: Dict[str, Device] = {}
        self.event_queue = queue.Queue()

        self._setup_styles()
        self._build_ui()
        self._load_interfaces()
        self.root.after(50, self._process_queue)

    def _setup_styles(self):
        style = ttk.Style()
        style.theme_use("clam")

        style.configure(".", background=DARK_THEME["bg_main"], foreground=DARK_THEME["fg_text"], font=FONT_BODY)
        style.configure("TFrame", background=DARK_THEME["bg_main"])
        style.configure("Card.TFrame", background=DARK_THEME["bg_secondary"], relief="flat")
        
        style.configure("TLabel", background=DARK_THEME["bg_main"], foreground=DARK_THEME["fg_text"], font=FONT_BODY)
        style.configure("Card.TLabel", background=DARK_THEME["bg_secondary"], foreground=DARK_THEME["fg_text"], font=FONT_BODY)
        style.configure("Title.TLabel", background=DARK_THEME["bg_secondary"], foreground=DARK_THEME["accent"], font=FONT_TITLE)
        style.configure("Muted.TLabel", background=DARK_THEME["bg_secondary"], foreground=DARK_THEME["fg_muted"], font=FONT_BODY)
        
        # Notebook (Sekmeler)
        style.configure("TNotebook", background=DARK_THEME["bg_main"], borderwidth=0)
        style.configure("TNotebook.Tab", background=DARK_THEME["bg_secondary"], foreground=DARK_THEME["fg_text"], padding=[16, 8], font=FONT_HEADING)
        style.map("TNotebook.Tab", background=[("selected", DARK_THEME["bg_surface"])], foreground=[("selected", DARK_THEME["accent"])])

        # Treeview (Modern Koyu Tablo)
        style.configure("Treeview",
            background=DARK_THEME["bg_secondary"],
            foreground=DARK_THEME["fg_text"],
            fieldbackground=DARK_THEME["bg_secondary"],
            rowheight=28,
            font=FONT_BODY,
            borderwidth=0
        )
        style.configure("Treeview.Heading",
            background=DARK_THEME["bg_surface"],
            foreground=DARK_THEME["fg_text"],
            font=FONT_HEADING,
            relief="flat"
        )
        style.map("Treeview", background=[("selected", DARK_THEME["accent"])], foreground=[("selected", "#000000")])

        # Progressbar
        style.configure("TProgressbar", thickness=6, troughcolor=DARK_THEME["bg_surface"], background=DARK_THEME["accent"])

    def _build_ui(self):
        # 1. Üst Başlık & Kontrol Paneli (Card)
        header_card = ttk.Frame(self.root, style="Card.TFrame", padding=15)
        header_card.pack(fill="x", padx=15, pady=(15, 10))

        title_frame = ttk.Frame(header_card, style="Card.TFrame")
        title_frame.pack(fill="x", pady=(0, 10))

        ttk.Label(title_frame, text="⚡ Yerel Ağ ve Sunucu Tarayıcı", style="Title.TLabel").pack(side="left")
        self.lbl_stats = ttk.Label(title_frame, text="Toplam Cihaz: 0  |  Sunucu: 0", style="Card.TLabel", font=FONT_HEADING)
        self.lbl_stats.pack(side="right")

        # Kontroller Satırı
        ctrl_frame = ttk.Frame(header_card, style="Card.TFrame")
        ctrl_frame.pack(fill="x")

        ttk.Label(ctrl_frame, text="Ağ Arayüzü:", style="Card.TLabel").pack(side="left", padx=(0, 5))
        self.combo_iface = ttk.Combobox(ctrl_frame, state="readonly", width=32, font=FONT_BODY)
        self.combo_iface.pack(side="left", padx=(0, 15))
        self.combo_iface.bind("<<ComboboxSelected>>", self._on_iface_selected)

        ttk.Label(ctrl_frame, text="Alt Ağ (CIDR):", style="Card.TLabel").pack(side="left", padx=(0, 5))
        self.entry_cidr = tk.Entry(ctrl_frame, bg=DARK_THEME["bg_surface"], fg=DARK_THEME["fg_text"],
                                  insertbackground=DARK_THEME["fg_text"], font=FONT_MONO, width=16, relief="flat")
        self.entry_cidr.pack(side="left", padx=(0, 15), ipady=3)

        self.btn_scan = tk.Button(ctrl_frame, text="Taramayı Başlat", bg=DARK_THEME["accent"], fg="#000000",
                                  activebackground=DARK_THEME["accent_hover"], font=FONT_HEADING, relief="flat",
                                  padx=15, pady=3, cursor="hand2", command=self._start_scan)
        self.btn_scan.pack(side="left", padx=(0, 8))

        self.btn_stop = tk.Button(ctrl_frame, text="Durdur", bg=DARK_THEME["accent_danger"], fg="#FFFFFF",
                                  font=FONT_HEADING, relief="flat", padx=15, pady=3, state="disabled",
                                  cursor="hand2", command=self._stop_scan)
        self.btn_stop.pack(side="left", padx=(0, 15))

        self.btn_export = tk.Button(ctrl_frame, text="Dışa Aktar ▼", bg=DARK_THEME["bg_surface"], fg=DARK_THEME["fg_text"],
                                    font=FONT_BODY, relief="flat", padx=10, pady=3, cursor="hand2", command=self._export_menu)
        self.btn_export.pack(side="right")

        # 2. Arama & Filtreleme Çubuğu
        search_frame = ttk.Frame(self.root, style="TFrame")
        search_frame.pack(fill="x", padx=15, pady=(0, 8))

        ttk.Label(search_frame, text="🔍 Hızlı Filtrele:", style="TLabel").pack(side="left", padx=(0, 5))
        self.entry_search = tk.Entry(search_frame, bg=DARK_THEME["bg_surface"], fg=DARK_THEME["fg_text"],
                                     insertbackground=DARK_THEME["fg_text"], font=FONT_BODY, relief="flat")
        self.entry_search.pack(side="left", fill="x", expand=True, padx=(0, 15), ipady=3)
        self.entry_search.bind("<KeyRelease>", lambda e: self._refresh_tables())

        # 3. İki Sekmeli Görünüm (Tüm Cihazlar / Sunucular)
        self.notebook = ttk.Notebook(self.root)
        self.notebook.pack(fill="both", expand=True, padx=15, pady=(0, 10))

        # Sekme 1: Tüm Cihazlar Tablosu
        self.frame_all = ttk.Frame(self.notebook, style="TFrame")
        self.notebook.add(self.frame_all, text="  🌐 Tüm Ağ Cihazları  ")
        self.table_all = self._create_treeview(self.frame_all)

        # Sekme 2: Sunucular Tablosu (Özel Sunucu Sekmesi)
        self.frame_servers = ttk.Frame(self.notebook, style="TFrame")
        self.notebook.add(self.frame_servers, text="  🖥️ Sunucular & Servisler  ")
        self.table_servers = self._create_treeview(self.frame_servers, is_server_tab=True)

        # 4. Alt Durum Çubuğu
        status_bar = ttk.Frame(self.root, style="Card.TFrame", padding=(15, 6))
        status_bar.pack(fill="x", side="bottom")

        self.progress_bar = ttk.Progressbar(status_bar, mode="determinate")
        self.progress_bar.pack(fill="x", side="top", pady=(0, 4))

        self.lbl_status = ttk.Label(status_bar, text="Hazır. Taramak için 'Taramayı Başlat' düğmesine tıklayın.", style="Muted.TLabel")
        self.lbl_status.pack(side="left")

    def _create_treeview(self, parent, is_server_tab=False):
        container = ttk.Frame(parent)
        container.pack(fill="both", expand=True)

        columns = ("ip", "mac", "vendor", "hostname", "type", "ports", "rtt")
        headers = {
            "ip": "IP Adresi",
            "mac": "MAC Adresi",
            "vendor": "Cihaz Üreticisi",
            "hostname": "Cihaz Adı / DNS",
            "type": "Cihaz Türü",
            "ports": "Açık Servisler / Portlar" if is_server_tab else "Tespit Edilen Portlar",
            "rtt": "Gecikme (ms)"
        }

        tree = ttk.Treeview(container, columns=columns, show="headings", selectmode="browse")
        widths = {"ip": 120, "mac": 140, "vendor": 190, "hostname": 150, "type": 130, "ports": 200, "rtt": 90}
        
        for col in columns:
            tree.heading(col, text=headers[col], anchor="w")
            tree.column(col, width=widths[col], anchor="w")

        scrollbar = ttk.Scrollbar(container, orient="vertical", command=tree.yview)
        tree.configure(yscrollcommand=scrollbar.set)
        scrollbar.pack(side="right", fill="y")
        tree.pack(side="left", fill="both", expand=True)

        tree.bind("<Double-1>", lambda e: self._show_device_details(tree))
        return tree

    def _load_interfaces(self):
        self.interfaces = InterfaceDetector.get_interfaces()
        values = [f"{i.name} ({i.ip})" for i in self.interfaces]
        self.combo_iface["values"] = values
        if values:
            self.combo_iface.current(0)
            self.entry_cidr.delete(0, tk.END)
            self.entry_cidr.insert(0, self.interfaces[0].cidr)

    def _on_iface_selected(self, event):
        idx = self.combo_iface.current()
        if 0 <= idx < len(self.interfaces):
            self.entry_cidr.delete(0, tk.END)
            self.entry_cidr.insert(0, self.interfaces[idx].cidr)

    def _start_scan(self):
        cidr = self.entry_cidr.get().strip()
        if not cidr:
            messagebox.showwarning("Uyarı", "Lütfen taranacak bir alt ağ (CIDR) girin.")
            return

        self.devices.clear()
        self._refresh_tables()
        self.btn_scan.config(state="disabled")
        self.btn_stop.config(state="normal")
        self.progress_bar["value"] = 0

        threading.Thread(target=self._run_scan_worker, args=(cidr,), daemon=True).start()

    def _run_scan_worker(self, cidr: str):
        def on_device(d: Device):
            self.event_queue.put(("device", d))

        def on_prog(p: ScanProgress):
            self.event_queue.put(("progress", p))

        self.coordinator.scan_subnet(cidr, scan_ports=True, on_device_found=on_device, on_progress=on_prog)
        self.event_queue.put(("finished", None))

    def _stop_scan(self):
        self.coordinator.cancel()
        self.lbl_status.config(text="Tarama durduruluyor...")

    def _process_queue(self):
        try:
            while True:
                evt_type, data = self.event_queue.get_nowait()
                if evt_type == "device":
                    dev: Device = data
                    self.devices[dev.ip] = dev
                    self._insert_device_to_tables(dev)
                    self._update_stats()
                elif evt_type == "progress":
                    prog: ScanProgress = data
                    self.progress_bar["value"] = prog.percentage
                    self.lbl_status.config(text=prog.status_message)
                    self._update_stats()
                elif evt_type == "finished":
                    self.btn_scan.config(state="normal")
                    self.btn_stop.config(state="disabled")
                    self.progress_bar["value"] = 100
                    servers = sum(1 for d in self.devices.values() if d.is_server)
                    self.lbl_status.config(text=f"Tarama Tamamlandı. {len(self.devices)} Cihaz, {servers} Sunucu Tespit Edildi.")
                    self._update_stats()
        except queue.Empty:
            pass

        self.root.after(50, self._process_queue)

    def _update_stats(self):
        total = len(self.devices)
        servers = sum(1 for d in self.devices.values() if d.is_server)
        self.lbl_stats.config(text=f"Toplam Cihaz: {total}  |  Sunucu: {servers}")

    def _insert_device_to_tables(self, d: Device):
        query = self.entry_search.get().strip().lower()
        if query and not self._device_matches_query(d, query):
            return

        ports_str = ", ".join(f"{p.port} ({p.service_name})" for p in d.open_ports) if d.open_ports else "-"
        values = (d.ip, d.mac, d.vendor, d.hostname, d.device_type.value, ports_str, f"{d.response_time_ms} ms")

        self.table_all.insert("", "end", iid=f"all_{d.ip}", values=values)

        if d.is_server:
            self.table_servers.insert("", "end", iid=f"srv_{d.ip}", values=values)

    def _refresh_tables(self):
        self.table_all.delete(*self.table_all.get_children())
        self.table_servers.delete(*self.table_servers.get_children())
        query = self.entry_search.get().strip().lower()

        for d in self.devices.values():
            if not query or self._device_matches_query(d, query):
                ports_str = ", ".join(f"{p.port} ({p.service_name})" for p in d.open_ports) if d.open_ports else "-"
                values = (d.ip, d.mac, d.vendor, d.hostname, d.device_type.value, ports_str, f"{d.response_time_ms} ms")
                self.table_all.insert("", "end", iid=f"all_{d.ip}", values=values)
                if d.is_server:
                    self.table_servers.insert("", "end", iid=f"srv_{d.ip}", values=values)

    def _device_matches_query(self, d: Device, q: str) -> bool:
        return (q in d.ip.lower() or
                q in d.mac.lower() or
                q in d.vendor.lower() or
                q in d.hostname.lower() or
                q in d.device_type.value.lower())

    def _show_device_details(self, tree: ttk.Treeview):
        selected = tree.selection()
        if not selected:
            return
        item_id = selected[0]
        ip = item_id.replace("all_", "").replace("srv_", "")
        dev = self.devices.get(ip)
        if not dev:
            return

        dialog = tk.Toplevel(self.root)
        dialog.title(f"Cihaz Detayları - {dev.ip}")
        dialog.geometry("520x450")
        dialog.configure(bg=DARK_THEME["bg_secondary"])

        frame = ttk.Frame(dialog, style="Card.TFrame", padding=20)
        frame.pack(fill="both", expand=True)

        ttk.Label(frame, text=f"Cihaz: {dev.ip}", font=FONT_TITLE, style="Title.TLabel").pack(anchor="w", pady=(0, 10))
        
        info_lines = [
            ("IP Adresi:", dev.ip),
            ("MAC Adresi:", dev.mac),
            ("Üretici:", dev.vendor),
            ("Hostname / DNS:", dev.hostname),
            ("Cihaz Türü:", dev.device_type.value),
            ("Sunucu Mu?:", "Evet (Aktif Servis Tespit Edildi)" if dev.is_server else "Hayır"),
            ("Yanıt Süresi:", f"{dev.response_time_ms} ms"),
        ]

        for lbl, val in info_lines:
            row = ttk.Frame(frame, style="Card.TFrame")
            row.pack(fill="x", pady=2)
            ttk.Label(row, text=lbl, width=16, font=FONT_HEADING, style="Card.TLabel").pack(side="left")
            ttk.Label(row, text=val, font=FONT_BODY, style="Card.TLabel").pack(side="left")

        ttk.Label(frame, text="\nAçık Portlar & Servisler:", font=FONT_HEADING, style="Card.TLabel").pack(anchor="w", pady=(10, 5))
        
        ports_box = tk.Text(frame, height=7, bg=DARK_THEME["bg_surface"], fg=DARK_THEME["fg_text"],
                            font=FONT_MONO, relief="flat", padx=10, pady=8)
        ports_box.pack(fill="both", expand=True)

        if dev.open_ports:
            for p in dev.open_ports:
                ports_box.insert(tk.END, f"• Port {p.port:<5} | Servis: {p.service_name:<20} | Durum: {p.state}\n")
        else:
            ports_box.insert(tk.END, "Açık standart servis portu tespit edilmedi.")
        ports_box.config(state="disabled")

    def _export_menu(self):
        if not self.devices:
            messagebox.showinfo("Bilgi", "Dışa aktarılacak cihaz bulunamadı. Lütfen önce tarama yapın.")
            return

        menu = tk.Menu(self.root, tearoff=0, bg=DARK_THEME["bg_surface"], fg=DARK_THEME["fg_text"])
        menu.add_command(label="CSV Olarak Dışa Aktar (Excel Uyumlu)", command=self._export_csv)
        menu.add_command(label="JSON Olarak Dışa Aktar", command=self._export_json)
        menu.post(self.btn_export.winfo_rootx(), self.btn_export.winfo_rooty() + self.btn_export.winfo_height())

    def _export_csv(self):
        path = filedialog.asksaveasfilename(defaultextension=".csv", filetypes=[("CSV Dosyası", "*.csv")])
        if path:
            if ScanExporter.export_csv(list(self.devices.values()), path):
                messagebox.showinfo("Başarılı", f"Cihaz listesi CSV olarak kaydedildi:\n{path}")
            else:
                messagebox.showerror("Hata", "CSV dışa aktarımında hata oluştu.")

    def _export_json(self):
        path = filedialog.asksaveasfilename(defaultextension=".json", filetypes=[("JSON Dosyası", "*.json")])
        if path:
            if ScanExporter.export_json(list(self.devices.values()), path):
                messagebox.showinfo("Başarılı", f"Cihaz listesi JSON olarak kaydedildi:\n{path}")
            else:
                messagebox.showerror("Hata", "JSON dışa aktarımında hata oluştu.")
