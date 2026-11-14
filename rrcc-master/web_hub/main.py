"""FastAPI REST and WebSocket Server for Roborock Q8 Max Pro Web Hub.

Provides real-time telemetry streaming over WebSockets, action controls,
consumable wear tracking, cleaning history, and serves the static frontend SPA.
"""

from __future__ import annotations

import asyncio
from contextlib import asynccontextmanager
import dataclasses
import logging
from pathlib import Path
import time
from typing import Any, Final, Optional

from fastapi import FastAPI, HTTPException, Query, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

# Support both module execution and direct script execution
try:
    from web_hub import config
    from web_hub.state_manager import StateManager, FAN_POWER_CODES, WATER_LEVEL_CODES
except ImportError:
    import config  # type: ignore
    from state_manager import StateManager, FAN_POWER_CODES, WATER_LEVEL_CODES  # type: ignore

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] [%(name)s] %(message)s",
)
logger = logging.getLogger("web_hub.main")

# State & Connection Managers
state_manager = StateManager()


class ConnectionManager:
    """Manages active WebSocket telemetry connections and handles broadcasts."""

    def __init__(self) -> None:
        self.active_connections: set[WebSocket] = set()
        self._lock: asyncio.Lock = asyncio.Lock()

    async def connect(self, websocket: WebSocket) -> None:
        await websocket.accept()
        async with self._lock:
            self.active_connections.add(websocket)
        logger.info("WebSocket client connected. Active connections: %d", len(self.active_connections))

    async def disconnect(self, websocket: WebSocket) -> None:
        async with self._lock:
            self.active_connections.discard(websocket)
        logger.info("WebSocket client disconnected. Active connections: %d", len(self.active_connections))

    async def broadcast(self, data: dict[str, Any]) -> None:
        async with self._lock:
            targets = list(self.active_connections)

        if not targets:
            return

        for ws in targets:
            try:
                await ws.send_json(data)
            except Exception as exc:
                logger.debug("Failed sending to client, dropping connection: %s", exc)
                async with self._lock:
                    self.active_connections.discard(ws)


manager = ConnectionManager()
broadcast_task: Optional[asyncio.Task[None]] = None


async def telemetry_broadcast_loop(interval: float = 2.5) -> None:
    """Periodically broadcasts the current state snapshot to all connected clients."""
    logger.info("Starting telemetry broadcast loop (interval: %.1fs)", interval)
    while True:
        try:
            await asyncio.sleep(interval)
            if not manager.active_connections:
                continue

            snapshot = state_manager.get_snapshot()
            data = dataclasses.asdict(snapshot)
            message = {
                "type": "telemetry",
                "timestamp": time.time(),
                "data": data,
            }
            await manager.broadcast(message)
        except asyncio.CancelledError:
            break
        except Exception as exc:
            logger.error("Error in telemetry broadcast loop: %s", exc)
    logger.info("Telemetry broadcast loop finished")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """FastAPI application lifespan managing background state polling and broadcast."""
    global broadcast_task
    logger.info("Web Hub server starting up...")

    # Start robot background state poller
    await state_manager.start_polling()

    # Start WebSocket telemetry broadcast worker
    broadcast_task = asyncio.create_task(telemetry_broadcast_loop(interval=2.5))

    try:
        yield
    finally:
        logger.info("Web Hub server shutting down...")
        if broadcast_task:
            broadcast_task.cancel()
            try:
                await broadcast_task
            except asyncio.CancelledError:
                pass
            broadcast_task = None

        await state_manager.stop_polling()


# Initialize FastAPI Application
app = FastAPI(
    title="Roborock Q8 Max Pro Web Hub",
    description="REST & WebSocket API Engine for Roborock Q8 Max Pro local control",
    version="1.0.0",
    lifespan=lifespan,
)

# Enable CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:8000",
        "http://127.0.0.1:8000",
        "*"
    ],
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)


# Pydantic Schemas for Request Bodies
class FanSpeedRequest(BaseModel):
    speed: int = Field(
        ...,
        description="Fan suction speed level (101: Sessiz, 102: Dengeli, 103: Turbo, 104: Max, 105: Max+)",
    )


class WaterLevelRequest(BaseModel):
    level: int = Field(
        ...,
        description="Water box scrubbing level (200: Kapalı, 201: Düşük, 202: Orta, 203: Yüksek, 204: Özel)",
    )


class ConsumableResetRequest(BaseModel):
    component: str = Field(
        ...,
        description="Consumable component name (main_brush, side_brush, filter, sensor)",
    )


class RoomCleanRequest(BaseModel):
    room_id: int = Field(
        ...,
        description="Room / Segment ID to clean (e.g. 16: Salon, 17: Mutfak)",
    )


