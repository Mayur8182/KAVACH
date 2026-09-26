import json
import logging
import re
import sys
from datetime import datetime, timezone
from typing import Any, Dict


# Patterns to redact sensitive data from logs
SENSITIVE_PATTERNS = [
    re.compile(r'(?i)(password|secret|token|api[_-]?key|bearer|authorization)["\']?\s*[:=]\s*["\']?([^"\'\s,;]+)'),
]

REDACTED = "[REDACTED]"


def sanitize_message(message: str) -> str:
    """Masks secrets, tokens, passwords, and sensitive keys in log output."""
    if not isinstance(message, str):
        message = str(message)
    for pattern in SENSITIVE_PATTERNS:
        message = pattern.sub(r'\1: "' + REDACTED + '"', message)
    return message


class StructuredJsonFormatter(logging.Formatter):
    """Formats log records as structured JSON including audit context."""

    def __init__(self, service_name: str, environment: str):
        super().__init__()
        self.service_name = service_name
        self.environment = environment

    def format(self, record: logging.LogRecord) -> str:
        timestamp = datetime.now(timezone.utc).isoformat()
        
        # Redact raw log message
        clean_msg = sanitize_message(record.getMessage())

        log_payload: Dict[str, Any] = {
            "timestamp": timestamp,
            "level": record.levelname,
            "service": self.service_name,
            "environment": self.environment,
            "logger": record.name,
            "message": clean_msg,
        }

        # Include custom request context if present
        request_id = getattr(record, "request_id", None)
        if request_id:
            log_payload["request_id"] = request_id

        event = getattr(record, "event", None)
        if event:
            log_payload["event"] = event

        if record.exc_info:
            log_payload["exception"] = self.formatException(record.exc_info)

        return json.dumps(log_payload, default=str)


def setup_logging(service_name: str = "secure-control-plane", environment: str = "development", log_level: str = "INFO") -> logging.Logger:
    """Configures root and application loggers with structured JSON formatting."""
    root_logger = logging.getLogger()
    numeric_level = getattr(logging, log_level.upper(), logging.INFO)
    root_logger.setLevel(numeric_level)

    # Remove existing handlers to avoid duplicates
    for handler in list(root_logger.handlers):
        root_logger.removeHandler(handler)

    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(StructuredJsonFormatter(service_name=service_name, environment=environment))
    root_logger.addHandler(handler)

    # Quiet external noisy libraries
    logging.getLogger("uvicorn.access").handlers = [handler]
    logging.getLogger("uvicorn.error").handlers = [handler]

    logger = logging.getLogger(service_name)
    logger.info("Structured logging initialized", extra={"event": "logging_init"})
    return logger
