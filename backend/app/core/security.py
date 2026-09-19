"""
===============================================================================
TattvaAI - Security & JWT Authentication Utilities
===============================================================================

Provides bcrypt password hashing, token generation, and JWT validation.
Uses direct bcrypt hashing to avoid passlib 72-byte detection bug with modern bcrypt.
Integrates with AWS Secrets Manager for production JWT secret retrieval.
===============================================================================
"""

from __future__ import annotations

import os
from datetime import datetime, timedelta
from typing import Any, Dict, Optional
import bcrypt
from jose import JWTError, jwt

from app.core.settings import settings


def get_jwt_secret_key() -> str:
    """
    Retrieve JWT signing secret securely:
    1. Check OS environment variable JWT_SECRET_KEY
    2. If AWS Secrets Manager is enabled, fetch JWT_SECRET_KEY from tattvaai/production/secrets
    3. Fallback to settings / safe local default
    Never logs or exposes secret contents.
    """
    env_secret = os.environ.get("JWT_SECRET_KEY")
    if env_secret:
        return env_secret

    if getattr(settings, "SECRETS_MANAGER_ENABLED", False) and getattr(settings, "AWS_ENABLED", False):
        try:
            from app.services.secrets_service import secrets_service
            sec_dict = secrets_service.get_secret()
            if sec_dict and isinstance(sec_dict, dict):
                secret_val = sec_dict.get("JWT_SECRET_KEY") or sec_dict.get("jwt_secret")
                if secret_val:
                    return secret_val
        except Exception:
            pass

    return getattr(settings, "JWT_SECRET_KEY", "tattvaai-jwt-secret-key-change-in-prod-super-secure")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a plain password against an existing bcrypt hash."""
    try:
        pw_bytes = plain_password.encode("utf-8")[:72]
        hash_bytes = hashed_password.encode("utf-8")
        return bcrypt.checkpw(pw_bytes, hash_bytes)
    except Exception:
        return False


def get_password_hash(password: str) -> str:
    """Generate a secure bcrypt hash for the provided password."""
    pw_bytes = password.encode("utf-8")[:72]
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(pw_bytes, salt).decode("utf-8")


def create_access_token(
    data: Dict[str, Any],
    expires_delta: Optional[timedelta] = None,
) -> str:
    """
    Generate a signed JWT access token with expiration.
    Default validity is 7 days to support persistent sessions.
    """
    to_encode = data.copy()
    expire_days = getattr(settings, "JWT_ACCESS_TOKEN_EXPIRE_DAYS", 7)
    expire = datetime.utcnow() + (expires_delta or timedelta(days=expire_days))
    
    to_encode.update({
        "exp": expire,
        "iat": datetime.utcnow(),
    })
    
    secret_key = get_jwt_secret_key()
    algorithm = getattr(settings, "JWT_ALGORITHM", "HS256")
    
    return jwt.encode(to_encode, secret_key, algorithm=algorithm)


def decode_access_token(token: str) -> Dict[str, Any]:
    """
    Decode and validate a JWT access token.
    Raises JWTError on failure or expiration.
    """
    secret_key = get_jwt_secret_key()
    algorithm = getattr(settings, "JWT_ALGORITHM", "HS256")
    return jwt.decode(token, secret_key, algorithms=[algorithm])
