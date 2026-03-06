"""API consommée par le système salle (lecteur → backend salle → Gorillax).

Authentification : X-API-Key ou Authorization Bearer avec la clé salle (SALLE_API_KEY).
Rate limiting et audit des appels.
"""
import os
import time
from collections import deque
from datetime import datetime, timezone
from threading import Lock
from typing import Any, Callable, Optional

from fastapi import APIRouter, Depends, HTTPException, Header, status
from pydantic import BaseModel
from sqlmodel import Session, select

from ..db import get_session
from ..models import (
    User,
    PassToken,
    SalleAuditLog,
    Workout,
    WorkoutExercise,
    Set,
    Exercise,
)

router = APIRouter(prefix="/salle", tags=["salle"])

SALLE_API_KEY_ENV = "SALLE_API_KEY"
SALLE_RATE_LIMIT_PER_MINUTE = int(os.getenv("SALLE_RATE_LIMIT_PER_MINUTE", "100"))
SALLE_CACHE_TTL_SECONDS = int(os.getenv("SALLE_CACHE_TTL_SECONDS", "120"))  # 2 min

# Rate limit: in-memory, par clé (une seule clé pour l'instant)
_salle_rate_limit: dict[str, deque[float]] = {}
_salle_rate_limit_lock = Lock()


def _get_salle_api_key() -> Optional[str]:
    return os.getenv(SALLE_API_KEY_ENV)


def _check_salle_rate_limit() -> None:
    """Lève 429 si trop de requêtes (par minute, global pour la clé salle)."""
    if SALLE_RATE_LIMIT_PER_MINUTE <= 0:
        return
    key = "salle"
    now = time.monotonic()
    cutoff = now - 60.0
    with _salle_rate_limit_lock:
        if key not in _salle_rate_limit:
            _salle_rate_limit[key] = deque(maxlen=SALLE_RATE_LIMIT_PER_MINUTE + 10)
        q = _salle_rate_limit[key]
        while q and q[0] < cutoff:
            q.popleft()
        if len(q) >= SALLE_RATE_LIMIT_PER_MINUTE:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="rate_limit_exceeded",
            )
        q.append(now)


def get_salle_client(
    x_api_key: Optional[str] = Header(None, alias="X-API-Key"),
    authorization: Optional[str] = Header(None),
) -> str:
    """Vérifie que la requête est authentifiée par une clé salle."""
    key = _get_salle_api_key()
    if not key:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="salle_api_not_configured",
        )
    provided = None
    if x_api_key:
        provided = x_api_key.strip()
    elif authorization and authorization.lower().startswith("bearer "):
        provided = authorization.split(" ", 1)[1].strip()
    if not provided or provided != key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="invalid_salle_credentials",
        )
    _check_salle_rate_limit()
    return "salle"


def _log_salle_call(
    session: Session,
    endpoint: str,
    gym_id: Optional[str] = None,
    user_id: Optional[str] = None,
) -> None:
    session.add(
        SalleAuditLog(gym_id=gym_id, endpoint=endpoint, user_id=user_id)
    )
    session.commit()


# --- Cache simple TTL (pour profile et current-session) ---
_salle_cache: dict[str, tuple[float, Any]] = {}
_salle_cache_lock = Lock()


def _get_cached(key: str, fetch_fn: Callable[[], Any], ttl: int = SALLE_CACHE_TTL_SECONDS) -> Any:
    now = time.monotonic()
    with _salle_cache_lock:
        if key in _salle_cache:
            expires_at, value = _salle_cache[key]
            if now < expires_at:
                return value
    value = fetch_fn()
    with _salle_cache_lock:
        _salle_cache[key] = (now + ttl, value)
    return value


# --- Schémas ---


class ResolveTokenRequest(BaseModel):
    token: str
    gym_id: Optional[str] = None


class ResolveTokenResponse(BaseModel):
    user_id: str
    status: str = "active"
    display_name: str


class SetSummary(BaseModel):
    reps: Optional[int] = None
    weight: Optional[float] = None
    rpe: Optional[float] = None
    done_at: Optional[str] = None


class ExerciseSummary(BaseModel):
    name: str
    planned_sets: Optional[int] = None
    sets: list[SetSummary]


class CurrentSessionResponse(BaseModel):
    workout_id: str
    title: str
    status: str
    exercises: list[ExerciseSummary]


