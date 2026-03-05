"""Pass Wallet (Apple/Google) — token pour Gorillax Salles."""
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from pydantic import BaseModel
from sqlmodel import Session, select

from ..db import get_session
from ..models import User, PassToken
from ..services.apple_pass import generate_pkpass
from ..services.google_wallet import get_add_to_wallet_url
from ..utils.dependencies import get_current_user, get_current_user_header_or_query

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


@router.get("/apple/pass")
def get_apple_pass(
    current_user: User = Depends(get_current_user_header_or_query),
    session: Session = Depends(get_session),
) -> Response:
    """Retourne le fichier .pkpass pour Apple Wallet. 503 si certificats non configurés."""
    pt = _get_or_create_pass_token(current_user.id, session)
    pkpass_bytes = generate_pkpass(
        pt.token,
        organization_name="Gorillax",
        member_name=current_user.username or "Membre",
        member_id=current_user.id,
    )
    if pkpass_bytes is None:
        raise HTTPException(
            status_code=503,
            detail="Apple Wallet pass non configuré (certificats manquants). Voir APPLE_PASS_* dans .env.",
        )
    return Response(
        content=pkpass_bytes,
        media_type="application/vnd.apple.pkpass",
        headers={"Content-Disposition": "attachment; filename=gorillax.pkpass"},
    )


class GooglePassResponse(BaseModel):
    addToWalletUrl: str


@router.get("/google/pass", response_model=GooglePassResponse)
def get_google_pass(
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> GooglePassResponse:
    """Retourne l'URL « Add to Google Wallet ». 503 si compte de service non configuré."""
    pt = _get_or_create_pass_token(current_user.id, session)
    url = get_add_to_wallet_url(pt.token)
    if url is None:
        raise HTTPException(
            status_code=503,
            detail="Google Wallet non configuré (GOOGLE_WALLET_ISSUER_ID / service account).",
        )
    return GooglePassResponse(addToWalletUrl=url)
