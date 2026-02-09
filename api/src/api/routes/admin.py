"""Routes d'administration."""
from fastapi import APIRouter, Depends
from sqlmodel import Session, select
from api.db import get_session
from api.models import User

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/users")
def list_users(
    limit: int = 50,
    session: Session = Depends(get_session)
):
    """Liste tous les utilisateurs (pour debug)."""
    users = session.exec(
        select(User)
        .order_by(User.created_at.desc())
        .limit(limit)
    ).all()
    
    return {
        "count": len(users),
        "users": [
            {
                "id": u.id,
                "username": u.username,
                "email": u.email,
                "bio": u.bio,
                "objective": u.objective,
                "created_at": u.created_at,
                "email_verified": u.email_verified,
            }
            for u in users
        ]
    }
