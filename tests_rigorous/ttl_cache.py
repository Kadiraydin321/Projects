"""Thread-Safe TTL Cache with O(1) LRU eviction, RLock thread-safety, and eviction callbacks.
"""

from __future__ import annotations
import threading
import time
from typing import Any, Callable, Dict, Optional


class _Node:
    """Internal doubly linked list node."""
    __slots__ = ('key', 'value', 'expiry_time', 'prev', 'next')

    def __init__(self, key: Any, value: Any, expiry_time: Optional[float] = None) -> None:
        self.key: Any = key
        self.value: Any = value
        self.expiry_time: Optional[float] = expiry_time
        self.prev: Optional[_Node] = None
        self.next: Optional[_Node] = None

    def is_expired(self, current_time: float) -> bool:
        return self.expiry_time is not None and current_time >= self.expiry_time


class ThreadSafeTTLCache:
    """
    O(1) LRU Cache with Time-To-Live (TTL) support and re-entrant thread safety.
    """

    def __init__(
        self,
        capacity: int,
        default_ttl: Optional[float] = None,
        on_evict: Optional[Callable[[Any, Any], None]] = None,
    ) -> None:
        if capacity <= 0:
            raise ValueError(f"Capacity must be greater than 0, got {capacity}")
        if default_ttl is not None and default_ttl <= 0:
            raise ValueError(f"default_ttl must be positive, got {default_ttl}")

        self._capacity: int = capacity
        self._default_ttl: Optional[float] = default_ttl
        self._on_evict: Optional[Callable[[Any, Any], None]] = on_evict

        self._lock: threading.RLock = threading.RLock()
        self._map: Dict[Any, _Node] = {}

        # Sentinel nodes for doubly linked list
        # head.next points to Most Recently Used (MRU)
        # tail.prev points to Least Recently Used (LRU)
        self._head: _Node = _Node("__HEAD__", None)
        self._tail: _Node = _Node("__TAIL__", None)
        self._head.next = self._tail
        self._tail.prev = self._head

        # Cache metrics
        self._hits: int = 0
        self._misses: int = 0
        self._evictions: int = 0
        self._expirations: int = 0

    def _add_to_head(self, node: _Node) -> None:
        """Insert node right after head (MRU position)."""
        node.prev = self._head
        node.next = self._head.next
        if self._head.next:
            self._head.next.prev = node
        self._head.next = node

    def _remove_node(self, node: _Node) -> None:
        """Unlink node from doubly linked list."""
        p = node.prev
        n = node.next
        if p:
            p.next = n
        if n:
            n.prev = p
        node.prev = None
        node.next = None

    def _move_to_head(self, node: _Node) -> None:
        """Move existing node to MRU position."""
        self._remove_node(node)
        self._add_to_head(node)

    def _pop_tail(self) -> Optional[_Node]:
        """Remove and return the LRU node right before tail."""
        res = self._tail.prev
        if res is not None and res is not self._head:
            self._remove_node(res)
            return res
        return None

    def _trigger_evict_callback(self, key: Any, value: Any) -> None:
        if self._on_evict:
            try:
                self._on_evict(key, value)
            except Exception:
                # Callback exceptions should not break cache internals
                pass

    def put(self, key: Any, value: Any, ttl: Optional[float] = None) -> None:
        """Insert or update a key with an optional TTL in seconds."""
        now = time.monotonic()
        effective_ttl = ttl if ttl is not None else self._default_ttl
        expiry = (now + effective_ttl) if effective_ttl is not None else None

        with self._lock:
            if key in self._map:
                node = self._map[key]
                node.value = value
                node.expiry_time = expiry
                self._move_to_head(node)
                return

            # Clean expired items if capacity is full to make room
            if len(self._map) >= self._capacity:
                self._evict_expired_unlocked(now)

            # If still at capacity, evict the LRU node
            if len(self._map) >= self._capacity:
                lru_node = self._pop_tail()
                if lru_node is not None:
                    del self._map[lru_node.key]
                    self._evictions += 1
                    self._trigger_evict_callback(lru_node.key, lru_node.value)

            new_node = _Node(key, value, expiry)
            self._map[key] = new_node
            self._add_to_head(new_node)

    def get(self, key: Any, default: Any = None) -> Any:
        """Retrieve key value if present and not expired; moves to MRU."""
        now = time.monotonic()
        with self._lock:
            if key not in self._map:
                self._misses += 1
                return default

            node = self._map[key]
            if node.is_expired(now):
                # Expired: evict from map and list
                self._remove_node(node)
                del self._map[key]
                self._expirations += 1
                self._misses += 1
                self._trigger_evict_callback(node.key, node.value)
                return default

            self._hits += 1
            self._move_to_head(node)
            return node.value

    def delete(self, key: Any) -> bool:
        """Remove key manually; returns True if deleted, False otherwise."""
        with self._lock:
            if key in self._map:
                node = self._map.pop(key)
                self._remove_node(node)
                return True
            return False

    def _evict_expired_unlocked(self, current_time: float) -> int:
        """Scan and purge expired items while lock is held."""
        expired_keys = [k for k, node in self._map.items() if node.is_expired(current_time)]
        for k in expired_keys:
            node = self._map.pop(k)
            self._remove_node(node)
            self._expirations += 1
            self._trigger_evict_callback(node.key, node.value)
        return len(expired_keys)

    def cleanup_expired(self) -> int:
        """Public method to proactively purge expired keys."""
        with self._lock:
            return self._evict_expired_unlocked(time.monotonic())

    def clear(self) -> None:
        """Clear all items from cache."""
        with self._lock:
            self._map.clear()
            self._head.next = self._tail
            self._tail.prev = self._head

    def __contains__(self, key: Any) -> bool:
        now = time.monotonic()
        with self._lock:
            if key not in self._map:
                return False
            node = self._map[key]
            if node.is_expired(now):
                self._remove_node(node)
                del self._map[key]
                self._expirations += 1
                self._trigger_evict_callback(node.key, node.value)
                return False
            return True

    def __len__(self) -> int:
        now = time.monotonic()
        with self._lock:
            # Only count non-expired
            return sum(1 for node in self._map.values() if not node.is_expired(now))

    def get_stats(self) -> Dict[str, int]:
        with self._lock:
            return {
                "hits": self._hits,
                "misses": self._misses,
                "evictions": self._evictions,
                "expirations": self._expirations,
                "size": len(self._map),
            }
