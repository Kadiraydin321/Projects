import ipaddress
import threading
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import Callable, List, Optional
from core.models import Device, DeviceType, ScanProgress, ScanStatus
from core.arp_scanner import WindowsArpScanner
from core.hostname_resolver import HostnameResolver
from core.port_scanner import FastPortScanner, COMMON_SERVER_PORTS
from services.oui_lookup import lookup_vendor

class NetworkScanCoordinator:
    """ARP, Hostname ve Port taramasını çoklu iş parçacığıyla koordine eder."""

    def __init__(self, max_workers: int = 40):
        self.max_workers = max_workers
        self.arp_scanner = WindowsArpScanner()
        self._cancel_event = threading.Event()
        self._status = ScanStatus.IDLE

    def cancel(self):
        self._cancel_event.set()
        self._status = ScanStatus.CANCELLED

    def is_cancelled(self) -> bool:
        return self._cancel_event.is_set()

    def scan_subnet(
        self,
        cidr: str,
        scan_ports: bool = True,
        on_device_found: Optional[Callable[[Device], None]] = None,
        on_progress: Optional[Callable[[ScanProgress], None]] = None
    ) -> List[Device]:
        self._cancel_event.clear()
        self._status = ScanStatus.SCANNING

        try:
            net = ipaddress.ip_network(cidr, strict=False)
            hosts = [str(ip) for ip in net.hosts()]
        except ValueError:
            self._status = ScanStatus.ERROR
            return []

        total_hosts = len(hosts)
        scanned_count = 0
        found_devices: List[Device] = []
        server_count = 0

        # Aşama 1: Ultra Hızlı ARP Taraması
        def worker(ip: str) -> Optional[Device]:
            if self.is_cancelled():
                return None

            arp_res = self.arp_scanner.scan_ip(ip)
            if not arp_res:
                return None

            mac_str, rtt = arp_res
            vendor = lookup_vendor(mac_str)
            hostname = HostnameResolver.resolve(ip)

            # Aşama 2: Sunucu & Port Taraması
            open_ports = []
            is_server = False
            device_type = DeviceType.WORKSTATION

            if scan_ports and not self.is_cancelled():
                open_ports = tuple(FastPortScanner.scan_common_ports(ip, timeout=0.20))
                # Sunucu tespiti kuralı: 21, 22, 80, 443, 3306, 5432, 8080, 8443, 6379 portlarından en az biri açıksa
                server_identifying_ports = {21, 22, 80, 443, 1433, 1521, 3306, 5432, 6379, 8000, 8080, 8443, 9000, 27017}
                has_server_port = any(p.port in server_identifying_ports for p in open_ports)
                
                if has_server_port or "Server" in vendor or "NAS" in vendor:
                    is_server = True
                    device_type = DeviceType.SERVER
                elif ip.endswith(".1"):
                    device_type = DeviceType.ROUTER

            return Device(
                ip=ip,
                mac=mac_str,
                vendor=vendor,
                hostname=hostname,
                response_time_ms=rtt,
                is_alive=True,
                device_type=device_type,
                is_server=is_server,
                open_ports=tuple(open_ports)
            )

        with ThreadPoolExecutor(max_workers=self.max_workers) as executor:
            future_to_ip = {executor.submit(worker, ip): ip for ip in hosts}

            for future in as_completed(future_to_ip):
                if self.is_cancelled():
                    break

                scanned_count += 1
                try:
                    dev = future.result()
                    if dev:
                        found_devices.append(dev)
                        if dev.is_server:
                            server_count += 1
                        if on_device_found:
                            on_device_found(dev)
                except Exception:
                    pass

                if on_progress:
                    pct = (scanned_count / total_hosts) * 100.0
                    msg = f"Taranıyor: {scanned_count}/{total_hosts} IP ({len(found_devices)} Cihaz, {server_count} Sunucu)"
                    on_progress(ScanProgress(
                        current=scanned_count,
                        total=total_hosts,
                        found_devices_count=len(found_devices),
                        server_count=server_count,
                        status_message=msg,
                        percentage=round(pct, 1)
                    ))

        self._status = ScanStatus.COMPLETED if not self.is_cancelled() else ScanStatus.CANCELLED
        return found_devices
