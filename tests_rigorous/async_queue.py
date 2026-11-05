"""Async Task Queue with deadlock protection, Dead Letter Queue (DLQ), and exponential backoff retries.
"""

from __future__ import annotations
import asyncio
from dataclasses import dataclass, field
from enum import Enum
import time
import traceback
from typing import Any, Callable, Dict, List, Optional, Tuple
import uuid


class TaskStatus(str, Enum):
    PENDING = "PENDING"
    RUNNING = "RUNNING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"
    CANCELLED = "CANCELLED"


@dataclass
class DLQItem:
    task_id: str
    func_name: str
    args: Tuple[Any, ...]
    kwargs: Dict[str, Any]
    error: str
    traceback: str
    attempts: int
    failed_at: float


@dataclass
class TaskRecord:
    task_id: str
    func: Callable[..., Any]
    args: Tuple[Any, ...]
    kwargs: Dict[str, Any]
    status: TaskStatus = TaskStatus.PENDING
    attempts: int = 0
    result: Any = None
    error: Optional[str] = None
    created_at: float = field(default_factory=time.monotonic)
    completed_at: Optional[float] = None
    asyncio_task: Optional[asyncio.Task] = None
    retry_timestamps: List[float] = field(default_factory=list)


class AsyncTaskQueue:
    """Production-grade asyncio task queue with worker pool, exponential backoff, DLQ, and cancellation."""

    def __init__(
        self,
        max_workers: int = 5,
        max_retries: int = 3,
        base_backoff: float = 0.05,
        max_backoff: float = 1.0,
        max_completed_retention: int = 500,
    ) -> None:
        if max_workers <= 0:
            raise ValueError("max_workers must be positive")
        if max_retries < 0:
            raise ValueError("max_retries cannot be negative")

        self.max_workers: int = max_workers
        self.max_retries: int = max_retries
        self.base_backoff: float = base_backoff
        self.max_backoff: float = max_backoff
        self.max_completed_retention: int = max_completed_retention

        self._queue: asyncio.Queue[TaskRecord] = asyncio.Queue()
        self._tasks: Dict[str, TaskRecord] = {}
        self._dlq: List[DLQItem] = []
        self._workers: List[asyncio.Task] = []
        self._is_running: bool = False
        self._is_shutting_down: bool = False
        self._completed_order: List[str] = []
        self._lock: asyncio.Lock = asyncio.Lock()

    async def start(self) -> None:
        """Initialize and spawn worker tasks."""
        if self._is_running:
            return
        self._is_running = True
        self._is_shutting_down = False
        for i in range(self.max_workers):
            worker_task = asyncio.create_task(
                self._worker_loop(worker_id=i),
                name=f"async_queue_worker_{i}"
            )
            self._workers.append(worker_task)

    async def _worker_loop(self, worker_id: int) -> None:
        while self._is_running:
            try:
                task_record = await self._queue.get()
            except asyncio.CancelledError:
                break

            if task_record is None:
                # Sentinel to stop worker
                self._queue.task_done()
                break

            if task_record.status == TaskStatus.CANCELLED:
                self._queue.task_done()
                continue

            await self._process_task(task_record)
            self._queue.task_done()

    async def _process_task(self, record: TaskRecord) -> None:
        while record.attempts <= self.max_retries and self._is_running:
            if record.status == TaskStatus.CANCELLED:
                return

            record.attempts += 1
            record.status = TaskStatus.RUNNING
            current_task = asyncio.current_task()
            record.asyncio_task = current_task

            try:
                if asyncio.iscoroutinefunction(record.func):
                    res = await record.func(*record.args, **record.kwargs)
                else:
                    res = record.func(*record.args, **record.kwargs)

                record.result = res
                record.status = TaskStatus.COMPLETED
                record.completed_at = time.monotonic()
                await self._prune_completed_history(record.task_id)
                return

            except asyncio.CancelledError:
                record.status = TaskStatus.CANCELLED
                record.completed_at = time.monotonic()
                return

            except Exception as exc:
                record.error = str(exc)
                record.retry_timestamps.append(time.monotonic())

                if record.attempts > self.max_retries:
                    # Route to Dead Letter Queue
                    record.status = TaskStatus.FAILED
                    record.completed_at = time.monotonic()
                    dlq_item = DLQItem(
                        task_id=record.task_id,
                        func_name=getattr(record.func, "__name__", str(record.func)),
                        args=record.args,
                        kwargs=record.kwargs,
                        error=str(exc),
                        traceback=traceback.format_exc(),
                        attempts=record.attempts,
                        failed_at=time.monotonic(),
                    )
                    async with self._lock:
                        self._dlq.append(dlq_item)
                    await self._prune_completed_history(record.task_id)
                    return
                else:
                    # Exponential backoff
                    backoff = min(
                        self.max_backoff,
                        self.base_backoff * (2 ** (record.attempts - 1))
                    )
                    try:
                        await asyncio.sleep(backoff)
                    except asyncio.CancelledError:
                        record.status = TaskStatus.CANCELLED
                        return

    async def enqueue(
        self,
        func: Callable[..., Any],
        *args: Any,
        task_id: Optional[str] = None,
        **kwargs: Any,
    ) -> str:
        """Enqueue task for asynchronous execution."""
        if self._is_shutting_down:
            raise RuntimeError("Cannot enqueue new tasks: queue is shutting down")

        tid = task_id or str(uuid.uuid4())
        record = TaskRecord(task_id=tid, func=func, args=args, kwargs=kwargs)

        async with self._lock:
            self._tasks[tid] = record

        await self._queue.put(record)
        return tid

    async def cancel_task(self, task_id: str) -> bool:
        """Cancel a pending or running task and free its resources."""
        async with self._lock:
            if task_id not in self._tasks:
                return False
            record = self._tasks[task_id]

        if record.status in (TaskStatus.COMPLETED, TaskStatus.FAILED, TaskStatus.CANCELLED):
            return False

        record.status = TaskStatus.CANCELLED
        if record.asyncio_task and not record.asyncio_task.done():
            record.asyncio_task.cancel()
        return True

    def get_task_status(self, task_id: str) -> Optional[TaskStatus]:
        record = self._tasks.get(task_id)
        return record.status if record else None

    def get_task_result(self, task_id: str) -> Any:
        record = self._tasks.get(task_id)
        if record:
            return record.result
        return None

    def get_task_record(self, task_id: str) -> Optional[TaskRecord]:
        return self._tasks.get(task_id)

    async def _prune_completed_history(self, task_id: str) -> None:
        """Prevents memory leaks by maintaining a bounded completed task cache."""
        async with self._lock:
            self._completed_order.append(task_id)
            while len(self._completed_order) > self.max_completed_retention:
                oldest_id = self._completed_order.pop(0)
                # Remove from tasks map if completed/failed
                if oldest_id in self._tasks:
                    rec = self._tasks[oldest_id]
                    if rec.status in (TaskStatus.COMPLETED, TaskStatus.FAILED, TaskStatus.CANCELLED):
                        del self._tasks[oldest_id]

    async def graceful_shutdown(self, timeout: float = 5.0) -> None:
        """Stop accepting new work, await in-flight tasks, and stop workers cleanly."""
        self._is_shutting_down = True

        # Wait for all queued tasks to finish up to timeout
        try:
            await asyncio.wait_for(self._queue.join(), timeout=timeout)
        except asyncio.TimeoutError:
            pass

        self._is_running = False

        # Send termination sentinels to any idling workers
        for _ in self._workers:
            await self._queue.put(None)

        # Await worker termination or cancel them if stuck
        done, pending = await asyncio.wait(self._workers, timeout=2.0)
        for w in pending:
            w.cancel()
        if pending:
            await asyncio.gather(*pending, return_exceptions=True)

        self._workers.clear()

    async def get_dlq(self) -> List[DLQItem]:
        async with self._lock:
            return list(self._dlq)

    async def clear_dlq(self) -> None:
        async with self._lock:
            self._dlq.clear()

    def pending_count(self) -> int:
        return self._queue.qsize()

    def active_tasks_count(self) -> int:
        return len(self._tasks)
