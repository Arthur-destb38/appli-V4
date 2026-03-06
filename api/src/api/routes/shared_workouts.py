import re

from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select

from ..db import get_session
from ..models import Share, Workout, WorkoutExercise, Exercise, Set

router = APIRouter(prefix="/workouts/shared", tags=["feed"])


def _slug_to_name(slug: str) -> str:
    """Convert a slug like 'bench-press-pectorals' to 'Bench Press Pectorals'."""
    return re.sub(r"-", " ", slug).title()


def _resolve_exercise(session: Session, exercise_id: str) -> dict:
    """Look up an Exercise record by id or slug; fall back to slug-derived name."""
    ex = session.get(Exercise, exercise_id)
    if ex:
        return {"name": ex.name, "slug": ex.slug or exercise_id, "muscle_group": ex.muscle_group}

    ex = session.exec(select(Exercise).where(Exercise.slug == exercise_id)).first()
    if ex:
        return {"name": ex.name, "slug": ex.slug or exercise_id, "muscle_group": ex.muscle_group}

    return {"name": _slug_to_name(exercise_id), "slug": exercise_id, "muscle_group": ""}


@router.get("/{share_id}")
def get_shared_workout(share_id: str, session: Session = Depends(get_session)) -> dict:
    share = session.get(Share, share_id)
    if share is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="share_not_found")

    snapshot: dict = {
        "title": share.workout_title,
        "exercises": [],
    }

    if share.workout_id:
        workout_exercises = session.exec(
            select(WorkoutExercise)
            .where(WorkoutExercise.workout_id == share.workout_id)
            .order_by(WorkoutExercise.order_index)
        ).all()

        # Batch-load exercises and sets to avoid N+1
        exercise_ids = list({we.exercise_id for we in workout_exercises})
        we_ids = [we.id for we in workout_exercises]

        exercises_by_id: dict[str, Exercise] = {}
        exercises_by_slug: dict[str, Exercise] = {}
        if exercise_ids:
            all_exercises = session.exec(select(Exercise).where(Exercise.id.in_(exercise_ids))).all()
            exercises_by_id = {ex.id: ex for ex in all_exercises}
            # Also try slug lookup for IDs not found by primary key
            missing_ids = [eid for eid in exercise_ids if eid not in exercises_by_id]
            if missing_ids:
                slug_exercises = session.exec(select(Exercise).where(Exercise.slug.in_(missing_ids))).all()
                exercises_by_slug = {ex.slug: ex for ex in slug_exercises if ex.slug}

        sets_by_we: dict[str, list[Set]] = {wid: [] for wid in we_ids}
        if we_ids:
            all_sets = session.exec(
                select(Set).where(Set.workout_exercise_id.in_(we_ids)).order_by(Set.order)
            ).all()
            for s in all_sets:
                sets_by_we[s.workout_exercise_id].append(s)

        for we in workout_exercises:
            ex = exercises_by_id.get(we.exercise_id) or exercises_by_slug.get(we.exercise_id)
            if ex:
                ex_info = {"name": ex.name, "slug": ex.slug or we.exercise_id, "muscle_group": ex.muscle_group}
            else:
                ex_info = {"name": _slug_to_name(we.exercise_id), "slug": we.exercise_id, "muscle_group": ""}

            snapshot["exercises"].append({
                "name": ex_info["name"],
                "slug": ex_info["slug"],
                "muscle_group": ex_info["muscle_group"],
                "sets": [
                    {"reps": s.reps, "weight": s.weight}
                    for s in sets_by_we.get(we.id, [])
                ],
            })
    else:
        count = max(share.exercise_count, 1)
        for i in range(share.exercise_count):
            snapshot["exercises"].append({
                "name": f"Exercice {i + 1}",
                "slug": f"exercise-{i + 1}",
                "muscle_group": "general",
                "sets": [
                    {"reps": 10, "weight": 50}
                    for _ in range(max(1, share.set_count // count))
                ],
            })

    return snapshot
