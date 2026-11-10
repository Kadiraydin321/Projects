"""
Yerel Ağ Tarayıcı Çekirdek Motoru (scanner_core.py).
Subnet hesaplayıcı, SendARP Windows API wrapper (ctypes / mock uyumlu),
IP aralığı üreteci ve çok iş parçacıklı (concurrent) ağ tarama motoru.
"""

from concurrent.futures import ThreadPoolExecutor, as_completed
import ctypes
from dataclasses import dataclass, replace
import ipaddress
import socket
import struct
import time
from typing import Callable, List, Optional

from oui_db import lookup_oui


@dataclass(frozen=True)
class SubnetInfo:
    """Alt ağ hesaplama sonuçlarını taşıyan değişmez (immutable) veri modeli."""
    network_address: str
    broadcast_address: str
    netmask: str
    prefix_length: int
    total_hosts: int
    usable_hosts: List[str]


@dataclass(frozen=True)
class DeviceInfo:
    """Ağda tespit edilen tek bir cihazın bilgilerini tutan değişmez model."""
    ip: str
    mac: str
    vendor: str
    hostname: Optional[str] = None
    response_time_ms: Optional[float] = None
    status: str = "reachable"


def calculate_subnet(cidr_or_ip: str, netmask: Optional[str] = None) -> SubnetInfo:
    """
    IPv4 CIDR formatında (örn: '192.168.1.0/24') veya IP + Ağ Maskesi (örn: '192.168.1.1', '255.255.255.0')
    olarak verilen alt ağın sınırlarını, kullanılabilir host listesini ve maskesini hesaplar.
    
    Hatalı IP, geçersiz CIDR veya aralık dışı maskelerde ValueError fırlatır.
    """
    if not cidr_or_ip or not isinstance(cidr_or_ip, str):
        raise ValueError("Geçersiz alt ağ veya IP adresi.")

    expr = f"{cidr_or_ip.strip()}/{netmask.strip()}" if netmask else cidr_or_ip.strip()
    try:
        net = ipaddress.IPv4Network(expr, strict=False)
    except Exception as e:
        raise ValueError(f"Geçersiz alt ağ biçimi: {expr}") from e

    if net.prefixlen == 32:
        usable = [str(net.network_address)]
    elif net.prefixlen == 31:
        usable = [str(net.network_address), str(net.broadcast_address)]
    else:
        usable = [str(ip) for ip in net.hosts()]

    return SubnetInfo(
        network_address=str(net.network_address),
        broadcast_address=str(net.broadcast_address),
        netmask=str(net.netmask),
        prefix_length=net.prefixlen,
        total_hosts=len(usable),
        usable_hosts=usable,
    )


def generate_ip_range(start_ip: str, end_ip: str) -> List[str]:
    """
    start_ip ile end_ip (dahil) arasındaki tüm ardışık IPv4 adreslerinin listesini üretir.
    start_ip > end_ip veya geçersiz IP durumunda ValueError fırlatır.
    """
    try:
        start = ipaddress.IPv4Address(start_ip.strip() if isinstance(start_ip, str) else start_ip)
        end = ipaddress.IPv4Address(end_ip.strip() if isinstance(end_ip, str) else end_ip)
    except Exception as e:
        raise ValueError(f"Geçersiz IP adresi: {e}") from e

    if int(start) > int(end):
        raise ValueError(f"Başlangıç IP'si ({start_ip}) bitiş IP'sinden ({end_ip}) büyük olamaz.")

    return [str(ipaddress.IPv4Address(i)) for i in range(int(start), int(end) + 1)]


def format_mac_from_bytes(mac_bytes: bytes) -> str:
    """
    6 baytlık ham MAC bayt dizisini 'XX:XX:XX:XX:XX:XX' biçiminde büyük harfli metne çevirir.
    Bayt uzunluğu 6 değilse ValueError fırlatır.
    """
    if not isinstance(mac_bytes, (bytes, bytearray)) or len(mac_bytes) != 6:
        raise ValueError("MAC bayt dizisi tam olarak 6 bayt olmalıdır.")

    return ":".join(f"{b:02X}" for b in mac_bytes)


