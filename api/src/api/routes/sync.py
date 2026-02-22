import json
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlmodel import Session, select

from ..db import get_session
from ..models import Set, SyncEvent, User, Workout, WorkoutExercise
from ..schemas import SyncPullResponse, SyncPushRequest, SyncPushResponse
from ..utils.dependencies import get_current_user

router = APIRouter(prefix="/sync", tags=["sync"])


def _ms_to_datetime(value: Optional[int], fallback: datetime) -> datetime:
    if value is None:
        return fallback
    try:
        return datetime.fromtimestamp(value / 1000, tz=timezone.utc)
    except (TypeError, ValueError) as exc:
        raise HTTPException(status_code=400, detail="Invalid timestamp") from exc


def _find_workout(session: Session, payload: dict, user_id: str) -> Optional[Workout]:
    """Find a workout by client_id or server_id, ensuring it belongs to the user."""
    client_id = payload.get("workoutClientId") or payload.get("client_id")
    if client_id:
        workout = session.exec(
            select(Workout).where(Workout.client_id == client_id)
        ).first()
        if workout and workout.user_id == user_id:
            return workout

    server_id = payload.get("workoutServerId") or payload.get("workoutId")
    if server_id is not None:
        workout = session.get(Workout, str(server_id))
        if workout and workout.user_id == user_id:
            return workout

    return None


def _owns_exercise(session: Session, we: WorkoutExercise, user_id: str) -> bool:
    """Check that the exercise belongs to a workout owned by user_id."""
    workout = session.get(Workout, we.workout_id)
    return workout is not None and workout.user_id == user_id


def _find_exercise(session: Session, payload: dict, user_id: str) -> Optional[WorkoutExercise]:
    """Find a workout exercise by client_id or server_id, ensuring ownership."""
    client_id = payload.get("exerciseClientId") or payload.get("client_id")
    if client_id:
        we = session.exec(
            select(WorkoutExercise).where(WorkoutExercise.client_id == client_id)
        ).first()
        if we and _owns_exercise(session, we, user_id):
            return we

    server_id = payload.get("workoutExerciseServerId") or payload.get("workoutExerciseId")
    if server_id is not None:
        we = session.get(WorkoutExercise, str(server_id))
        if we and _owns_exercise(session, we, user_id):
            return we

    return None


def _owns_set(session: Session, s: Set, user_id: str) -> bool:
    """Check that the set belongs to an exercise in a workout owned by user_id."""
    we = session.get(WorkoutExercise, s.workout_exercise_id)
    if we is None:
        return False
    return _owns_exercise(session, we, user_id)


def _find_set(session: Session, payload: dict, user_id: str) -> Optional[Set]:
    """Find a set by client_id or server_id, ensuring ownership."""
    client_id = payload.get("setClientId") or payload.get("client_id")
    if client_id:
        s = session.exec(select(Set).where(Set.client_id == client_id)).first()
        if s and _owns_set(session, s, user_id):
            return s

    server_id = payload.get("setServerId") or payload.get("setId")
    if server_id is not None:
        s = session.get(Set, str(server_id))
        if s and _owns_set(session, s, user_id):
            return s

    return None


