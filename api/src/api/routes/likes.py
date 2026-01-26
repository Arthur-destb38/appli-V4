from fastapi import APIRouter, Depends, HTTPException, status, Header
from fastapi.responses import Response
from pydantic import BaseModel
from sqlmodel import Session, select, func
from typing import Optional

from ..db import get_session
from ..models import Like, Share, User, Comment, Notification, CommentLike
from ..utils.auth import decode_token

router = APIRouter(prefix="/likes", tags=["likes"])


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


class LikeRequest(BaseModel):
    user_id: str


class LikeResponse(BaseModel):
    liked: bool
    like_count: int


class CommentRequest(BaseModel):
    user_id: str
    content: str


class CommentResponse(BaseModel):
    id: str
    user_id: str
    username: str
    content: str
    created_at: str


class CommentsListResponse(BaseModel):
    comments: list[CommentResponse]
    total: int


# ==================== LIKES ====================

@router.post("/{share_id}", response_model=LikeResponse)
def toggle_like(
    share_id: str, 
    payload: LikeRequest, 
    session: Session = Depends(get_session),
    current_user: User = Depends(_get_current_user_required)
) -> LikeResponse:
    """Toggle like sur un partage (like si pas liké, unlike si déjà liké)"""
    
    # Vérifier que le share existe
    share = session.exec(select(Share).where(Share.share_id == share_id)).first()
    if not share:
        raise HTTPException(status_code=404, detail="share_not_found")
    
    # Use authenticated user
    user = current_user
    
    # Chercher si déjà liké
    existing_like = session.exec(
        select(Like)
        .where(Like.share_id == share_id)
        .where(Like.user_id == current_user.id)
    ).first()
    
    if existing_like:
        # Unlike
        session.delete(existing_like)
        session.commit()
        liked = False
    else:
        # Like
        new_like = Like(user_id=current_user.id, share_id=share_id)
        session.add(new_like)
        session.commit()
        liked = True
        
        # Créer une notification si ce n'est pas son propre post
        if share.owner_id != current_user.id:
            notification = Notification(
                user_id=share.owner_id,
                type="like",
                actor_id=current_user.id,
                actor_username=user.username,
                reference_id=share_id,
                message=f"{user.username} a aimé ta séance",
            )
            session.add(notification)
            session.commit()
    
    # Compter le nombre total de likes
    like_count = session.exec(
        select(func.count()).select_from(Like).where(Like.share_id == share_id)
    ).one()
    
    return LikeResponse(liked=liked, like_count=like_count)


@router.get("/{share_id}/status")
def get_like_status(
    share_id: str, 
    session: Session = Depends(get_session),
    current_user: User = Depends(_get_current_user_required)
) -> LikeResponse:
    """Vérifie si un utilisateur a liké un partage"""
    
    existing_like = session.exec(
        select(Like)
        .where(Like.share_id == share_id)
        .where(Like.user_id == current_user.id)
    ).first()
    
    like_count = session.exec(
        select(func.count()).select_from(Like).where(Like.share_id == share_id)
    ).one()
    
    return LikeResponse(liked=existing_like is not None, like_count=like_count)


@router.get("/{share_id}/count")
def get_like_count(share_id: str, session: Session = Depends(get_session)) -> dict:
    """Récupère le nombre de likes d'un partage"""
    
    like_count = session.exec(
        select(func.count()).select_from(Like).where(Like.share_id == share_id)
    ).one()
    
    return {"share_id": share_id, "like_count": like_count}


# ==================== COMMENTS ====================

