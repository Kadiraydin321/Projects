import socket
from typing import Optional

class HostnameResolver:
    """Reverse DNS ve NetBIOS üzerinden cihaz adını çözer."""

    @staticmethod
    def resolve_netbios(ip_address: str, timeout: float = 0.3) -> Optional[str]:
        """UDP Port 137 üzerinden NetBIOS Node Status isteği gönderir."""
        query = (
            b"\x82\x28\x00\x00\x00\x01\x00\x00\x00\x00\x00\x00"
            b"\x20CKAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA\x00\x00\x21\x00\x01"
        )
        sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        sock.settimeout(timeout)
        try:
            sock.sendto(query, (ip_address, 137))
            data, _ = sock.recvfrom(1024)
            if len(data) > 57:
                num_names = data[56]
                if num_names > 0 and len(data) >= 57 + 18:
                    raw_name = data[57:57+15].decode('latin-1', errors='ignore').strip()
                    if raw_name:
                        return raw_name
        except Exception:
            pass
        finally:
            sock.close()
        return None

    @classmethod
    def resolve(cls, ip_address: str) -> str:
        """Cihaz adını çözmek için önce NetBIOS'u sonra Reverse DNS'i dener."""
        nb_name = cls.resolve_netbios(ip_address)
        if nb_name:
            return nb_name

        try:
            name, _, _ = socket.gethostbyaddr(ip_address)
            return name
        except (socket.herror, socket.gaierror, socket.timeout):
            return "Bilinmiyor"
        except Exception:
            return "Bilinmiyor"
