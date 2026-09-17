"""
===============================================================================
TattvaAI - Central Logging Configuration
===============================================================================

This module provides centralized logging configuration for the entire
TattvaAI Autonomous Incident Investigation Platform.

Goals:
    • Consistent logging across all modules
    • Console and file logging
    • Easy debugging
    • Production-ready logging
    • Future integration with SigNoz/OpenTelemetry

===============================================================================
"""

import os
import logging
import logging.config
from pathlib import Path


# =============================================================================
# Log Directory & Lambda Environment Detection
# =============================================================================

# When running in AWS Lambda (/var/task is read-only), avoid creating local ./logs.
# Detect Lambda environment via standard AWS_LAMBDA_FUNCTION_NAME.
IS_LAMBDA = bool(os.environ.get("AWS_LAMBDA_FUNCTION_NAME"))

if IS_LAMBDA:
    # Use /tmp if file logging is ever required in Lambda; do not require writes on startup
    LOG_DIR = Path("/tmp/tattvaai_logs")
else:
    LOG_DIR = Path("logs")
    try:
        LOG_DIR.mkdir(exist_ok=True)
    except Exception:
        pass


def ensure_log_dir() -> Path:
    """Ensure the log directory exists and return its path."""
    try:
        LOG_DIR.mkdir(parents=True, exist_ok=True)
    except Exception:
        pass
    return LOG_DIR


# =============================================================================
# Logging Configuration
# =============================================================================

LOGGING_CONFIG = {
    "version": 1,

    "disable_existing_loggers": False,

    "formatters": {

        "default": {

            "format": (
                "%(asctime)s | "
                "%(levelname)-8s | "
                "%(name)s | "
                "%(message)s"
            )

        },

        "detailed": {

            "format": (
                "%(asctime)s | "
                "%(levelname)-8s | "
                "%(name)s | "
                "%(filename)s:%(lineno)d | "
                "%(message)s"
            )

        },

    },

    "handlers": {

        "console": {

            "class": "logging.StreamHandler",

            "formatter": "default",

            "level": "INFO",

        },

    },

    "root": {

        "handlers": ["console"],
        "level": "INFO",

    },

}


# =============================================================================
# Configure Logging
# =============================================================================

def configure_logging() -> None:
    """
    Configure application-wide logging.

    Call this once during FastAPI startup.
    """

    logging.config.dictConfig(LOGGING_CONFIG)


# =============================================================================
# Get Logger
# =============================================================================

def get_logger(name: str) -> logging.Logger:
    """
    Return a named logger.
    """
    return logging.getLogger(name)


# Configure logging once when this module is imported
configure_logging()

# Global logger used throughout the application
logger = get_logger("TattvaAI")