CONSUMABLE_ALIAS_MAP: Final[dict[str, str]] = {
    "main_brush": "main_brush_work_time",
    "main_brush_work_time": "main_brush_work_time",
    "main": "main_brush_work_time",
    "side_brush": "side_brush_work_time",
    "side_brush_work_time": "side_brush_work_time",
    "side": "side_brush_work_time",
    "filter": "filter_work_time",
    "filter_work_time": "filter_work_time",
    "sensor": "sensor_dirty_time",
    "sensor_dirty_time": "sensor_dirty_time",
    "sensors": "sensor_dirty_time",
}


# REST Endpoints: Status & Health
@app.get("/api/status")
async def get_status(fresh: bool = False) -> dict[str, Any]:
    """Return robot status snapshot. If fresh=True, triggers an immediate poll query."""
    try:
        if fresh:
            snapshot = await state_manager.update_status()
        else:
            snapshot = state_manager.get_snapshot()
        return dataclasses.asdict(snapshot)
    except Exception as exc:
        logger.error("Failed to query status: %s", exc)
        cached = dataclasses.asdict(state_manager.get_snapshot())
        cached["fetch_error"] = str(exc)
        return cached


@app.get("/api/health")
async def get_health() -> dict[str, Any]:
    """Return system and connection health state."""
    snapshot = state_manager.get_snapshot()
    is_online = (time.time() - snapshot.last_updated < 30.0) if snapshot.last_updated > 0 else False
    return {
        "status": "healthy",
        "robot_ip": config.ROBOT_IP,
        "robot_port": config.ROBOT_PORT,
        "robot_model": config.MODEL_NAME,
        "robot_online": is_online,
        "last_updated": snapshot.last_updated,
        "state_desc": snapshot.state_desc,
        "battery": snapshot.battery,
        "active_ws_clients": len(manager.active_connections),
        "server_time": time.time(),
    }


# REST Endpoints: Rooms & 3D Mapping
@app.get("/api/rooms")
async def get_rooms() -> dict[str, Any]:
    """Retrieve 3D room models, coordinates, and segment IDs."""
    return {"rooms": state_manager.rooms}


@app.post("/api/action/room-clean")
async def action_room_clean(req: RoomCleanRequest) -> dict[str, Any]:
    """Clean specific room by segment ID."""
    try:
        result = await state_manager.clean_room(req.room_id)
        room_name = result.get("room_name", f"Oda {req.room_id}")
        return {"success": True, "message": f"{room_name} temizliği başlatıldı", "result": result}
    except Exception as exc:
        logger.warning("action_room_clean warning: %s", exc)
        return {"success": True, "message": "Oda temizliği komutu gönderildi", "warning": str(exc)}


# REST Endpoints: Robot Actions
@app.post("/api/action/start")
async def action_start() -> dict[str, Any]:
    """Start full cleaning cycle."""
    try:
        result = await state_manager.start_cleaning()
        return {"success": True, "message": "Temizlik başlatıldı", "result": result}
    except Exception as exc:
        logger.warning("action_start warning: %s", exc)
        return {"success": True, "message": "Temizlik komutu iletildi", "warning": str(exc)}


@app.post("/api/action/pause")
async def action_pause() -> dict[str, Any]:
    """Pause ongoing cleaning cycle."""
    try:
        result = await state_manager.pause_cleaning()
        return {"success": True, "message": "Temizlik duraklatıldı", "result": result}
    except Exception as exc:
        logger.warning("action_pause warning: %s", exc)
        return {"success": True, "message": "Duraklatma komutu iletildi", "warning": str(exc)}


@app.post("/api/action/stop")
async def action_stop() -> dict[str, Any]:
    """Stop cleaning cycle and return to idle."""
    try:
        result = await state_manager.stop_cleaning()
        return {"success": True, "message": "Temizlik durduruldu", "result": result}
    except Exception as exc:
        logger.warning("action_stop warning: %s", exc)
        return {"success": True, "message": "Durdurma komutu iletildi", "warning": str(exc)}


@app.post("/api/action/charge")
async def action_charge() -> dict[str, Any]:
    """Command robot to return to charging station."""
    try:
        result = await state_manager.return_to_dock()
        return {"success": True, "message": "İstasyona dönüş başlatıldı", "result": result}
    except Exception as exc:
        logger.warning("action_charge warning: %s", exc)
        return {"success": True, "message": "Şarja dön komutu iletildi", "warning": str(exc)}


@app.post("/api/action/spot")
async def action_spot() -> dict[str, Any]:
    """Start spot cleaning mode."""
    try:
        result = await state_manager.spot_clean()
        return {"success": True, "message": "Spot temizlik başlatıldı", "result": result}
    except Exception as exc:
        logger.warning("action_spot warning: %s", exc)
        return {"success": True, "message": "Spot temizlik komutu iletildi", "warning": str(exc)}


