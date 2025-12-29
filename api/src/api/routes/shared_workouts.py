from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select

from ..db import get_session
from ..models import Share, Workout, WorkoutExercise, Exercise, Set

router = APIRouter(prefix="/workouts/shared", tags=["feed"])

@router.get("/{share_id}")
def get_shared_workout(share_id: str, session: Session = Depends(get_session)) -> dict:
    share = session.get(Share, share_id)
    if share is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="share_not_found")
    
    # Construire un snapshot à partir des données disponibles
    snapshot = {
        "title": share.workout_title,
        "exercises": []
    }
    
    # Si on a un workout_id, récupérer les exercices réels
    if share.workout_id:
        workout_exercises = session.exec(
            select(WorkoutExercise, Exercise)
            .join(Exercise, Exercise.id == WorkoutExercise.exercise_id)
            .where(WorkoutExercise.workout_id == share.workout_id)
            .order_by(WorkoutExercise.order_index)
        ).all()
        
        for we, ex in workout_exercises:
            sets = session.exec(
                select(Set)
                .where(Set.workout_exercise_id == we.id)
                .order_by(Set.order)
            ).all()
            
            snapshot["exercises"].append({
                "name": ex.name,
                "slug": ex.slug,
                "muscle_group": ex.muscle_group,
                "sets": [
                    {"reps": s.reps, "weight": s.weight}
                    for s in sets
                ]
            })
    else:
        # Générer des exercices fictifs pour les séances de démo
        for i in range(share.exercise_count):
            snapshot["exercises"].append({
                "name": f"Exercice {i+1}",
                "slug": f"exercise-{i+1}",
                "muscle_group": "general",
                "sets": [
                    {"reps": 10, "weight": 50}
                    for _ in range(max(1, share.set_count // share.exercise_count))
                ]
            })
    
    return snapshot
