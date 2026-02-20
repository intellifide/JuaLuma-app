# Load/Performance Test Report

- Generated at: 2026-02-20T06:35:26Z
- Requests per URL: 30
- Concurrency per URL: 2
- Timeout seconds: 10.0

## Results

| URL | OK | Failed | Error Rate | Throughput (rps) | p95 (ms) | p99 (ms) |
|---|---:|---:|---:|---:|---:|---:|
| https://jualuma-backend-77ybfmw7cq-uc.a.run.app/health | 0 | 30 | 100.00% | 217.91 | 10.13 | 10.63 |

## Raw JSON
```json
{
  "generated_at_utc": "2026-02-20T06:35:26Z",
  "requests_per_url": 30,
  "concurrency": 2,
  "timeout_seconds": 10.0,
  "results": [
    {
      "url": "https://jualuma-backend-77ybfmw7cq-uc.a.run.app/health",
      "requests": 30,
      "concurrency": 2,
      "ok": 0,
      "failed": 30,
      "error_rate": 1.0,
      "throughput_rps": 217.91,
      "latency_ms": {
        "avg": 9.06,
        "p50": 9.22,
        "p95": 10.13,
        "p99": 10.63,
        "max": 10.79
      },
      "sample_errors": [
        {
          "status": 0,
          "error": "curl: (6) Could not resolve host: jualuma-backend-77ybfmw7cq-uc.a.run.app",
          "latency_ms": 8.59
        },
        {
          "status": 0,
          "error": "curl: (6) Could not resolve host: jualuma-backend-77ybfmw7cq-uc.a.run.app",
          "latency_ms": 9.98
        },
        {
          "status": 0,
          "error": "curl: (6) Could not resolve host: jualuma-backend-77ybfmw7cq-uc.a.run.app",
          "latency_ms": 9.63
        },
        {
          "status": 0,
          "error": "curl: (6) Could not resolve host: jualuma-backend-77ybfmw7cq-uc.a.run.app",
          "latency_ms": 9.7
        },
        {
          "status": 0,
          "error": "curl: (6) Could not resolve host: jualuma-backend-77ybfmw7cq-uc.a.run.app",
          "latency_ms": 8.39
        },
        {
          "status": 0,
          "error": "curl: (6) Could not resolve host: jualuma-backend-77ybfmw7cq-uc.a.run.app",
          "latency_ms": 8.5
        },
        {
          "status": 0,
          "error": "curl: (6) Could not resolve host: jualuma-backend-77ybfmw7cq-uc.a.run.app",
          "latency_ms": 9.54
        },
        {
          "status": 0,
          "error": "curl: (6) Could not resolve host: jualuma-backend-77ybfmw7cq-uc.a.run.app",
          "latency_ms": 9.9
        },
        {
          "status": 0,
          "error": "curl: (6) Could not resolve host: jualuma-backend-77ybfmw7cq-uc.a.run.app",
          "latency_ms": 8.25
        },
        {
          "status": 0,
          "error": "curl: (6) Could not resolve host: jualuma-backend-77ybfmw7cq-uc.a.run.app",
          "latency_ms": 8.22
        }
      ]
    }
  ]
}
```
