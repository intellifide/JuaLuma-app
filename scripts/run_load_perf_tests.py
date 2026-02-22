#!/usr/bin/env python3
"""Lightweight HTTP load/performance test runner for Stage 5 verification."""

from __future__ import annotations

import argparse
import json
import math
import statistics
import subprocess
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from dataclasses import dataclass
from pathlib import Path


@dataclass
class Result:
    url: str
    ok: bool
    status: int
    latency_ms: float
    error: str | None = None


def _request_once(url: str, timeout: float) -> Result:
    start = time.perf_counter()
    try:
        proc = subprocess.run(  # noqa: S603
            [
                "curl",
                "-sS",
                "--max-time",
                str(timeout),
                "-o",
                "/dev/null",
                "-w",
                "%{http_code}",
                url,
            ],
            check=False,
            capture_output=True,
            text=True,
        )
        latency_ms = (time.perf_counter() - start) * 1000
        status = int(proc.stdout.strip() or "0")
        ok = proc.returncode == 0 and 200 <= status < 400
        err = None if ok else (proc.stderr.strip() or f"curl exit={proc.returncode}")
        return Result(url=url, ok=ok, status=status, latency_ms=latency_ms, error=err)
    except Exception as exc:  # noqa: BLE001
        latency_ms = (time.perf_counter() - start) * 1000
        return Result(url=url, ok=False, status=0, latency_ms=latency_ms, error=str(exc))


def _percentile(values: list[float], pct: float) -> float:
    if not values:
        return 0.0
    if len(values) == 1:
        return values[0]
    values_sorted = sorted(values)
    idx = (len(values_sorted) - 1) * pct
    lo = math.floor(idx)
    hi = math.ceil(idx)
    if lo == hi:
        return values_sorted[lo]
    return values_sorted[lo] + (values_sorted[hi] - values_sorted[lo]) * (idx - lo)


def run_test(url: str, total_requests: int, concurrency: int, timeout: float) -> dict:
    results: list[Result] = []
    start = time.perf_counter()
    with ThreadPoolExecutor(max_workers=concurrency) as pool:
        futures = [pool.submit(_request_once, url, timeout) for _ in range(total_requests)]
        for future in as_completed(futures):
            results.append(future.result())
    elapsed_s = time.perf_counter() - start

    latencies = [r.latency_ms for r in results]
    ok_count = sum(1 for r in results if r.ok)
    errors = [r for r in results if not r.ok]

    return {
        "url": url,
        "requests": total_requests,
        "concurrency": concurrency,
        "ok": ok_count,
        "failed": len(results) - ok_count,
        "error_rate": round((len(results) - ok_count) / max(len(results), 1), 6),
        "throughput_rps": round(total_requests / max(elapsed_s, 1e-9), 2),
        "latency_ms": {
            "avg": round(statistics.fmean(latencies), 2) if latencies else 0.0,
            "p50": round(_percentile(latencies, 0.50), 2),
            "p95": round(_percentile(latencies, 0.95), 2),
            "p99": round(_percentile(latencies, 0.99), 2),
            "max": round(max(latencies), 2) if latencies else 0.0,
        },
        "sample_errors": [
            {
                "status": e.status,
                "error": e.error,
                "latency_ms": round(e.latency_ms, 2),
            }
            for e in errors[:10]
        ],
    }


def build_markdown(report: dict) -> str:
    lines = [
        "# Load/Performance Test Report",
        "",
        f"- Generated at: {report['generated_at_utc']}",
        f"- Requests per URL: {report['requests_per_url']}",
        f"- Concurrency per URL: {report['concurrency']}",
        f"- Timeout seconds: {report['timeout_seconds']}",
        "",
        "## Results",
        "",
        "| URL | OK | Failed | Error Rate | Throughput (rps) | p95 (ms) | p99 (ms) |",
        "|---|---:|---:|---:|---:|---:|---:|",
    ]

    for row in report["results"]:
        lines.append(
            f"| {row['url']} | {row['ok']} | {row['failed']} | {row['error_rate']:.2%} | {row['throughput_rps']} | {row['latency_ms']['p95']} | {row['latency_ms']['p99']} |"
        )

    lines.append("")
    lines.append("## Raw JSON")
    lines.append("```json")
    lines.append(json.dumps(report, indent=2))
    lines.append("```")
    return "\n".join(lines)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--urls",
        nargs="+",
        required=True,
        help="One or more HTTP URLs to test.",
    )
    parser.add_argument("--requests-per-url", type=int, default=200)
    parser.add_argument("--concurrency", type=int, default=20)
    parser.add_argument("--timeout", type=float, default=8.0)
    parser.add_argument("--output", type=Path, default=None)
    args = parser.parse_args()

    generated_at = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())

    results = [
        run_test(
            url=url,
            total_requests=args.requests_per_url,
            concurrency=args.concurrency,
            timeout=args.timeout,
        )
        for url in args.urls
    ]

    report = {
        "generated_at_utc": generated_at,
        "requests_per_url": args.requests_per_url,
        "concurrency": args.concurrency,
        "timeout_seconds": args.timeout,
        "results": results,
    }

    markdown = build_markdown(report)
    print(markdown)

    if args.output:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(markdown, encoding="utf-8")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
