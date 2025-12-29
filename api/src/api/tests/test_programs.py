from sqlmodel import Session, select


from api.db import get_engine, reset_engine, init_db
from api.models import Program, ProgramSession, ProgramSet


def setup_function() -> None:
    reset_engine()
    init_db()


def test_create_program(client):
    payload = {
        "title": "Programme force",
        "objective": "force",
        "duration_weeks": 4,
        "user_id": "user-1",
        "sessions": [
            {
                "day_index": 0,
                "title": "Séance 1",
                "focus": "Poussée",
                "estimated_minutes": 60,
                "sets": [
                    {
                        "exercise_slug": "bench-press-pectoraux",
                        "reps": "5x5",
                        "weight": 80,
                        "rpe": 7.5,
                        "order_index": 0,
                        "notes": "Progression linéaire",
                    }
                ],
            }
        ],
    }

    response = client.post("/programs", json=payload)
    assert response.status_code == 201
    body = response.json()
    assert body["title"] == "Programme force"
    assert len(body["sessions"]) == 1
    assert len(body["sessions"][0]["sets"]) == 1

    with Session(get_engine()) as session:
        programs = session.exec(select(Program)).all()
        sessions = session.exec(select(ProgramSession)).all()
        sets = session.exec(select(ProgramSet)).all()
    assert len(programs) == 1
    assert len(sessions) == 1
    assert len(sets) == 1
