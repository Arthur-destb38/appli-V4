from __future__ import annotations

import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select

from ..db import get_session
from ..models import Exercise, Share, User, Workout, WorkoutExercise, Set
from ..utils.slug import make_exercise_slug
from ..schemas import ShareRequest, ShareResponse

router = APIRouter(prefix="/share", tags=["share"])


def _generate_share_id() -> str:
    return f"sh_{uuid.uuid4().hex[:12]}"


def _fetch_workout_snapshot(session: Session, workout_id: str) -> dict:
    workout = session.get(Workout, workout_id)
    if workout is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="workout_not_found")
    if workout.status != "completed":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="workout_not_completed")

    exercises = session.exec(
        select(WorkoutExercise, Exercise)
        .join(Exercise, Exercise.id == WorkoutExercise.exercise_id)
        .where(WorkoutExercise.workout_id == workout_id)
        .order_by(WorkoutExercise.order_index.asc())
    ).all()

    workout_exercise_ids = [we.id for we, _ in exercises]
    sets_by_exercise: dict[int, list[Set]] = {id_: [] for id_ in workout_exercise_ids}
    if workout_exercise_ids:
        sets = session.exec(
            select(Set)
            .where(Set.workout_exercise_id.in_(workout_exercise_ids))
            .order_by(Set.id.asc())
        ).all()
        for set_item in sets:
            sets_by_exercise.setdefault(set_item.workout_exercise_id, []).append(set_item)

    exercises_snapshot = []
    total_sets = 0
    for workout_exercise, exercise in exercises:
        exercise_sets = [
            {
                "reps": workout_set.reps,
                "weight": workout_set.weight,
                "rpe": workout_set.rpe,
                "done_at": workout_set.done_at.isoformat() if workout_set.done_at else None,
            }
            for workout_set in sets_by_exercise.get(workout_exercise.id, [])
        ]
        total_sets += len(exercise_sets)
        exercises_snapshot.append(
            {
                "name": exercise.name,
                "slug": exercise.slug
                or make_exercise_slug(exercise.name, exercise.muscle_group or ""),
                "muscle_group": exercise.muscle_group,
                "exercise_id": exercise.id,
                "planned_sets": workout_exercise.planned_sets,
                "sets": exercise_sets,
            }
        )

    snapshot = {
        "workout_id": workout.id,
        "title": workout.title,
        "status": workout.status,
        "created_at": workout.created_at.isoformat(),
        "updated_at": workout.updated_at.isoformat(),
        "exercises": exercises_snapshot,
    }

    return {
        "snapshot": snapshot,
        "exercise_count": len(exercises_snapshot),
        "set_count": total_sets,
        "title": workout.title,
    }


@router.post("/workouts/{workout_id}", response_model=ShareResponse, status_code=status.HTTP_201_CREATED)
def share_workout(
    workout_id: str,  # Changé en str pour supporter les UUIDs
    payload: ShareRequest,
    session: Session = Depends(get_session),
) -> ShareResponse:
    # Créer l'utilisateur s'il n'existe pas (mode démo)
    user = session.get(User, payload.user_id)
    if user is None:
        user = User(
            id=payload.user_id,
            username=f"User_{payload.user_id[:8]}",
            email=f"{payload.user_id}@temp.local",
            password_hash="temp_not_for_login",
            consent_to_public_share=True,
        )
        session.add(user)
        session.commit()
        session.refresh(user)

    # Récupérer le workout
    workout = session.get(Workout, workout_id)
    
    if workout is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="workout_not_found")
    
    # Permettre le partage même des brouillons en mode démo
    # (commenté la vérification du status)
    # if workout.status != "completed":
    #     raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="workout_not_completed")

    # Compter les exercices et sets
    workout_exercises = session.exec(
        select(WorkoutExercise).where(WorkoutExercise.workout_id == workout_id)
    ).all()
    
    exercise_count = len(workout_exercises)
    set_count = 0
    for we in workout_exercises:
        sets = session.exec(select(Set).where(Set.workout_exercise_id == we.id)).all()
        set_count += len(sets)

    share = Share(
        share_id=_generate_share_id(),
        owner_id=user.id,
        owner_username=user.username,
        workout_id=workout_id,
        workout_title=workout.title,
        exercise_count=exercise_count,
        set_count=set_count,
        created_at=datetime.now(timezone.utc),
    )
    session.add(share)
    session.commit()

    return ShareResponse(
        share_id=share.share_id,
        owner_id=share.owner_id,
        owner_username=share.owner_username,
        workout_title=share.workout_title,
        exercise_count=share.exercise_count,
        set_count=share.set_count,
        created_at=share.created_at,
    )
