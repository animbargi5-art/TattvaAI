"""
===============================================================================
TattvaAI - Security & JWT Authentication Utilities
===============================================================================

Provides bcrypt password hashing, token generation, and JWT validation.
Uses direct bcrypt hashing to avoid passlib 72-byte detection bug with modern bcrypt.
===============================================================================
"""

from __future__ import annotations

from datetime import datetime, timedelta
from typing import Any, Dict, Optional
import bcrypt
from jose import JWTError, jwt

from app.core.settings import settings


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
    
    secret_key = getattr(settings, "JWT_SECRET_KEY", "tattvaai-jwt-secret-key-change-in-prod-super-secure")
    algorithm = getattr(settings, "JWT_ALGORITHM", "HS256")
    
    return jwt.encode(to_encode, secret_key, algorithm=algorithm)


def decode_access_token(token: str) -> Dict[str, Any]:
    """
    Decode and validate a JWT access token.
    Raises JWTError on failure or expiration.
    """
    secret_key = getattr(settings, "JWT_SECRET_KEY", "tattvaai-jwt-secret-key-change-in-prod-super-secure")
    algorithm = getattr(settings, "JWT_ALGORITHM", "HS256")
    return jwt.decode(token, secret_key, algorithms=[algorithm])
