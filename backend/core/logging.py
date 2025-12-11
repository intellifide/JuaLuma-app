# Updated 2025-12-11 01:32 CST by ChatGPT
"""JSON logging configuration for the Finity backend."""

import logging
import sys
from typing import Any

from pythonjsonlogger import jsonlogger


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
    root.addHandler(handler)


__all__ = ["configure_logging"]
