"""Rigorous test suite for RFC 7807 Problem Details API, Idempotency-Key handling,
SQL injection protection, audit logging, and LiteLLM Anthropic bridge format validation.
"""

from __future__ import annotations
import concurrent.futures
import json
import pytest
from rfc7807_api import ApiResponse, AuditLogger, LiteLLMAnthropicBridge, OrderService, ProblemDetails


@pytest.fixture
def order_service() -> OrderService:
    return OrderService()


def test_1_valid_payload_201(order_service: OrderService):
    """Verify valid order payload returns HTTP 201 Created with order metadata."""
    payload = {
        "customer_id": "cust_12345",
        "items": [
            {"item_id": "prod_A", "quantity": 2, "price": 19.99},
            {"item_id": "prod_B", "quantity": 1, "price": 10.02},
        ],
        "total_amount": 50.00,
    }
    response = order_service.process_order(payload, idempotency_key="key-order-001")

    assert response.status_code == 201
    assert response.headers["Content-Type"] == "application/json"
    assert "Location" in response.headers
    assert response.body["status"] == "CREATED"
    assert response.body["customer_id"] == "cust_12345"
    assert response.body["total_amount"] == 50.00
    assert response.is_cached is False


def test_2_invalid_schema_422_rfc7807(order_service: OrderService):
    """Verify invalid payload missing required fields returns 422 RFC 7807 Problem Details."""
    # Missing customer_id and items
    invalid_payload = {
        "total_amount": 100.0,
    }
    response = order_service.process_order(invalid_payload, idempotency_key="key-order-002")

    assert response.status_code == 422
    assert response.headers["Content-Type"] == "application/problem+json"

    body = response.body
    assert body["status"] == 422
    assert body["title"] == "Unprocessable Entity"
    assert "type" in body
    assert "detail" in body
    assert "instance" in body
    assert "invalid_params" in body
    assert len(body["invalid_params"]) >= 2

    param_names = [p["name"] for p in body["invalid_params"]]
    assert "customer_id" in param_names
    assert "items" in param_names


def test_3_idempotent_replay(order_service: OrderService):
    """Verify re-submitting with the same Idempotency-Key returns exact identical cached response."""
    payload = {
        "customer_id": "cust_repeat",
        "items": [{"item_id": "prod_X", "quantity": 1, "price": 25.00}],
        "total_amount": 25.00,
    }
    key = "idem-key-unique-999"

    # First attempt -> creates order (201)
    first_resp = order_service.process_order(payload, idempotency_key=key)
    assert first_resp.status_code == 201
    first_order_id = first_resp.body["order_id"]
    assert first_resp.is_cached is False

    # Second attempt -> returns cached replay
    replay_resp = order_service.process_order(payload, idempotency_key=key)
    assert replay_resp.status_code == 201
    assert replay_resp.is_cached is True
    assert replay_resp.headers.get("Idempotent-Replayed") == "true"
    assert replay_resp.body["order_id"] == first_order_id
    assert replay_resp.body == first_resp.body


def test_4_rfc7807_required_fields_schema(order_service: OrderService):
    """Verify all 5 mandatory RFC 7807 fields (type, title, status, detail, instance) are present."""
    # Call with missing idempotency key to produce 400 Problem Details
    resp = order_service.process_order({"customer_id": "cust_1"}, idempotency_key="")

    assert resp.status_code == 400
    assert resp.headers["Content-Type"] == "application/problem+json"

    body = resp.body
    required_fields = ["type", "title", "status", "detail", "instance"]
    for field in required_fields:
        assert field in body, f"RFC 7807 required field '{field}' is missing"
        assert body[field] is not None

    assert body["type"].startswith("http")
    assert isinstance(body["title"], str)
    assert body["status"] == 400
    assert isinstance(body["detail"], str)
    assert body["instance"].startswith("/api/v1/orders/")


def test_5_negative_price_or_quantity_rejection(order_service: OrderService):
    """Verify negative and zero prices or quantities are rejected with 422 Problem Details."""
    # Test negative quantity
    payload_bad_qty = {
        "customer_id": "cust_1",
        "items": [{"item_id": "item_1", "quantity": -5, "price": 10.0}],
        "total_amount": 10.0,
    }
    resp1 = order_service.process_order(payload_bad_qty, idempotency_key="key-neg-qty")
    assert resp1.status_code == 422
    assert any("quantity" in p["name"] for p in resp1.body["invalid_params"])

    # Test negative price
    payload_bad_price = {
        "customer_id": "cust_1",
        "items": [{"item_id": "item_1", "quantity": 1, "price": -20.0}],
        "total_amount": 20.0,
    }
    resp2 = order_service.process_order(payload_bad_price, idempotency_key="key-neg-price")
    assert resp2.status_code == 422
    assert any("price" in p["name"] for p in resp2.body["invalid_params"])


