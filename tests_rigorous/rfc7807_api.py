"""RFC 7807 (Problem Details) compliant API, Idempotency-Key protection, SQL injection sanitization,
structured audit logging, and LiteLLM Anthropic API bridge validator.
"""

from __future__ import annotations
from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone
import hashlib
import json
import re
import threading
import time
from typing import Any, Callable, Dict, List, Optional
import urllib.error
import urllib.request
import uuid


@dataclass
class ProblemDetails:
    """RFC 7807 Problem Details representation."""
    type: str
    title: str
    status: int
    detail: str
    instance: str
    invalid_params: Optional[List[Dict[str, Any]]] = None
    code: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        res = {
            "type": self.type,
            "title": self.title,
            "status": self.status,
            "detail": self.detail,
            "instance": self.instance,
        }
        if self.invalid_params is not None:
            res["invalid_params"] = self.invalid_params
        if self.code is not None:
            res["code"] = self.code
        return res


@dataclass
class ApiResponse:
    status_code: int
    headers: Dict[str, str]
    body: Dict[str, Any]
    is_cached: bool = False


@dataclass
class AuditRecord:
    timestamp: str
    event_id: str
    action: str
    idempotency_key: Optional[str]
    status_code: int
    details: Dict[str, Any]

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


class AuditLogger:
    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._records: List[Dict[str, Any]] = []

    def log(self, action: str, status_code: int, idempotency_key: Optional[str] = None, **details: Any) -> Dict[str, Any]:
        record = AuditRecord(
            timestamp=datetime.now(timezone.utc).isoformat(),
            event_id=f"audit_{uuid.uuid4().hex[:12]}",
            action=action,
            idempotency_key=idempotency_key,
            status_code=status_code,
            details=details,
        )
        rec_dict = record.to_dict()
        with self._lock:
            self._records.append(rec_dict)
        return rec_dict

    def get_logs(self) -> List[Dict[str, Any]]:
        with self._lock:
            return list(self._records)

    def clear(self) -> None:
        with self._lock:
            self._records.clear()


class IdempotencyRecord:
    def __init__(self, key: str, payload_hash: str) -> None:
        self.key: str = key
        self.payload_hash: str = payload_hash
        self.status: str = "PROCESSING"  # PROCESSING, COMPLETED, FAILED
        self.response: Optional[ApiResponse] = None
        self.lock: threading.Lock = threading.Lock()


