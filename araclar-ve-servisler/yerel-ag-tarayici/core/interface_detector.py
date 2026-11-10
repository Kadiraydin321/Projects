import socket
import ipaddress
import subprocess
from typing import List
from core.models import NetworkInterfaceInfo

class InterfaceDetector:
    """Yerel makinenin etkin IPv4 ağ arayüzlerini ve alt ağlarını tespit eder."""

    @staticmethod
    def get_interfaces() -> List[NetworkInterfaceInfo]:
        interfaces = []
        try:
            # Standart soket ile dışarıya bağlanan IP'yi bul
            s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            s.connect(("8.8.8.8", 80))
            active_ip = s.getsockname()[0]
            s.close()

            # Varsayılan /24 varsayımı ile birincil arayüz
            interfaces.append(NetworkInterfaceInfo(
                name="Varsayılan Etkin Arayüz (LAN)",
                ip=active_ip,
                netmask="255.255.255.0",
                cidr=f"{active_ip.rsplit('.', 1)[0]}.0/24",
                default_gateway=f"{active_ip.rsplit('.', 1)[0]}.1"
            ))
        except Exception:
            pass

        if not interfaces:
            interfaces.append(NetworkInterfaceInfo(
                name="Yerel Ağ Varsayılan (Fallback)",
                ip="192.168.1.6",
                netmask="255.255.255.0",
                cidr="192.168.1.0/24",
                default_gateway="192.168.1.1"
            ))

        return interfaces
