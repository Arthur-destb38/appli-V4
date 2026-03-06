"""Tests for messaging routes: conversations, messages, unread count."""
import os
import uuid

import pytest
from sqlmodel import Session, select

from api.db import get_engine
from api.models import User, Conversation, Message
from api.utils.auth import hash_password, create_access_token


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

_AUTH_SECRET = "test-secret-that-is-at-least-32-characters-long-ok"


@pytest.fixture(autouse=True)
def _auth_env():
    os.environ["AUTH_SECRET"] = _AUTH_SECRET
    os.environ["RATE_LIMIT_ENABLED"] = "false"
    for key in ("SMTP_HOST", "SMTP_USER", "SMTP_PASSWORD"):
        os.environ.pop(key, None)
    yield
    os.environ.pop("AUTH_SECRET", None)
    os.environ.pop("RATE_LIMIT_ENABLED", None)


def _make_user(session: Session, username: str) -> User:
    user = User(
        id=username,
        username=username,
        email=f"{username}@test.local",
        password_hash=hash_password("StrongPass1"),
        email_verified=True,
    )
    session.add(user)
    session.commit()
    session.refresh(user)
    return user


def _auth_header(user_id: str) -> dict[str, str]:
    token = create_access_token(user_id)
    return {"Authorization": f"Bearer {token}"}


def _setup_two_users() -> tuple[User, User]:
    """Create two users and return them."""
    with Session(get_engine()) as session:
        alice = _make_user(session, "alice")
        bob = _make_user(session, "bob")
    return alice, bob


# ---------------------------------------------------------------------------
# Create / get conversation
# ---------------------------------------------------------------------------


