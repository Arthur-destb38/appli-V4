import uuid


def test_create_and_get_profile(client):
    user_id = str(uuid.uuid4())
    payload = {
        "id": user_id,
        "username": "athlete-001",
        "consent_to_public_share": False,
    }
    response = client.post("/users/profile", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == user_id
    assert data["username"] == "athlete-001"
    assert data["consent_to_public_share"] is False

    fetch = client.get(f"/users/profile/{user_id}")
    assert fetch.status_code == 200
    fetched = fetch.json()
    assert fetched["username"] == "athlete-001"


def test_update_profile_and_consent(client):
    user_id = str(uuid.uuid4())
    create_payload = {
        "id": user_id,
        "username": "runner-01",
        "consent_to_public_share": False,
    }
    client.post("/users/profile", json=create_payload)

    update_payload = {
        "id": user_id,
        "username": "runner-elite",
        "consent_to_public_share": True,
    }
    update = client.post("/users/profile", json=update_payload)
    assert update.status_code == 200
    updated = update.json()
    assert updated["username"] == "runner-elite"
    assert updated["consent_to_public_share"] is True


def test_username_conflict(client):
    first_id = str(uuid.uuid4())
    second_id = str(uuid.uuid4())
    payload = {"id": first_id, "username": "unique-name", "consent_to_public_share": False}
    client.post("/users/profile", json=payload)

    conflict_payload = {
        "id": second_id,
        "username": "unique-name",
        "consent_to_public_share": False,
    }
    response = client.post("/users/profile", json=conflict_payload)
    assert response.status_code == 409
    assert response.json()["detail"] == "username_taken"


def test_get_profile_not_found(client):
    unknown_id = str(uuid.uuid4())
    response = client.get(f"/users/profile/{unknown_id}")
    assert response.status_code == 404
    assert response.json()["detail"] == "user_not_found"
