"""API endpoints pour la découverte (Explore)."""
from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlmodel import Session, select, func
from typing import Optional

from ..db import get_session
from ..models import User, Share, Like, Follower

router = APIRouter(prefix="/explore", tags=["explore"])


class TrendingPost(BaseModel):
    share_id: str
    owner_id: str
    owner_username: str
    workout_title: str
    exercise_count: int
    set_count: int
    like_count: int
    created_at: str


class SuggestedUser(BaseModel):
    id: str
    username: str
    avatar_url: Optional[str]
    bio: Optional[str]
    objective: Optional[str]
    followers_count: int
    posts_count: int


class ExploreResponse(BaseModel):
    trending_posts: list[TrendingPost]
    suggested_users: list[SuggestedUser]


class SearchResult(BaseModel):
    users: list[SuggestedUser]
    posts: list[TrendingPost]


@router.get("/trending", response_model=list[TrendingPost])
def get_trending_posts(
    limit: int = Query(20, ge=1, le=50),
    session: Session = Depends(get_session)
) -> list[TrendingPost]:
    """Récupérer les posts les plus populaires (par likes)."""
    
    # Optimisation: récupérer les shares récents et compter les likes en une requête
    # Récupérer plus de shares pour avoir un bon échantillon
    shares = session.exec(
        select(Share)
        .order_by(Share.created_at.desc())
        .limit(limit * 3)
    ).all()
    
    if not shares:
        return []
    
    # Compter les likes pour tous les shares en une seule requête
    share_ids = [share.share_id for share in shares]
    likes_counts = session.exec(
        select(Like.share_id, func.count(Like.id).label('count'))
        .where(Like.share_id.in_(share_ids))
        .group_by(Like.share_id)
    ).all()
    likes_map = {row[0]: row[1] for row in likes_counts}
    
    # Construire la liste avec les counts
    posts_with_likes = []
    for share in shares:
        posts_with_likes.append({
            "share": share,
            "like_count": likes_map.get(share.share_id, 0),
        })
    
    # Trier par likes (décroissant) puis par date
    posts_with_likes.sort(key=lambda x: (-x["like_count"], -x["share"].created_at.timestamp()))
    
    return [
        TrendingPost(
            share_id=p["share"].share_id,
            owner_id=p["share"].owner_id,
            owner_username=p["share"].owner_username,
            workout_title=p["share"].workout_title,
            exercise_count=p["share"].exercise_count,
            set_count=p["share"].set_count,
            like_count=p["like_count"],
            created_at=p["share"].created_at.isoformat(),
        )
        for p in posts_with_likes[:limit]
    ]


@router.get("/suggested-users", response_model=list[SuggestedUser])
def get_suggested_users(
    current_user_id: Optional[str] = None,
    limit: int = Query(10, ge=1, le=30),
    session: Session = Depends(get_session)
) -> list[SuggestedUser]:
    """Récupérer des suggestions d'utilisateurs à suivre."""
    
    # Récupérer les IDs des utilisateurs déjà suivis
    following_ids = set()
    if current_user_id:
        following = session.exec(
            select(Follower.followed_id).where(Follower.follower_id == current_user_id)
        ).all()
        following_ids = set(following)
        following_ids.add(current_user_id)  # Exclure soi-même
    
    # Optimisation: filtrer en SQL au lieu de charger tous les users
    users_query = select(User)
    if following_ids:
        users_query = users_query.where(~User.id.in_(following_ids))
    
    # Limiter le nombre d'users récupérés
    users = session.exec(users_query.limit(limit * 3)).all()
    
    if not users:
        return []
    
    # Récupérer les counts pour tous les users en une seule requête groupée
    user_ids = [user.id for user in users]
    
    # Compter followers pour tous les users
    followers_counts = session.exec(
        select(Follower.followed_id, func.count(Follower.id).label('count'))
        .where(Follower.followed_id.in_(user_ids))
        .group_by(Follower.followed_id)
    ).all()
    followers_map = {row[0]: row[1] for row in followers_counts}
    
    # Compter posts pour tous les users
    posts_counts = session.exec(
        select(Share.owner_id, func.count(Share.share_id).label('count'))
        .where(Share.owner_id.in_(user_ids))
        .group_by(Share.owner_id)
    ).all()
    posts_map = {row[0]: row[1] for row in posts_counts}
    
    # Construire la liste avec les counts
    suggested = []
    for user in users:
        suggested.append(SuggestedUser(
            id=user.id,
            username=user.username,
            avatar_url=user.avatar_url,
            bio=user.bio,
            objective=user.objective,
            followers_count=followers_map.get(user.id, 0),
            posts_count=posts_map.get(user.id, 0),
        ))
    
    # Trier par nombre de followers (les plus populaires en premier)
    suggested.sort(key=lambda x: -x.followers_count)
    
    return suggested[:limit]