class TestCreateConversation:
    def test_create_conversation(self, client):
        alice, bob = _setup_two_users()

        resp = client.post(
            "/messaging/conversations",
            json={"participant_id": bob.id},
            headers=_auth_header(alice.id),
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["created"] is True
        assert data["conversation"]["participant"]["username"] == "bob"

    def test_create_conversation_returns_existing(self, client):
        alice, bob = _setup_two_users()
        headers = _auth_header(alice.id)

        resp1 = client.post(
            "/messaging/conversations",
            json={"participant_id": bob.id},
            headers=headers,
        )
        conv_id = resp1.json()["conversation"]["id"]

        resp2 = client.post(
            "/messaging/conversations",
            json={"participant_id": bob.id},
            headers=headers,
        )
        assert resp2.json()["created"] is False
        assert resp2.json()["conversation"]["id"] == conv_id

    def test_cannot_message_self(self, client):
        alice, _ = _setup_two_users()
        resp = client.post(
            "/messaging/conversations",
            json={"participant_id": alice.id},
            headers=_auth_header(alice.id),
        )
        assert resp.status_code == 400
        assert resp.json()["detail"] == "cannot_message_self"

    def test_create_conversation_user_not_found(self, client):
        alice, _ = _setup_two_users()
        resp = client.post(
            "/messaging/conversations",
            json={"participant_id": "nonexistent-user"},
            headers=_auth_header(alice.id),
        )
        assert resp.status_code == 404

    def test_create_conversation_no_auth(self, client):
        resp = client.post(
            "/messaging/conversations",
            json={"participant_id": "someone"},
        )
        assert resp.status_code == 401


# ---------------------------------------------------------------------------
# Send message
# ---------------------------------------------------------------------------


class TestSendMessage:
    def _create_conversation(self, client, alice, bob) -> str:
        resp = client.post(
            "/messaging/conversations",
            json={"participant_id": bob.id},
            headers=_auth_header(alice.id),
        )
        return resp.json()["conversation"]["id"]

    def test_send_message(self, client):
        alice, bob = _setup_two_users()
        conv_id = self._create_conversation(client, alice, bob)

        resp = client.post(
            f"/messaging/conversations/{conv_id}/messages",
            json={"content": "Hello Bob!"},
            headers=_auth_header(alice.id),
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["message"]["content"] == "Hello Bob!"
        assert data["message"]["sender_id"] == alice.id
        assert data["conversation_id"] == conv_id

    def test_send_message_non_participant(self, client):
        alice, bob = _setup_two_users()
        conv_id = self._create_conversation(client, alice, bob)

        # Create a third user
        with Session(get_engine()) as session:
            charlie = _make_user(session, "charlie")

        resp = client.post(
            f"/messaging/conversations/{conv_id}/messages",
            json={"content": "Intruder!"},
            headers=_auth_header(charlie.id),
        )
        assert resp.status_code == 403
        assert resp.json()["detail"] == "not_participant"

    def test_send_message_conversation_not_found(self, client):
        alice, _ = _setup_two_users()
        resp = client.post(
            "/messaging/conversations/nonexistent/messages",
            json={"content": "Hello?"},
            headers=_auth_header(alice.id),
        )
        assert resp.status_code == 404


# ---------------------------------------------------------------------------
# List messages
# ---------------------------------------------------------------------------


class TestListMessages:
    def test_list_messages(self, client):
        alice, bob = _setup_two_users()
        headers_a = _auth_header(alice.id)
        headers_b = _auth_header(bob.id)

        # Create conversation and send messages
        resp = client.post(
            "/messaging/conversations",
            json={"participant_id": bob.id},
            headers=headers_a,
        )
        conv_id = resp.json()["conversation"]["id"]

        client.post(
            f"/messaging/conversations/{conv_id}/messages",
            json={"content": "Hi Bob"},
            headers=headers_a,
        )
        client.post(
            f"/messaging/conversations/{conv_id}/messages",
            json={"content": "Hi Alice"},
            headers=headers_b,
        )

        # List messages as Alice
        resp = client.get(
            f"/messaging/conversations/{conv_id}/messages",
            headers=headers_a,
        )
        assert resp.status_code == 200
        data = resp.json()
        assert len(data["messages"]) == 2
        # Messages should be returned in chronological order (oldest first)
        assert data["messages"][0]["content"] == "Hi Bob"
        assert data["messages"][1]["content"] == "Hi Alice"

    def test_list_messages_non_participant_forbidden(self, client):
        alice, bob = _setup_two_users()
        with Session(get_engine()) as session:
            charlie = _make_user(session, "charlie")

        resp = client.post(
            "/messaging/conversations",
            json={"participant_id": bob.id},
            headers=_auth_header(alice.id),
        )
        conv_id = resp.json()["conversation"]["id"]

        resp2 = client.get(
            f"/messaging/conversations/{conv_id}/messages",
            headers=_auth_header(charlie.id),
        )
        assert resp2.status_code == 403

    def test_list_messages_marks_as_read(self, client):
        """When Alice fetches messages, Bob's messages should be marked as read."""
        alice, bob = _setup_two_users()
        headers_a = _auth_header(alice.id)
        headers_b = _auth_header(bob.id)

        resp = client.post(
            "/messaging/conversations",
            json={"participant_id": bob.id},
            headers=headers_a,
        )
        conv_id = resp.json()["conversation"]["id"]

        # Bob sends a message
        client.post(
            f"/messaging/conversations/{conv_id}/messages",
            json={"content": "Hey Alice"},
            headers=headers_b,
        )

        # Before Alice reads: 1 unread
        unread_resp = client.get("/messaging/unread-count", headers=headers_a)
        assert unread_resp.json()["unread_count"] == 1

        # Alice lists messages (auto-marks as read)
        client.get(f"/messaging/conversations/{conv_id}/messages", headers=headers_a)

        # After: 0 unread
        unread_resp2 = client.get("/messaging/unread-count", headers=headers_a)
        assert unread_resp2.json()["unread_count"] == 0


# ---------------------------------------------------------------------------
# Unread count
# ---------------------------------------------------------------------------


class TestUnreadCount:
    def test_unread_count_zero_initially(self, client):
        alice, _ = _setup_two_users()
        resp = client.get("/messaging/unread-count", headers=_auth_header(alice.id))
        assert resp.status_code == 200
        assert resp.json()["unread_count"] == 0

    def test_unread_count_increments(self, client):
        alice, bob = _setup_two_users()
        headers_a = _auth_header(alice.id)
        headers_b = _auth_header(bob.id)

        resp = client.post(
            "/messaging/conversations",
            json={"participant_id": bob.id},
            headers=headers_a,
        )
        conv_id = resp.json()["conversation"]["id"]

        # Bob sends two messages
        client.post(
            f"/messaging/conversations/{conv_id}/messages",
            json={"content": "msg1"},
            headers=headers_b,
        )
        client.post(
            f"/messaging/conversations/{conv_id}/messages",
            json={"content": "msg2"},
            headers=headers_b,
        )

        resp = client.get("/messaging/unread-count", headers=headers_a)
        assert resp.json()["unread_count"] == 2

    def test_unread_count_no_auth(self, client):
        resp = client.get("/messaging/unread-count")
        assert resp.status_code == 401


# ---------------------------------------------------------------------------
# List conversations
# ---------------------------------------------------------------------------


class TestListConversations:
    def test_list_conversations_empty(self, client):
        alice, _ = _setup_two_users()
        resp = client.get("/messaging/conversations", headers=_auth_header(alice.id))
        assert resp.status_code == 200
        assert resp.json()["conversations"] == []

    def test_list_conversations_shows_last_message(self, client):
        alice, bob = _setup_two_users()
        headers_a = _auth_header(alice.id)

        resp = client.post(
            "/messaging/conversations",
            json={"participant_id": bob.id},
            headers=headers_a,
        )
        conv_id = resp.json()["conversation"]["id"]

        client.post(
            f"/messaging/conversations/{conv_id}/messages",
            json={"content": "Last message"},
            headers=headers_a,
        )

        resp2 = client.get("/messaging/conversations", headers=headers_a)
        assert resp2.status_code == 200
        convs = resp2.json()["conversations"]
        assert len(convs) == 1
        assert convs[0]["last_message"]["content"] == "Last message"
        assert convs[0]["participant"]["username"] == "bob"


# ---------------------------------------------------------------------------
# Mark as read
# ---------------------------------------------------------------------------


class TestMarkAsRead:
    def test_mark_as_read(self, client):
        alice, bob = _setup_two_users()
        headers_a = _auth_header(alice.id)
        headers_b = _auth_header(bob.id)

        resp = client.post(
            "/messaging/conversations",
            json={"participant_id": bob.id},
            headers=headers_a,
        )
        conv_id = resp.json()["conversation"]["id"]

        client.post(
            f"/messaging/conversations/{conv_id}/messages",
            json={"content": "Unread msg"},
            headers=headers_b,
        )

        # Mark as read
        resp2 = client.post(
            f"/messaging/conversations/{conv_id}/read",
            headers=headers_a,
        )
        assert resp2.status_code == 204

        # Verify unread count is 0
        resp3 = client.get("/messaging/unread-count", headers=headers_a)
        assert resp3.json()["unread_count"] == 0


# ---------------------------------------------------------------------------
# Direct send
# ---------------------------------------------------------------------------


class TestDirectSend:
    def test_send_direct_creates_conversation(self, client):
        alice, bob = _setup_two_users()

        resp = client.post(
            "/messaging/send",
            json={"recipient_id": bob.id, "content": "Direct hello"},
            headers=_auth_header(alice.id),
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["message"]["content"] == "Direct hello"
        assert data["conversation_id"]  # should be set

    def test_send_direct_to_self_fails(self, client):
        alice, _ = _setup_two_users()
        resp = client.post(
            "/messaging/send",
            json={"recipient_id": alice.id, "content": "self-talk"},
            headers=_auth_header(alice.id),
        )
        assert resp.status_code == 400

    def test_send_direct_to_nonexistent_user(self, client):
        alice, _ = _setup_two_users()
        resp = client.post(
            "/messaging/send",
            json={"recipient_id": "ghost", "content": "hello"},
            headers=_auth_header(alice.id),
        )
        assert resp.status_code == 404


# ---------------------------------------------------------------------------
# Delete conversation
# ---------------------------------------------------------------------------


class TestDeleteConversation:
    def test_delete_conversation(self, client):
        alice, bob = _setup_two_users()
        headers_a = _auth_header(alice.id)

        resp = client.post(
            "/messaging/conversations",
            json={"participant_id": bob.id},
            headers=headers_a,
        )
        conv_id = resp.json()["conversation"]["id"]

        # Send a message so there's data to delete
        client.post(
            f"/messaging/conversations/{conv_id}/messages",
            json={"content": "to be deleted"},
            headers=headers_a,
        )

        resp2 = client.delete(
            f"/messaging/conversations/{conv_id}",
            headers=headers_a,
        )
        assert resp2.status_code == 204

        # Conversation and messages should be gone
        with Session(get_engine()) as session:
            conv = session.get(Conversation, conv_id)
            assert conv is None
            msgs = session.exec(
                select(Message).where(Message.conversation_id == conv_id)
            ).all()
            assert len(msgs) == 0

    def test_delete_conversation_non_participant(self, client):
        alice, bob = _setup_two_users()
        with Session(get_engine()) as session:
            charlie = _make_user(session, "charlie")

        resp = client.post(
            "/messaging/conversations",
            json={"participant_id": bob.id},
            headers=_auth_header(alice.id),
        )
        conv_id = resp.json()["conversation"]["id"]

        resp2 = client.delete(
            f"/messaging/conversations/{conv_id}",
            headers=_auth_header(charlie.id),
        )
        assert resp2.status_code == 403
