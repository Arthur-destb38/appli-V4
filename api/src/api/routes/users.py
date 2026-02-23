from typing import Optional
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlmodel import Session, select

from ..db import get_session
from ..models import User
from ..schemas import UserProfileCreate, UserProfileRead
from ..routes.auth import _get_current_user

router = APIRouter(prefix="/users", tags=["users"])


class UpdateProfileRequest(BaseModel):
    username: Optional[str] = None
    bio: Optional[str] = None
    avatar_url: Optional[str] = None
    objective: Optional[str] = None


def _ensure_unique_username(session, username: str, exclude_id: Optional[str] = None) -> None:
    statement = select(User).where(User.username == username)
    if exclude_id is not None:
        statement = statement.where(User.id != exclude_id)
    existing = session.exec(statement).first()
    if existing is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="username_taken")


@router.post("/profile", response_model=UserProfileRead)
def upsert_profile(
    payload: UserProfileCreate, 
    session=Depends(get_session),
    current_user: User = Depends(_get_current_user)
) -> UserProfileRead:
    # Use authenticated user instead of payload.id
    user = current_user
    if user.username != payload.username:
        _ensure_unique_username(session, payload.username, exclude_id=user.id)
    user.username = payload.username
    user.consent_to_public_share = payload.consent_to_public_share
    session.commit()
    session.refresh(user)
    return UserProfileRead.model_validate(user)


@router.get("/profile/status")
def get_profile_status(
    current_user: User = Depends(_get_current_user)
) -> dict:
    """Vérifier le statut de completion du profil et retourner toutes les données"""
    
    # Calculer le pourcentage de completion
    total_fields = 10  # Nombre de champs importants
    completed_fields = 0
    
    if current_user.avatar_url:
        completed_fields += 1
    if current_user.bio:
        completed_fields += 1
    if current_user.location:
        completed_fields += 1
    if current_user.height:
        completed_fields += 1
    if current_user.weight:
        completed_fields += 1
    if current_user.birth_date:
        completed_fields += 1
    if current_user.gender:
        completed_fields += 1
    if current_user.objective:
        completed_fields += 1
    if current_user.experience_level:
        completed_fields += 1
    if current_user.training_frequency:
        completed_fields += 1
    
    completion_percentage = int((completed_fields / total_fields) * 100)
    profile_completed = current_user.profile_completed or False
    
    # Retourner toutes les données du profil
    return {
        "profile_completed": profile_completed,
        "completion_percentage": completion_percentage,
        "completed_fields": completed_fields,
        "total_fields": total_fields,
        "user_id": current_user.id,
        "username": current_user.username,
        # Données de base
        "bio": current_user.bio,
        "objective": current_user.objective,
        "avatar_url": current_user.avatar_url,
        # Données personnelles
        "location": current_user.location,
        "height": current_user.height,
        "weight": current_user.weight,
        "birth_date": current_user.birth_date.isoformat() if current_user.birth_date else None,
        "gender": current_user.gender,
        # Objectifs fitness
        "experience_level": current_user.experience_level,
        "training_frequency": current_user.training_frequency,
        "equipment_available": current_user.equipment_available,
        # Préférences
        "consent_to_public_share": current_user.consent_to_public_share
    }


@router.get("/profile/{user_id}", response_model=UserProfileRead)
def get_profile(user_id: str, session=Depends(get_session)) -> UserProfileRead:
    user = session.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="user_not_found")
    return UserProfileRead.model_validate(user)


@router.put("/profile/{user_id}", response_model=UserProfileRead)
def update_profile(
    user_id: str, 
    payload: UpdateProfileRequest, 
    session=Depends(get_session),
    current_user: User = Depends(_get_current_user)
) -> UserProfileRead:
    """Met à jour le profil utilisateur (username, bio, avatar, objective)."""
    
    # Only allow users to update their own profile
    if current_user.id != user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="can_only_update_own_profile")
    
    user = current_user
    
    if payload.username is not None and payload.username.strip() != user.username:
        _ensure_unique_username(session, payload.username.strip(), exclude_id=user.id)
        user.username = payload.username.strip()
    
    if payload.bio is not None:
        user.bio = payload.bio
    
    if payload.avatar_url is not None:
        user.avatar_url = payload.avatar_url
    
    if payload.objective is not None:
        user.objective = payload.objective
    
    session.commit()
    session.refresh(user)
    return UserProfileRead.model_validate(user)


# ==================== PROFILE SETUP ENDPOINTS ====================