@router.post("/{share_id}/comments", response_model=CommentResponse)
def add_comment(
    share_id: str, 
    payload: CommentRequest, 
    session: Session = Depends(get_session),
    current_user: User = Depends(_get_current_user_required)
) -> CommentResponse:
    """Ajouter un commentaire sur un partage"""
    
    # Vérifier que le share existe
    share = session.exec(select(Share).where(Share.share_id == share_id)).first()
    if not share:
        raise HTTPException(status_code=404, detail="share_not_found")
    
    # Use authenticated user
    user = current_user
    
    # Valider le contenu
    content = payload.content.strip()
    if not content:
        raise HTTPException(status_code=400, detail="empty_comment")
    if len(content) > 500:
        raise HTTPException(status_code=400, detail="comment_too_long")
    
    # Créer le commentaire
    comment = Comment(
        user_id=current_user.id,
        username=user.username,
        share_id=share_id,
        content=content,
    )
    session.add(comment)
    session.commit()
    session.refresh(comment)
    
    # Créer une notification si ce n'est pas son propre post
    if share.owner_id != current_user.id:
        notification = Notification(
            user_id=share.owner_id,
            type="comment",
            actor_id=current_user.id,
            actor_username=user.username,
            reference_id=share_id,
            message=f"{user.username} a commenté ta séance: \"{content[:50]}{'...' if len(content) > 50 else ''}\"",
        )
        session.add(notification)
        session.commit()
    
    return CommentResponse(
        id=comment.id,
        user_id=comment.user_id,
        username=comment.username,
        content=comment.content,
        created_at=comment.created_at.isoformat(),
    )


@router.get("/{share_id}/comments", response_model=CommentsListResponse)
def get_comments(share_id: str, limit: int = 20, session: Session = Depends(get_session)) -> CommentsListResponse:
    """Récupérer les commentaires d'un partage"""
    
    comments = session.exec(
        select(Comment)
        .where(Comment.share_id == share_id)
        .order_by(Comment.created_at.desc())
        .limit(limit)
    ).all()
    
    total = session.exec(
        select(func.count()).select_from(Comment).where(Comment.share_id == share_id)
    ).one()
    
    return CommentsListResponse(
        comments=[
            CommentResponse(
                id=c.id,
                user_id=c.user_id,
                username=c.username,
                content=c.content,
                created_at=c.created_at.isoformat(),
            )
            for c in comments
        ],
        total=total,
    )


@router.delete("/{share_id}/comments/{comment_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_comment(
    share_id: str, 
    comment_id: str, 
    session: Session = Depends(get_session),
    current_user: User = Depends(_get_current_user_required)
) -> Response:
    """Supprimer un commentaire (seulement par son auteur)"""
    
    comment = session.get(Comment, comment_id)
    if not comment:
        raise HTTPException(status_code=404, detail="comment_not_found")
    
    if comment.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="not_authorized")
    
    session.delete(comment)
    session.commit()
    
    return Response(status_code=status.HTTP_204_NO_CONTENT)


# ==================== COMMENT LIKES ====================

class CommentLikeResponse(BaseModel):
    liked: bool
    like_count: int


@router.post("/comment/{comment_id}/like", response_model=CommentLikeResponse)
def toggle_comment_like(
    comment_id: str, 
    payload: LikeRequest, 
    session: Session = Depends(get_session),
    current_user: User = Depends(_get_current_user_required)
) -> CommentLikeResponse:
    """Toggle like sur un commentaire"""
    
    # Vérifier que le commentaire existe
    comment = session.get(Comment, comment_id)
    if not comment:
        raise HTTPException(status_code=404, detail="comment_not_found")
    
    # Chercher un like existant
    existing_like = session.exec(
        select(CommentLike)
        .where(CommentLike.comment_id == comment_id)
        .where(CommentLike.user_id == current_user.id)
    ).first()
    
    if existing_like:
        # Unlike
        session.delete(existing_like)
        session.commit()
        liked = False
    else:
        # Like
        new_like = CommentLike(comment_id=comment_id, user_id=current_user.id)
        session.add(new_like)
        session.commit()
        liked = True
    
    # Compter les likes
    like_count = session.exec(
        select(func.count()).select_from(CommentLike).where(CommentLike.comment_id == comment_id)
    ).one()
    
    return CommentLikeResponse(liked=liked, like_count=like_count)


@router.get("/comment/{comment_id}/like", response_model=CommentLikeResponse)
def get_comment_like_status(
    comment_id: str, 
    session: Session = Depends(get_session),
    current_user: User = Depends(_get_current_user_required)
) -> CommentLikeResponse:
    """Récupérer le statut de like d'un commentaire"""
    
    existing_like = session.exec(
        select(CommentLike)
        .where(CommentLike.comment_id == comment_id)
        .where(CommentLike.user_id == current_user.id)
    ).first()
    
    like_count = session.exec(
        select(func.count()).select_from(CommentLike).where(CommentLike.comment_id == comment_id)
    ).one()
    
    return CommentLikeResponse(liked=existing_like is not None, like_count=like_count)

