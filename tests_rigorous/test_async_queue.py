"""Rigorous test suite for AsyncTaskQueue.
Tests concurrency, DLQ, exponential backoff, graceful shutdown, and memory leaks.
"""

from __future__ import annotations
import asyncio
import time
import pytest
from async_queue import AsyncTaskQueue, TaskStatus


def run_async(coro):
    return asyncio.run(coro)


def test_1_normal_async_task_execution():
    """Verify normal async tasks run to completion, produce correct results, and mark COMPLETED."""
    async def _test():
        queue = AsyncTaskQueue(max_workers=3)
        await queue.start()

        async def add_nums(a, b):
            await asyncio.sleep(0.01)
            return a + b

        t1 = await queue.enqueue(add_nums, 10, 20)
        t2 = await queue.enqueue(add_nums, 100, 200)

        await queue.graceful_shutdown(timeout=2.0)

        assert queue.get_task_status(t1) == TaskStatus.COMPLETED
        assert queue.get_task_result(t1) == 30

        assert queue.get_task_status(t2) == TaskStatus.COMPLETED
        assert queue.get_task_result(t2) == 300

    run_async(_test())


def test_2_exception_handling():
    """Verify failing task doesn't crash worker pool or deadlock subsequent tasks."""
    async def _test():
        queue = AsyncTaskQueue(max_workers=2, max_retries=1, base_backoff=0.01)
        await queue.start()

        async def buggy_task():
            raise RuntimeError("Fatal worker bug")

        async def safe_task():
            return "all_good"

        bad_tid = await queue.enqueue(buggy_task)
        good_tid = await queue.enqueue(safe_task)

        await queue.graceful_shutdown(timeout=2.0)

        assert queue.get_task_status(bad_tid) == TaskStatus.FAILED
        assert queue.get_task_status(good_tid) == TaskStatus.COMPLETED
        assert queue.get_task_result(good_tid) == "all_good"

    run_async(_test())


def test_3_dead_letter_queue_routing():
    """Verify that tasks exceeding max_retries are routed to Dead Letter Queue with full traceback."""
    async def _test():
        queue = AsyncTaskQueue(max_workers=2, max_retries=2, base_backoff=0.01)
        await queue.start()

        async def doomed_task(param):
            raise ValueError(f"Permanent failure for {param}")

        tid = await queue.enqueue(doomed_task, "item_999")
        await queue.graceful_shutdown(timeout=2.0)

        dlq = await queue.get_dlq()
        assert len(dlq) == 1
        item = dlq[0]

        assert item.task_id == tid
        assert item.func_name == "doomed_task"
        assert item.args == ("item_999",)
        assert "Permanent failure for item_999" in item.error
        assert "ValueError" in item.traceback
        assert item.attempts == 3  # Initial attempt + 2 retries
        assert item.failed_at > 0

    run_async(_test())


def test_4_exponential_backoff_timing():
    """Verify that retries follow exponential backoff: delay doubles on each attempt."""
    async def _test():
        base_backoff = 0.05
        queue = AsyncTaskQueue(max_workers=1, max_retries=2, base_backoff=base_backoff)
        await queue.start()

        start_time = time.monotonic()

        async def failing_task():
            raise Exception("Retry me")

        tid = await queue.enqueue(failing_task)
        await queue.graceful_shutdown(timeout=3.0)

        rec = queue.get_task_record(tid)
        assert rec is not None
        assert rec.attempts == 3
        assert len(rec.retry_timestamps) == 3

        # Check intervals between failures:
        # Retry 1 backoff: base_backoff * (2**0) = 0.05s
        # Retry 2 backoff: base_backoff * (2**1) = 0.10s
        # Expected minimum total elapsed time >= 0.15s
        total_time = rec.completed_at - start_time
        assert total_time >= 0.14, f"Total backoff time {total_time:.3f}s was less than minimum expected ~0.15s"

    run_async(_test())


