"""
Veri Dışa ve İçe Aktarma Modülü (exporter.py).
Bulunan cihaz listesini JSON ve CSV formatında veri kaybı olmadan,
Türkçe karakter (UTF-8) ve özel karakter bütünlüğü korunarak dışa ve içe aktarır.
"""

import csv
from dataclasses import asdict, is_dataclass
import io
import json
from pathlib import Path
from typing import Any, Dict, List, Optional, Union


def device_to_dict(device: Any) -> Dict[str, Any]:
    """
    DeviceInfo dataclass nesnesini veya sözlük yapısını standartlaştırılmış
    bir sözlüğe çevirir.
    """
    if device is None:
        raise ValueError("Cihaz nesnesi None olamaz.")

    if is_dataclass(device):
        d = asdict(device)
        if "ip" not in d or "mac" not in d:
            raise ValueError("Cihaz nesnesinde 'ip' ve 'mac' alanları zorunludur.")
        return {
            "ip": str(d["ip"]),
            "mac": str(d["mac"]),
            "vendor": d.get("vendor") or "Bilinmeyen Üretici",
            "hostname": d.get("hostname"),
            "response_time_ms": float(d["response_time_ms"]) if d.get("response_time_ms") is not None else None,
            "status": d.get("status", "reachable"),
        }

    if isinstance(device, dict):
        if "ip" not in device or "mac" not in device:
            raise KeyError("Cihaz sözlüğünde 'ip' ve 'mac' anahtarları zorunludur.")
        return {
            "ip": str(device["ip"]),
            "mac": str(device["mac"]),
            "vendor": device.get("vendor") or "Bilinmeyen Üretici",
            "hostname": device.get("hostname"),
            "response_time_ms": float(device["response_time_ms"]) if device.get("response_time_ms") is not None else None,
            "status": device.get("status", "reachable"),
        }

    raise TypeError(f"Geçersiz cihaz türü: {type(device)}")


def export_to_json(
    devices: List[Union[Dict[str, Any], Any]],
    target: Optional[Union[str, Path, io.TextIOBase]] = None,
    indent: int = 2,
) -> str:
    """
    Cihaz listesini JSON formatına aktarır.
    Hedef verilmişse (dosya yolu veya StringIO) dosyaya yazar.
    Her durumda oluşturulan JSON metnini döndürür.
    UTF-8 ve Türkçe karakterleri ('ensure_ascii=False') korur.
    devices None ise ValueError fırlatır.
    """
    if devices is None:
        raise ValueError("Cihaz listesi None olamaz.")
    if not isinstance(devices, list):
        raise ValueError("Cihazlar bir liste olmalıdır.")

    device_dicts = [device_to_dict(d) for d in devices]
    json_str = json.dumps(device_dicts, ensure_ascii=False, indent=indent)

    if target is not None:
        if isinstance(target, (str, Path)):
            Path(target).write_text(json_str, encoding="utf-8")
        elif hasattr(target, "write"):
            target.write(json_str)
        else:
            raise ValueError("Geçersiz hedef türü.")

    return json_str


def import_from_json(source: Union[str, Path, io.TextIOBase]) -> List[Dict[str, Any]]:
    """
    JSON dosyasından, metninden veya akışından cihaz listesini içe aktarır.
    Geçersiz JSON veya hatalı şemada ValueError fırlatır.
    """
    if source is None:
        raise ValueError("Kaynak None olamaz.")

    if isinstance(source, Path):
        content = source.read_text(encoding="utf-8")
    elif hasattr(source, "read"):
        content = source.read()
    elif isinstance(source, str):
        s_str = source.strip()
        if not s_str:
            raise ValueError("Boş JSON verisi.")
        try:
            p = Path(s_str)
            if p.is_file():
                content = p.read_text(encoding="utf-8")
            else:
                content = source
        except (OSError, ValueError):
            content = source
    else:
        raise ValueError("Desteklenmeyen kaynak tipi.")

    if not content or not content.strip():
        raise ValueError("Boş JSON içeriği.")

    try:
        data = json.loads(content)
    except Exception as e:
        raise ValueError(f"Geçersiz JSON biçimi: {e}") from e

    if not isinstance(data, list):
        raise ValueError("JSON verisi bir liste içermelidir.")

    return [device_to_dict(item) for item in data]