@router.post("/profile/setup/step1")
def setup_profile_step1(
    payload: dict,
    current_user: User = Depends(_get_current_user),
    session: Session = Depends(get_session)
) -> dict:
    """Étape 1: Informations de base"""
    
    # Mise à jour des champs de l'étape 1
    if 'avatar_url' in payload and payload['avatar_url']:
        current_user.avatar_url = payload['avatar_url']
    if 'bio' in payload and payload['bio']:
        current_user.bio = payload['bio']
    if 'location' in payload and payload['location']:
        setattr(current_user, 'location', payload['location'])
    if 'height' in payload and payload['height']:
        setattr(current_user, 'height', int(payload['height']))
    if 'weight' in payload and payload['weight']:
        setattr(current_user, 'weight', float(payload['weight']))
    if 'birth_date' in payload and payload['birth_date']:
        setattr(current_user, 'birth_date', datetime.fromisoformat(payload['birth_date'].replace('Z', '+00:00')))
    if 'gender' in payload and payload['gender']:
        setattr(current_user, 'gender', payload['gender'])
    
    session.commit()
    session.refresh(current_user)
    
    return {
        "success": True,
        "message": "Étape 1 complétée avec succès",
        "profile_completed": getattr(current_user, 'profile_completed', False)
    }


@router.post("/profile/setup/step2")
def setup_profile_step2(
    payload: dict,
    current_user: User = Depends(_get_current_user),
    session: Session = Depends(get_session)
) -> dict:
    """Étape 2: Objectifs fitness"""
    
    # Mise à jour des champs de l'étape 2
    if 'objective' in payload and payload['objective']:
        current_user.objective = payload['objective']
    if 'experience_level' in payload and payload['experience_level']:
        setattr(current_user, 'experience_level', payload['experience_level'])
    if 'training_frequency' in payload and payload['training_frequency']:
        setattr(current_user, 'training_frequency', int(payload['training_frequency']))
    
    session.commit()
    session.refresh(current_user)
    
    return {
        "success": True,
        "message": "Étape 2 complétée avec succès",
        "profile_completed": getattr(current_user, 'profile_completed', False)
    }


@router.post("/profile/setup/step3")
def setup_profile_step3(
    payload: dict,
    current_user: User = Depends(_get_current_user),
    session: Session = Depends(get_session)
) -> dict:
    """Étape 3: Préférences"""
    
    # Mise à jour des champs de l'étape 3
    if 'equipment_available' in payload and payload['equipment_available']:
        import json
        setattr(current_user, 'equipment_available', json.dumps(payload['equipment_available']))
    
    if 'consent_to_public_share' in payload:
        current_user.consent_to_public_share = payload['consent_to_public_share']
    
    # Marquer le profil comme complet
    setattr(current_user, 'profile_completed', True)
    
    session.commit()
    session.refresh(current_user)
    
    return {
        "success": True,
        "message": "Profil complété avec succès ! Bienvenue sur Gorillax 🦍",
        "profile_completed": True
    }


@router.post("/profile/complete")
def complete_profile_all_steps(
    payload: dict,
    current_user: User = Depends(_get_current_user),
    session: Session = Depends(get_session)
) -> dict:
    """Compléter le profil en une seule fois"""
    
    # Étape 1: Informations de base
    if 'avatar_url' in payload and payload['avatar_url']:
        current_user.avatar_url = payload['avatar_url']
    if 'bio' in payload and payload['bio']:
        current_user.bio = payload['bio']
    if 'location' in payload and payload['location']:
        current_user.location = payload['location']
    if 'height' in payload and payload['height']:
        current_user.height = int(payload['height'])
    if 'weight' in payload and payload['weight']:
        current_user.weight = float(payload['weight'])
    if 'birth_date' in payload and payload['birth_date']:
        current_user.birth_date = datetime.fromisoformat(payload['birth_date'].replace('Z', '+00:00'))
    if 'gender' in payload and payload['gender']:
        current_user.gender = payload['gender']
    
    # Étape 2: Objectifs fitness
    if 'objective' in payload and payload['objective']:
        current_user.objective = payload['objective']
    if 'experience_level' in payload and payload['experience_level']:
        current_user.experience_level = payload['experience_level']
    if 'training_frequency' in payload and payload['training_frequency']:
        current_user.training_frequency = int(payload['training_frequency'])
    
    # Étape 3: Préférences
    if 'equipment_available' in payload and payload['equipment_available']:
        # Si c'est déjà une string JSON, l'utiliser directement
        if isinstance(payload['equipment_available'], str):
            current_user.equipment_available = payload['equipment_available']
        else:
            # Sinon, convertir en JSON
            import json
            current_user.equipment_available = json.dumps(payload['equipment_available'])
    
    if 'consent_to_public_share' in payload:
        current_user.consent_to_public_share = payload['consent_to_public_share']
    
    current_user.profile_completed = True
    
    session.add(current_user)
    session.commit()
    session.refresh(current_user)
    
    return {
        "success": True,
        "message": "Profil complété avec succès ! Bienvenue sur Gorillax 🦍",
        "profile_completed": True
    }