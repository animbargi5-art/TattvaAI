"""
===============================================================================
TattvaAI - Authentication Schemas
===============================================================================
"""

from __future__ import annotations

from typing import Optional
from pydantic import BaseModel, Field


class UserSignup(BaseModel):
    email: str = Field(..., min_length=3, max_length=255, description="User corporate or personal email address")
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
