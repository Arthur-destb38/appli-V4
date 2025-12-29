import json
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlmodel import Session, select

from ..db import get_session
from ..models import SyncEvent, Workout
from ..schemas import SyncPullResponse, SyncPushRequest, SyncPushResponse

router = APIRouter(prefix="/sync", tags=["sync"])


def _ms_to_datetime(value: Optional[int], fallback: datetime) -> datetime:
    if value is None:
        return fallback
    try:
        return datetime.fromtimestamp(value / 1000, tz=timezone.utc)
    except (TypeError, ValueError) as exc:  # pragma: no cover - guard
        raise HTTPException(status_code=400, detail="Invalid timestamp") from exc


def _get_workout_for_payload(session: Session, payload: dict) -> Workout:
    server_id = payload.get("server_id") or payload.get("workoutServerId") or payload.get("workoutId")
    if server_id is not None:
        workout = session.get(Workout, server_id)
        if workout is not None:
            return workout
    client_id = payload.get("client_id") or payload.get("workoutClientId")
    if client_id:
        workout = session.exec(select(Workout).where(Workout.client_id == client_id)).first()
        if workout is not None:
            return workout
    raise HTTPException(status_code=404, detail="Workout not found for mutation")


@router.post("/push", response_model=SyncPushResponse, status_code=status.HTTP_200_OK)
def push_mutations(payload: SyncPushRequest, session: Session = Depends(get_session)) -> SyncPushResponse:
    if not payload.mutations:
        return SyncPushResponse(processed=0, server_time=datetime.now(timezone.utc), results=[])

    results = []

    for mutation in payload.mutations:
        created_at = _ms_to_datetime(mutation.created_at, datetime.now(timezone.utc))
        action = mutation.action
        payload_data = mutation.payload or {}

        if action == "create-workout":
            # Utiliser le user_id du payload ou générer un ID par défaut
            user_id = payload_data.get("user_id") or payload_data.get("userId") or "guest-user"
            workout = Workout(
                user_id=user_id,
                client_id=payload_data.get("client_id"),
                title=payload_data.get("title", ""),
                status=payload_data.get("status", "draft"),
                created_at=_ms_to_datetime(payload_data.get("created_at"), created_at),
                updated_at=_ms_to_datetime(payload_data.get("updated_at"), created_at),
                deleted_at=None,
            )
            session.add(workout)
            session.flush()
            if workout.id is not None:
                results.append({"queue_id": mutation.queue_id, "server_id": workout.id})
        elif action == "update-title":
            workout = _get_workout_for_payload(session, payload_data)
            workout.title = payload_data.get("title", workout.title)
            workout.updated_at = _ms_to_datetime(payload_data.get("updated_at"), created_at)
        elif action == "complete-workout":
            workout = _get_workout_for_payload(session, payload_data)
            workout.status = "completed"
            workout.updated_at = _ms_to_datetime(payload_data.get("updated_at"), created_at)
        elif action == "delete-workout":
            workout = _get_workout_for_payload(session, payload_data)
            workout.deleted_at = _ms_to_datetime(payload_data.get("deleted_at"), created_at)
            workout.updated_at = _ms_to_datetime(payload_data.get("updated_at"), created_at)
        else:
            # Sérialiser le payload en JSON string pour SQLite
            payload_str = json.dumps(payload_data) if payload_data else None
            event = SyncEvent(action=mutation.action, payload=payload_str, created_at=created_at)
            session.add(event)
            session.flush()
            if event.id is not None:
                results.append({"queue_id": mutation.queue_id, "server_id": event.id})

    session.commit()
    server_time = datetime.now(timezone.utc)
    return SyncPushResponse(processed=len(payload.mutations), server_time=server_time, results=results)


@router.get("/pull", response_model=SyncPullResponse)
def pull_changes(
    since: int = Query(0, ge=0),
    session: Session = Depends(get_session),
) -> SyncPullResponse:
    cutoff = datetime.fromtimestamp(since / 1000, tz=timezone.utc)
    events: list[dict] = []

    workout_stmt = select(Workout).where(Workout.updated_at > cutoff).order_by(Workout.updated_at.asc())
    workouts = session.exec(workout_stmt).all()
    for workout in workouts:
        events.append({
            "id": workout.id,
            "action": "workout-upsert" if workout.deleted_at is None else "workout-delete",
            "payload": {
                "server_id": workout.id,
                "client_id": workout.client_id,
                "title": workout.title,
                "status": workout.status,
                "created_at": workout.created_at.isoformat(),
                "updated_at": workout.updated_at.isoformat(),
                "deleted_at": workout.deleted_at.isoformat() if workout.deleted_at else None,
            },
            "created_at": workout.updated_at,
        })

    statement = select(SyncEvent).where(SyncEvent.created_at > cutoff).order_by(SyncEvent.created_at.asc())
    legacy_events = session.exec(statement).all()
    
    # Convertir les legacy events avec désérialisation du payload JSON
    for event in legacy_events:
        payload_dict: dict = {}
        if event.payload:
            if isinstance(event.payload, str):
                try:
                    payload_dict = json.loads(event.payload)
                except json.JSONDecodeError:
                    payload_dict = {}
            elif isinstance(event.payload, dict):
                payload_dict = event.payload
        
        events.append({
            "id": event.id,
            "action": event.action,
            "payload": payload_dict,
            "created_at": event.created_at,
        })
    
    events.sort(key=lambda item: item["created_at"])

    return SyncPullResponse(server_time=datetime.now(timezone.utc), events=events)
