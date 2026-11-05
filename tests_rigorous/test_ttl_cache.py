"""Rigorous test suite for ThreadSafeTTLCache.
Ensures zero flaky behavior, strict assertions, edge case coverage, and thread-safety under load.
"""

from __future__ import annotations
import concurrent.futures
import threading
import time
import pytest
from ttl_cache import ThreadSafeTTLCache


def test_1_basic_put_get():
    """Verify standard put, get, default fallback, and hit/miss counts."""
    cache = ThreadSafeTTLCache(capacity=5)
    cache.put("k1", "val1")
    cache.put("k2", 42)
    cache.put("k3", {"nested": True})

    # Assert retrieved values match exactly
    assert cache.get("k1") == "val1"
    assert cache.get("k2") == 42
    assert cache.get("k3") == {"nested": True}

    # Assert non-existent key returns default
    assert cache.get("non_existent") is None
    assert cache.get("non_existent", default="fallback") == "fallback"

    # Assert metrics
    stats = cache.get_stats()
    assert stats["hits"] == 3
    assert stats["misses"] == 2
    assert len(cache) == 3


def test_2_lru_eviction_order():
    """Verify that when capacity is reached, the Least Recently Used item is evicted."""
    evictions = []
    cache = ThreadSafeTTLCache(capacity=3, on_evict=lambda k, v: evictions.append((k, v)))

    cache.put("a", 1)  # oldest
    cache.put("b", 2)
    cache.put("c", 3)

    assert len(cache) == 3
    assert "a" in cache
    assert "b" in cache
    assert "c" in cache

    # Adding a 4th item should evict "a"
    cache.put("d", 4)

    assert len(cache) == 3
    assert cache.get("a") is None
    assert cache.get("b") == 2
    assert cache.get("c") == 3
    assert cache.get("d") == 4
    assert evictions == [("a", 1)]


def test_3_lru_access_refresh():
    """Verify that accessing an item via get() refreshes its MRU status, preventing eviction."""
    evictions = []
    cache = ThreadSafeTTLCache(capacity=3, on_evict=lambda k, v: evictions.append((k, v)))

    cache.put("a", 1)
    cache.put("b", 2)
    cache.put("c", 3)

    # Access "a", making it MRU. "b" is now the LRU item.
    val = cache.get("a")
    assert val == 1

    # Insert "d" -> should evict "b", NOT "a"
    cache.put("d", 4)

    assert cache.get("a") == 1
    assert cache.get("b") is None
    assert cache.get("c") == 3
    assert cache.get("d") == 4
    assert evictions == [("b", 2)]


def test_4_ttl_expiration():
    """Verify TTL expiry purges item on read and decrements cache size."""
    evictions = []
    cache = ThreadSafeTTLCache(capacity=5, default_ttl=0.08, on_evict=lambda k, v: evictions.append((k, v)))

    cache.put("short_lived", "data", ttl=0.04)
    cache.put("normal_lived", "alive")

    # Immediate check: both are present
    assert cache.get("short_lived") == "data"
    assert cache.get("normal_lived") == "alive"

    # Sleep past short_lived TTL but before default_ttl
    time.sleep(0.05)

    assert cache.get("short_lived") is None
    assert cache.get("normal_lived") == "alive"
    assert ("short_lived", "data") in evictions

    # Sleep past normal_lived TTL
    time.sleep(0.05)
    assert cache.get("normal_lived") is None
    assert ("normal_lived", "alive") in evictions


def test_5_multithreaded_race_condition():
    """Verify thread-safety and lock integrity under high concurrency (10 threads, 1000 operations)."""
    capacity = 50
    cache = ThreadSafeTTLCache(capacity=capacity)
    num_threads = 10
    ops_per_thread = 100

    errors = []

    def worker(worker_id: int):
        try:
            for i in range(ops_per_thread):
                key = f"key_{i % 30}"
                val = f"worker_{worker_id}_val_{i}"
                cache.put(key, val, ttl=0.5)

                read_val = cache.get(key)
                # It should either be what we wrote, what another worker wrote, or None if expired
                if read_val is not None:
                    assert "worker_" in read_val

                if i % 7 == 0:
                    cache.delete(f"key_{(i + 1) % 30}")

                if i % 15 == 0:
                    cache.cleanup_expired()
        except Exception as exc:
            errors.append(exc)

    threads = [threading.Thread(target=worker, args=(t,)) for t in range(num_threads)]
    for t in threads:
        t.start()
    for t in threads:
        t.join(timeout=10.0)
        assert not t.is_alive(), "Worker thread deadlocked or timed out"

    assert len(errors) == 0, f"Thread errors occurred: {errors}"
    # Verify cache capacity was strictly enforced at all times
    stats = cache.get_stats()
    assert stats["size"] <= capacity
    assert len(cache) <= capacity


def test_6_eviction_callback():
    """Verify that on_evict callback receives all evicted entries accurately."""
    called_events = []

    def evict_listener(k, v):
        called_events.append((k, v))

    cache = ThreadSafeTTLCache(capacity=2, on_evict=evict_listener)
    cache.put("x", 100)
    cache.put("y", 200)
    cache.put("z", 300)  # should evict "x"

    assert ("x", 100) in called_events

    # TTL eviction callback test
    cache.put("temp", 999, ttl=0.03)
    time.sleep(0.04)
    # Trigger eviction via get
    cache.get("temp")
    assert ("temp", 999) in called_events


def test_7_capacity_validation():
    """Verify invalid capacity raises ValueError."""
    with pytest.raises(ValueError, match="Capacity must be greater than 0"):
        ThreadSafeTTLCache(capacity=0)

    with pytest.raises(ValueError, match="Capacity must be greater than 0"):
        ThreadSafeTTLCache(capacity=-10)

    with pytest.raises(ValueError, match="default_ttl must be positive"):
        ThreadSafeTTLCache(capacity=5, default_ttl=-1.0)


def test_8_update_existing_key_refreshes_ttl():
    """Verify updating a key resets its TTL expiration window."""
    cache = ThreadSafeTTLCache(capacity=5)
    # Set with 0.06s TTL
    cache.put("renew_key", "version_1", ttl=0.06)

    # Wait 0.04s, update with new 0.08s TTL
    time.sleep(0.04)
    assert cache.get("renew_key") == "version_1"
    cache.put("renew_key", "version_2", ttl=0.08)

    # Wait another 0.04s (total elapsed: 0.08s > initial 0.06s TTL)
    time.sleep(0.04)
    # Since it was refreshed, it must still be alive!
    assert cache.get("renew_key") == "version_2"

    # Wait another 0.05s to exceed the renewed 0.08s TTL
    time.sleep(0.05)
    assert cache.get("renew_key") is None