def export_to_csv(
    devices: List[Union[Dict[str, Any], Any]],
    target: Optional[Union[str, Path, io.TextIOBase]] = None,
) -> str:
    """
    Cihaz listesini RFC 4180 uyumlu CSV formatına dönüştürür.
    Alanlar: ip, mac, vendor, hostname, response_time_ms, status.
    Virgül, tırnak işareti, yeni satır ve Türkçe karakterleri güvenle sarar.
    devices None ise ValueError fırlatır.
    """
    if devices is None:
        raise ValueError("Cihaz listesi None olamaz.")
    if not isinstance(devices, list):
        raise ValueError("Cihazlar bir liste olmalıdır.")

    fieldnames = ["ip", "mac", "vendor", "hostname", "response_time_ms", "status"]
    output = io.StringIO()
    writer = csv.DictWriter(output, fieldnames=fieldnames, lineterminator="\n")
    writer.writeheader()

    for dev in devices:
        d = device_to_dict(dev)
        writer.writerow({
            "ip": d["ip"],
            "mac": d["mac"],
            "vendor": d["vendor"],
            "hostname": d["hostname"] if d["hostname"] is not None else "",
            "response_time_ms": d["response_time_ms"] if d["response_time_ms"] is not None else "",
            "status": d["status"],
        })

    csv_str = output.getvalue()
    if target is not None:
        if isinstance(target, (str, Path)):
            Path(target).write_text(csv_str, encoding="utf-8")
        elif hasattr(target, "write"):
            target.write(csv_str)
        else:
            raise ValueError("Geçersiz hedef türü.")

    return csv_str


def import_from_csv(source: Union[str, Path, io.TextIOBase]) -> List[Dict[str, Any]]:
    """
    CSV dosyasından, metninden veya akışından cihaz listesini okur.
    Başlıkları doğrular, sayısal değerleri (response_time_ms) uygun tiplere dönüştürür.
    Bozuk veya uyumsuz CSV durumunda ValueError fırlatır.
    """
    if source is None:
        raise ValueError("Kaynak None olamaz.")

    if isinstance(source, Path):
        content = source.read_text(encoding="utf-8")
    elif hasattr(source, "read"):
        content = source.read()
    elif isinstance(source, str):
        s_str = source.strip()
        if not s_str:
            raise ValueError("Boş CSV verisi.")
        try:
            p = Path(s_str)
            if p.is_file():
                content = p.read_text(encoding="utf-8")
            else:
                content = source
        except (OSError, ValueError):
            content = source
    else:
        raise ValueError("Desteklenmeyen kaynak tipi.")

    if not content or not content.strip():
        raise ValueError("Boş CSV içeriği.")

    f = io.StringIO(content.strip())
    reader = csv.DictReader(f)

    if not reader.fieldnames:
        raise ValueError("CSV dosyasında başlık satırı bulunamadı.")

    required_fields = ["ip", "mac", "vendor", "hostname", "response_time_ms", "status"]
    if not set(required_fields).issubset(set(reader.fieldnames)):
        raise ValueError("CSV başlıkları eksik veya geçersiz.")

    devices: List[Dict[str, Any]] = []
    for row in reader:
        if None in row or row.get("ip") is None or row.get("mac") is None:
            raise ValueError("CSV satırında eksik veya geçersiz sütun verisi.")

        rt_raw = row.get("response_time_ms")
        if rt_raw is not None and str(rt_raw).strip() != "":
            try:
                rt = float(str(rt_raw).strip())
            except ValueError as e:
                raise ValueError(f"Geçersiz response_time_ms: {rt_raw}") from e
        else:
            rt = None

        h_raw = row.get("hostname")
        hostname = str(h_raw).strip() if h_raw and str(h_raw).strip() != "" else None

        devices.append({
            "ip": row["ip"].strip(),
            "mac": row["mac"].strip(),
            "vendor": row.get("vendor", "").strip() or "Bilinmeyen Üretici",
            "hostname": hostname,
            "response_time_ms": rt,
            "status": row.get("status", "reachable").strip() or "reachable",
        })

    return devices
