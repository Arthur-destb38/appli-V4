"""Pass Wallet (Apple/Google) — token pour Gorillax Salles."""
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlmodel import Session, select

from ..db import get_session
from ..models import User, PassToken
from ..utils.dependencies import get_current_user

router = APIRouter(prefix="/wallet", tags=["wallet"])


class PassTokenResponse(BaseModel):
    token: str
    expires_at: datetime


def _get_or_create_pass_token(user_id: str, session: Session) -> PassToken:
    """Retourne le token actif pour l'user, ou en crée un (et révoque les anciens)."""
    now = datetime.now(timezone.utc)
    active = session.exec(
        select(PassToken).where(
            PassToken.user_id == user_id,
            PassToken.revoked_at.is_(None),
            PassToken.expires_at > now,
        )
    ).first()
    if active:
        return active
    for old in session.exec(select(PassToken).where(PassToken.user_id == user_id)).all():
        old.revoked_at = now
    session.commit()
    new_token = PassToken(
        user_id=user_id,
        expires_at=now + timedelta(days=365),
    )
    session.add(new_token)
    session.commit()
    session.refresh(new_token)
    return new_token


def _renew_pass_token(user_id: str, session: Session) -> PassToken:
    """Révoque le token actuel et en crée un nouveau."""
    now = datetime.now(timezone.utc)
    for old in session.exec(select(PassToken).where(PassToken.user_id == user_id)).all():
        if old.revoked_at is None:
            old.revoked_at = now
    session.commit()
    new_token = PassToken(
        user_id=user_id,
        expires_at=now + timedelta(days=365),
    )
    session.add(new_token)
    session.commit()
    session.refresh(new_token)
    return new_token


@router.get("/pass-token", response_model=PassTokenResponse)
def get_pass_token(
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> PassTokenResponse:
    """Retourne le token pass actif pour l'utilisateur (ou en crée un)."""
    pt = _get_or_create_pass_token(current_user.id, session)
    return PassTokenResponse(token=pt.token, expires_at=pt.expires_at)


@router.post("/pass-token/renew", response_model=PassTokenResponse)
def renew_pass_token(
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> PassTokenResponse:
    """Révoque l'ancien token et en crée un nouveau (pour mettre à jour le pass)."""
    pt = _renew_pass_token(current_user.id, session)
    return PassTokenResponse(token=pt.token, expires_at=pt.expires_at)
