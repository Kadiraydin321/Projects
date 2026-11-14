"""Configuration for Roborock Q8 Max Pro Web Hub.

Defines network parameters, device tokens, and dynamic interface resolution
to bypass VPN tunnels (such as Kaspersky VPN) by binding directly to the local LAN.
"""

from __future__ import annotations

import logging
import os
import socket
from typing import Final

logger = logging.getLogger("web_hub.config")

# Network & Device Constants (Environment variables supported with safe defaults)
ROBOT_IP: Final[str] = os.getenv("ROBOROCK_IP", "127.0.0.1")
ROBOT_PORT: Final[int] = int(os.getenv("ROBOROCK_PORT", "54321"))
TOKEN_HEX: Final[str] = os.getenv("ROBOROCK_TOKEN_HEX", "00000000000000000000000000000000")
TOKEN_RAW: Final[str] = os.getenv("ROBOROCK_TOKEN_RAW", "0000000000000000")
DUID: Final[str] = os.getenv("ROBOROCK_DUID", "MOCK_ROBOROCK_DUID")
MODEL: Final[str] = os.getenv("ROBOROCK_MODEL", "roborock.vacuum.ss09")
MODEL_NAME: Final[str] = "Roborock Q8 Max Pro"

# Socket & Protocol Tuning
DEFAULT_TIMEOUT: Final[float] = 2.5
MAX_RETRIES: Final[int] = 3
POLL_INTERVAL_CLEANING: Final[float] = 3.0
POLL_INTERVAL_IDLE: Final[float] = 10.0


def get_lan_ip(target_ip: str = ROBOT_IP) -> str:
    """Detect the host's local IPv4 interface belonging to the robot's subnet.

    Bypasses VPN tunnel virtual interfaces (e.g., Kaspersky VPN 10.x.x.x / 172.x.x.x)
    by identifying the physical Ethernet/Wi-Fi adapter in the 192.168.1.x subnet.
    """
    target_prefix = ".".join(target_ip.split(".")[:3]) + "."

    # Strategy 1: Enumerate all local network interfaces assigned to the host
    try:
        hostname = socket.gethostname()
        _, _, ip_list = socket.gethostbyname_ex(hostname)
        for ip in ip_list:
            if ip.startswith(target_prefix):
                logger.debug("Resolved LAN IP via gethostbyname_ex: %s", ip)
                return ip
    except Exception as exc:
        logger.warning("Interface enumeration failed: %s", exc)

    # Strategy 2: Probe routing socket towards target IP
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as probe_sock:
            probe_sock.connect((target_ip, ROBOT_PORT))
            detected_ip = probe_sock.getsockname()[0]
            if detected_ip and not detected_ip.startswith("127."):
                logger.debug("Resolved LAN IP via routing probe: %s", detected_ip)
                return detected_ip
    except Exception as exc:
        logger.warning("Routing probe socket failed: %s", exc)

    # Strategy 3: Deterministic fallback default
    fallback_ip = os.getenv("HOST_LAN_IP", "127.0.0.1")
    logger.info("Using fallback LAN IP: %s", fallback_ip)
    return fallback_ip
