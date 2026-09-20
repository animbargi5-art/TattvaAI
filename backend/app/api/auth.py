"""
===============================================================================
TattvaAI - Authentication API Router
===============================================================================

Endpoints:
• POST /auth/signup - Register new engineer / SRE investigator
• POST /auth/login  - Authenticate and receive 7-day JWT access token
• GET  /auth/me     - Retrieve currently authenticated engineer profile
===============================================================================
"""

from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError

from app.core.logger import logger
from app.core.security import (
    create_access_token,
    decode_access_token,
    get_password_hash,
    verify_password,
)
from app.database.user_repository import get_user_repository
from app.schemas.auth import TokenResponse, UserLogin, UserOut, UserSignup, is_work_email

router = APIRouter(prefix="/auth", tags=["Authentication"])

# OAuth2 scheme extracting Bearer token from the Authorization header
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login", auto_error=False)


def get_current_user(token: Optional[str] = Depends(oauth2_scheme)) -> UserOut:
    """
    FastAPI dependency resolving the authenticated user from the Bearer JWT token.
    Raises 401 if missing, invalid, or expired.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials or session expired.",
        headers={"WWW-Authenticate": "Bearer"},
    )
    if not token:
        raise credentials_exception

    try:
        payload = decode_access_token(token)
        email: str = payload.get("sub")
        if not email:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    repo = get_user_repository()
    try:
        user = repo.get_by_email(email)
        if user is None:
            raise credentials_exception
        
        created_str = (
            user.created_at.isoformat()
            if hasattr(user.created_at, "isoformat")
            else str(user.created_at or "")
        )
        return UserOut(
            id=str(user.id),
            email=user.email,
            full_name=user.full_name,
            created_at=created_str,
        )
    finally:
        repo.close()


@router.post("/signup", response_model=TokenResponse)
def signup(payload: UserSignup):
    """
    Register a new engineer profile, persist credentials safely with bcrypt,
    and return a persistent 7-day JWT session.
    """
    # Enforce work / organizational email address
    if not is_work_email(payload.email):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please use your work or organization email address.",
        )

    repo = get_user_repository()
    try:
        existing = repo.get_by_email(payload.email)
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="An account with this email already exists. Please sign in.",
            )

        hashed_password = get_password_hash(payload.password)
        user = repo.create_user(
            email=payload.email,
            full_name=payload.full_name,
            hashed_password=hashed_password,
        )

        token = create_access_token({
            "sub": user.email,
            "uid": str(user.id),
            "name": user.full_name,
        })

        created_str = (
            user.created_at.isoformat()
            if hasattr(user.created_at, "isoformat")
            else str(user.created_at or "")
        )
        user_out = UserOut(
            id=str(user.id),
            email=user.email,
            full_name=user.full_name,
            created_at=created_str,
        )

        logger.info("[Auth] User registered successfully: %s (%s)", user.email, user.id)
        return TokenResponse(
            access_token=token,
            token_type="bearer",
            user=user_out,
        )
    finally:
        repo.close()


@router.post("/login", response_model=TokenResponse)
def login(payload: UserLogin):
    """
    Authenticate an existing engineer, verify password hash, and return a 7-day JWT session.
    """
    # Check for work email requirement upfront for better UX
    # (without exposing whether an account exists)
    if not is_work_email(payload.email):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please sign in using your work or organization email address.",
        )
    
    repo = get_user_repository()
    try:
        user = repo.get_by_email(payload.email)
        if not user or not verify_password(payload.password, user.hashed_password):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password. Please check your credentials.",
                headers={"WWW-Authenticate": "Bearer"},
            )

        token = create_access_token({
            "sub": user.email,
            "uid": str(user.id),
            "name": user.full_name,
        })

        created_str = (
            user.created_at.isoformat()
            if hasattr(user.created_at, "isoformat")
            else str(user.created_at or "")
        )
        user_out = UserOut(
            id=str(user.id),
            email=user.email,
            full_name=user.full_name,
            created_at=created_str,
        )

        logger.info("[Auth] User logged in successfully: %s", user.email)
        return TokenResponse(
            access_token=token,
            token_type="bearer",
            user=user_out,
        )
    finally:
        repo.close()


@router.get("/me", response_model=UserOut)
def get_me(current_user: UserOut = Depends(get_current_user)):
    """
    Validate the caller's JWT token and return their user profile.
    """
    return current_user