class OrderService:
    """Service handling order processing with RFC 7807 validation and Idempotency protection."""

    # SQL injection regex pattern checking common attack payloads
    SQLI_PATTERN = re.compile(
        r"(\b(UNION(\s+ALL)?|SELECT|INSERT|DELETE|UPDATE|DROP|ALTER|EXEC|EXECUTE)\b|--|;|\/\*|\*\/|'\s*(OR|AND)\s*['\d]|'--)",
        re.IGNORECASE,
    )

    def __init__(self, audit_logger: Optional[AuditLogger] = None) -> None:
        self.audit_logger: AuditLogger = audit_logger or AuditLogger()
        self._idempotency_store: Dict[str, IdempotencyRecord] = {}
        self._store_lock: threading.Lock = threading.Lock()
        self._orders_db: Dict[str, Dict[str, Any]] = {}

    def _check_sqli(self, value: Any) -> bool:
        if isinstance(value, str):
            return bool(self.SQLI_PATTERN.search(value))
        elif isinstance(value, dict):
            return any(self._check_sqli(v) for v in value.values())
        elif isinstance(value, list):
            return any(self._check_sqli(v) for v in value)
        return False

    def _compute_hash(self, payload: Dict[str, Any]) -> str:
        serialized = json.dumps(payload, sort_keys=True)
        return hashlib.sha256(serialized.encode("utf-8")).hexdigest()

    def process_order(
        self,
        payload: Dict[str, Any],
        idempotency_key: Optional[str],
        request_path: str = "/api/v1/orders",
    ) -> ApiResponse:
        req_instance = f"{request_path}/{uuid.uuid4().hex[:8]}"

        # 1. Validate Idempotency-Key header presence
        if not idempotency_key or not idempotency_key.strip():
            problem = ProblemDetails(
                type="https://api.example.com/errors/missing-header",
                title="Missing Required Header",
                status=400,
                detail="The 'Idempotency-Key' HTTP header is mandatory for order creation.",
                instance=req_instance,
                code="ERR_MISSING_IDEMPOTENCY_KEY",
            )
            self.audit_logger.log("HEADER_VALIDATION_FAILED", 400, idempotency_key, reason="Missing Idempotency-Key")
            return ApiResponse(status_code=400, headers={"Content-Type": "application/problem+json"}, body=problem.to_dict())

        payload_hash = self._compute_hash(payload)

        # 2. Concurrency and Idempotency registry management
        with self._store_lock:
            if idempotency_key in self._idempotency_store:
                record = self._idempotency_store[idempotency_key]
                is_existing = True
            else:
                record = IdempotencyRecord(idempotency_key, payload_hash)
                self._idempotency_store[idempotency_key] = record
                record.lock.acquire()
                is_existing = False

        if is_existing:
            # If already acquired by another thread that is currently processing:
            # wait on lock to read response
            acquired = record.lock.acquire(timeout=5.0)
            if not acquired:
                problem = ProblemDetails(
                    type="https://api.example.com/errors/concurrent-conflict",
                    title="Conflict",
                    status=409,
                    detail=f"Request with idempotency key '{idempotency_key}' is currently being processed.",
                    instance=req_instance,
                )
                self.audit_logger.log("IDEMPOTENCY_LOCKED", 409, idempotency_key)
                return ApiResponse(status_code=409, headers={"Content-Type": "application/problem+json"}, body=problem.to_dict())

            try:
                # Payload integrity check
                if record.payload_hash != payload_hash:
                    problem = ProblemDetails(
                        type="https://api.example.com/errors/idempotency-payload-mismatch",
                        title="Unprocessable Entity",
                        status=422,
                        detail=f"Idempotency key '{idempotency_key}' was previously used with a different request payload.",
                        instance=req_instance,
                        code="ERR_IDEMPOTENCY_MISMATCH",
                    )
                    self.audit_logger.log("IDEMPOTENCY_MISMATCH", 422, idempotency_key)
                    return ApiResponse(status_code=422, headers={"Content-Type": "application/problem+json"}, body=problem.to_dict())

                if record.status == "COMPLETED" and record.response is not None:
                    # Return idempotent replay
                    self.audit_logger.log("IDEMPOTENT_REPLAY", record.response.status_code, idempotency_key)
                    replay_resp = ApiResponse(
                        status_code=record.response.status_code,
                        headers={**record.response.headers, "Idempotent-Replayed": "true"},
                        body=record.response.body,
                        is_cached=True,
                    )
                    return replay_resp
            finally:
                record.lock.release()

        # 3. Process new request under record lock
        try:
            # SQL Injection Sanitization Check
            if self._check_sqli(payload):
                problem = ProblemDetails(
                    type="https://api.example.com/errors/security-violation",
                    title="Security Violation",
                    status=422,
                    detail="Potential SQL injection pattern detected in payload.",
                    instance=req_instance,
                    code="ERR_SQL_INJECTION_DETECTED",
                )
                self.audit_logger.log("SECURITY_ALERT_SQLI", 422, idempotency_key, payload=payload)
                resp = ApiResponse(status_code=422, headers={"Content-Type": "application/problem+json"}, body=problem.to_dict())
                record.status = "FAILED"
                record.response = resp
                return resp

            # Schema and business validation
            invalid_params: List[Dict[str, Any]] = []

            customer_id = payload.get("customer_id")
            if not customer_id or not isinstance(customer_id, str):
                invalid_params.append({"name": "customer_id", "reason": "Field 'customer_id' must be a non-empty string"})

            items = payload.get("items")
            if not items or not isinstance(items, list):
                invalid_params.append({"name": "items", "reason": "Field 'items' must be a non-empty list of items"})
            else:
                calculated_total = 0.0
                for idx, item in enumerate(items):
                    if not isinstance(item, dict):
                        invalid_params.append({"name": f"items[{idx}]", "reason": "Item must be an object"})
                        continue

                    qty = item.get("quantity")
                    price = item.get("price")

                    if qty is None or not isinstance(qty, int) or qty <= 0:
                        invalid_params.append({
                            "name": f"items[{idx}].quantity",
                            "value": qty,
                            "reason": "Quantity must be an integer greater than 0"
                        })

                    if price is None or not isinstance(price, (int, float)) or price <= 0:
                        invalid_params.append({
                            "name": f"items[{idx}].price",
                            "value": price,
                            "reason": "Price must be a number greater than 0"
                        })

                    if qty is not None and price is not None and qty > 0 and price > 0:
                        calculated_total += qty * price

            total_amount = payload.get("total_amount")
            if total_amount is None or not isinstance(total_amount, (int, float)) or total_amount <= 0:
                invalid_params.append({"name": "total_amount", "reason": "Field 'total_amount' must be positive"})
            elif not invalid_params and abs(total_amount - calculated_total) > 0.01:
                invalid_params.append({
                    "name": "total_amount",
                    "reason": f"total_amount ({total_amount}) does not match sum of items ({calculated_total})"
                })

            if invalid_params:
                problem = ProblemDetails(
                    type="https://api.example.com/errors/validation-error",
                    title="Unprocessable Entity",
                    status=422,
                    detail=f"Validation failed for {len(invalid_params)} field(s).",
                    instance=req_instance,
                    invalid_params=invalid_params,
                    code="ERR_VALIDATION_FAILED",
                )
                self.audit_logger.log("VALIDATION_FAILED", 422, idempotency_key, errors=invalid_params)
                resp = ApiResponse(status_code=422, headers={"Content-Type": "application/problem+json"}, body=problem.to_dict())
                record.status = "FAILED"
                record.response = resp
                return resp

            # 4. Create Order successfully
            order_id = f"ord_{uuid.uuid4().hex[:10]}"
            order_data = {
                "order_id": order_id,
                "customer_id": customer_id,
                "items": items,
                "total_amount": total_amount,
                "status": "CREATED",
                "created_at": datetime.now(timezone.utc).isoformat(),
            }
            self._orders_db[order_id] = order_data

            self.audit_logger.log("ORDER_CREATED", 201, idempotency_key, order_id=order_id, total=total_amount)
            resp = ApiResponse(
                status_code=201,
                headers={"Content-Type": "application/json", "Location": f"/api/v1/orders/{order_id}"},
                body=order_data,
                is_cached=False,
            )
            record.status = "COMPLETED"
            record.response = resp
            return resp

        finally:
            record.lock.release()


