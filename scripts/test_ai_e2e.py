#!/usr/bin/env python3
"""
JuaLuma AI E2E Test Script — Stage 2 Validation
Targets: jualuma-dev Cloud Run backend
Tests: /api/ai/chat, /api/ai/quota, /api/ai/history, health check

Usage:
  # Requires a valid Firebase ID token
  export JUALUMA_AUTH_TOKEN=$(firebase auth:export --project jualuma-dev | ...)
  python scripts/test_ai_e2e.py

  # Or pass token directly:
  python scripts/test_ai_e2e.py --token <TOKEN>
"""

import argparse
import json
import sys
import time
from datetime import datetime

import requests

BACKEND_URL = "https://jualuma-backend-77ybfmw7cq-uc.a.run.app"

# Test results collector
results: list[dict] = []


def log_result(name: str, passed: bool, details: str = "", latency_ms: float = 0):
    status = "PASS" if passed else "FAIL"
    results.append({
        "test": name,
        "status": status,
        "details": details,
        "latency_ms": round(latency_ms, 2),
    })
    icon = "✅" if passed else "❌"
    lat = f" ({latency_ms:.0f}ms)" if latency_ms else ""
    print(f"  {icon} {name}{lat}: {details}")


def test_health():
    """Verify backend is running and responsive."""
    print("\n--- Health Check ---")
    try:
        start = time.time()
        resp = requests.get(f"{BACKEND_URL}/api/health", timeout=30)
        latency = (time.time() - start) * 1000
        log_result("health_check", resp.status_code == 200,
                   f"status={resp.status_code}", latency)
    except Exception as e:
        log_result("health_check", False, str(e))


def test_chat(token: str):
    """Test AI chat endpoint with financial queries."""
    print("\n--- Chat Endpoint Tests ---")
    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}

    test_queries = [
        {
            "name": "basic_financial_query",
            "payload": {"message": "What did I spend the most on last month?"},
        },
        {
            "name": "category_analysis",
            "payload": {"message": "Show me my food and dining spending trends"},
        },
        {
            "name": "merchant_query",
            "payload": {"message": "How much have I spent at Amazon?"},
        },
    ]

    for test in test_queries:
        try:
            start = time.time()
            resp = requests.post(
                f"{BACKEND_URL}/api/ai/chat",
                headers=headers,
                json=test["payload"],
                timeout=60,
            )
            latency = (time.time() - start) * 1000

            if resp.status_code == 200:
                data = resp.json()
                has_response = bool(data.get("response"))
                log_result(
                    test["name"], has_response,
                    f"response_length={len(data.get('response', ''))}", latency
                )
            elif resp.status_code == 429:
                log_result(test["name"], True,
                           "Rate limited (expected for free tier)", latency)
            else:
                log_result(test["name"], False,
                           f"status={resp.status_code} body={resp.text[:200]}", latency)

        except Exception as e:
            log_result(test["name"], False, str(e))


def test_quota(token: str):
    """Test AI quota endpoint."""
    print("\n--- Quota Endpoint Tests ---")
    headers = {"Authorization": f"Bearer {token}"}

    try:
        start = time.time()
        resp = requests.get(f"{BACKEND_URL}/api/ai/quota", headers=headers, timeout=10)
        latency = (time.time() - start) * 1000

        if resp.status_code == 200:
            data = resp.json()
            has_fields = all(k in data for k in ["remaining", "limit", "tier"])
            log_result("quota_check", has_fields,
                       f"tier={data.get('tier')} remaining={data.get('remaining')}", latency)
        else:
            log_result("quota_check", False,
                       f"status={resp.status_code}", latency)
    except Exception as e:
        log_result("quota_check", False, str(e))


def test_history(token: str):
    """Test AI history endpoint."""
    print("\n--- History Endpoint Tests ---")
    headers = {"Authorization": f"Bearer {token}"}

    try:
        start = time.time()
        resp = requests.get(f"{BACKEND_URL}/api/ai/history", headers=headers, timeout=10)
        latency = (time.time() - start) * 1000

        if resp.status_code == 200:
            data = resp.json()
            is_list = isinstance(data, list)
            log_result("history_retrieval", is_list,
                       f"entries={len(data) if is_list else 'N/A'}", latency)
        else:
            log_result("history_retrieval", False,
                       f"status={resp.status_code}", latency)
    except Exception as e:
        log_result("history_retrieval", False, str(e))


def test_unauthenticated():
    """Verify unauthenticated requests are rejected."""
    print("\n--- Auth Guard Tests ---")
    endpoints = [
        ("chat_no_auth", "POST", "/api/ai/chat", {"message": "test"}),
        ("quota_no_auth", "GET", "/api/ai/quota", None),
        ("history_no_auth", "GET", "/api/ai/history", None),
    ]

    for name, method, path, payload in endpoints:
        try:
            start = time.time()
            if method == "POST":
                resp = requests.post(f"{BACKEND_URL}{path}", json=payload, timeout=10)
            else:
                resp = requests.get(f"{BACKEND_URL}{path}", timeout=10)
            latency = (time.time() - start) * 1000
            log_result(name, resp.status_code in [401, 403],
                       f"status={resp.status_code} (expected 401/403)", latency)
        except Exception as e:
            log_result(name, False, str(e))


def print_summary():
    """Print test summary."""
    print("\n" + "=" * 60)
    print(f"  JuaLuma AI E2E Test Results — {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 60)

    total = len(results)
    passed = sum(1 for r in results if r["status"] == "PASS")
    failed = total - passed
    avg_latency = sum(r["latency_ms"] for r in results) / max(total, 1)

    print(f"  Total: {total} | Passed: {passed} | Failed: {failed}")
    print(f"  Avg Latency: {avg_latency:.0f}ms")
    print("=" * 60)

    if failed > 0:
        print("\n  Failed Tests:")
        for r in results:
            if r["status"] == "FAIL":
                print(f"    ❌ {r['test']}: {r['details']}")

    return failed == 0


def main():
    parser = argparse.ArgumentParser(description="JuaLuma AI E2E Tests")
    parser.add_argument("--token", help="Firebase auth token for authenticated tests")
    parser.add_argument("--health-only", action="store_true", help="Run health check only")
    args = parser.parse_args()

    print(f"\n🏁 JuaLuma AI E2E Tests — Target: {BACKEND_URL}")
    print(f"   Started: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")

    # Always run health check
    test_health()

    if args.health_only:
        all_passed = print_summary()
        sys.exit(0 if all_passed else 1)

    # Auth guard tests (no token needed)
    test_unauthenticated()

    # Authenticated tests
    if args.token:
        test_chat(args.token)
        test_quota(args.token)
        test_history(args.token)
    else:
        print("\n⚠️  No --token provided. Skipping authenticated tests.")
        print("   Run with: python scripts/test_ai_e2e.py --token <FIREBASE_TOKEN>")

    all_passed = print_summary()
    sys.exit(0 if all_passed else 1)


if __name__ == "__main__":
    main()
