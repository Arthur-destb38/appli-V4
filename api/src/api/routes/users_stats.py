from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlmodel import Session, select
from typing import Optional

from ..db import get_session
from ..models import User, Share


router = APIRouter(prefix="/users", tags=["users-stats"])


class WeeklyStats(BaseModel):
    volume: float
    sessions: int
    best_lift: float


class UserStatsResponse(BaseModel):
    user_id: str
    username: str
    # Stats globales
    total_sessions: int
    total_volume: float
    best_lift: float
    # Stats cette semaine
    sessions_this_week: int
    volume_this_week: float
    # Stats semaine dernière (pour comparaison)
    sessions_last_week: int
    volume_last_week: float
    # Progression
    volume_change_percent: Optional[float]  # % de changement vs semaine dernière
    sessions_change: int  # +/- séances vs semaine dernière
    # Streak (séances consécutives cette semaine)
    current_streak: int
    # Objectif (si défini)
    weekly_goal: int  # Objectif de séances par semaine
    goal_progress_percent: float  # % de l'objectif atteint


def _calculate_volume_and_best(shares: list[Share]) -> tuple[float, float]:
    """Calcule le volume total et la meilleure charge d'une liste de shares."""
    volume = 0.0
    best_lift = 0.0
    
    for share in shares:
        for ex in share.snapshot.get("exercises", []):
            for s in ex.get("sets", []):
                reps = s.get("reps") or 0
                weight = s.get("weight") or 0
                
                if isinstance(reps, str):
                    try:
                        reps = int(reps.split("x")[-1])
                    except Exception:
                        reps = 0
                try:
                    w = float(weight)
                except Exception:
                    w = 0
                    
                volume += reps * w
                best_lift = max(best_lift, w)
    
    return volume, best_lift


def _get_week_bounds(offset_weeks: int = 0) -> tuple[datetime, datetime]:
    """Retourne le début et la fin d'une semaine (lundi à dimanche).
    offset_weeks=0 = cette semaine, offset_weeks=1 = semaine dernière, etc.
    """
    now = datetime.now(timezone.utc)
    # Aller au début de la semaine courante (lundi)
    start_of_this_week = now - timedelta(days=now.weekday())
    start_of_this_week = start_of_this_week.replace(hour=0, minute=0, second=0, microsecond=0)
    
    # Calculer la semaine demandée
    start = start_of_this_week - timedelta(weeks=offset_weeks)
    end = start + timedelta(days=7)
    
    return start, end


@router.get("/{user_id}/stats", response_model=UserStatsResponse)
def get_user_stats(user_id: str, session: Session = Depends(get_session)) -> UserStatsResponse:
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="user_not_found")

    # Récupérer toutes les shares de l'utilisateur
    all_shares = session.exec(
        select(Share).where(Share.owner_id == user_id).order_by(Share.created_at.desc())
    ).all()
    
    # Stats globales
    total_sessions = len(all_shares)
    total_volume, best_lift = _calculate_volume_and_best(all_shares)
    
    # Cette semaine
    this_week_start, this_week_end = _get_week_bounds(0)
    this_week_shares = [s for s in all_shares if this_week_start <= s.created_at < this_week_end]
    sessions_this_week = len(this_week_shares)
    volume_this_week, _ = _calculate_volume_and_best(this_week_shares)
    
    # Semaine dernière
    last_week_start, last_week_end = _get_week_bounds(1)
    last_week_shares = [s for s in all_shares if last_week_start <= s.created_at < last_week_end]
    sessions_last_week = len(last_week_shares)
    volume_last_week, _ = _calculate_volume_and_best(last_week_shares)
    
    # Calcul de la progression
    volume_change_percent = None
    if volume_last_week > 0:
        volume_change_percent = round(((volume_this_week - volume_last_week) / volume_last_week) * 100, 1)
    elif volume_this_week > 0:
        volume_change_percent = 100.0  # Progression de 0 à quelque chose = +100%
    
    sessions_change = sessions_this_week - sessions_last_week
    
    # Calculer le streak (jours consécutifs avec séance cette semaine)
    # Simplifié : on compte juste les jours uniques d'entraînement cette semaine
    workout_days = set()
    for share in this_week_shares:
        workout_days.add(share.created_at.date())
    current_streak = len(workout_days)
    
    # Objectif par défaut : 3 séances/semaine
    weekly_goal = 3
    goal_progress_percent = min(100.0, round((sessions_this_week / weekly_goal) * 100, 1)) if weekly_goal > 0 else 0

    return UserStatsResponse(
        user_id=user_id,
        username=user.username,
        total_sessions=total_sessions,
        total_volume=round(total_volume, 1),
        best_lift=round(best_lift, 1),
        sessions_this_week=sessions_this_week,
        volume_this_week=round(volume_this_week, 1),
        sessions_last_week=sessions_last_week,
        volume_last_week=round(volume_last_week, 1),
        volume_change_percent=volume_change_percent,
        sessions_change=sessions_change,
        current_streak=current_streak,
        weekly_goal=weekly_goal,
        goal_progress_percent=goal_progress_percent,
    )


# Endpoint simplifié pour récupérer rapidement les stats (sans auth)
@router.get("/{user_id}/stats/summary")
def get_user_stats_summary(user_id: str, session: Session = Depends(get_session)) -> dict:
    """Version légère des stats pour affichage rapide."""
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="user_not_found")

    all_shares = session.exec(
        select(Share).where(Share.owner_id == user_id)
    ).all()
    
    this_week_start, _ = _get_week_bounds(0)
    this_week_shares = [s for s in all_shares if s.created_at >= this_week_start]
    
    volume_this_week, _ = _calculate_volume_and_best(this_week_shares)
    
    return {
        "sessions_this_week": len(this_week_shares),
        "total_sessions": len(all_shares),
        "volume_this_week": round(volume_this_week, 1),
        "weekly_goal": 3,
        "goal_progress_percent": min(100, round((len(this_week_shares) / 3) * 100)),
    }