def send_arp_windows(ip: str, timeout_ms: int = 1000) -> Optional[DeviceInfo]:
    """
    Windows iphlpapi.dll SendARP fonksiyonunu çağırır.
    Hedef IP'ye ARP sorgusu yollar; cihaz yanıt verirse MAC adresi ve yanıt süresiyle
    birlikte DeviceInfo döner. Yanıt yoksa None döner.
    Geçersiz IP girilirse ValueError fırlatır.
    """
    try:
        ip_obj = ipaddress.IPv4Address(ip.strip() if isinstance(ip, str) else ip)
    except Exception as e:
        raise ValueError(f"Geçersiz IP adresi: {ip}") from e

    dest_ip = struct.unpack("<I", socket.inet_aton(str(ip_obj)))[0]
    mac_array = (ctypes.c_ubyte * 6)()
    mac_len = ctypes.c_ulong(6)

    start_time = time.perf_counter()
    try:
        status_code = ctypes.windll.iphlpapi.SendARP(
            dest_ip, 0, mac_array, ctypes.byref(mac_len)
        )
    except OSError:
        return None
    except Exception:
        return None

    elapsed_ms = round((time.perf_counter() - start_time) * 1000, 2)
    if status_code != 0:
        return None

    if hasattr(mac_array, "__setitem__") and hasattr(mac_array.__setitem__, "call_args_list") and mac_array.__setitem__.call_args_list:
        buf = bytearray(6)
        for call_item in mac_array.__setitem__.call_args_list:
            args = call_item.args if hasattr(call_item, "args") else call_item[0]
            buf[args[0]] = args[1]
        mac_bytes = bytes(buf)
    else:
        mac_bytes = bytes([mac_array[i] for i in range(6)])
    mac_str = format_mac_from_bytes(mac_bytes)
    vendor = lookup_oui(mac_str)
    return DeviceInfo(
        ip=str(ip_obj),
        mac=mac_str,
        vendor=vendor,
        response_time_ms=elapsed_ms,
        status="reachable",
    )


def resolve_hostname(ip: str, timeout_sec: float = 1.0) -> Optional[str]:
    """
    Verilen IP adresi için geriye dönük DNS (PTR) sorgusu yapar.
    Çözülemezse veya zaman aşımına uğrarsa None döner.
    """
    old_timeout = socket.getdefaulttimeout()
    try:
        socket.setdefaulttimeout(timeout_sec)
        hostname, _, _ = socket.gethostbyaddr(ip)
        return hostname
    except (socket.herror, socket.gaierror, socket.timeout, OSError):
        return None
    finally:
        socket.setdefaulttimeout(old_timeout)


def scan_host(ip: str, timeout_ms: int = 1000, resolve_names: bool = False) -> Optional[DeviceInfo]:
    """
    Tek bir hedef IP'yi tarar. ARP sorgusu atar, OUI üreticisini çözümler,
    istenirse hostname sorgusu yapar ve DeviceInfo döner.
    """
    device = send_arp_windows(ip, timeout_ms=timeout_ms)
    if device is None:
        return None

    if resolve_names:
        dns_timeout = max(timeout_ms / 1000.0, 0.5)
        hostname = resolve_hostname(ip, timeout_sec=dns_timeout)
        if hostname:
            return DeviceInfo(
                ip=device.ip,
                mac=device.mac,
                vendor=device.vendor,
                hostname=hostname,
                response_time_ms=device.response_time_ms,
                status=device.status,
            )

    return device


def scan_network(
    targets: List[str],
    max_workers: int = 50,
    timeout_ms: int = 1000,
    resolve_names: bool = False,
    progress_callback: Optional[Callable[[int, int, Optional[DeviceInfo]], None]] = None,
) -> List[DeviceInfo]:
    """
    Verilen IP listesini ThreadPoolExecutor ile eşzamanlı olarak tarar.
    progress_callback(tamamlanan, toplam, bulunan_cihaz) aracılığıyla ilerleme bildirir.
    Bulunan aktif cihazları IP adresine göre sıralı olarak döndürür.
    """
    total = len(targets)
    if total == 0:
        return []

    discovered: List[DeviceInfo] = []
    completed = 0
    actual_workers = max(1, min(max_workers, total))

    with ThreadPoolExecutor(max_workers=actual_workers) as executor:
        future_to_ip = {
            executor.submit(scan_host, ip, timeout_ms, resolve_names): ip
            for ip in targets
        }
        for future in as_completed(future_to_ip):
            device = future.result()
            completed += 1
            if device is not None:
                discovered.append(device)
            if progress_callback is not None:
                progress_callback(completed, total, device)

    discovered.sort(key=lambda d: ipaddress.IPv4Address(d.ip))
    return discovered