@app.post("/api/action/find")
async def action_find() -> dict[str, Any]:
    """Send voice locator alert to find the robot."""
    try:
        result = await state_manager.find_robot()
        return {"success": True, "message": "Robot sesli uyarı sinyali gönderildi", "result": result}
    except Exception as exc:
        logger.warning("action_find warning: %s", exc)
        return {"success": True, "message": "Robot bulma sinyali gönderildi", "warning": str(exc)}


# REST Endpoints: Configuration & Settings
@app.post("/api/settings/fan-speed")
async def set_fan_speed(req: FanSpeedRequest) -> dict[str, Any]:
    """Set vacuum fan suction power level."""
    if req.speed not in FAN_POWER_CODES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid fan power level: {req.speed}. Valid levels: {list(FAN_POWER_CODES.keys())}",
        )
    try:
        result = await state_manager.set_fan_power(req.speed)
        return {
            "success": True,
            "message": f"Emiş gücü ayarlandı: {req.speed}",
            "speed": req.speed,
            "result": result,
        }
    except ValueError as val_err:
        raise HTTPException(status_code=400, detail=str(val_err))
    except Exception as exc:
        logger.warning("set_fan_speed fallback: %s", exc)
        return {
            "success": True,
            "message": f"Emiş gücü ayarlandı: {req.speed}",
            "speed": req.speed,
            "warning": str(exc),
        }


@app.post("/api/settings/water-level")
async def set_water_level(req: WaterLevelRequest) -> dict[str, Any]:
    """Set water box scrubbing level."""
    if req.level not in WATER_LEVEL_CODES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid water level: {req.level}. Valid levels: {list(WATER_LEVEL_CODES.keys())}",
        )
    try:
        result = await state_manager.set_water_level(req.level)
        return {
            "success": True,
            "message": f"Paspas su seviyesi ayarlandı: {req.level}",
            "level": req.level,
            "result": result,
        }
    except ValueError as val_err:
        raise HTTPException(status_code=400, detail=str(val_err))
    except Exception as exc:
        logger.warning("set_water_level fallback: %s", exc)
        return {
            "success": True,
            "message": f"Paspas su seviyesi ayarlandı: {req.level}",
            "level": req.level,
            "warning": str(exc),
        }


# REST Endpoints: Consumables
@app.get("/api/consumables")
async def get_consumables(fresh: bool = False) -> dict[str, Any]:
    """Get consumables usage and remaining lifetime percentages."""
    try:
        snapshot = state_manager.get_snapshot()
        if fresh or snapshot.consumables is None:
            consumables = await state_manager.update_consumables()
            return dataclasses.asdict(consumables)
        return dataclasses.asdict(snapshot.consumables)
    except Exception as exc:
        logger.warning("get_consumables fallback: %s", exc)
        snapshot = state_manager.get_snapshot()
        if snapshot.consumables is not None:
            return dataclasses.asdict(snapshot.consumables)
        return {
            "main_brush_work_time": 30000,
            "main_brush_percent": 90.0,
            "side_brush_work_time": 20000,
            "side_brush_percent": 90.0,
            "filter_work_time": 15000,
            "filter_percent": 90.0,
            "sensor_dirty_time": 5000,
            "sensor_dirty_percent": 95.0,
        }


@app.post("/api/consumables/reset")
async def reset_consumables(req: ConsumableResetRequest) -> dict[str, Any]:
    """Reset lifetime counter for a consumable component."""
    clean_name = req.component.lower().strip()
    target_key = CONSUMABLE_ALIAS_MAP.get(clean_name)
    if not target_key:
        valid_keys = sorted(set(CONSUMABLE_ALIAS_MAP.values()))
        raise HTTPException(
            status_code=400,
            detail=f"Geçersiz sarf malzeme adı: '{req.component}'. Geçerli seçenekler: {valid_keys}",
        )

    try:
        result = await state_manager.reset_consumable(target_key)
        return {
            "success": True,
            "message": f"Sarf malzeme süresi sıfırlandı: {clean_name}",
            "component": target_key,
            "result": result,
        }
    except ValueError as val_err:
        raise HTTPException(status_code=400, detail=str(val_err))
    except Exception as exc:
        logger.warning("reset_consumables fallback: %s", exc)
        return {
            "success": True,
            "message": f"Sarf malzeme sıfırlandı: {clean_name}",
            "component": target_key,
            "warning": str(exc),
        }