class SalleProfileResponse(BaseModel):
    user_id: str
    display_name: str
    objective: Optional[str] = None
    bio: Optional[str] = None


# --- Endpoints ---


@router.post("/resolve-token", response_model=ResolveTokenResponse)
def resolve_token(
    body: ResolveTokenRequest,
    session: Session = Depends(get_session),
    _client: str = Depends(get_salle_client),
) -> ResolveTokenResponse:
    """
    Résout le token lu depuis le pass (QR/code) et retourne l'identité utilisateur.
    """
    token_str = (body.token or "").strip()
    if not token_str:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="token_missing")

    pt = session.get(PassToken, token_str)
    if not pt:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="token_unknown")

    now = datetime.now(timezone.utc)
    if pt.revoked_at is not None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="token_revoked")
    if pt.expires_at <= now:
        raise HTTPException(status_code=status.HTTP_410_GONE, detail="token_expired")

    user = session.get(User, pt.user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="user_not_found")

    _log_salle_call(session, "resolve-token", gym_id=body.gym_id, user_id=user.id)
    return ResolveTokenResponse(
        user_id=user.id,
        status="active",
        display_name=user.username,
    )


def _fetch_current_session_uncached(session: Session, user_id: str) -> Optional[CurrentSessionResponse]:
    """Dernière séance non terminée (draft ou en cours)."""
    workout = session.exec(
        select(Workout)
        .where(
            Workout.user_id == user_id,
            Workout.deleted_at.is_(None),
            Workout.status != "completed",
        )
        .order_by(Workout.updated_at.desc())
        .limit(1)
    ).first()
    if not workout:
        return None

    exercises = session.exec(
        select(WorkoutExercise)
        .where(WorkoutExercise.workout_id == workout.id)
        .order_by(WorkoutExercise.order_index.asc())
    ).all()

    exercise_summaries = []
    for we in exercises:
        ex_catalog = session.get(Exercise, we.exercise_id)
        name = ex_catalog.name if ex_catalog else we.exercise_id
        sets_list = session.exec(
            select(Set)
            .where(Set.workout_exercise_id == we.id)
            .order_by(Set.order.asc())
        ).all()
        exercise_summaries.append(
            ExerciseSummary(
                name=name,
                planned_sets=we.planned_sets,
                sets=[
                    SetSummary(
                        reps=s.reps,
                        weight=s.weight,
                        rpe=s.rpe,
                        done_at=s.done_at.isoformat() if s.done_at else None,
                    )
                    for s in sets_list
                ],
            )
        )

    return CurrentSessionResponse(
        workout_id=workout.id,
        title=workout.title,
        status=workout.status,
        exercises=exercise_summaries,
    )


@router.get("/users/{user_id}/current-session", response_model=Optional[CurrentSessionResponse])
def get_current_session(
    user_id: str,
    session: Session = Depends(get_session),
    _client: str = Depends(get_salle_client),
) -> Optional[CurrentSessionResponse]:
    """
    Séance en cours (dernière séance non terminée) pour l'affichage machine.
    Cache court (SALLE_CACHE_TTL_SECONDS). 404 si l'utilisateur n'existe pas.
    """
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="user_not_found")

    _log_salle_call(session, "current-session", user_id=user_id)

    return _get_cached(
        f"current-session:{user_id}",
        lambda: _fetch_current_session_uncached(session, user_id),
    )


def _fetch_profile_uncached(session: Session, user_id: str) -> Optional[SalleProfileResponse]:
    user = session.get(User, user_id)
    if not user:
        return None
    return SalleProfileResponse(
        user_id=user.id,
        display_name=user.username,
        objective=user.objective,
        bio=user.bio,
    )


@router.get("/users/{user_id}/profile", response_model=SalleProfileResponse)
def get_profile(
    user_id: str,
    session: Session = Depends(get_session),
    _client: str = Depends(get_salle_client),
) -> SalleProfileResponse:
    """
    Profil public (pseudo, objectifs) pour l'affichage machine. Pas de données sensibles.
    Cache court (SALLE_CACHE_TTL_SECONDS).
    """
    _log_salle_call(session, "profile", user_id=user_id)

    result = _get_cached(
        f"profile:{user_id}",
        lambda: _fetch_profile_uncached(session, user_id),
    )
    if not result:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="user_not_found")
    return result