class LiteLLMAnthropicBridge:
    """LiteLLM Anthropic API message format validator and client bridge."""

    def __init__(self, endpoint_url: str = "http://127.0.0.1:8000/v1/messages") -> None:
        self.endpoint_url: str = endpoint_url

    def build_anthropic_payload(
        self,
        model: str,
        messages: List[Dict[str, str]],
        max_tokens: int = 1024,
        temperature: float = 0.0,
    ) -> Dict[str, Any]:
        """Construct Anthropic Messages API payload."""
        if not model or not isinstance(model, str):
            raise ValueError("Model must be a non-empty string")
        if not messages or not isinstance(messages, list):
            raise ValueError("Messages must be a non-empty list")
        for m in messages:
            if "role" not in m or "content" not in m:
                raise ValueError("Each message must have 'role' and 'content' keys")

        return {
            "model": model,
            "messages": messages,
            "max_tokens": max_tokens,
            "temperature": temperature,
        }

    def validate_anthropic_response(self, response_data: Dict[str, Any]) -> bool:
        """Validate that response structure conforms to Anthropic Messages specification."""
        if not isinstance(response_data, dict):
            return False

        required_keys = {"id", "type", "role", "content", "usage"}
        if not required_keys.issubset(response_data.keys()):
            return False

        if response_data["type"] != "message" or response_data["role"] != "assistant":
            return False

        content = response_data.get("content")
        if not isinstance(content, list) or len(content) == 0:
            return False

        for block in content:
            if not isinstance(block, dict) or block.get("type") != "text" or "text" not in block:
                return False

        usage = response_data.get("usage")
        if not isinstance(usage, dict) or "input_tokens" not in usage or "output_tokens" not in usage:
            return False

        return True

    def send_message(
        self,
        model: str,
        messages: List[Dict[str, str]],
        max_tokens: int = 1024,
        timeout: float = 3.0,
        transport_fn: Optional[Callable[[Dict[str, Any]], Dict[str, Any]]] = None,
    ) -> Dict[str, Any]:
        """Send message to LiteLLM Anthropic proxy or use transport hook."""
        payload = self.build_anthropic_payload(model, messages, max_tokens)

        if transport_fn is not None:
            raw_response = transport_fn(payload)
        else:
            data_bytes = json.dumps(payload).encode("utf-8")
            req = urllib.request.Request(
                self.endpoint_url,
                data=data_bytes,
                headers={"Content-Type": "application/json", "x-api-key": "litellm-local"},
                method="POST",
            )
            try:
                with urllib.request.urlopen(req, timeout=timeout) as resp:
                    raw_response = json.loads(resp.read().decode("utf-8"))
            except urllib.error.URLError as err:
                raise ConnectionError(f"Failed to connect to LiteLLM bridge at {self.endpoint_url}: {err}") from err

        if not self.validate_anthropic_response(raw_response):
            raise ValueError(f"Invalid Anthropic API response format received: {raw_response}")

        return raw_response