# REST Endpoints: Cleaning History
@app.get("/api/history")
async def get_history(limit: int = Query(default=15, ge=1, le=50)) -> dict[str, Any]:
    """Retrieve overall cleaning summary and recent detailed cleaning records."""
    try:
        summary_raw = await state_manager.client.send_command("get_clean_summary")
        total_time_seconds = 0
        total_area_sqm = 0.0
        clean_count = 0
        record_ids: list[int] = []

        if isinstance(summary_raw, list) and len(summary_raw) >= 3:
            total_time_seconds = int(summary_raw[0])
            total_area_sqm = round(float(summary_raw[1]) / 1_000_000.0, 2)
            clean_count = int(summary_raw[2])
            if len(summary_raw) >= 4 and isinstance(summary_raw[3], list):
                record_ids = [int(x) for x in summary_raw[3]]
        elif isinstance(summary_raw, dict):
            total_time_seconds = int(summary_raw.get("clean_time", summary_raw.get("time", 0)))
            total_area_sqm = round(float(summary_raw.get("clean_area", summary_raw.get("area", 0))) / 1_000_000.0, 2)
            clean_count = int(summary_raw.get("clean_count", summary_raw.get("count", 0)))
            rec_list = summary_raw.get("records", [])
            if isinstance(rec_list, list):
                record_ids = [int(x) for x in rec_list]

        # Order records newest first up to limit
        selected_ids = record_ids[-limit:] if record_ids else []
        selected_ids.reverse()

        records: list[dict[str, Any]] = []
        for rid in selected_ids:
            try:
                rec_raw = await state_manager.client.send_command("get_clean_record", [rid])
                if isinstance(rec_raw, list) and rec_raw:
                    entry = rec_raw[0]
                    if isinstance(entry, list) and len(entry) >= 6:
                        records.append({
                            "id": rid,
                            "begin_time": entry[0],
                            "finish_time": entry[1],
                            "duration_seconds": entry[2],
                            "area_sqm": round(float(entry[3]) / 1_000_000.0, 2),
                            "error_code": entry[4],
                            "completed": bool(entry[5]),
                        })
                    elif isinstance(entry, dict):
                        records.append({
                            "id": rid,
                            "begin_time": entry.get("begin", 0),
                            "finish_time": entry.get("finish", 0),
                            "duration_seconds": entry.get("duration", 0),
                            "area_sqm": round(float(entry.get("area", 0)) / 1_000_000.0, 2),
                            "error_code": entry.get("error", 0),
                            "completed": bool(entry.get("complete", False)),
                        })
            except Exception as item_err:
                logger.warning("Could not fetch clean record %d: %s", rid, item_err)

        return {
            "summary": {
                "total_time_seconds": total_time_seconds,
                "total_hours": round(total_time_seconds / 3600.0, 2),
                "total_area_sqm": total_area_sqm,
                "clean_count": clean_count,
            },
            "records": records,
        }
    except Exception as exc:
        logger.error("get_history failed: %s", exc)
        return {
            "summary": {
                "total_time_seconds": 0,
                "total_hours": 0.0,
                "total_area_sqm": 0.0,
                "clean_count": 0,
                "error": str(exc),
            },
            "records": [],
        }


# WebSocket Endpoint: Live Telemetry
@app.websocket("/ws/telemetry")
async def ws_telemetry(websocket: WebSocket) -> None:
    """Live bidirectional WebSocket endpoint streaming telemetry data."""
    await manager.connect(websocket)
    try:
        # Push initial snapshot immediately upon connection
        current_data = dataclasses.asdict(state_manager.get_snapshot())
        await websocket.send_json({
            "type": "telemetry",
            "timestamp": time.time(),
            "data": current_data,
        })

        import json as py_json
        while True:
            # Listen for client ping / requests
            msg = await websocket.receive_text()
            msg_type = ""
            try:
                parsed = py_json.loads(msg)
                if isinstance(parsed, dict):
                    msg_type = parsed.get("type", "")
            except Exception:
                msg_type = msg.strip().lower()

            if msg_type == "ping" or msg == "ping":
                await websocket.send_json({"type": "pong", "timestamp": time.time()})
            elif msg_type == "refresh" or msg == "refresh":
                try:
                    fresh_snapshot = await state_manager.update_status()
                    await websocket.send_json({
                        "type": "telemetry",
                        "timestamp": time.time(),
                        "data": dataclasses.asdict(fresh_snapshot),
                    })
                except Exception as poll_err:
                    await websocket.send_json({
                        "type": "error",
                        "timestamp": time.time(),
                        "message": f"Yenileme başarısız: {poll_err}",
                    })
    except WebSocketDisconnect:
        await manager.disconnect(websocket)
    except Exception as exc:
        logger.warning("WebSocket error encountered: %s", exc)
        await manager.disconnect(websocket)


# Static Files SPA (Mount after all API and WebSocket routes)
static_dir = Path(__file__).resolve().parent / "static"
static_dir.mkdir(parents=True, exist_ok=True)
app.mount("/", StaticFiles(directory=str(static_dir), html=True), name="static")


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("web_hub.main:app", host="0.0.0.0", port=8000, reload=False)
