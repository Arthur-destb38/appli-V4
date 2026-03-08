"""Common dependencies for FastAPI routes.

All route files should import auth dependencies from here
instead of defining their own copies.
"""
from datetime import datetime, timezone
from typing import Annotated, Optional
from fastapi import Depends, HTTPException, status, Header, Query
from sqlmodel import Session

from ..db import get_session, set_session_user_id
from ..models import User
from .auth import decode_token


def _user_from_token(token: str, session: Session) -> User:
    """Valide le token et retourne le User. Lève 401 si invalide."""
    try:
        payload = decode_token(token)
    except ValueError as e:
        detail = "token_expired" if "token_expired" in str(e) else "invalid_token"
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=detail)
    except Exception:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="invalid_token")
    if payload.get("type") != "access":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="invalid_token")
    user_id = payload.get("sub")
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="user_not_found")
    set_session_user_id(session, str(user.id))
    return user


def get_current_user(
    authorization: Annotated[Optional[str], Header()] = None,
    session: Session = Depends(get_session),
) -> User:
    """Require a valid access token. Raises 401 if missing/invalid."""
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="missing_token")
    token = authorization.split(" ", 1)[1]
    return _user_from_token(token, session)


def get_current_user_header_or_query(
    authorization: Annotated[Optional[str], Header()] = None,
    access_token: Annotated[Optional[str], Query()] = None,
    session: Session = Depends(get_session),
) -> User:
    """User from Authorization Bearer or from query param access_token (pour ouverture URL pass Apple)."""
    token = None
    if authorization and authorization.lower().startswith("bearer "):
        token = authorization.split(" ", 1)[1]
    elif access_token:
        token = access_token
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="missing_token")
    return _user_from_token(token, session)


def require_premium(
    current_user: User = Depends(get_current_user),
) -> User:
    """Require premium subscription. Raises 403 if free tier."""
    if current_user.subscription_tier not in ("premium",):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="premium_required")
    if (current_user.subscription_expires_at
            and current_user.subscription_expires_at < datetime.now(timezone.utc)):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="subscription_expired")
    return current_user


def check_ai_program_limit(
    current_user: User = Depends(get_current_user),
) -> User:
    """Allow 1 free AI program, then require premium."""
    if current_user.subscription_tier in ("premium",):
        return current_user
    if current_user.ai_programs_generated >= 1:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="ai_program_limit_reached")
    return current_user


def get_current_user_optional(
    authorization: Annotated[Optional[str], Header()] = None,
    session: Session = Depends(get_session),
) -> Optional[User]:
    """Try to get the current user, return None if no valid token."""
    if not authorization or not authorization.lower().startswith("bearer "):
        return None
    token = authorization.split(" ", 1)[1]
    try:
        payload = decode_token(token)
        if payload.get("type") != "access":
            return None
        user_id = payload.get("sub")
        user = session.get(User, user_id)
        if user:
            set_session_user_id(session, str(user.id))
        return user
    except Exception:
        return None