import uuid
from sqlmodel import Session

from api.db import get_engine
from api.models import Share


def test_get_shared_workout(client):
    with Session(get_engine()) as session:
        share = Share(
            share_id='sh_test',
            owner_id=str(uuid.uuid4()),
            owner_username='owner',
            workout_title='Test',
            exercise_count=1,
            set_count=1,
            snapshot={'title': 'Test'},
        )
        session.add(share)
        session.commit()

    response = client.get('/workouts/shared/sh_test')
    assert response.status_code == 200
    payload = response.json()
    assert payload['title'] == 'Test'


def test_shared_workout_not_found(client):
    response = client.get('/workouts/shared/unknown')
    assert response.status_code == 404
    assert response.json()['detail'] == 'share_not_found'
