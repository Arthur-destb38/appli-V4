import uuid
from datetime import datetime, timedelta

from sqlmodel import Session

from api.db import get_engine
from api.models import Share, User, Follower


def setup_users_and_shares(session: Session):
    owner = User(id=str(uuid.uuid4()), username='owner', consent_to_public_share=True)
    follower = User(id=str(uuid.uuid4()), username='follower', consent_to_public_share=True)
    session.add(owner)
    session.add(follower)
    session.commit()

    snapshots = []
    for i in range(3):
        share = Share(
            share_id=f'sh_{i}',
            owner_id=owner.id,
            owner_username='owner',
            workout_title=f'Séance {i}',
            exercise_count=1,
            set_count=1,
            snapshot={'title': f'Séance {i}'},
            created_at=datetime.now() - timedelta(minutes=i),
        )
        session.add(share)
        snapshots.append(share)
    session.add(Follower(follower_id=follower.id, followed_id=owner.id))
    session.commit()
    return follower.id, owner.id, snapshots


def test_feed_returns_followed_shares(client):
    with Session(get_engine()) as session:
        follower_id, owner_id, shares = setup_users_and_shares(session)

    response = client.get(f"/feed?user_id={follower_id}&limit=2")
    assert response.status_code == 200
    payload = response.json()
    assert len(payload['items']) == 2
    assert payload['items'][0]['share_id'] == 'sh_0'

    assert payload['next_cursor'] is not None

    response2 = client.get(
        f"/feed?user_id={follower_id}&limit=2&cursor={payload['next_cursor']}"
    )
    assert response2.status_code == 200
    payload2 = response2.json()
    assert len(payload2['items']) == 1


def test_follow_and_unfollow(client):
    with Session(get_engine()) as session:
        follower_id, owner_id, _ = setup_users_and_shares(session)

    follow_resp = client.post(f"/feed/follow/{owner_id}", json={'follower_id': follower_id})
    assert follow_resp.status_code == 204

    delete_resp = client.request(
        "DELETE",
        f"/feed/follow/{owner_id}",
        json={'follower_id': follower_id}
    )
    assert delete_resp.status_code == 204


def test_feed_requires_user(client):
    response = client.get('/feed?user_id=unknown')
    assert response.status_code == 404
    assert response.json()['detail'] == 'user_not_found'
