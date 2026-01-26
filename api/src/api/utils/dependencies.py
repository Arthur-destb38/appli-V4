"""Common dependencies for FastAPI routes."""
from typing import Annotated, Optional
from fastapi import Depends, HTTPException, status, Header
from sqlmodel import Session

from ..db import get_session
from ..models import User
from .auth import decode_token


def get_current_user(
    authorization: Annotated[Optional[str], Header()] = None,
    session: Session = Depends(get_session),
) -> User:
    """Get current user from Authorization header."""
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="missing_token")
    
    token = authorization.split(" ", 1)[1]
    try:
        payload = decode_token(token)
    except Exception:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="invalid_token")
    
    if payload.get("type") != "access":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="invalid_token")
    
    user_id = payload.get("sub")
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="user_not_found")
    
    return user