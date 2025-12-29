from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlmodel import select

from ..db import get_session
from ..models import User
from ..schemas import UserProfileCreate, UserProfileRead

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
def upsert_profile(payload: UserProfileCreate, session=Depends(get_session)) -> UserProfileRead:
    user = session.get(User, payload.id)
    if user is None:
        _ensure_unique_username(session, payload.username)
        user = User(
            id=payload.id,
            username=payload.username,
            email=f"{payload.id}@temp.local",  # Email par défaut pour mode démo
            password_hash="temp_not_for_login",
            consent_to_public_share=payload.consent_to_public_share,
        )

        
        session.add(user)
    else:
        if user.username != payload.username:
            _ensure_unique_username(session, payload.username, exclude_id=user.id)
        user.username = payload.username
        user.consent_to_public_share = payload.consent_to_public_share
    session.commit()
    session.refresh(user)
    return UserProfileRead.model_validate(user)


@router.get("/profile/{user_id}", response_model=UserProfileRead)
def get_profile(user_id: str, session=Depends(get_session)) -> UserProfileRead:
    user = session.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="user_not_found")
    return UserProfileRead.model_validate(user)


@router.put("/profile/{user_id}", response_model=UserProfileRead)
def update_profile(user_id: str, payload: UpdateProfileRequest, session=Depends(get_session)) -> UserProfileRead:
    """Met à jour le profil utilisateur (username, bio, avatar, objective)."""
    user = session.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="user_not_found")
    
    if payload.username is not None and payload.username != user.username:
        _ensure_unique_username(session, payload.username, exclude_id=user.id)
        user.username = payload.username
    
    if payload.bio is not None:
        user.bio = payload.bio
    
    if payload.avatar_url is not None:
        user.avatar_url = payload.avatar_url
    
    if payload.objective is not None:
        user.objective = payload.objective
    
    session.commit()
    session.refresh(user)
    return UserProfileRead.model_validate(user)
