"""API endpoints pour les classements."""
from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlmodel import Session, select, func
from typing import Optional
from datetime import datetime, timezone, timedelta

from ..db import get_session
from ..models import User, Share, Like, Follower, Workout, Set

router = APIRouter(prefix="/leaderboard", tags=["leaderboard"])


class LeaderboardEntry(BaseModel):
    rank: int
    user_id: str
    username: str
    avatar_url: Optional[str]
    score: int
    change: int  # Changement par rapport à la semaine dernière


class LeaderboardResponse(BaseModel):
    type: str  # 'volume', 'sessions', 'likes', 'followers'
    period: str  # 'week', 'month', 'all'
    entries: list[LeaderboardEntry]
    my_rank: Optional[int]


@router.get("/volume", response_model=LeaderboardResponse)
def get_volume_leaderboard(
    period: str = Query("week", regex="^(week|month|all)$"),
    current_user_id: Optional[str] = None,
    limit: int = Query(20, ge=1, le=100),
    session: Session = Depends(get_session)
) -> LeaderboardResponse:
    """Classement par volume total (kg × reps)."""
    
    # Calculer la date de début selon la période
    now = datetime.now(timezone.utc)
    if period == "week":
        start_date = now - timedelta(days=7)
    elif period == "month":
        start_date = now - timedelta(days=30)
    else:
        start_date = None
    
    # Pour l'instant, on utilise les données de Share comme proxy
    # (le volume réel nécessiterait de joindre les sets)
    users = session.exec(select(User)).all()
    
    entries = []
    for user in users:
        # Compter le nombre de sets partagés comme proxy du volume
        shares_query = select(Share).where(Share.owner_id == user.id)
        if start_date:
            shares_query = shares_query.where(Share.created_at >= start_date)
        shares = session.exec(shares_query).all()
        
        # Calculer un score basé sur les séances partagées
        score = sum(s.set_count * 50 for s in shares)  # Approximation: 50kg moyenne par set
        
        if score > 0:
            entries.append({
                "user_id": user.id,
                "username": user.username,
                "avatar_url": user.avatar_url,
                "score": score,
            })
    
    # Trier par score décroissant
    entries.sort(key=lambda x: -x["score"])
    
    # Ajouter les rangs
    result_entries = []
    my_rank = None
    for i, entry in enumerate(entries[:limit]):
        rank = i + 1
        result_entries.append(LeaderboardEntry(
            rank=rank,
            user_id=entry["user_id"],
            username=entry["username"],
            avatar_url=entry["avatar_url"],
            score=entry["score"],
            change=0,  # TODO: calculer le changement
        ))
        if current_user_id and entry["user_id"] == current_user_id:
            my_rank = rank
    
    return LeaderboardResponse(
        type="volume",
        period=period,
        entries=result_entries,
        my_rank=my_rank,
    )


@router.get("/sessions", response_model=LeaderboardResponse)
def get_sessions_leaderboard(
    period: str = Query("week", regex="^(week|month|all)$"),
    current_user_id: Optional[str] = None,
    limit: int = Query(20, ge=1, le=100),
    session: Session = Depends(get_session)
) -> LeaderboardResponse:
    """Classement par nombre de séances."""
    
    now = datetime.now(timezone.utc)
    if period == "week":
        start_date = now - timedelta(days=7)
    elif period == "month":
        start_date = now - timedelta(days=30)
    else:
        start_date = None
    
    users = session.exec(select(User)).all()
    
    entries = []
    for user in users:
        shares_query = select(func.count()).select_from(Share).where(Share.owner_id == user.id)
        if start_date:
            shares_query = shares_query.where(Share.created_at >= start_date)
        count = session.exec(shares_query).one()
        
        if count > 0:
            entries.append({
                "user_id": user.id,
                "username": user.username,
                "avatar_url": user.avatar_url,
                "score": count,
            })
    
    entries.sort(key=lambda x: -x["score"])
    
    result_entries = []
    my_rank = None
    for i, entry in enumerate(entries[:limit]):
        rank = i + 1
        result_entries.append(LeaderboardEntry(
            rank=rank,
            user_id=entry["user_id"],
            username=entry["username"],
            avatar_url=entry["avatar_url"],
            score=entry["score"],
            change=0,
        ))
        if current_user_id and entry["user_id"] == current_user_id:
            my_rank = rank
    
    return LeaderboardResponse(
        type="sessions",
        period=period,
        entries=result_entries,
        my_rank=my_rank,
    )


@router.get("/likes", response_model=LeaderboardResponse)
def get_likes_leaderboard(
    current_user_id: Optional[str] = None,
    limit: int = Query(20, ge=1, le=100),
    session: Session = Depends(get_session)
) -> LeaderboardResponse:
    """Classement par nombre de likes reçus."""
    
    users = session.exec(select(User)).all()
    
    entries = []
    for user in users:
        # Compter les likes sur les posts de l'utilisateur
        shares = session.exec(select(Share.share_id).where(Share.owner_id == user.id)).all()
        if shares:
            likes_count = session.exec(
                select(func.count()).select_from(Like).where(Like.share_id.in_(shares))
            ).one()
        else:
            likes_count = 0
        
        if likes_count > 0:
            entries.append({
                "user_id": user.id,
                "username": user.username,
                "avatar_url": user.avatar_url,
                "score": likes_count,
            })
    
    entries.sort(key=lambda x: -x["score"])
    
    result_entries = []
    my_rank = None
    for i, entry in enumerate(entries[:limit]):
        rank = i + 1
        result_entries.append(LeaderboardEntry(
            rank=rank,
            user_id=entry["user_id"],
            username=entry["username"],
            avatar_url=entry["avatar_url"],
            score=entry["score"],
            change=0,
        ))
        if current_user_id and entry["user_id"] == current_user_id:
            my_rank = rank
    
    return LeaderboardResponse(
        type="likes",
        period="all",
        entries=result_entries,
        my_rank=my_rank,
    )


@router.get("/followers", response_model=LeaderboardResponse)
def get_followers_leaderboard(
    current_user_id: Optional[str] = None,
    limit: int = Query(20, ge=1, le=100),
    session: Session = Depends(get_session)
) -> LeaderboardResponse:
    """Classement par nombre de followers."""
    
    users = session.exec(select(User)).all()
    
    entries = []
    for user in users:
        followers_count = session.exec(
            select(func.count()).select_from(Follower).where(Follower.followed_id == user.id)
        ).one()
        
        if followers_count > 0:
            entries.append({
                "user_id": user.id,
                "username": user.username,
                "avatar_url": user.avatar_url,
                "score": followers_count,
            })
    
    entries.sort(key=lambda x: -x["score"])
    
    result_entries = []
    my_rank = None
    for i, entry in enumerate(entries[:limit]):
        rank = i + 1
        result_entries.append(LeaderboardEntry(
            rank=rank,
            user_id=entry["user_id"],
            username=entry["username"],
            avatar_url=entry["avatar_url"],
            score=entry["score"],
            change=0,
        ))
        if current_user_id and entry["user_id"] == current_user_id:
            my_rank = rank
    
    return LeaderboardResponse(
        type="followers",
        period="all",
        entries=result_entries,
        my_rank=my_rank,
    )




