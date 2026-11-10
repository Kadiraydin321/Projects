import json
import csv
from typing import List
from core.models import Device

class ScanExporter:
    """Tarama sonuçlarını CSV ve JSON formatında dışa aktarır."""

    @staticmethod
    def export_json(devices: List[Device], filepath: str) -> bool:
        try:
            data = []
            for d in devices:
                data.append({
                    "ip": d.ip,
                    "mac": d.mac,
                    "vendor": d.vendor,
                    "hostname": d.hostname,
                    "is_server": d.is_server,
                    "device_type": d.device_type.value,
                    "response_time_ms": d.response_time_ms,
                    "open_ports": [
                        {"port": p.port, "service": p.service_name, "state": p.state}
                        for p in d.open_ports
                    ]
                })
            with open(filepath, "w", encoding="utf-8") as f:
                json.dump(data, f, indent=4, ensure_ascii=False)
            return True
        except Exception:
            return False

    @staticmethod
    def export_csv(devices: List[Device], filepath: str) -> bool:
        try:
            # Excel için UTF-8 BOM
            with open(filepath, "w", encoding="utf-8-sig", newline="") as f:
                writer = csv.writer(f)
                writer.writerow(["IP Adresi", "MAC Adresi", "Üretici", "Cihaz Adı (Hostname)", "Tür", "Sunucu Mu?", "Gecikme (ms)", "Açık Portlar"])
                for d in devices:
                    ports_str = ", ".join(f"{p.port} ({p.service_name})" for p in d.open_ports) if d.open_ports else "-"
                    writer.writerow([
                        d.ip,
                        d.mac,
                        d.vendor,
                        d.hostname,
                        d.device_type.value,
                        "Evet" if d.is_server else "Hayır",
                        d.response_time_ms,
                        ports_str
                    ])
            return True
        except Exception:
            return False
