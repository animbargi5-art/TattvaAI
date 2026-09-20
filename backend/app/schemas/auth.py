"""
===============================================================================
TattvaAI - Authentication Schemas
===============================================================================
"""

from __future__ import annotations

from typing import Optional
from pydantic import BaseModel, Field


DISALLOWED_EMAIL_DOMAINS = {
    # Google
    "gmail.com", "googlemail.com",
    # Yahoo
    "yahoo.com", "ymail.com", "rocketmail.com",
    "yahoo.co.uk", "yahoo.co.in", "yahoo.fr", "yahoo.de", "yahoo.es",
    # Microsoft
    "hotmail.com", "outlook.com", "live.com", "msn.com", "passport.com",
    "hotmail.co.uk", "hotmail.fr", "live.co.uk",
    # Apple
    "icloud.com", "me.com", "mac.com",
    # AOL
    "aol.com", "aim.com",
    # Proton
    "proton.me", "protonmail.com", "pm.me",
    # Zoho personal
    "zoho.com", "zohomail.com",
    # Other common free mail
    "gmx.com", "gmx.net", "mail.com", "yandex.com", "yandex.ru", "mail.ru",
    "inbox.com", "fastmail.com", "hushmail.com", "tutanota.com", "tuta.io",
}


def is_work_email(email: str) -> bool:
    """
    Check if an email address belongs to a work, corporate, or organizational domain.
    Rejects consumer / personal free email providers while permitting organizational domains.
    """
    if not email or "@" not in email:
        return False
    parts = email.strip().lower().split("@")
    if len(parts) != 2:
        return False
    domain = parts[1]
    return domain not in DISALLOWED_EMAIL_DOMAINS


class UserSignup(BaseModel):
    email: str = Field(..., min_length=3, max_length=255, description="User corporate or organization work email address")
    password: str = Field(..., min_length=6, description="Password (minimum 6 characters)")
    full_name: str = Field(..., min_length=1, max_length=100, description="Full name of the engineer")


class UserLogin(BaseModel):
    email: str = Field(..., min_length=3, max_length=255, description="Registered email address")
    password: str = Field(..., description="Account password")


class UserOut(BaseModel):
    id: str = Field(..., description="Unique user identifier")
    email: str = Field(..., description="User email address")
    full_name: str = Field(..., description="User full name")
    created_at: Optional[str] = Field(None, description="ISO timestamp of account creation")


class TokenResponse(BaseModel):
    access_token: str = Field(..., description="Signed JWT access token")
    token_type: str = Field(default="bearer", description="Token type, defaults to bearer")
    user: UserOut = Field(..., description="Authenticated user profile summary")
