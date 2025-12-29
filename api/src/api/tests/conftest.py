import os
from collections.abc import Iterator

import pytest
from fastapi.testclient import TestClient

from api.db import init_db
from api.db import reset_engine
from api.main import app


@pytest.fixture(autouse=True)
def _test_database(tmp_path) -> Iterator[None]:
    db_path = tmp_path / "test.db"
    os.environ["DATABASE_URL"] = f"sqlite:///{db_path}"
    reset_engine()
    init_db()
    yield
    if "DATABASE_URL" in os.environ:
        del os.environ["DATABASE_URL"]
    reset_engine()


@pytest.fixture()
def client() -> Iterator[TestClient]:
    with TestClient(app) as test_client:
        yield test_client