@router.post("/push", response_model=SyncPushResponse, status_code=status.HTTP_200_OK)
def push_mutations(
    payload: SyncPushRequest,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> SyncPushResponse:
    if not payload.mutations:
        return SyncPushResponse(processed=0, server_time=datetime.now(timezone.utc), results=[])

    results = []
    now = datetime.now(timezone.utc)

    for mutation in payload.mutations:
        created_at = _ms_to_datetime(mutation.created_at, now)
        action = mutation.action
        data = mutation.payload or {}

        if action == "create-workout":
            cid = data.get("client_id")
            existing = None
            if cid:
                existing = session.exec(
                    select(Workout)
                    .where(Workout.client_id == cid)
                    .where(Workout.user_id == current_user.id)
                ).first()
            if existing:
                results.append({"queue_id": mutation.queue_id, "server_id": existing.id})
            else:
                workout = Workout(
                    user_id=current_user.id,
                    client_id=cid,
                    title=data.get("title", ""),
                    status=data.get("status", "draft"),
                    created_at=_ms_to_datetime(data.get("created_at"), created_at),
                    updated_at=_ms_to_datetime(data.get("updated_at"), created_at),
                    deleted_at=None,
                )
                session.add(workout)
                session.flush()
                if workout.id is not None:
                    results.append({"queue_id": mutation.queue_id, "server_id": workout.id})

        elif action == "update-title":
            workout = _find_workout(session, data, current_user.id)
            if workout:
                workout.title = data.get("title", workout.title)
                workout.updated_at = _ms_to_datetime(data.get("updated_at"), now)

        elif action == "complete-workout":
            workout = _find_workout(session, data, current_user.id)
            if workout:
                workout.status = "completed"
                workout.updated_at = _ms_to_datetime(data.get("updated_at"), now)

        elif action == "delete-workout":
            workout = _find_workout(session, data, current_user.id)
            if workout:
                workout.deleted_at = _ms_to_datetime(data.get("deleted_at"), now)
                workout.updated_at = _ms_to_datetime(data.get("updated_at"), now)

        elif action == "add-exercise":
            ex_cid = data.get("client_id")
            existing_ex = None
            if ex_cid:
                existing_ex = _find_exercise(session, {"client_id": ex_cid}, current_user.id)
            if existing_ex:
                results.append({"queue_id": mutation.queue_id, "server_id": existing_ex.id})
            else:
                workout = _find_workout(session, data, current_user.id)
                if workout:
                    we = WorkoutExercise(
                        client_id=ex_cid,
                        workout_id=workout.id,
                        exercise_id=data.get("exerciseId", ""),
                        order_index=data.get("orderIndex", 0),
                        planned_sets=data.get("plannedSets"),
                        created_at=created_at,
                        updated_at=created_at,
                    )
                    session.add(we)
                    session.flush()
                    workout.updated_at = now
                    if we.id is not None:
                        results.append({"queue_id": mutation.queue_id, "server_id": we.id})

        elif action == "update-exercise-plan":
            we = _find_exercise(session, data, current_user.id)
            if we:
                planned = data.get("plannedSets")
                we.planned_sets = planned if isinstance(planned, int) else None
                we.updated_at = now

        elif action == "remove-exercise":
            we = _find_exercise(session, data, current_user.id)
            if we:
                sets_to_delete = session.exec(
                    select(Set).where(Set.workout_exercise_id == we.id)
                ).all()
                for s in sets_to_delete:
                    session.delete(s)
                session.delete(we)

        elif action == "add-set":
            set_cid = data.get("client_id")
            existing_set = None
            if set_cid:
                existing_set = _find_set(session, {"client_id": set_cid}, current_user.id)
            if existing_set:
                results.append({"queue_id": mutation.queue_id, "server_id": existing_set.id})
            else:
                we = _find_exercise(session, data, current_user.id)
                if we:
                    set_payload = data.get("payload", {})
                    new_set = Set(
                        client_id=set_cid,
                        workout_exercise_id=we.id,
                        reps=set_payload.get("reps"),
                        weight=set_payload.get("weight"),
                        rpe=set_payload.get("rpe"),
                        created_at=created_at,
                        updated_at=created_at,
                    )
                    session.add(new_set)
                    session.flush()
                    we.updated_at = now
                    if new_set.id is not None:
                        results.append({"queue_id": mutation.queue_id, "server_id": new_set.id})

        elif action == "update-set":
            target_set = _find_set(session, data, current_user.id)
            if target_set:
                updates = data.get("updates", {})
                if "reps" in updates:
                    target_set.reps = updates["reps"]
                if "weight" in updates:
                    target_set.weight = updates["weight"]
                if "rpe" in updates:
                    target_set.rpe = updates["rpe"]
                if "done_at" in updates:
                    done_val = updates["done_at"]
                    target_set.done_at = (
                        _ms_to_datetime(done_val, now) if done_val else None
                    )
                target_set.updated_at = now

        elif action == "remove-set":
            target_set = _find_set(session, data, current_user.id)
            if target_set:
                session.delete(target_set)

        else:
            payload_str = json.dumps(data) if data else None
            event = SyncEvent(
                user_id=current_user.id,
                action=mutation.action,
                payload=payload_str,
                created_at=created_at,
            )
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
    current_user: User = Depends(get_current_user),
) -> SyncPullResponse:
    cutoff = datetime.fromtimestamp(since / 1000, tz=timezone.utc)
    events: list[dict] = []

    workout_stmt = (
        select(Workout)
        .where(Workout.user_id == current_user.id)
        .where(Workout.updated_at > cutoff)
        .order_by(Workout.updated_at.asc())
    )
    workouts = session.exec(workout_stmt).all()

    for workout in workouts:
        exercises_data = []
        exercises = session.exec(
            select(WorkoutExercise)
            .where(WorkoutExercise.workout_id == workout.id)
            .order_by(WorkoutExercise.order_index.asc())
        ).all()

        for ex in exercises:
            sets_data = []
            sets = session.exec(
                select(Set)
                .where(Set.workout_exercise_id == ex.id)
                .order_by(Set.order.asc())
            ).all()

            for s in sets:
                sets_data.append({
                    "server_id": s.id,
                    "client_id": s.client_id,
                    "reps": s.reps,
                    "weight": s.weight,
                    "rpe": s.rpe,
                    "done_at": s.done_at.isoformat() if s.done_at else None,
                })

            exercises_data.append({
                "server_id": ex.id,
                "client_id": ex.client_id,
                "exercise_id": ex.exercise_id,
                "order_index": ex.order_index,
                "planned_sets": ex.planned_sets,
                "sets": sets_data,
            })

        action = "workout-upsert" if workout.deleted_at is None else "workout-delete"
        events.append({
            "id": workout.id,
            "action": action,
            "payload": {
                "server_id": workout.id,
                "client_id": workout.client_id,
                "user_id": workout.user_id,
                "title": workout.title,
                "status": workout.status,
                "created_at": workout.created_at.isoformat(),
                "updated_at": workout.updated_at.isoformat(),
                "deleted_at": workout.deleted_at.isoformat() if workout.deleted_at else None,
                "exercises": exercises_data,
            },
            "created_at": workout.updated_at,
        })

    return SyncPullResponse(server_time=datetime.now(timezone.utc), events=events)