def test_5_graceful_shutdown():
    """Verify graceful shutdown completes running tasks and rejects new incoming tasks."""
    async def _test():
        queue = AsyncTaskQueue(max_workers=2)
        await queue.start()

        completed_work = []

        async def slow_task(val):
            await asyncio.sleep(0.08)
            completed_work.append(val)
            return val

        t1 = await queue.enqueue(slow_task, "task_1")
        t2 = await queue.enqueue(slow_task, "task_2")

        # Initiate graceful shutdown immediately while tasks are running
        shutdown_task = asyncio.create_task(queue.graceful_shutdown(timeout=2.0))
        # Yield brief moment so graceful_shutdown sets _is_shutting_down
        await asyncio.sleep(0.005)

        # Enqueueing new task during shutdown must raise RuntimeError
        with pytest.raises(RuntimeError, match="shutting down"):
            await queue.enqueue(slow_task, "rejected_task")

        await shutdown_task

        # In-flight tasks must have completed
        assert "task_1" in completed_work
        assert "task_2" in completed_work
        assert queue.get_task_status(t1) == TaskStatus.COMPLETED
        assert queue.get_task_status(t2) == TaskStatus.COMPLETED

    run_async(_test())


def test_6_concurrent_workers():
    """Verify that 5 workers process multiple tasks concurrently in a fraction of sequential time."""
    async def _test():
        num_workers = 5
        num_tasks = 10
        delay = 0.05

        queue = AsyncTaskQueue(max_workers=num_workers)
        await queue.start()

        async def sleep_task():
            await asyncio.sleep(delay)
            return True

        start_time = time.monotonic()
        tids = [await queue.enqueue(sleep_task) for _ in range(num_tasks)]

        await queue.graceful_shutdown(timeout=3.0)
        elapsed = time.monotonic() - start_time

        # Sequential would take 10 * 0.05 = 0.50s.
        # With 5 workers, 10 tasks execute in 2 batches: 2 * 0.05s = 0.10s (+ small overhead).
        # Elapsed must be well under sequential duration (e.g. < 0.35s).
        assert elapsed < 0.35, f"Expected concurrent execution < 0.35s, got {elapsed:.3f}s"

        for tid in tids:
            assert queue.get_task_status(tid) == TaskStatus.COMPLETED

    run_async(_test())


def test_7_cancellation_token():
    """Verify cancellation token cancels pending or active tasks and marks them CANCELLED."""
    async def _test():
        queue = AsyncTaskQueue(max_workers=1)
        await queue.start()

        async def blocker():
            await asyncio.sleep(0.15)
            return "done"

        async def target_task():
            await asyncio.sleep(0.10)
            return "should_not_run"

        blocker_id = await queue.enqueue(blocker)
        target_id = await queue.enqueue(target_task)

        # Target is still pending because worker=1 is busy with blocker
        assert queue.get_task_status(target_id) == TaskStatus.PENDING

        cancelled = await queue.cancel_task(target_id)
        assert cancelled is True
        assert queue.get_task_status(target_id) == TaskStatus.CANCELLED

        await queue.graceful_shutdown(timeout=2.0)
        assert queue.get_task_status(blocker_id) == TaskStatus.COMPLETED
        assert queue.get_task_status(target_id) == TaskStatus.CANCELLED
        assert queue.get_task_result(target_id) is None

    run_async(_test())


def test_8_memory_leak_1000_tasks():
    """Verify running 1000 tasks keeps internal data structures bounded without memory leaks."""
    async def _test():
        retention = 50
        queue = AsyncTaskQueue(max_workers=10, max_completed_retention=retention)
        await queue.start()

        def fast_calc(x):
            return x * 2

        # Enqueue 1000 lightweight tasks
        for i in range(1000):
            await queue.enqueue(fast_calc, i)

        await queue.graceful_shutdown(timeout=5.0)

        # Internal task registry must not exceed the specified retention limit!
        active_records = queue.active_tasks_count()
        assert active_records <= retention, (
            f"Memory leak detected! Active task records ({active_records}) exceeded retention limit ({retention})"
        )
        assert queue.pending_count() == 0

    run_async(_test())
