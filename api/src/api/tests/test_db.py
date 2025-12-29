
from api.db import get_engine
from api.db import reset_engine


def test_default_database_url(monkeypatch):
    monkeypatch.delenv("DATABASE_URL", raising=False)
    reset_engine()
    engine = get_engine()
    assert engine.url.database.endswith("gorillax.db")
