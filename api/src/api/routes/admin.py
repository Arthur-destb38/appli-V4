"""Routes d'administration — protégées par X-Admin-Key."""
import os
from fastapi import APIRouter, Depends, Header, HTTPException, status
from sqlmodel import Session, select
from ..db import get_session
from ..models import User

router = APIRouter(prefix="/admin", tags=["admin"])

_ADMIN_SECRET = os.getenv("ADMIN_SECRET", "")


def _require_admin(x_admin_key: str = Header(default="")):
    """Vérifie le header X-Admin-Key. Bloque si non configuré ou incorrect."""
    if not _ADMIN_SECRET or x_admin_key != _ADMIN_SECRET:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="forbidden")


@router.get("/users")
def list_users(
    limit: int = 50,
    session: Session = Depends(get_session),
    _: None = Depends(_require_admin),
):
    """Liste tous les utilisateurs (admin seulement)."""
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
def create_demo_users(
    session: Session = Depends(get_session),
    _: None = Depends(_require_admin),
):
    """Créer les utilisateurs de démo (setup initial, admin seulement)."""
    from ..utils.auth import hash_password
    from datetime import datetime, timezone
    from ..models import Workout

    try:
        existing_demo = session.exec(select(User).where(User.username == "demo")).first()
        if existing_demo:
            return {"message": "Demo users already exist"}

        demo = User(
            id='demo-permanent',
            username='demo',
            email='demo@gorillax.app',
            password_hash=hash_password(os.getenv("DEMO_PASSWORD", "DemoPassword123")),
            created_at=datetime.now(timezone.utc),
            email_verified=True,
            profile_completed=True
        )
        session.add(demo)

        arthur = User(
            id='test-user-002',
            username='arthur',
            email='arthur@gorillax.app',
            password_hash=hash_password(os.getenv("ARTHUR_PASSWORD", "Test123456")),
            created_at=datetime.now(timezone.utc),
            email_verified=True,
            profile_completed=True
        )
        session.add(arthur)
        session.commit()

        for title, uid, s in [
            ('Séance Demo Cloud 1', 'demo-permanent', 'completed'),
            ('Séance Demo Cloud 2', 'demo-permanent', 'draft'),
            ('Séance Arthur Cloud 1', 'test-user-002', 'completed'),
            ('Séance Arthur Cloud 2', 'test-user-002', 'draft'),
        ]:
            session.add(Workout(
                user_id=uid, title=title, status=s,
                created_at=datetime.now(timezone.utc),
                updated_at=datetime.now(timezone.utc)
            ))
        session.commit()

        return {"message": "Demo users created successfully", "users": ["demo", "arthur"]}
    except Exception as e:
        session.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/debug/schema")
def debug_schema(
    session: Session = Depends(get_session),
    _: None = Depends(_require_admin),
):
    """Vérifie le schéma de la base de données (admin seulement)."""
    from sqlalchemy import text
    from ..db import _database_url
    from sqlalchemy.engine.url import make_url

    try:
        url = _database_url()
        parsed_url = make_url(url)
        is_postgres = parsed_url.get_backend_name() == "postgresql"

        if is_postgres:
            result = session.exec(text(
                "SELECT column_name, data_type FROM information_schema.columns "
                "WHERE table_name='user' ORDER BY ordinal_position"
            ))
            columns = [{"name": row[0], "type": row[1]} for row in result]
            demo_user = session.exec(select(User).where(User.username == "demo")).first()
            return {
                "database": "postgresql",
                "user_table_columns": columns,
                "demo_user_exists": demo_user is not None,
            }
        else:
            return {"database": "sqlite", "message": "Schema check only works on PostgreSQL"}
    except Exception as e:
        return {"error": str(e)}


@router.post("/debug/test-login")
def debug_test_login(
    session: Session = Depends(get_session),
    _: None = Depends(_require_admin),
):
    """Teste la logique de login (admin seulement)."""
    from ..utils.auth import verify_password

    demo_user = session.exec(select(User).where(User.username == "demo")).first()
    if not demo_user:
        return {"error": "Demo user not found"}

    password_correct = verify_password(
        os.getenv("DEMO_PASSWORD", "DemoPassword123"),
        demo_user.password_hash
    )
    return {
        "user_found": True,
        "username": demo_user.username,
        "email": demo_user.email,
        "password_correct": password_correct,
        "email_verified": demo_user.email_verified,
    }


@router.post("/debug/full-login-test")
def debug_full_login_test(
    session: Session = Depends(get_session),
    _: None = Depends(_require_admin),
):
    """Teste le flux complet de login (admin seulement)."""
    from ..utils.auth import verify_password, create_access_token, create_refresh_token
    from ..models import RefreshToken
    from datetime import datetime, timezone

    demo_user = session.exec(select(User).where(User.username == "demo")).first()
    if not demo_user:
        return {"step": "get_user", "error": "User not found"}

    password_ok = verify_password(
        os.getenv("DEMO_PASSWORD", "DemoPassword123"),
        demo_user.password_hash
    )
    if not password_ok:
        return {"step": "verify_password", "error": "Password incorrect"}

    try:
        access_token = create_access_token(demo_user.id)
    except Exception as e:
        return {"step": "create_access_token", "error": str(e)}

    try:
        refresh_token, exp = create_refresh_token(demo_user.id)
    except Exception as e:
        return {"step": "create_refresh_token", "error": str(e)}

    try:
        rt = RefreshToken(token=refresh_token, user_id=demo_user.id, expires_at=exp)
        session.add(rt)
        session.commit()
    except Exception as e:
        session.rollback()
        return {"step": "save_refresh_token", "error": str(e)}

    return {
        "success": True,
        "access_token_length": len(access_token),
        "refresh_token_length": len(refresh_token),
        "expires_at": exp.isoformat()
    }
