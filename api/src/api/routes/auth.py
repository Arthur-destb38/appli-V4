from datetime import datetime, timezone
from typing import Annotated, Optional

from fastapi import APIRouter, Depends, HTTPException, status, Header
from fastapi.responses import Response
from sqlmodel import Session, select

from ..db import get_session
from ..models import User, RefreshToken
from ..schemas import LoginRequest, RegisterRequest, TokenPair, MeResponse
from ..utils.auth import (
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_password,
)

router = APIRouter(prefix="/auth", tags=["auth"])


def _get_refresh_from_header(authorization: Optional[str]) -> str:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="missing_token")
    return authorization.split(" ", 1)[1]


def _get_current_user(
    authorization: Annotated[Optional[str], Header()] = None,
    session: Session = Depends(get_session),
) -> User:
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


@router.post("/register", response_model=TokenPair, status_code=status.HTTP_201_CREATED)
def register(payload: RegisterRequest, session: Session = Depends(get_session)) -> TokenPair:
    existing = session.exec(select(User).where(User.username == payload.username)).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="username_taken")
    user = User(id=payload.username, username=payload.username, password_hash=hash_password(payload.password))
    session.add(user)
    access = create_access_token(user.id)
    refresh_token, exp = create_refresh_token(user.id)
    session.add(RefreshToken(token=refresh_token, user_id=user.id, expires_at=exp))
    session.commit()
    return TokenPair(access_token=access, refresh_token=refresh_token)


@router.post("/login", response_model=TokenPair)
def login(payload: LoginRequest, session: Session = Depends(get_session)) -> TokenPair:
    user = session.exec(select(User).where(User.username == payload.username)).first()
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="invalid_credentials")
    access = create_access_token(user.id)
    refresh_token, exp = create_refresh_token(user.id)
    session.add(RefreshToken(token=refresh_token, user_id=user.id, expires_at=exp))
    session.commit()
    return TokenPair(access_token=access, refresh_token=refresh_token)


@router.post("/refresh", response_model=TokenPair)
def refresh_token(
    authorization: Annotated[Optional[str], Header()] = None,
    session: Session = Depends(get_session),
) -> TokenPair:
    token = _get_refresh_from_header(authorization)
    try:
        payload = decode_token(token)
    except Exception:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="invalid_token")
    if payload.get("type") != "refresh":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="invalid_token")
    user_id = payload.get("sub")
    db_token = session.get(RefreshToken, token)
    if not db_token or db_token.user_id != user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="invalid_token")
    if db_token.expires_at < datetime.now(timezone.utc):
        session.delete(db_token)
        session.commit()
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="token_expired")
    session.delete(db_token)
    new_refresh, exp = create_refresh_token(user_id)
    session.add(RefreshToken(token=new_refresh, user_id=user_id, expires_at=exp))
    access = create_access_token(user_id)
    session.commit()
    return TokenPair(access_token=access, refresh_token=new_refresh)


@router.get("/me", response_model=MeResponse)
def me(current_user: User = Depends(_get_current_user)) -> MeResponse:
    return MeResponse.model_validate(current_user)


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(
    authorization: Annotated[Optional[str], Header()] = None,
    session: Session = Depends(get_session),
) -> Response:
    token = _get_refresh_from_header(authorization)
    db_token = session.get(RefreshToken, token)
    if db_token:
        session.delete(db_token)
        session.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
