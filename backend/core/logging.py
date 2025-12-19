# Updated 2025-12-11 01:32 CST by ChatGPT
"""JSON logging configuration for the jualuma backend."""

import contextvars
import logging
import sys
from typing import Any

from pythonjsonlogger import jsonlogger

# Per-request correlation id propagated via middleware
_request_id_ctx: contextvars.ContextVar[str | None] = contextvars.ContextVar(
    "request_id", default=None
)


class RequestIdFilter(logging.Filter):
    """Attach the current request id to all log records if available."""

    def filter(self, record: logging.LogRecord) -> bool:  # type: ignore[override]
        record.request_id = _request_id_ctx.get()
        return True


class ServiceAwareFormatter(jsonlogger.JsonFormatter):
    """Attach service/module metadata to every log entry."""

    def __init__(self, service_name: str):
        super().__init__(
            "%(asctime)s %(levelname)s %(name)s %(message)s %(module)s %(lineno)d"
        )
        self.service_name = service_name

    def add_fields(  # type: ignore[override]
        self,
        log_record: dict[str, Any],
        record: logging.LogRecord,
        message_dict: dict[str, Any],
    ) -> None:
        super().add_fields(log_record, record, message_dict)
        log_record.setdefault("service", self.service_name)
        log_record.setdefault("module", record.module)
        log_record.setdefault("severity", record.levelname)
        if getattr(record, "request_id", None):
            log_record.setdefault("request_id", record.request_id)


def configure_logging(*, service_name: str, level: int | str = logging.INFO) -> None:
    """
    Configure root logging with JSON output to stdout.

    Ensures a single stream handler is attached with structured fields.
    """
    root = logging.getLogger()
    root.setLevel(level)

    for handler in list(root.handlers):
        root.removeHandler(handler)

    formatter = ServiceAwareFormatter(service_name)
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(formatter)
    handler.addFilter(RequestIdFilter())
    root.addHandler(handler)


def set_request_id(request_id: str | None) -> None:
    """Expose a safe setter for request-scoped correlation ids."""
    _request_id_ctx.set(request_id)


def get_request_id() -> str | None:
    """Retrieve the current request id if one exists."""
    return _request_id_ctx.get()


__all__ = ["configure_logging", "set_request_id", "get_request_id"]