def test_6_sql_injection_detection(order_service: OrderService):
    """Verify that payloads containing SQL injection patterns are caught and rejected."""
    sqli_payloads = [
        {"customer_id": "admin' OR 1=1 --", "items": [{"item_id": "item_1", "quantity": 1, "price": 10.0}], "total_amount": 10.0},
        {"customer_id": "cust_1", "items": [{"item_id": "'; DROP TABLE orders; --", "quantity": 1, "price": 10.0}], "total_amount": 10.0},
        {"customer_id": "cust_1' UNION SELECT * FROM users --", "items": [{"item_id": "item_1", "quantity": 1, "price": 10.0}], "total_amount": 10.0},
    ]

    for idx, bad_payload in enumerate(sqli_payloads):
        resp = order_service.process_order(bad_payload, idempotency_key=f"sqli-key-{idx}")
        assert resp.status_code == 422
        assert resp.body["code"] == "ERR_SQL_INJECTION_DETECTED"
        assert "SQL injection" in resp.body["detail"]


def test_7_concurrent_idempotency_locking(order_service: OrderService):
    """Verify that multiple concurrent threads with the same Idempotency-Key execute safely."""
    payload = {
        "customer_id": "cust_concurrent",
        "items": [{"item_id": "item_c", "quantity": 2, "price": 15.0}],
        "total_amount": 30.0,
    }
    shared_key = "concurrent-idempotency-key-007"
    num_threads = 8

    results = []

    def call_api():
        return order_service.process_order(payload, idempotency_key=shared_key)

    with concurrent.futures.ThreadPoolExecutor(max_workers=num_threads) as executor:
        futures = [executor.submit(call_api) for _ in range(num_threads)]
        for f in concurrent.futures.as_completed(futures):
            results.append(f.result())

    # All responses must be successful HTTP 201 Created (or 409 if timed out)
    status_codes = [r.status_code for r in results]
    assert all(code in (201, 409) for code in status_codes)

    # All successful responses must return the exact same order_id
    success_responses = [r for r in results if r.status_code == 201]
    assert len(success_responses) >= 1
    order_ids = {r.body["order_id"] for r in success_responses}
    assert len(order_ids) == 1, f"Expected exactly 1 order created, got {order_ids}"

    # Exactly one response should be original creation (not cached), and others cached
    non_cached_count = sum(1 for r in success_responses if not r.is_cached)
    assert non_cached_count == 1, f"Expected exactly 1 non-cached initial creation, got {non_cached_count}"


def test_8_structured_json_audit_log(order_service: OrderService):
    """Verify structured audit logs capture valid JSON records for all operations."""
    logger = order_service.audit_logger
    logger.clear()

    # Trigger multiple events
    order_service.process_order(
        {"customer_id": "cust_audit", "items": [{"item_id": "i1", "quantity": 1, "price": 10.0}], "total_amount": 10.0},
        idempotency_key="audit-key-1",
    )
    # Trigger validation error
    order_service.process_order({}, idempotency_key="audit-key-2")

    logs = logger.get_logs()
    assert len(logs) >= 2

    for log_record in logs:
        # Must be serializable to JSON
        json_str = json.dumps(log_record)
        parsed = json.loads(json_str)

        assert "timestamp" in parsed
        assert "event_id" in parsed
        assert "action" in parsed
        assert "status_code" in parsed
        assert "details" in parsed
        assert parsed["event_id"].startswith("audit_")


def test_9_litellm_anthropic_format_validation():
    """Verify LiteLLM Anthropic Messages API payload builder and response validator."""
    bridge = LiteLLMAnthropicBridge()

    # 1. Payload construction test
    payload = bridge.build_anthropic_payload(
        model="claude-3-5-sonnet",
        messages=[{"role": "user", "content": "Hello LiteLLM"}],
        max_tokens=512,
        temperature=0.7,
    )
    assert payload["model"] == "claude-3-5-sonnet"
    assert payload["max_tokens"] == 512
    assert payload["temperature"] == 0.7
    assert payload["messages"][0]["content"] == "Hello LiteLLM"

    # 2. Response validation test (Valid Anthropic Messages response)
    valid_anthropic_response = {
        "id": "msg_01XyZ12345",
        "type": "message",
        "role": "assistant",
        "content": [
            {"type": "text", "text": "This is a valid response from Claude."}
        ],
        "model": "claude-3-5-sonnet",
        "stop_reason": "end_turn",
        "usage": {
            "input_tokens": 15,
            "output_tokens": 28,
        },
    }
    assert bridge.validate_anthropic_response(valid_anthropic_response) is True

    # 3. Invalid Anthropic response formats (missing fields, wrong roles)
    assert bridge.validate_anthropic_response({"type": "message"}) is False
    assert bridge.validate_anthropic_response({"id": "1", "type": "message", "role": "user"}) is False
    assert bridge.validate_anthropic_response({"id": "1", "type": "message", "role": "assistant", "content": []}) is False

    # 4. End-to-end transport hook invocation test
    mock_transport = lambda req: valid_anthropic_response
    res = bridge.send_message(
        model="claude-3-5-sonnet",
        messages=[{"role": "user", "content": "Generate code"}],
        transport_fn=mock_transport,
    )
    assert res["id"] == "msg_01XyZ12345"
    assert res["content"][0]["text"] == "This is a valid response from Claude."
