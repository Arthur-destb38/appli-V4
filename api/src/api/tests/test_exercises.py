from sqlmodel import Session
from sqlmodel import select

from api.db import get_engine
from api.models import Exercise
from api.seeds import seed_exercises


def test_seed_populates_and_list_endpoint(client):
    inserted = seed_exercises(force=True)
    assert inserted == 15

    with Session(get_engine()) as session:
        results = session.exec(select(Exercise)).all()
    assert len(results) == 15

    response = client.get("/exercises")
    assert response.status_code == 200
    payload = response.json()
    assert isinstance(payload, list)
    assert len(payload) == 15
    assert {item["name"] for item in payload}


def test_seed_does_not_duplicate(client):
    seed_exercises(force=True)
    second = seed_exercises()
    assert second == 0


def test_create_exercise(client):
    payload = {
        "name": "Face Pull",
        "muscle_group": "shoulders",
        "equipment": "cable",
        "description": "Cable face pull",
    }
    response = client.post("/exercises", json=payload)
    assert response.status_code == 201
    body = response.json()
    assert body["name"] == "Face Pull"
    assert body["id"] > 0

    list_response = client.get("/exercises")
    assert len(list_response.json()) >= 1


def test_create_duplicate_exercise_returns_conflict(client):
    payload = {
        "name": "Zercher Squat",
        "muscle_group": "legs",
        "equipment": "barbell",
        "description": "Squat with bar in elbows.",
    }
    first = client.post("/exercises", json=payload)
    assert first.status_code == 201

    conflict = client.post("/exercises", json=payload)
    assert conflict.status_code == 409
    body = conflict.json()
    assert body["detail"]["reason"] == "duplicate"
    assert body["detail"]["exercise"]["name"] == "Zercher Squat"


def test_get_exercise_by_id(client):
    seed_exercises(force=True)
    listing = client.get("/exercises").json()
    first = listing[0]
    response = client.get(f"/exercises/{first['id']}")
    assert response.status_code == 200
    assert response.json()["id"] == first["id"]


def test_get_exercise_not_found(client):
    seed_exercises(force=True)
    response = client.get("/exercises/999999")
    assert response.status_code == 404
    assert response.json()["detail"] == "Exercise 999999 not found"


def test_bulk_create_exercises(client):
    seed_exercises(force=True)
    payloads = [
        {
            "name": "Hip Thrust",
            "muscle_group": "posterior_chain",
            "equipment": "barbell",
            "description": "Hip thrust with barbell.",
        },
        {
            "name": "Pallof Press",
            "muscle_group": "core",
            "equipment": "cable",
            "description": "Anti-rotation core press.",
        },
    ]
    response = client.post("/exercises/bulk", json=payloads)
    assert response.status_code == 201
    body = response.json()
    assert len(body) == 2
    names = {item["name"] for item in body}
    assert names == {"Hip Thrust", "Pallof Press"}

