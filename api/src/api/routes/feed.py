from __future__ import annotations

from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import Response
from sqlalchemy import func
from sqlmodel import Session, select

from ..db import get_session
from ..models import Follower, Share, User, Comment, Like
from ..schemas import FeedResponse, FeedItem, FollowRequest

router = APIRouter(prefix="/feed", tags=["feed"])


@router.post("/follow/{followed_id}", status_code=status.HTTP_204_NO_CONTENT)
def follow_user(followed_id: str, payload: FollowRequest, session: Session = Depends(get_session)) -> Response:
    if payload.follower_id == followed_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="cannot_follow_self")

    follower = session.get(User, payload.follower_id)
    followed = session.get(User, followed_id)
    if follower is None or followed is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="user_not_found")

    existing = session.exec(
        select(Follower)
        .where(Follower.follower_id == payload.follower_id)
        .where(Follower.followed_id == followed_id)
    ).first()
    if existing is None:
        session.add(Follower(follower_id=payload.follower_id, followed_id=followed_id))
        session.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.delete("/follow/{followed_id}", status_code=status.HTTP_204_NO_CONTENT)
def unfollow_user(followed_id: str, payload: FollowRequest, session: Session = Depends(get_session)) -> Response:
    statement = (
        select(Follower)
        .where(Follower.follower_id == payload.follower_id)
        .where(Follower.followed_id == followed_id)
    )
    existing = session.exec(statement).first()
    if existing is not None:
        session.delete(existing)
        session.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("", response_model=FeedResponse)
def get_feed(
    user_id: str,
    limit: int = Query(10, ge=1, le=50),
    cursor: Optional[str] = Query(None),
    session: Session = Depends(get_session),
) -> FeedResponse:
    # Mode démo: créer l'utilisateur s'il n'existe pas
    user = session.get(User, user_id)
    if user is None:
        # Créer un utilisateur temporaire pour le feed
        user = User(
            id=user_id,
            username=f"User_{user_id[:8]}",
            email=f"{user_id}@temp.local",
            password_hash="temp_not_for_login",
            consent_to_public_share=True,
        )
        session.add(user)
        session.commit()

    # Affiche les partages publics de tous les utilisateurs (simplifié pour le mode démo)
    statement = select(Share)
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
