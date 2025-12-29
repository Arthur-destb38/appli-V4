"""API endpoints pour les profils utilisateurs."""
import base64
import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlmodel import Session, select, func
from typing import Optional

from ..db import get_session
from ..models import User, Share, Follower, Like, Notification

router = APIRouter(prefix="/profile", tags=["profile"])


class ProfileResponse(BaseModel):
    id: str
    username: str
    avatar_url: Optional[str]
    bio: Optional[str]
    objective: Optional[str]
    # Stats
    posts_count: int
    followers_count: int
    following_count: int
    total_likes: int
    # Relation avec l'utilisateur courant
    is_following: bool
    is_own_profile: bool
    created_at: str


class ProfileUpdateRequest(BaseModel):
    avatar_url: Optional[str] = None
    bio: Optional[str] = None
    objective: Optional[str] = None


class UserPostsResponse(BaseModel):
    posts: list[dict]
    total: int


@router.get("/{user_id}", response_model=ProfileResponse)
def get_profile(
    user_id: str,
    current_user_id: Optional[str] = None,
    session: Session = Depends(get_session)
) -> ProfileResponse:
    """Récupérer le profil complet d'un utilisateur."""
    
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="user_not_found")
    
    # Compter les posts (shares)
    posts_count = session.exec(
        select(func.count()).select_from(Share).where(Share.owner_id == user_id)
    ).one()
    
    # Compter les followers
    followers_count = session.exec(
        select(func.count()).select_from(Follower).where(Follower.followed_id == user_id)
    ).one()
    
    # Compter les following
    following_count = session.exec(
        select(func.count()).select_from(Follower).where(Follower.follower_id == user_id)
    ).one()
    
    # Compter les likes reçus sur tous ses posts
    user_shares = session.exec(select(Share.share_id).where(Share.owner_id == user_id)).all()
    total_likes = 0
    if user_shares:
        total_likes = session.exec(
            select(func.count()).select_from(Like).where(Like.share_id.in_(user_shares))
        ).one()
    
    # Vérifier si l'utilisateur courant suit ce profil
    is_following = False
    if current_user_id and current_user_id != user_id:
        follow = session.exec(
            select(Follower)
            .where(Follower.follower_id == current_user_id)
            .where(Follower.followed_id == user_id)
        ).first()
        is_following = follow is not None
    
    return ProfileResponse(
        id=user.id,
        username=user.username,
        avatar_url=user.avatar_url,
        bio=user.bio,
        objective=user.objective,
        posts_count=posts_count,
        followers_count=followers_count,
        following_count=following_count,
        total_likes=total_likes,
        is_following=is_following,
        is_own_profile=current_user_id == user_id,
        created_at=user.created_at.isoformat(),
    )


@router.put("/{user_id}", response_model=ProfileResponse)
def update_profile(
    user_id: str,
    payload: ProfileUpdateRequest,
    session: Session = Depends(get_session)
) -> ProfileResponse:
    """Mettre à jour son profil."""
    
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="user_not_found")
    
    # Mettre à jour les champs fournis
    if payload.avatar_url is not None:
        user.avatar_url = payload.avatar_url
    if payload.bio is not None:
        # Limiter la bio à 150 caractères
        user.bio = payload.bio[:150] if payload.bio else None
    if payload.objective is not None:
        user.objective = payload.objective
    
    session.add(user)
    session.commit()
    session.refresh(user)
    
    # Retourner le profil mis à jour
    return get_profile(user_id, user_id, session)


@router.get("/{user_id}/posts", response_model=UserPostsResponse)
def get_user_posts(
    user_id: str,
    limit: int = 20,
    session: Session = Depends(get_session)
) -> UserPostsResponse:
    """Récupérer les posts d'un utilisateur."""
    
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="user_not_found")
    
    shares = session.exec(
        select(Share)
        .where(Share.owner_id == user_id)
        .order_by(Share.created_at.desc())
        .limit(limit)
    ).all()
    
    total = session.exec(
        select(func.count()).select_from(Share).where(Share.owner_id == user_id)
    ).one()
    
    posts = []
    for share in shares:
        # Compter les likes pour ce post
        like_count = session.exec(
            select(func.count()).select_from(Like).where(Like.share_id == share.share_id)
        ).one()
        
        posts.append({
            "share_id": share.share_id,
            "workout_title": share.workout_title,
            "exercise_count": share.exercise_count,
            "set_count": share.set_count,
            "like_count": like_count,
            "created_at": share.created_at.isoformat(),
        })
    
    return UserPostsResponse(posts=posts, total=total)


