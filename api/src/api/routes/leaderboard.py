"""API endpoints pour les classements."""
from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlmodel import Session, select, func, col
from typing import Optional
from datetime import datetime, timezone, timedelta

from ..db import get_session
from ..models import User, Share, Like, Follower, WorkoutExercise, Set

router = APIRouter(prefix="/leaderboard", tags=["leaderboard"])


class LeaderboardEntry(BaseModel):
    rank: int
    user_id: str
    username: str
    avatar_url: Optional[str]
    score: int
    change: int  # Changement par rapport à la période précédente


class LeaderboardResponse(BaseModel):
    type: str  # 'volume', 'sessions', 'likes', 'followers'
    period: str  # 'week', 'month', 'all'
    entries: list[LeaderboardEntry]
    my_rank: Optional[int]


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _period_bounds(period: str) -> tuple[Optional[datetime], Optional[datetime]]:
    """Return (current_start, previous_start) for the given period.

    For "week":  current = last 7 days, previous = 7-14 days ago
    For "month": current = last 30 days, previous = 30-60 days ago
    For "all":   no date filter → no meaningful previous period
    """
    now = datetime.now(timezone.utc)
    if period == "week":
        return now - timedelta(days=7), now - timedelta(days=14)
    if period == "month":
        return now - timedelta(days=30), now - timedelta(days=60)
    return None, None


def _scores_to_ranks(scores: dict[str, int]) -> dict[str, int]:
    """Convert {user_id: score} → {user_id: rank} (1-based, sorted desc)."""
    sorted_users = sorted(scores.items(), key=lambda x: -x[1])
    return {uid: i + 1 for i, (uid, _) in enumerate(sorted_users)}


def _fetch_users_map(
    session: Session, user_ids: list[str]
) -> dict[str, tuple[str, Optional[str]]]:
    """Batch-fetch username + avatar_url for a list of user IDs."""
    if not user_ids:
        return {}
    rows = session.exec(
        select(User.id, User.username, User.avatar_url).where(
            col(User.id).in_(user_ids)
        )
    ).all()
    return {r[0]: (r[1], r[2]) for r in rows}


def _build_response(
    session: Session,
    leaderboard_type: str,
    period: str,
    current_scores: dict[str, int],
    previous_scores: dict[str, int],
    current_user_id: Optional[str],
    limit: int,
) -> LeaderboardResponse:
    """Assemble the response with entries + rank changes."""
    current_ranks = _scores_to_ranks(current_scores)
    previous_ranks = _scores_to_ranks(previous_scores)

    sorted_entries = sorted(current_scores.items(), key=lambda x: -x[1])
    top_ids = [uid for uid, _ in sorted_entries[:limit]]
    users_map = _fetch_users_map(session, top_ids)

    entries: list[LeaderboardEntry] = []
    my_rank: Optional[int] = None

    for i, (user_id, score) in enumerate(sorted_entries[:limit]):
        rank = i + 1
        prev_rank = previous_ranks.get(user_id)
        # positive change = climbed, negative = dropped
        change = (prev_rank - rank) if prev_rank else 0

        username, avatar_url = users_map.get(user_id, ("unknown", None))
        entries.append(LeaderboardEntry(
            rank=rank,
            user_id=user_id,
            username=username,
            avatar_url=avatar_url,
            score=int(score),
            change=change,
        ))
        if current_user_id and user_id == current_user_id:
            my_rank = rank

    # If the requesting user isn't in the top N, still report their rank
    if current_user_id and my_rank is None and current_user_id in current_ranks:
        my_rank = current_ranks[current_user_id]

    return LeaderboardResponse(
        type=leaderboard_type,
        period=period,
        entries=entries,
        my_rank=my_rank,
    )


# ---------------------------------------------------------------------------
# Score computation helpers
# ---------------------------------------------------------------------------

def _compute_volume_scores(
    session: Session,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
) -> dict[str, int]:
    """Real volume = Σ(weight × reps) from sets of shared workouts."""
    query = (
        select(
            Share.owner_id,
            func.coalesce(func.sum(Set.weight * Set.reps), 0),
        )
        .select_from(Share)
        .join(WorkoutExercise, WorkoutExercise.workout_id == Share.workout_id)
        .join(Set, Set.workout_exercise_id == WorkoutExercise.id)
        .where(Share.workout_id.isnot(None))  # type: ignore[union-attr]
        .where(Set.weight.isnot(None))  # type: ignore[union-attr]
        .where(Set.reps.isnot(None))  # type: ignore[union-attr]
    )
    if start_date:
        query = query.where(Share.created_at >= start_date)
    if end_date:
        query = query.where(Share.created_at < end_date)
    query = query.group_by(Share.owner_id)

    rows = session.exec(query).all()
    return {r[0]: int(r[1]) for r in rows if r[1]}


