"""Routes abonnement — webhook RevenueCat, statut, restauration."""

import json
import os
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Header, status
from sqlmodel import Session, select

from ..db import get_session, set_session_user_id
from ..models import User, SubscriptionEvent
from ..schemas import SubscriptionStatusResponse
from ..utils.dependencies import get_current_user

router = APIRouter(prefix="/subscriptions", tags=["subscriptions"])

FREE_AI_PROGRAM_LIMIT = 10
WEBHOOK_SECRET = os.getenv("REVENUECAT_WEBHOOK_SECRET", "")


# ─── Helpers ───────────────────────────────────────────────────────────────────

def _update_user_subscription(user: User, event_type: str, expires_at: Optional[datetime]) -> None:
    """Met à jour le tier de l'utilisateur selon l'événement RevenueCat."""
    if event_type in ("INITIAL_PURCHASE", "RENEWAL", "NON_RENEWING_PURCHASE"):
        user.subscription_tier = "premium"
        user.subscription_expires_at = expires_at
    elif event_type in ("CANCELLATION", "EXPIRATION"):
        # Garder premium jusqu'à expiration si elle est dans le futur
        if expires_at and expires_at > datetime.now(timezone.utc):
            user.subscription_tier = "premium"
            user.subscription_expires_at = expires_at
        else:
            user.subscription_tier = "free"
            user.subscription_expires_at = None
    elif event_type == "BILLING_ISSUE":
        # Garder premium, RevenueCat gère les retries
        pass


# ─── Webhook RevenueCat ───────────────────────────────────────────────────────

@router.post("/webhook", summary="Webhook RevenueCat")
def revenuecat_webhook(
    body: dict,
    authorization: Optional[str] = Header(None),
    session: Session = Depends(get_session),
):
    """Reçoit les événements RevenueCat et met à jour l'abonnement.

    Authentification par header Authorization: Bearer <REVENUECAT_WEBHOOK_SECRET>.
    """
    # Vérifier le secret — toujours requis
    if not WEBHOOK_SECRET:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="webhook_not_configured"
        )
    token = ""
    if authorization and authorization.lower().startswith("bearer ") and len(authorization) > 7:
        token = authorization.split(" ", 1)[1]
    if token != WEBHOOK_SECRET:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="invalid_webhook_secret")

    event = body.get("event", {})
    event_type = event.get("type", "")
    app_user_id = event.get("app_user_id", "")
    product_id = event.get("product_id", "")
    store = event.get("store", "")
    event_id = event.get("id", "")

    # Parse expiration
    expires_at = None
    expiration_ms = event.get("expiration_at_ms")
    if expiration_ms:
        try:
            expires_at = datetime.fromtimestamp(int(expiration_ms) / 1000, tz=timezone.utc)
        except (ValueError, TypeError):
            pass

    if not app_user_id:
        return {"status": "ignored", "reason": "no_app_user_id"}

    # Idempotence : vérifier si l'event a déjà été traité
    if event_id:
        existing = session.exec(
            select(SubscriptionEvent).where(SubscriptionEvent.revenuecat_event_id == event_id)
        ).first()
        if existing:
            return {"status": "already_processed"}

    # Trouver l'utilisateur
    user = session.exec(
        select(User).where(User.revenuecat_app_user_id == app_user_id)
    ).first()
    if not user:
        # Essayer par user ID directement (on utilise user.id comme app_user_id)
        user = session.get(User, app_user_id)
    if not user:
        return {"status": "ignored", "reason": "user_not_found"}

    set_session_user_id(session, str(user.id))

    # Log l'événement
    sub_event = SubscriptionEvent(
        user_id=user.id,
        event_type=event_type,
        product_id=product_id,
        store=store,
        expires_at=expires_at,
        revenuecat_event_id=event_id if event_id else None,
        raw_payload=json.dumps(body)[:5000],  # Limiter la taille
    )
    session.add(sub_event)

    # Mettre à jour le statut
    _update_user_subscription(user, event_type, expires_at)
    session.add(user)
    session.commit()

    return {"status": "ok"}


# ─── Statut abonnement ────────────────────────────────────────────────────────

@router.get("/status", response_model=SubscriptionStatusResponse, summary="Statut d'abonnement")
def subscription_status(
    current_user: User = Depends(get_current_user),
):
    """Retourne le statut d'abonnement de l'utilisateur courant."""
    is_premium = current_user.subscription_tier == "premium"

    # Vérifier expiration
    if is_premium and current_user.subscription_expires_at:
        if current_user.subscription_expires_at < datetime.now(timezone.utc):
            is_premium = False

    if is_premium:
        remaining = -1  # Illimité
    else:
        remaining = max(0, FREE_AI_PROGRAM_LIMIT - current_user.ai_programs_generated)

    return SubscriptionStatusResponse(
        tier="premium" if is_premium else "free",
        is_premium=is_premium,
        expires_at=current_user.subscription_expires_at,
        ai_programs_remaining=remaining,
    )


# ─── Restauration ─────────────────────────────────────────────────────────────

@router.post("/restore", summary="Restaurer l'abonnement")
def restore_subscription(
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """Force une re-vérification du statut.

    Le client appelle ceci après un `Purchases.restorePurchases()` réussi.
    Le webhook RevenueCat aura déjà mis à jour le statut,
    donc on retourne simplement le statut actuel.
    """
    is_premium = (
        current_user.subscription_tier == "premium"
        and (
            not current_user.subscription_expires_at
            or current_user.subscription_expires_at > datetime.now(timezone.utc)
        )
    )
    remaining = -1 if is_premium else max(0, FREE_AI_PROGRAM_LIMIT - current_user.ai_programs_generated)

    return SubscriptionStatusResponse(
        tier="premium" if is_premium else "free",
        is_premium=is_premium,
        expires_at=current_user.subscription_expires_at,
        ai_programs_remaining=remaining,
    )
