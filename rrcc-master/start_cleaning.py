import socket
import json
import hashlib
import time
from Crypto.Cipher import AES

IP = "192.168.1.44"
PORT = 54321
TOKEN_HEX = "6457713532704e374b56505062715362"

def send_miio_command(method="app_start", params=[]):
    token = bytes.fromhex(TOKEN_HEX)
    key = hashlib.md5(token).digest()
    iv = hashlib.md5(key + token).digest()
    
    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    sock.bind(("192.168.1.6", 0))
    sock.settimeout(3.0)
    
    # 1. Hello paketi ile Device ID ve Stamp al
    hello = bytes.fromhex("21310020ffffffffffffffffffffffffffffffffffffffffffffffffffffffff")
    print(f"[>] {IP}:{PORT} adresine miIO Hello gönderiliyor...")
    try:
        sock.sendto(hello, (IP, PORT))
        data, _ = sock.recvfrom(1024)
        did = data[8:12]
        stamp = int.from_bytes(data[12:16], "big") + 1
        print(f"[+] Robot yanıt verdi! DID: {did.hex()} | Stamp: {stamp}")
    except Exception as e:
        print(f"[-] Hello yanıtı alınamadı (Kaspersky VPN devrede olabilir): {e}")
        did = bytes.fromhex("00000000")
        stamp = int(time.time())
    
    # 2. app_start Payload Şifrele
    payload = json.dumps({"id": 1, "method": method, "params": params}).encode()
    pad_len = 16 - (len(payload) % 16)
    payload_padded = payload + bytes([pad_len] * pad_len)
    
    cipher = AES.new(key, AES.MODE_CBC, iv)
    encrypted = cipher.encrypt(payload_padded)
    
    # Header: 2131 + Length + 00000000 + DID + Stamp + Token
    header = bytearray(32)
    header[0:2] = bytes.fromhex("2131")
    total_len = 32 + len(encrypted)
    header[2:4] = total_len.to_bytes(2, "big")
    header[4:8] = bytes.fromhex("00000000")
    header[8:12] = did
    header[12:16] = stamp.to_bytes(4, "big")
    header[16:32] = token
    
    # MD5 Checksum
    checksum = hashlib.md5(header + encrypted).digest()
    header[16:32] = checksum
    
    packet = bytes(header) + encrypted
    print(f"[>] '{method}' komut paketi gönderiliyor...")
    sock.sendto(packet, (IP, PORT))
    
    try:
        resp_data, _ = sock.recvfrom(2048)
        resp_cipher = AES.new(key, AES.MODE_CBC, iv)
        resp_dec = resp_cipher.decrypt(resp_data[32:])
        # remove padding
        pad = resp_dec[-1]
        res_json = resp_dec[:-pad].decode("utf-8", errors="ignore")
        print(f"[✓] CİHAZ YANITI: {res_json}")
        print("[✓] TEMİZLİK BAŞLADI!")
    except Exception as e:
        print(f"[i] Komut fırlatıldı! Yanıt okuma: {e}")
        
    sock.close()

if __name__ == "__main__":
    send_miio_command("app_start")
