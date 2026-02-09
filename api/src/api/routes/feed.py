from __future__ import annotations

from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status, Header
from fastapi.responses import Response
from sqlalchemy import func
from sqlmodel import Session, select

from ..db import get_session
from ..models import Follower, Share, User, Comment, Like
from ..schemas import FeedResponse, FeedItem, FollowRequest
from ..utils.auth import decode_token

router = APIRouter(prefix="/feed", tags=["feed"])


def _get_current_user_optional(
    authorization: Optional[str] = Header(None),
    session: Session = Depends(get_session),
) -> Optional[User]:
    """Get current user from token, return None if no valid token."""
    if not authorization or not authorization.lower().startswith("bearer "):
        return None
    token = authorization.split(" ", 1)[1]
    try:
        payload = decode_token(token)
        if payload.get("type") != "access":
            return None
        user_id = payload.get("sub")
        return session.get(User, user_id)
    except Exception:
        return None


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


@router.post("/follow/{followed_id}", status_code=status.HTTP_204_NO_CONTENT)
def follow_user(
    followed_id: str, 
    payload: FollowRequest, 
    session: Session = Depends(get_session),
    current_user: User = Depends(_get_current_user_required)
) -> Response:
    # Use authenticated user's ID instead of payload
    if current_user.id == followed_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="cannot_follow_self")

    followed = session.get(User, followed_id)
    if followed is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="user_not_found")

    existing = session.exec(
        select(Follower)
        .where(Follower.follower_id == current_user.id)
        .where(Follower.followed_id == followed_id)
    ).first()
    if existing is None:
        session.add(Follower(follower_id=current_user.id, followed_id=followed_id))
        session.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.delete("/follow/{followed_id}", status_code=status.HTTP_204_NO_CONTENT)
def unfollow_user(
    followed_id: str, 
    payload: FollowRequest, 
    session: Session = Depends(get_session),
    current_user: User = Depends(_get_current_user_required)
) -> Response:
    statement = (
        select(Follower)
        .where(Follower.follower_id == current_user.id)
        .where(Follower.followed_id == followed_id)
    )
    existing = session.exec(statement).first()
    if existing is not None:
        session.delete(existing)
        session.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("", response_model=FeedResponse)
def get_feed(
    limit: int = Query(10, ge=1, le=50),
    cursor: Optional[str] = Query(None),
    session: Session = Depends(get_session),
    current_user: User = Depends(_get_current_user_required)
) -> FeedResponse:
    user = current_user
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="user_not_found")

    # Récupérer les IDs des utilisateurs suivis
    followed_ids = session.exec(
        select(Follower.followed_id).where(Follower.follower_id == user.id)
    ).all()
    
    # Construire la requête du feed
    # Si l'utilisateur ne suit personne, afficher seulement ses propres posts
    # Exception: le compte demo voit tout le monde pour la démo
    if user.id == 'demo' or user.id == 'guest-user':
        # Mode démo: afficher tous les posts publics
        statement = select(Share)
    elif followed_ids:
        # Afficher les posts des utilisateurs suivis + ses propres posts
        statement = select(Share).where(
            Share.owner_id.in_(followed_ids + [user.id])
        )
    else:
        # Pas de followers: afficher seulement ses propres posts
        statement = select(Share).where(Share.owner_id == user.id)
    
    parsed_cursor: Optional[datetime] = None
    if cursor:
        try:
            parsed_cursor = datetime.fromisoformat(cursor)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid cursor format. Expected ISO 8601 datetime string."
            )
        statement = statement.where(Share.created_at <= parsed_cursor)
    statement = statement.order_by(Share.created_at.desc()).limit(limit + 1)

    shares = session.exec(statement).all()
    next_cursor = None
    if len(shares) > limit:
        next_cursor = shares[-1].created_at
        shares = shares[:limit]

    # Optimisation: récupérer tous les share_ids pour faire des requêtes groupées
    share_ids = [share.share_id for share in shares]
    
    if not share_ids:
        return FeedResponse(items=[], next_cursor=None)
    
    # Récupérer tous les commentaires en une seule requête (limité à 2 par share)
    # Pour chaque share, on veut les 2 derniers commentaires
    all_comments = session.exec(
        select(Comment)
        .where(Comment.share_id.in_(share_ids))
        .order_by(Comment.share_id, Comment.created_at.desc())
    ).all()
    
    # Grouper les commentaires par share_id et prendre les 2 premiers de chaque
    comments_by_share: dict[str, list[Comment]] = {}
    for comment in all_comments:
        if comment.share_id not in comments_by_share:
            comments_by_share[comment.share_id] = []
        if len(comments_by_share[comment.share_id]) < 2:
            comments_by_share[comment.share_id].append(comment)
    
    # Compter les commentaires et likes en une seule requête par type
    comment_counts = session.exec(
        select(Comment.share_id, func.count(Comment.id).label('count'))
        .where(Comment.share_id.in_(share_ids))
        .group_by(Comment.share_id)
    ).all()
    comment_count_map = {row[0]: row[1] for row in comment_counts}
    
    like_counts = session.exec(
        select(Like.share_id, func.count(Like.id).label('count'))
        .where(Like.share_id.in_(share_ids))
        .group_by(Like.share_id)
    ).all()
    like_count_map = {row[0]: row[1] for row in like_counts}

    items = []
    for share in shares:
        
        share_comments = comments_by_share.get(share.share_id, [])
        items.append({
            'share_id': share.share_id,
            'owner_id': share.owner_id,
            'owner_username': share.owner_username,
            'workout_title': share.workout_title,
            'exercise_count': share.exercise_count,
            'set_count': share.set_count,
            'created_at': share.created_at,
            'like_count': like_count_map.get(share.share_id, 0),
            'comment_count': comment_count_map.get(share.share_id, 0),
            'comments': [
                {
                    'id': c.id,
                    'username': c.username,
                    'content': c.content,
                }
                for c in reversed(share_comments)  # Ordre chronologique pour l'affichage
            ],
        })

    cursor_value = next_cursor.isoformat() if next_cursor else None
    return FeedResponse(items=items, next_cursor=cursor_value)
