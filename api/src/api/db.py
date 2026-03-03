from __future__ import annotations

import os
from collections.abc import Iterator
from pathlib import Path
from typing import Optional

from sqlalchemy import text
from sqlalchemy.engine import Engine
from sqlalchemy.engine.url import make_url
from sqlmodel import Session, select, SQLModel, create_engine


def set_session_user_id(session: Session, user_id: str) -> None:
    """Set app.current_user_id for RLS on PostgreSQL. No-op on SQLite."""
    url = _database_url()
    if url.startswith("postgresql"):
        session.execute(text("SELECT set_config('app.current_user_id', :id, true)"), {"id": user_id})

BASE_DIR = Path(__file__).resolve().parent.parent.parent  # api/
DEFAULT_DB_PATH = BASE_DIR / "gorillax.db"

_ENGINE: Optional[Engine] = None


def _database_url() -> str:
    url = os.getenv("DATABASE_URL")
    if url:
        # Render utilise postgres:// mais SQLAlchemy veut postgresql://
        if url.startswith("postgres://"):
            url = url.replace("postgres://", "postgresql://", 1)
        return url
    return f"sqlite:///{DEFAULT_DB_PATH}"


def get_engine() -> Engine:
    global _ENGINE
    if _ENGINE is None:
        url = _database_url()
        parsed_url = make_url(url)
        connect_args = (
            {"check_same_thread": False}
            if parsed_url.get_backend_name() == "sqlite"
            else {}
        )
        _ENGINE = create_engine(url, echo=False, connect_args=connect_args)
    return _ENGINE


def reset_engine() -> None:
    global _ENGINE
    _ENGINE = None


def init_db() -> None:
    # Importer tous les modèles pour qu'ils soient ajoutés au metadata AVANT create_all
    from .models import (
        User, Workout, Exercise, WorkoutExercise, Set, Program, ProgramSession,
        ProgramSet, Share, Follower, Like, Comment, Notification, Story,
        RefreshToken, LoginAttempt, SyncEvent, PassToken,
    )
    
    url = _database_url()
    parsed_url = make_url(url)
    if parsed_url.get_backend_name() == "sqlite" and parsed_url.database:
        Path(parsed_url.database).parent.mkdir(parents=True, exist_ok=True)
    engine = get_engine()
    SQLModel.metadata.create_all(engine)
    _ensure_slug_column(engine)
    _ensure_workout_exercise_columns(engine)
    _ensure_share_columns(engine)


def _ensure_slug_column(engine: Engine) -> None:
    from .models import Exercise
    from .utils.slug import make_exercise_slug

    url = _database_url()
    parsed_url = make_url(url)
    is_sqlite = parsed_url.get_backend_name() == "sqlite"

    with engine.connect() as connection:
        if is_sqlite:
            # SQLite: utiliser PRAGMA
            result = connection.execute(text("PRAGMA table_info(exercise)"))
            columns = {row[1] for row in result}
            if "slug" not in columns:
                connection.execute(text("ALTER TABLE exercise ADD COLUMN slug TEXT"))
                connection.execute(
                    text("CREATE UNIQUE INDEX IF NOT EXISTS ix_exercise_slug ON exercise (slug)")
                )
        else:
            # PostgreSQL: utiliser information_schema
            result = connection.execute(text(
                "SELECT column_name FROM information_schema.columns "
                "WHERE table_name='exercise'"
            ))
            columns = {row[0] for row in result}
            if "slug" not in columns:
                connection.execute(text("ALTER TABLE exercise ADD COLUMN slug TEXT"))
                connection.execute(
                    text("CREATE UNIQUE INDEX IF NOT EXISTS ix_exercise_slug ON exercise (slug)")
                )
        connection.commit()

    with Session(engine) as session:
        exercises = session.exec(
            select(Exercise).where((Exercise.slug.is_(None)) | (Exercise.slug == ""))
        ).all()
        dirty = False
        for exercise in exercises:
            exercise.slug = make_exercise_slug(exercise.name, exercise.muscle_group)
            dirty = True
        if dirty:
            session.commit()


def _get_table_columns(connection, table_name: str, is_sqlite: bool) -> set[str]:
    quoted = f'"{table_name}"'
    if is_sqlite:
        result = connection.execute(text(f"PRAGMA table_info({quoted})"))
        return {row[1] for row in result}
    result = connection.execute(text(
        "SELECT column_name FROM information_schema.columns "
        f"WHERE table_name='{table_name}'"
    ))
    return {row[0] for row in result}


def _ensure_workout_exercise_columns(engine: Engine) -> None:
    url = _database_url()
    parsed_url = make_url(url)
    is_sqlite = parsed_url.get_backend_name() == "sqlite"

    with engine.connect() as connection:
        we_cols = _get_table_columns(connection, "workoutexercise", is_sqlite)
        if "planned_sets" not in we_cols:
            connection.execute(text("ALTER TABLE workoutexercise ADD COLUMN planned_sets INTEGER"))
        if "client_id" not in we_cols:
            connection.execute(text("ALTER TABLE workoutexercise ADD COLUMN client_id TEXT"))
        if "created_at" not in we_cols:
            connection.execute(text("ALTER TABLE workoutexercise ADD COLUMN created_at TIMESTAMP"))
        if "updated_at" not in we_cols:
            connection.execute(text("ALTER TABLE workoutexercise ADD COLUMN updated_at TIMESTAMP"))

        set_cols = _get_table_columns(connection, "set", is_sqlite)
        if "client_id" not in set_cols:
            connection.execute(text('ALTER TABLE "set" ADD COLUMN client_id TEXT'))
        if "created_at" not in set_cols:
            connection.execute(text('ALTER TABLE "set" ADD COLUMN created_at TIMESTAMP'))
        if "updated_at" not in set_cols:
            connection.execute(text('ALTER TABLE "set" ADD COLUMN updated_at TIMESTAMP'))

        connection.commit()


def _ensure_share_columns(engine: Engine) -> None:
    url = _database_url()
    parsed_url = make_url(url)
    is_sqlite = parsed_url.get_backend_name() == "sqlite"

    with engine.connect() as connection:
        cols = _get_table_columns(connection, "share", is_sqlite)
        if "caption" not in cols:
            connection.execute(text("ALTER TABLE share ADD COLUMN caption TEXT"))
        if "color" not in cols:
            connection.execute(text("ALTER TABLE share ADD COLUMN color TEXT"))
        if "image_url" not in cols:
            connection.execute(text("ALTER TABLE share ADD COLUMN image_url TEXT"))
        connection.commit()


def get_session() -> Iterator[Session]:
    engine = get_engine()
    with Session(engine) as session:
        yield session
