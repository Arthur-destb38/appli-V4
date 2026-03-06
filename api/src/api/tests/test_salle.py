"""Tests API salle (resolve-token, profile, current-session)."""
import os
import uuid

import pytest
from sqlmodel import Session, select

from api.db import get_engine
from api.models import User, PassToken, Workout, WorkoutExercise, Set, Exercise


def _create_user_with_pass_token(session: Session) -> tuple[str, str]:
    """Crée un user et un PassToken actif. Retourne (user_id, token)."""
    user = User(
        id=str(uuid.uuid4()),
        username="salle-test-user",
        email="salle-test@test.local",
        password_hash="hash",
        objective="Objectif test",
        bio="Bio test",
    )
    session.add(user)
    session.commit()
    session.refresh(user)
    pt = PassToken(user_id=user.id, token=str(uuid.uuid4()))
    session.add(pt)
    session.commit()
    session.refresh(pt)
    return user.id, pt.token


@pytest.fixture(autouse=True)
def _salle_api_key():
    os.environ["SALLE_API_KEY"] = "test-salle-key"
    yield
    if "SALLE_API_KEY" in os.environ:
        del os.environ["SALLE_API_KEY"]


def test_resolve_token_success(client):
    with Session(get_engine()) as session:
        user_id, token = _create_user_with_pass_token(session)

    response = client.post(
        "/salle/resolve-token",
        json={"token": token, "gym_id": "gym-1"},
        headers={"X-API-Key": "test-salle-key"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["user_id"] == user_id
    assert data["status"] == "active"
    assert data["display_name"] == "salle-test-user"


def test_resolve_token_unauthorized(client):
    response = client.post(
        "/salle/resolve-token",
        json={"token": "any-uuid"},
        headers={"X-API-Key": "wrong-key"},
    )
    assert response.status_code == 401


def test_resolve_token_missing(client):
    response = client.post(
        "/salle/resolve-token",
        json={"token": ""},
        headers={"X-API-Key": "test-salle-key"},
    )
    assert response.status_code == 400


def test_resolve_token_unknown(client):
    response = client.post(
        "/salle/resolve-token",
        json={"token": str(uuid.uuid4())},
        headers={"X-API-Key": "test-salle-key"},
    )
    assert response.status_code == 404


def test_profile_success(client):
    with Session(get_engine()) as session:
        user_id, _ = _create_user_with_pass_token(session)

    response = client.get(
        f"/salle/users/{user_id}/profile",
        headers={"X-API-Key": "test-salle-key"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["user_id"] == user_id
    assert data["display_name"] == "salle-test-user"
    assert data["objective"] == "Objectif test"
    assert data["bio"] == "Bio test"


def test_profile_not_found(client):
    response = client.get(
        "/salle/users/unknown-id/profile",
        headers={"X-API-Key": "test-salle-key"},
    )
    assert response.status_code == 404


def test_current_session_null_when_no_workout(client):
    with Session(get_engine()) as session:
        user_id, _ = _create_user_with_pass_token(session)

    response = client.get(
        f"/salle/users/{user_id}/current-session",
        headers={"X-API-Key": "test-salle-key"},
    )
    assert response.status_code == 200
    assert response.json() is None


def test_current_session_returns_draft_workout(client):
    with Session(get_engine()) as session:
        user_id, _ = _create_user_with_pass_token(session)
        workout = Workout(
            user_id=user_id,
            title="Séance test",
            status="draft",
        )
        session.add(workout)
        session.commit()
        session.refresh(workout)
        ex = Exercise(name="Squat", muscle_group="legs")
        session.add(ex)
        session.commit()
        session.refresh(ex)
        we = WorkoutExercise(
            workout_id=workout.id,
            exercise_id=ex.id,
            order_index=0,
            planned_sets=3,
        )
        session.add(we)
        session.commit()
        session.refresh(we)
        s = Set(workout_exercise_id=we.id, reps=10, weight=80.0, order=0)
        session.add(s)
        session.commit()

    response = client.get(
        f"/salle/users/{user_id}/current-session",
        headers={"X-API-Key": "test-salle-key"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data is not None
    assert data["workout_id"] == workout.id
    assert data["title"] == "Séance test"
    assert data["status"] == "draft"
    assert len(data["exercises"]) == 1
    assert data["exercises"][0]["name"] == "Squat"
    assert data["exercises"][0]["planned_sets"] == 3
    assert len(data["exercises"][0]["sets"]) == 1
    assert data["exercises"][0]["sets"][0]["reps"] == 10
    assert data["exercises"][0]["sets"][0]["weight"] == 80.0
