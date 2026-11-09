"""Asynchronous miIO Protocol Client for Roborock vacuums.

Implements UDP handshake, AES-128-CBC encryption/decryption, PKCS7 padding,
network interface binding (Kaspersky VPN bypass), and automatic retries.
"""

from __future__ import annotations

import asyncio
import hashlib
import json
import logging
import socket
import time
from typing import Any, Final, Optional

from Crypto.Cipher import AES

from .config import (
    DEFAULT_TIMEOUT,
    MAX_RETRIES,
    ROBOT_IP,
    ROBOT_PORT,
    TOKEN_HEX,
    get_lan_ip,
)

logger = logging.getLogger("web_hub.miio")

HELLO_PACKET: Final[bytes] = bytes.fromhex(
    "21310020ffffffffffffffffffffffffffffffffffffffffffffffffffffffff"
)


class MiioError(Exception):
    """Base exception for miIO communication errors."""


class MiioTimeoutError(MiioError):
    """Raised when miIO operations encounter repeated timeouts."""


class MiioClient:
    """Asynchronous client communicating with Roborock robots via the miIO UDP protocol."""

    def __init__(
        self,
        ip: str = ROBOT_IP,
        port: int = ROBOT_PORT,
        token_hex: str = TOKEN_HEX,
        timeout: float = DEFAULT_TIMEOUT,
        max_retries: int = MAX_RETRIES,
        lan_ip: Optional[str] = None,
    ) -> None:
        self.ip: Final[str] = ip
        self.port: Final[int] = port
        self.token: Final[bytes] = bytes.fromhex(token_hex)
        self.timeout: Final[float] = timeout
        self.max_retries: Final[int] = max_retries

        # Derived AES keys
        self.key: Final[bytes] = hashlib.md5(self.token).digest()
        self.iv: Final[bytes] = hashlib.md5(self.key + self.token).digest()

        # Session state
        self.lan_ip: str = lan_ip or get_lan_ip(self.ip)
        self.did: bytes = bytes.fromhex("00000000")
        self.stamp: int = 0
        self.stamp_time: float = 0.0
        self._msg_id: int = 0
        self._lock: asyncio.Lock = asyncio.Lock()

    def _next_msg_id(self) -> int:
        self._msg_id = (self._msg_id % 99999) + 1
        return self._msg_id

    @staticmethod
    def _pad_pkcs7(data: bytes) -> bytes:
        pad_len = 16 - (len(data) % 16)
        return data + bytes([pad_len] * pad_len)

    @staticmethod
    def _unpad_pkcs7(data: bytes) -> bytes:
        if not data:
            return b""
        pad_len = data[-1]
        if pad_len < 1 or pad_len > 16:
            raise ValueError(f"Invalid PKCS7 padding length: {pad_len}")
        if data[-pad_len:] != bytes([pad_len] * pad_len):
            raise ValueError("PKCS7 padding corruption detected")
        return data[:-pad_len]

    def _handshake_sync(self, sock: socket.socket) -> bool:
        """Send miIO hello packet to discover device ID and current timestamp."""
        try:
            logger.debug("Sending miIO handshake to %s:%d", self.ip, self.port)
            sock.sendto(HELLO_PACKET, (self.ip, self.port))
            data, _ = sock.recvfrom(1024)
            if len(data) >= 32 and data[:2] == bytes.fromhex("2131"):
                self.did = data[8:12]
                self.stamp = int.from_bytes(data[12:16], "big")
                self.stamp_time = time.time()
                logger.info(
                    "Handshake successful. DID: %s, Stamp: %d",
                    self.did.hex(),
                    self.stamp,
                )
                return True
        except (socket.timeout, OSError) as exc:
            logger.warning("Handshake attempt failed: %s", exc)

        return False

    def _send_command_sync(self, method: str, params: list[Any]) -> Any:
        """Synchronous execution of a single miIO command with retries and timeout."""
        last_error: Optional[Exception] = None

        for attempt in range(1, self.max_retries + 1):
            sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            try:
                # Bind explicitly to the designated LAN IP to avoid Kaspersky VPN interference
                sock.bind((self.lan_ip, 0))
                sock.settimeout(self.timeout)

                # Check handshake validity (refresh if older than 120s or DID is zero)
                needs_handshake = (
                    self.did == bytes.fromhex("00000000")
                    or (time.time() - self.stamp_time) > 120.0
                )
                if needs_handshake:
                    self._handshake_sync(sock)

                # Calculate stamp
                if self.stamp and self.stamp_time:
                    elapsed = int(time.time() - self.stamp_time)
                    stamp_val = self.stamp + elapsed + 1
                else:
                    stamp_val = int(time.time())

                msg_id = self._next_msg_id()
                payload_dict = {"id": msg_id, "method": method, "params": params}
                payload_bytes = json.dumps(payload_dict, separators=(",", ":")).encode("utf-8")
                padded = self._pad_pkcs7(payload_bytes)

                cipher = AES.new(self.key, AES.MODE_CBC, self.iv)
                encrypted = cipher.encrypt(padded)

                # Header construction (32 bytes)
                header = bytearray(32)
                header[0:2] = bytes.fromhex("2131")
                total_len = 32 + len(encrypted)
                header[2:4] = total_len.to_bytes(2, "big")
                header[4:8] = bytes.fromhex("00000000")
                header[8:12] = self.did
                header[12:16] = stamp_val.to_bytes(4, "big")
                header[16:32] = self.token

                # MD5 checksum calculation
                checksum = hashlib.md5(header + encrypted).digest()
                header[16:32] = checksum

                packet = bytes(header) + encrypted
                logger.debug(
                    "Sending miIO command '%s' (id=%d, attempt=%d/%d)",
                    method,
                    msg_id,
                    attempt,
                    self.max_retries,
                )
                sock.sendto(packet, (self.ip, self.port))

                # Receive reply
                resp_data, _ = sock.recvfrom(4096)
                if len(resp_data) < 32 or resp_data[:2] != bytes.fromhex("2131"):
                    raise MiioError(f"Malformed response header: {resp_data[:8].hex()}")

                # Update DID and stamp from response
                self.did = resp_data[8:12]
                self.stamp = int.from_bytes(resp_data[12:16], "big")
                self.stamp_time = time.time()

                # Decrypt payload
                encrypted_resp = resp_data[32:]
                resp_cipher = AES.new(self.key, AES.MODE_CBC, self.iv)
                decrypted = resp_cipher.decrypt(encrypted_resp)
                unpadded = self._unpad_pkcs7(decrypted)
                resp_json = json.loads(unpadded.decode("utf-8"))

                logger.debug("Received miIO response for '%s': %s", method, resp_json)

                if "error" in resp_json and resp_json["error"] is not None:
                    raise MiioError(f"Device error response: {resp_json['error']}")

                return resp_json.get("result")

            except (socket.timeout, TimeoutError) as exc:
                last_error = exc
                logger.warning(
                    "Timeout waiting for response from %s:%d (attempt %d/%d): %s",
                    self.ip,
                    self.port,
                    attempt,
                    self.max_retries,
                    exc,
                )
            except OSError as exc:
                last_error = exc
                logger.warning(
                    "Socket OS error during '%s' (attempt %d/%d): %s",
                    method,
                    attempt,
                    self.max_retries,
                    exc,
                )
            except Exception as exc:
                last_error = exc
                logger.error("Unexpected error in miIO command '%s': %s", method, exc)
            finally:
                sock.close()

            if attempt < self.max_retries:
                time.sleep(0.4 * attempt)

        raise MiioTimeoutError(
            f"Failed to execute '{method}' on {self.ip}:{self.port} after "
            f"{self.max_retries} attempts. Last error: {last_error}"
        ) from last_error

    async def send_command(self, method: str, params: Optional[list[Any]] = None) -> Any:
        """Execute a miIO command asynchronously with concurrency locking and retry logic."""
        if params is None:
            params = []

        async with self._lock:
            return await asyncio.to_thread(self._send_command_sync, method, params)