@router.post("/{user_id}/follow", status_code=status.HTTP_204_NO_CONTENT)
def follow_user(
    user_id: str,
    follower_id: str,
    session: Session = Depends(get_session)
):
    """Suivre un utilisateur."""
    
    if follower_id == user_id:
        raise HTTPException(status_code=400, detail="cannot_follow_self")
    
    # Vérifier que les deux utilisateurs existent
    user = session.get(User, user_id)
    follower = session.get(User, follower_id)
    if not user or not follower:
        raise HTTPException(status_code=404, detail="user_not_found")
    
    # Vérifier si déjà suivi
    existing = session.exec(
        select(Follower)
        .where(Follower.follower_id == follower_id)
        .where(Follower.followed_id == user_id)
    ).first()
    
    if not existing:
        follow = Follower(follower_id=follower_id, followed_id=user_id)
        session.add(follow)
        session.commit()
        
        # Créer une notification pour le suivi
        notification = Notification(
            user_id=user_id,
            type="follow",
            actor_id=follower_id,
            actor_username=follower.username,
            reference_id=None,
            message=f"{follower.username} a commencé à te suivre",
        )
        session.add(notification)
        session.commit()


@router.delete("/{user_id}/follow", status_code=status.HTTP_204_NO_CONTENT)
def unfollow_user(
    user_id: str,
    follower_id: str,
    session: Session = Depends(get_session)
):
    """Ne plus suivre un utilisateur."""
    
    existing = session.exec(
        select(Follower)
        .where(Follower.follower_id == follower_id)
        .where(Follower.followed_id == user_id)
    ).first()
    
    if existing:
        session.delete(existing)
        session.commit()


@router.get("/{user_id}/followers")
def get_followers(
    user_id: str,
    limit: int = 50,
    session: Session = Depends(get_session)
) -> dict:
    """Liste des followers d'un utilisateur."""
    
    followers = session.exec(
        select(Follower, User)
        .join(User, User.id == Follower.follower_id)
        .where(Follower.followed_id == user_id)
        .limit(limit)
    ).all()
    
    return {
        "followers": [
            {
                "id": user.id,
                "username": user.username,
                "avatar_url": user.avatar_url,
            }
            for _, user in followers
        ],
        "total": len(followers),
    }


@router.get("/{user_id}/following")
def get_following(
    user_id: str,
    limit: int = 50,
    session: Session = Depends(get_session)
) -> dict:
    """Liste des utilisateurs suivis."""
    
    following = session.exec(
        select(Follower, User)
        .join(User, User.id == Follower.followed_id)
        .where(Follower.follower_id == user_id)
        .limit(limit)
    ).all()
    
    return {
        "following": [
            {
                "id": user.id,
                "username": user.username,
                "avatar_url": user.avatar_url,
            }
            for _, user in following
        ],
        "total": len(following),
    }


class AvatarUploadRequest(BaseModel):
    """Requête d'upload d'avatar (image en base64)."""
    image_base64: str  # Format: "data:image/jpeg;base64,..." ou juste le base64


class AvatarUploadResponse(BaseModel):
    """Réponse après upload d'avatar."""
    avatar_url: str
    success: bool


@router.post("/{user_id}/avatar", response_model=AvatarUploadResponse)
def upload_avatar(
    user_id: str,
    payload: AvatarUploadRequest,
    session: Session = Depends(get_session)
) -> AvatarUploadResponse:
    """Upload un avatar pour un utilisateur (stocké en base64)."""
    
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="user_not_found")
    
    # Valider et nettoyer le base64
    image_data = payload.image_base64
    
    # Si format data URI, extraire le base64
    if image_data.startswith("data:"):
        # Format: data:image/jpeg;base64,/9j/4AAQ...
        parts = image_data.split(",", 1)
        if len(parts) == 2:
            image_data = parts[1]
    
    # Valider que c'est du base64 valide
    try:
        decoded = base64.b64decode(image_data)
        if len(decoded) > 5 * 1024 * 1024:  # Max 5MB
            raise HTTPException(status_code=400, detail="image_too_large")
    except Exception:
        raise HTTPException(status_code=400, detail="invalid_base64")
    
    # Stocker directement le data URI complet
    # Format: data:image/jpeg;base64,{base64_data}
    if not payload.image_base64.startswith("data:"):
        # Assumer JPEG si pas de header
        avatar_url = f"data:image/jpeg;base64,{image_data}"
    else:
        avatar_url = payload.image_base64
    
    # Mettre à jour l'utilisateur
    user.avatar_url = avatar_url
    session.add(user)
    session.commit()
    
    return AvatarUploadResponse(avatar_url=avatar_url, success=True)


@router.delete("/{user_id}/avatar", status_code=status.HTTP_204_NO_CONTENT)
def delete_avatar(
    user_id: str,
    session: Session = Depends(get_session)
):
    """Supprimer l'avatar d'un utilisateur."""
    
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="user_not_found")
    
    user.avatar_url = None
    session.add(user)
    session.commit()

