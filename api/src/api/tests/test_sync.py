from datetime import datetime, timezone

from sqlmodel import Session, select

from api.db import get_engine
from api.models import SyncEvent, Workout


def test_push_creates_workout(client):
    created_at = int(datetime.now(tz=timezone.utc).timestamp() * 1000)
    payload = {
        "mutations": [
            {
                "queue_id": 1,
                "action": "create-workout",
                "payload": {
                    "client_id": "cid-test",
                    "title": "Pull Day",
                    "status": "draft",
                    "created_at": created_at,
                    "updated_at": created_at,
                },
                "created_at": created_at,
            }
        ]
    }

    response = client.post("/sync/push", json=payload)
    assert response.status_code == 200
    body = response.json()
    assert body["processed"] == 1
    assert len(body["results"]) == 1

    with Session(get_engine()) as session:
        workouts = session.exec(select(Workout)).all()
        assert len(workouts) == 1
        workout = workouts[0]
        assert workout.title == "Pull Day"
        assert workout.client_id == "cid-test"
        assert body["results"][0]["server_id"] == workout.id


def test_push_fallback_event(client):
    created_at = int(datetime.now(tz=timezone.utc).timestamp() * 1000)
    payload = {
        "mutations": [
            {
                "queue_id": 2,
                "action": "add-set",
                "payload": {"setId": 99, "payload": {"reps": 6}},
                "created_at": created_at,
            }
        ]
    }

    response = client.post("/sync/push", json=payload)
    assert response.status_code == 200
    body = response.json()
    assert body["processed"] == 1
    assert len(body["results"]) == 1

    with Session(get_engine()) as session:
        events = session.exec(select(SyncEvent)).all()
        assert len(events) == 1
        event = events[0]
        assert event.action == "add-set"
        assert body["results"][0]["server_id"] == event.id


def test_pull_returns_workout_events(client):
    created_at = int(datetime.now(tz=timezone.utc).timestamp() * 1000)
    client.post(
        "/sync/push",
        json={
            "mutations": [
                {
                    "queue_id": 1,
                    "action": "create-workout",
                    "payload": {
                        "client_id": "cid-sync",
                        "title": "Push Day",
                        "status": "draft",
                        "created_at": created_at,
                        "updated_at": created_at,
                    },
                    "created_at": created_at,
                }
            ]
        },
    )

    response = client.get("/sync/pull", params={"since": created_at - 1000})
    assert response.status_code == 200
    body = response.json()
    assert any(event["action"] == "workout-upsert" for event in body["events"])
