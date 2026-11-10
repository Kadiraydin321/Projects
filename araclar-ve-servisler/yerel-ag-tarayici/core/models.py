from dataclasses import dataclass, field
from typing import Tuple, Optional
from enum import Enum

class ScanStatus(Enum):
    IDLE = "idle"
    SCANNING = "scanning"
    CANCELLED = "cancelled"
    COMPLETED = "completed"
    ERROR = "error"

class DeviceType(Enum):
    UNKNOWN = "Bilinmiyor"
    SERVER = "Sunucu"
    ROUTER = "Yönlendirici / Ağ Cihazı"
    PRINTER = "Yazıcı"
    WORKSTATION = "Bilgisayar / İstemci"
    MOBILE = "Mobil / IoT"

@dataclass(frozen=True)
class PortInfo:
    port: int
    service_name: str
    state: str  # "open", "closed", "filtered"
    response_time_ms: float = 0.0

@dataclass(frozen=True)
class Device:
    ip: str
    mac: str
    vendor: str
    hostname: str
    response_time_ms: float
    is_alive: bool
    detection_method: str = "ARP"
    device_type: DeviceType = DeviceType.UNKNOWN
    is_server: bool = False
    open_ports: Tuple[PortInfo, ...] = field(default_factory=tuple)
    notes: Optional[str] = None

@dataclass(frozen=True)
class NetworkInterfaceInfo:
    name: str
    ip: str
    netmask: str
    cidr: str
    default_gateway: Optional[str] = None

@dataclass(frozen=True)
class ScanProgress:
    current: int
    total: int
    found_devices_count: int
    server_count: int
    status_message: str
    percentage: float
