"""Routes d'administration."""
from fastapi import APIRouter, Depends
from sqlmodel import Session, select
from ..db import get_session
from ..models import User

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


@router.post("/create-demo-users")
def create_demo_users(session: Session = Depends(get_session)):
    """Créer les utilisateurs de démo (pour setup initial)."""
    from ..utils.auth import hash_password
    from datetime import datetime, timezone
    from ..models import Workout
    
    try:
        # Vérifier si demo existe déjà
        existing_demo = session.exec(select(User).where(User.username == "demo")).first()
        if existing_demo:
            return {"message": "Demo users already exist"}
        
        # Créer demo
        demo = User(
            id='demo-permanent',
            username='demo',
            email='demo@gorillax.app',
            password_hash=hash_password('DemoPassword123'),
            created_at=datetime.now(timezone.utc),
            email_verified=True,
            profile_completed=True
        )
        session.add(demo)
        
        # Créer arthur
        arthur = User(
            id='test-user-002',
            username='arthur',
            email='arthur@gorillax.app',
            password_hash=hash_password('Test123456'),
            created_at=datetime.now(timezone.utc),
            email_verified=True,
            profile_completed=True
        )
        session.add(arthur)
        
        session.commit()
        
        # Créer des workouts
        demo_w1 = Workout(
            user_id='demo-permanent',
            title='Séance Demo Cloud 1',
            status='completed',
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc)
        )
        session.add(demo_w1)
        
        demo_w2 = Workout(
            user_id='demo-permanent',
            title='Séance Demo Cloud 2',
            status='draft',
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc)
        )
        session.add(demo_w2)
        
        arthur_w1 = Workout(
            user_id='test-user-002',
            title='Séance Arthur Cloud 1',
            status='completed',
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc)
        )
        session.add(arthur_w1)
        
        arthur_w2 = Workout(
            user_id='test-user-002',
            title='Séance Arthur Cloud 2',
            status='draft',
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc)
        )
        session.add(arthur_w2)
        
        session.commit()
        
        return {
            "message": "Demo users created successfully",
            "users": ["demo", "arthur"],
            "credentials": {
                "demo": "demo / DemoPassword123",
                "arthur": "arthur / Test123456"
            }
        }
    except Exception as e:
        session.rollback()
        raise HTTPException(status_code=500, detail=str(e))