def _compute_session_scores(
    session: Session,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
) -> dict[str, int]:
    """Count shared workouts per user."""
    query = (
        select(Share.owner_id, func.count())
        .select_from(Share)
        .group_by(Share.owner_id)
    )
    if start_date:
        query = query.where(Share.created_at >= start_date)
    if end_date:
        query = query.where(Share.created_at < end_date)

    rows = session.exec(query).all()
    return {r[0]: int(r[1]) for r in rows if r[1]}


def _compute_likes_scores(
    session: Session, start_date: Optional[datetime] = None
) -> dict[str, int]:
    """Count likes received per user (via their shares)."""
    query = (
        select(Share.owner_id, func.count())
        .select_from(Like)
        .join(Share, Share.share_id == Like.share_id)
        .group_by(Share.owner_id)
    )
    if start_date:
        query = query.where(Like.created_at >= start_date)

    rows = session.exec(query).all()
    return {r[0]: int(r[1]) for r in rows if r[1]}


def _compute_followers_scores(
    session: Session, start_date: Optional[datetime] = None
) -> dict[str, int]:
    """Count followers per user."""
    query = (
        select(Follower.followed_id, func.count())
        .select_from(Follower)
        .group_by(Follower.followed_id)
    )
    if start_date:
        query = query.where(Follower.created_at >= start_date)

    rows = session.exec(query).all()
    return {r[0]: int(r[1]) for r in rows if r[1]}


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.get("/volume", response_model=LeaderboardResponse)
def get_volume_leaderboard(
    period: str = Query("week", pattern="^(week|month|all)$"),
    current_user_id: Optional[str] = None,
    limit: int = Query(20, ge=1, le=100),
    session: Session = Depends(get_session),
) -> LeaderboardResponse:
    """Classement par volume total (kg × reps)."""
    current_start, previous_start = _period_bounds(period)

    current_scores = _compute_volume_scores(session, start_date=current_start)
    previous_scores = (
        _compute_volume_scores(session, start_date=previous_start, end_date=current_start)
        if previous_start else {}
    )

    return _build_response(
        session, "volume", period,
        current_scores, previous_scores,
        current_user_id, limit,
    )


@router.get("/sessions", response_model=LeaderboardResponse)
def get_sessions_leaderboard(
    period: str = Query("week", pattern="^(week|month|all)$"),
    current_user_id: Optional[str] = None,
    limit: int = Query(20, ge=1, le=100),
    session: Session = Depends(get_session),
) -> LeaderboardResponse:
    """Classement par nombre de séances."""
    current_start, previous_start = _period_bounds(period)

    current_scores = _compute_session_scores(session, start_date=current_start)
    previous_scores = (
        _compute_session_scores(session, start_date=previous_start, end_date=current_start)
        if previous_start else {}
    )

    return _build_response(
        session, "sessions", period,
        current_scores, previous_scores,
        current_user_id, limit,
    )


@router.get("/likes", response_model=LeaderboardResponse)
def get_likes_leaderboard(
    current_user_id: Optional[str] = None,
    limit: int = Query(20, ge=1, le=100),
    session: Session = Depends(get_session),
) -> LeaderboardResponse:
    """Classement par nombre de likes reçus."""
    now = datetime.now(timezone.utc)
    week_ago = now - timedelta(days=7)

    current_scores = _compute_likes_scores(session)
    # "previous" = état il y a 7 jours ≈ total likes - likes de cette semaine
    previous_scores_snapshot: dict[str, int] = {}
    recent_likes = _compute_likes_scores(session, start_date=week_ago)
    for uid, total in current_scores.items():
        old_total = total - recent_likes.get(uid, 0)
        if old_total > 0:
            previous_scores_snapshot[uid] = old_total

    return _build_response(
        session, "likes", "all",
        current_scores, previous_scores_snapshot,
        current_user_id, limit,
    )


@router.get("/followers", response_model=LeaderboardResponse)
def get_followers_leaderboard(
    current_user_id: Optional[str] = None,
    limit: int = Query(20, ge=1, le=100),
    session: Session = Depends(get_session),
) -> LeaderboardResponse:
    """Classement par nombre de followers."""
    now = datetime.now(timezone.utc)
    week_ago = now - timedelta(days=7)

    current_scores = _compute_followers_scores(session)
    # "previous" = état il y a 7 jours ≈ followers gagnés avant cette semaine
    recent_followers = _compute_followers_scores(session, start_date=week_ago)
    previous_scores_snapshot: dict[str, int] = {}
    for uid, total in current_scores.items():
        old_total = total - recent_followers.get(uid, 0)
        if old_total > 0:
            previous_scores_snapshot[uid] = old_total

    return _build_response(
        session, "followers", "all",
        current_scores, previous_scores_snapshot,
        current_user_id, limit,
    )
