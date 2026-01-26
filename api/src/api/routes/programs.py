from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status, Header
from pydantic import BaseModel
from sqlmodel import Session, select
import random
from collections import defaultdict

from ..db import get_session
from ..models import Program, ProgramSession, ProgramSet, Exercise, Workout, WorkoutExercise, Set, User
from ..schemas import ProgramCreate, ProgramRead
from ..utils.auth import decode_token
from datetime import datetime, timezone

router = APIRouter(prefix="/programs", tags=["programs"])


def _get_current_user_required(
    authorization: Optional[str] = Header(None),
    session: Session = Depends(get_session),
) -> User:
    """Get current user from token, raise 401 if no valid token."""
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="missing_token")
    token = authorization.split(" ", 1)[1]
    try:
        payload = decode_token(token)
        if payload.get("type") != "access":
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="invalid_token")
        user_id = payload.get("sub")
        user = session.get(User, user_id)
        if not user:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="user_not_found")
        return user
    except ValueError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="invalid_token")


class GenerateProgramRequest(BaseModel):
    title: str = "Programme personnalisé"
    objective: Optional[str] = None
    duration_weeks: int = 4
    frequency: int = 3
    user_id: Optional[str] = None
    exercises_per_session: int = 4
    # Nouveaux paramètres de la V1
    niveau: Optional[str] = None  # Débutant, Intermédiaire, Avancé
    duree_seance: Optional[str] = None  # "45", "60", etc.
    priorite: Optional[str] = None  # "haut", "bas", "specifique"
    priorite_first: Optional[str] = None
    priorite_second: Optional[str] = None
    has_blessure: bool = False
    blessure_first: Optional[str] = None
    blessure_second: Optional[str] = None
    equipment_available: Optional[list[str]] = None
    cardio: Optional[str] = None  # "oui" ou "non"
    methode_preferee: Optional[str] = None  # "fullbody", "upperlower", "split", "ppl"


def _upsert_program(session: Session, payload: ProgramCreate) -> Program:
    program = Program(
        title=payload.title,
        objective=payload.objective,
        duration_weeks=payload.duration_weeks,
        user_id=payload.user_id,
    )
    session.add(program)
    session.flush()

    for sess in payload.sessions:
        prog_session = ProgramSession(
            program_id=program.id,
            day_index=sess.day_index,
            title=sess.title,
            focus=sess.focus,
            estimated_minutes=sess.estimated_minutes,
        )
        session.add(prog_session)
        session.flush()
        for s in sess.sets:
            session.add(
                ProgramSet(
                    program_session_id=prog_session.id,
                    exercise_slug=s.exercise_slug,
                    reps=s.reps,
                    weight=s.weight,
                    rpe=s.rpe,
                    order_index=s.order_index,
                    notes=s.notes,
                )
            )
    return program


@router.get("", response_model=list[ProgramRead], summary="Lister les programmes")
def list_programs(
    session: Session = Depends(get_session),
    current_user: User = Depends(_get_current_user_required)
) -> list[ProgramRead]:
    # Only return programs for the authenticated user
    programs = session.exec(select(Program).where(Program.user_id == current_user.id)).all()
    results: list[ProgramRead] = []
    for prog in programs:
        sessions = session.exec(select(ProgramSession).where(ProgramSession.program_id == prog.id)).all()
        session_reads = []
        for ps in sessions:
            sets = session.exec(select(ProgramSet).where(ProgramSet.program_session_id == ps.id).order_by(ProgramSet.order_index)).all()
            session_reads.append(
                {
                    "id": ps.id,
                    "day_index": ps.day_index,
                    "title": ps.title,
                    "focus": ps.focus,
                    "estimated_minutes": ps.estimated_minutes,
                    "sets": sets,
                }
            )
        results.append(
            ProgramRead(
                id=prog.id,
                title=prog.title,
                objective=prog.objective,
                duration_weeks=prog.duration_weeks,
                user_id=prog.user_id,
                sessions=session_reads,
            )
        )
    return results


@router.post("", response_model=ProgramRead, status_code=status.HTTP_201_CREATED, summary="Créer un programme avec sessions/sets")
def create_program(
    payload: ProgramCreate, 
    session: Session = Depends(get_session),
    current_user: User = Depends(_get_current_user_required)
) -> ProgramRead:
    # Set the user_id to the authenticated user
    payload.user_id = current_user.id
    program = _upsert_program(session, payload)
    session.commit()
    session.refresh(program)

    sessions = session.exec(select(ProgramSession).where(ProgramSession.program_id == program.id)).all()
    session_reads = []
    for ps in sessions:
        sets = session.exec(select(ProgramSet).where(ProgramSet.program_session_id == ps.id).order_by(ProgramSet.order_index)).all()
        session_reads.append(
            {
                "id": ps.id,
                "day_index": ps.day_index,
                "title": ps.title,
                "focus": ps.focus,
                "estimated_minutes": ps.estimated_minutes,
                "sets": sets,
            }
        )

    return ProgramRead(
        id=program.id,
        title=program.title,
        objective=program.objective,
        duration_weeks=program.duration_weeks,
        user_id=program.user_id,
        sessions=session_reads,
    )


