import socket
import time
from typing import List, Tuple
from core.models import PortInfo

COMMON_SERVER_PORTS = {
    21: "FTP",
    22: "SSH",
    23: "Telnet",
    25: "SMTP",
    53: "DNS",
    80: "HTTP Web",
    110: "POP3",
    139: "NetBIOS",
    143: "IMAP",
    443: "HTTPS Web",
    445: "SMB Dosya Paylaşımı",
    1433: "MS SQL Server",
    1521: "Oracle DB",
    3306: "MySQL / MariaDB",
    3389: "RDP Uzak Masaüstü",
    5432: "PostgreSQL Server",
    5900: "VNC Remote",
    6379: "Redis Key-Value",
    8000: "HTTP Dev Server",
    8080: "HTTP Proxy/Web",
    8443: "HTTPS Alt Web",
    9000: "Portainer / SonarQube",
    27017: "MongoDB Server"
}

class FastPortScanner:
    """Belirtilen IP üzerinde kritik sunucu portlarını asenkron olarak tarar."""

    @staticmethod
    def scan_port(ip_address: str, port: int, timeout: float = 0.25) -> Optional[PortInfo]:
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(timeout)
        t_start = time.perf_counter()
        try:
            res = sock.connect_ex((ip_address, port))
            elapsed_ms = (time.perf_counter() - t_start) * 1000.0
            if res == 0:
                service = COMMON_SERVER_PORTS.get(port, "Bilinmeyen Servis")
                return PortInfo(port=port, service_name=service, state="open", response_time_ms=round(elapsed_ms, 2))
        except Exception:
            pass
        finally:
            sock.close()
        return None

    @classmethod
    def scan_common_ports(cls, ip_address: str, timeout: float = 0.25) -> List[PortInfo]:
        open_ports = []
        for port in COMMON_SERVER_PORTS:
            info = cls.scan_port(ip_address, port, timeout)
            if info:
                open_ports.append(info)
        return open_ports
