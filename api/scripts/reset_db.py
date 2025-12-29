from __future__ import annotations

from sqlmodel import SQLModel

from api.db import get_engine
from api.db import reset_engine
from api.seeds import seed_exercises


def reset_database() -> None:
    """Drop, recreate and seed the SQLite database."""
    reset_engine()
    engine = get_engine()
    SQLModel.metadata.drop_all(engine)
    SQLModel.metadata.create_all(engine)
    inserted = seed_exercises(force=True)
    print(f"Database reset. Inserted {inserted} exercises.")


if __name__ == "__main__":
    reset_database()