@router.get("/search", response_model=SearchResult)
def search(
    q: str = Query(..., min_length=1),
    limit: int = Query(20, ge=1, le=50),
    session: Session = Depends(get_session)
) -> SearchResult:
    """Rechercher des utilisateurs et des posts."""
    
    query = q.lower().strip()
    search_pattern = f"%{query}%"
    
    # Optimisation: Rechercher des utilisateurs directement en SQL avec filtres
    from sqlalchemy import or_
    
    users_query = select(User).where(
        or_(
            User.username.ilike(search_pattern),
            User.bio.ilike(search_pattern) if User.bio else False
        )
    ).limit(limit)
    
    users = session.exec(users_query).all()
    
    # Récupérer les counts pour tous les users en une seule requête
    user_ids = [user.id for user in users]
    matching_users = []
    
    if user_ids:
        # Compter followers et posts pour tous les users en une fois
        followers_counts = session.exec(
            select(Follower.followed_id, func.count(Follower.id).label('count'))
            .where(Follower.followed_id.in_(user_ids))
            .group_by(Follower.followed_id)
        ).all()
        followers_map = {row[0]: row[1] for row in followers_counts}
        
        posts_counts = session.exec(
            select(Share.owner_id, func.count(Share.share_id).label('count'))
            .where(Share.owner_id.in_(user_ids))
            .group_by(Share.owner_id)
        ).all()
        posts_map = {row[0]: row[1] for row in posts_counts}
        
        for user in users:
            matching_users.append(SuggestedUser(
                id=user.id,
                username=user.username,
                avatar_url=user.avatar_url,
                bio=user.bio,
                objective=user.objective,
                followers_count=followers_map.get(user.id, 0),
                posts_count=posts_map.get(user.id, 0),
            ))
    
    # Optimisation: Rechercher des posts directement en SQL avec filtres
    shares_query = select(Share).where(
        or_(
            Share.workout_title.ilike(search_pattern),
            Share.owner_username.ilike(search_pattern)
        )
    ).limit(limit)
    
    shares = session.exec(shares_query).all()
    
    # Récupérer les counts de likes pour tous les shares en une seule requête
    share_ids = [share.share_id for share in shares]
    matching_posts = []
    
    if share_ids:
        likes_counts = session.exec(
            select(Like.share_id, func.count(Like.id).label('count'))
            .where(Like.share_id.in_(share_ids))
            .group_by(Like.share_id)
        ).all()
        likes_map = {row[0]: row[1] for row in likes_counts}
        
        for share in shares:
            matching_posts.append(TrendingPost(
                share_id=share.share_id,
                owner_id=share.owner_id,
                owner_username=share.owner_username,
                workout_title=share.workout_title,
                exercise_count=share.exercise_count,
                set_count=share.set_count,
                like_count=likes_map.get(share.share_id, 0),
                created_at=share.created_at.isoformat(),
            ))
    
    return SearchResult(
        users=matching_users[:limit],
        posts=matching_posts[:limit],
    )


@router.get("", response_model=ExploreResponse)
def get_explore(
    current_user_id: Optional[str] = None,
    session: Session = Depends(get_session)
) -> ExploreResponse:
    """Page Explore complète avec trending et suggestions."""
    
    trending = get_trending_posts(limit=12, session=session)
    suggested = get_suggested_users(current_user_id=current_user_id, limit=5, session=session)
    
    return ExploreResponse(
        trending_posts=trending,
        suggested_users=suggested,
    )




