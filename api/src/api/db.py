from __future__ import annotations

import os
from collections.abc import Iterator
from pathlib import Path
from typing import Optional

from sqlalchemy import text
from sqlalchemy.engine import Engine
from sqlalchemy.engine.url import make_url
from sqlmodel import Session, select, SQLModel, create_engine

BASE_DIR = Path(__file__).resolve().parent.parent.parent  # api/
DEFAULT_DB_PATH = BASE_DIR / "gorillax.db"

_ENGINE: Optional[Engine] = None


def _database_url() -> str:
    url = os.getenv("DATABASE_URL")
    if url:
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
        RefreshToken, SyncEvent
    )
    
    url = _database_url()
    parsed_url = make_url(url)
    if parsed_url.get_backend_name() == "sqlite" and parsed_url.database:
        Path(parsed_url.database).parent.mkdir(parents=True, exist_ok=True)
    engine = get_engine()
    SQLModel.metadata.create_all(engine)
    _ensure_slug_column(engine)
    _ensure_workout_exercise_columns(engine)


def _ensure_slug_column(engine: Engine) -> None:
    from .models import Exercise, Share, Follower
    from .utils.slug import make_exercise_slug

    with engine.connect() as connection:
        result = connection.execute(text("PRAGMA table_info(exercise)"))
        columns = {row[1] for row in result}
        if "slug" not in columns:
            connection.execute(text("ALTER TABLE exercise ADD COLUMN slug TEXT"))
            connection.execute(
                text("CREATE UNIQUE INDEX IF NOT EXISTS ix_exercise_slug ON exercise (slug)")
            )
        result = connection.execute(text("PRAGMA table_info(share)"))
        share_columns = {row[1] for row in result}
        if "share_id" not in share_columns:
            connection.execute(
                text(
                    "CREATE TABLE IF NOT EXISTS share ("
                    "share_id TEXT PRIMARY KEY,"
                    "owner_id TEXT NOT NULL,"
                    "owner_username TEXT NOT NULL,"
                    "workout_title TEXT NOT NULL,"
                    "exercise_count INTEGER NOT NULL,"
                    "set_count INTEGER NOT NULL,"
                    "snapshot JSON NOT NULL,"
                    "created_at INTEGER NOT NULL,"
                    "FOREIGN KEY(owner_id) REFERENCES user(id)"
                    ")"
                )
            )
        result = connection.execute(text("PRAGMA table_info(follower)"))
        follower_columns = {row[1] for row in result}
        if "follower_id" not in follower_columns:
            connection.execute(
                text(
                    "CREATE TABLE IF NOT EXISTS follower ("
                    "follower_id TEXT NOT NULL,"
                    "followed_id TEXT NOT NULL,"
                    "created_at INTEGER NOT NULL,"
                    "PRIMARY KEY (follower_id, followed_id),"
                    "FOREIGN KEY(follower_id) REFERENCES user(id),"
                    "FOREIGN KEY(followed_id) REFERENCES user(id)"
                    ")"
                )
            )
        connection.commit()
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


def _ensure_workout_exercise_columns(engine: Engine) -> None:
    with engine.connect() as connection:
        result = connection.execute(text("PRAGMA table_info(workoutexercise)"))
        columns = {row[1] for row in result}
        if "planned_sets" not in columns:
            connection.execute(text("ALTER TABLE workoutexercise ADD COLUMN planned_sets INTEGER"))
        connection.commit()


def get_session() -> Iterator[Session]:
    engine = get_engine()
    with Session(engine) as session:
        yield session
