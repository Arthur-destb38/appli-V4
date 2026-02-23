from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlmodel import Session, select
import random
from collections import defaultdict

from ..db import get_session
from ..models import Program, ProgramSession, ProgramSet, Exercise, Workout, WorkoutExercise, Set, User
from ..schemas import ProgramCreate, ProgramRead
from ..utils.dependencies import get_current_user as _get_current_user_required
from datetime import datetime, timezone

router = APIRouter(prefix="/programs", tags=["programs"])


def _get_user_profile_data(user: User) -> dict:
    """Récupère et structure les données du profil utilisateur pour la génération de programmes"""
    profile_data = {}
    
    # Informations de base
    if user.objective:
        # Mapper les objectifs du profil vers ceux du générateur
        objective_mapping = {
            'muscle_gain': 'Hypertrophie',
            'weight_loss': 'Perte de poids', 
            'strength': 'Force',
            'endurance': 'Endurance',
            'general_fitness': 'Remise en forme'
        }
        profile_data['objective'] = objective_mapping.get(user.objective, user.objective)
    
    # Niveau d'expérience
    if user.experience_level:
        level_mapping = {
            'beginner': 'Débutant',
            'intermediate': 'Intermédiaire', 
            'advanced': 'Avancé'
        }
        profile_data['experience_level'] = level_mapping.get(user.experience_level, user.experience_level)
    
    # Fréquence d'entraînement
    if user.training_frequency:
        profile_data['training_frequency'] = user.training_frequency
    
    # Équipement disponible
    if user.equipment_available:
        try:
            import json
            equipment_list = json.loads(user.equipment_available)
            # Mapper les équipements français vers les identifiants anglais
            equipment_mapping = {
                'Haltères': 'dumbbell',
                'Barre olympique': 'barbell', 
                'Machines': 'machine',
                'Kettlebells': 'kettlebell',
                'Élastiques': 'resistance_band',
                'Poids du corps': 'bodyweight',
                'TRX': 'suspension',
                'Banc': 'bench',
                'Rack à squat': 'squat_rack',
                'Cardio (tapis, vélo...)': 'cardio'
            }
            mapped_equipment = []
            for eq in equipment_list:
                mapped = equipment_mapping.get(eq, eq.lower().replace(' ', '_'))
                mapped_equipment.append(mapped)
            profile_data['equipment_available'] = mapped_equipment
        except (json.JSONDecodeError, TypeError):
            profile_data['equipment_available'] = []
    
    # Informations physiques
    if user.height:
        profile_data['height'] = user.height
    if user.weight:
        profile_data['weight'] = user.weight
    if user.gender:
        profile_data['gender'] = user.gender
    if user.location:
        profile_data['location'] = user.location
    
    # Détection des blessures potentielles depuis la bio
    if user.bio:
        bio_lower = user.bio.lower()
        injury_keywords = {
            'dos': 'Dos',
            'genou': 'Genoux', 
            'épaule': 'Épaules',
            'coude': 'Coudes',
            'poignet': 'Poignets',
            'cheville': 'Chevilles',
            'blessure': 'Général',
            'douleur': 'Général'
        }
        detected_injuries = []
        for keyword, injury in injury_keywords.items():
            if keyword in bio_lower:
                detected_injuries.append(injury)
        if detected_injuries:
            profile_data['injuries'] = ', '.join(detected_injuries[:2])  # Max 2 blessures
    
    return profile_data


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


@router.post("/generate", response_model=ProgramRead, summary="Générer un programme intelligent basé sur le profil utilisateur")
def generate_program(
    payload: GenerateProgramRequest, 
    session: Session = Depends(get_session),
    current_user: User = Depends(_get_current_user_required)
) -> ProgramRead:
    from ..services.program_generator import generate_program as generate_program_logic
    
    exercises = session.exec(select(Exercise)).all()
    if not exercises:
        raise HTTPException(status_code=400, detail="Aucun exercice en base pour générer un programme")

    # 🎯 NOUVEAU: Récupérer automatiquement les données du profil utilisateur
    user_profile = _get_user_profile_data(current_user)
    
    # Construire le profil utilisateur pour le générateur en fusionnant les données
    profile = {
        'frequency': max(2, min(6, payload.frequency)),
        'duration_weeks': payload.duration_weeks,
        # 🎯 Utiliser l'objectif du profil si non spécifié dans la requête
        'objective': payload.objective or user_profile.get('objective') or 'Hypertrophie',
        # 🎯 Utiliser le niveau du profil si non spécifié
        'niveau': payload.niveau or user_profile.get('experience_level') or 'Intermédiaire',
        # 🎯 Utiliser la fréquence du profil si disponible
        'duree_seance': payload.duree_seance or str(user_profile.get('training_frequency', 3) * 15) or '45',
        'priorite': payload.priorite,
        'priorite_first': payload.priorite_first,
        'priorite_second': payload.priorite_second,
        # 🎯 Détecter automatiquement les blessures depuis le profil
        'has_blessure': payload.has_blessure or bool(user_profile.get('injuries')),
        'blessure_first': payload.blessure_first or user_profile.get('injuries', '').split(',')[0].strip() if user_profile.get('injuries') else None,
        'blessure_second': payload.blessure_second,
        # 🎯 Utiliser l'équipement du profil si non spécifié
        'equipment_available': payload.equipment_available or user_profile.get('equipment_available', []),
        'cardio': payload.cardio,
        'methode_preferee': payload.methode_preferee,
        'user_id': current_user.id,
        # 🎯 NOUVEAU: Données supplémentaires du profil
        'user_height': user_profile.get('height'),
        'user_weight': user_profile.get('weight'),
        'user_gender': user_profile.get('gender'),
        'user_location': user_profile.get('location'),
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

    try:
        session.commit()
    except Exception:
        session.rollback()
        raise HTTPException(status_code=500, detail="save_program_failed")

    return ProgramSaveResponse(
        program_id=program.id,
        workouts_created=len(workouts_created),
        workouts=workouts_created
    )