@router.get("/{program_id}", response_model=ProgramRead, summary="Détail d'un programme")
def get_program(
    program_id: str, 
    session: Session = Depends(get_session),
    current_user: User = Depends(_get_current_user_required)
) -> ProgramRead:
    program = session.get(Program, program_id)
    if not program:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Programme introuvable")
    
    # Only allow access to own programs
    if program.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="access_denied")
    sessions = session.exec(select(ProgramSession).where(ProgramSession.program_id == program.id)).all()
    session_reads = []
    for ps in sessions:
        sets = session.exec(select(ProgramSet).where(ProgramSet.program_session_id == ps.id).order_by(ProgramSet.order_index)).all()
        session_reads.append(
            {
                "id": ps.id,
                "day_index": ps.day_index,
                "title": ps.title,
                "focus": ps.focus,
                "estimated_minutes": ps.estimated_minutes,
                "sets": sets,
            }
        )
    return ProgramRead(
        id=program.id,
        title=program.title,
        objective=program.objective,
        duration_weeks=program.duration_weeks,
        user_id=program.user_id,
        sessions=session_reads,
    )


@router.post("/generate", response_model=ProgramRead, summary="Générer un programme à partir des exos (logique V1 complète)")
def generate_program(
    payload: GenerateProgramRequest, 
    session: Session = Depends(get_session),
    current_user: User = Depends(_get_current_user_required)
) -> ProgramRead:
    from ..services.program_generator import generate_program as generate_program_logic
    
    exercises = session.exec(select(Exercise)).all()
    if not exercises:
        raise HTTPException(status_code=400, detail="Aucun exercice en base pour générer un programme")

    # Construire le profil utilisateur pour le générateur
    profile = {
        'frequency': max(2, min(6, payload.frequency)),
        'duration_weeks': payload.duration_weeks,
        'objective': payload.objective or 'Hypertrophie',
        'niveau': payload.niveau or 'Intermédiaire',
        'duree_seance': payload.duree_seance or '45',
        'priorite': payload.priorite,
        'priorite_first': payload.priorite_first,
        'priorite_second': payload.priorite_second,
        'has_blessure': payload.has_blessure,
        'blessure_first': payload.blessure_first,
        'blessure_second': payload.blessure_second,
        'equipment_available': payload.equipment_available or [],
        'cardio': payload.cardio,
        'methode_preferee': payload.methode_preferee,
        'user_id': current_user.id,  # Use authenticated user
    }

    # Générer le programme avec la logique V1
    program_data = generate_program_logic(session, profile, payload.title)

    # Créer le programme en base
    program_create = ProgramCreate(**program_data)
    program = _upsert_program(session, program_create)
    session.commit()
    session.refresh(program)

    # Retourner le programme créé
    sessions_db = session.exec(select(ProgramSession).where(ProgramSession.program_id == program.id)).all()
    session_reads = []
    for ps in sessions_db:
        sets = session.exec(select(ProgramSet).where(ProgramSet.program_session_id == ps.id).order_by(ProgramSet.order_index)).all()
        session_reads.append(
            {
                "id": ps.id,
                "day_index": ps.day_index,
                "title": ps.title,
                "focus": ps.focus,
                "estimated_minutes": ps.estimated_minutes,
                "sets": sets,
            }
        )

    return ProgramRead(
        id=program.id,
        title=program.title,
        objective=program.objective,
        duration_weeks=program.duration_weeks,
        user_id=program.user_id,
        sessions=session_reads,
    )


class ProgramSaveResponse(BaseModel):
    program_id: str
    workouts_created: int
    workouts: list[dict]


@router.post("/{program_id}/save", response_model=ProgramSaveResponse, summary="Enregistrer un programme et créer les séances associées")
def save_program(
    program_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(_get_current_user_required)
) -> ProgramSaveResponse:
    program = session.get(Program, program_id)
    if not program:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Programme introuvable")
    
    # Only allow access to own programs
    if program.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="access_denied")

    # Récupérer toutes les sessions du programme
    prog_sessions = session.exec(select(ProgramSession).where(ProgramSession.program_id == program.id)).all()
    
    workouts_created = []
    user_id = current_user.id  # Use authenticated user
    now = datetime.now(timezone.utc)

    for prog_session in prog_sessions:
        # Créer un workout pour chaque session du programme
        workout = Workout(
            user_id=user_id,
            title=prog_session.title or f"Séance {prog_session.day_index + 1} du programme",
            status="draft",
            created_at=now,
            updated_at=now,
        )
        session.add(workout)
        session.flush()

        # Récupérer les sets de la session
        prog_sets = session.exec(
            select(ProgramSet)
            .where(ProgramSet.program_session_id == prog_session.id)
            .order_by(ProgramSet.order_index)
        ).all()

        # Grouper les sets par exercice
        exercises_map: dict[str, list[ProgramSet]] = {}
        for prog_set in prog_sets:
            slug = prog_set.exercise_slug
            if slug not in exercises_map:
                exercises_map[slug] = []
            exercises_map[slug].append(prog_set)

        # Créer les exercices et sets
        order_index = 0
        for exercise_slug, sets_list in exercises_map.items():
            workout_exercise = WorkoutExercise(
                workout_id=workout.id,
                exercise_id=exercise_slug,
                order_index=order_index,
                planned_sets=len(sets_list),
            )
            session.add(workout_exercise)
            session.flush()

            # Créer les sets
            for set_index, prog_set in enumerate(sets_list):
                set_entry = Set(
                    workout_exercise_id=workout_exercise.id,
                    reps=prog_set.reps,
                    weight=prog_set.weight,
                    rpe=prog_set.rpe,
                    order=set_index,
                    created_at=now,
                    completed=False,
                )
                session.add(set_entry)
            
            order_index += 1

        workouts_created.append({
            "id": workout.id,
            "title": workout.title,
            "day_index": prog_session.day_index,
        })

    session.commit()

    return ProgramSaveResponse(
        program_id=program.id,
        workouts_created=len(workouts_created),
        workouts=workouts_created
    )
