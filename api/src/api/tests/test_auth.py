"""Tests for auth routes: register, login, refresh, logout, rate limiting."""
import os
import uuid

import pytest
from sqlmodel import Session, select

from api.db import get_engine
from api.models import User, RefreshToken, LoginAttempt
from api.utils.auth import hash_password, create_access_token, create_refresh_token


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

_AUTH_SECRET = "test-secret-that-is-at-least-32-characters-long-ok"


@pytest.fixture(autouse=True)
def _auth_env():
    """Set AUTH_SECRET and disable SMTP so email sending is a no-op."""
    os.environ["AUTH_SECRET"] = _AUTH_SECRET
    # Disable rate limiting by default; specific tests re-enable it.
    os.environ["RATE_LIMIT_ENABLED"] = "false"
    # Remove SMTP vars so send_verification_email returns False silently.
    for key in ("SMTP_HOST", "SMTP_USER", "SMTP_PASSWORD"):
        os.environ.pop(key, None)
    yield
    os.environ.pop("AUTH_SECRET", None)
    os.environ.pop("RATE_LIMIT_ENABLED", None)


def _valid_password() -> str:
    return "StrongPass1"


def _register_payload(username: str = "testuser", email: str = "test@example.com"):
    return {
        "username": username,
        "email": email,
        "password": _valid_password(),
    }


def _register(client, username="testuser", email="test@example.com"):
    """Register a user and return the response JSON (TokenPair)."""
    resp = client.post("/auth/register", json=_register_payload(username, email))
    assert resp.status_code == 201, resp.text
    return resp.json()


def _create_user_directly(session: Session, username="directuser", email="direct@example.com"):
    """Insert a user directly in the DB. Returns the User."""
    user = User(
        id=username,
        username=username,
        email=email,
        password_hash=hash_password(_valid_password()),
        email_verified=True,
    )
    session.add(user)
    session.commit()
    session.refresh(user)
    return user


# ---------------------------------------------------------------------------
# Register
# ---------------------------------------------------------------------------


class TestRegister:
    def test_register_success(self, client):
        resp = client.post("/auth/register", json=_register_payload())
        assert resp.status_code == 201
        data = resp.json()
        assert "access_token" in data
        assert "refresh_token" in data
        assert data["token_type"] == "bearer"

    def test_register_creates_user_in_db(self, client):
        _register(client)
        with Session(get_engine()) as session:
            user = session.exec(select(User).where(User.username == "testuser")).first()
            assert user is not None
            assert user.email == "test@example.com"

    def test_register_duplicate_username(self, client):
        _register(client, username="dupuser", email="a@example.com")
        resp = client.post(
            "/auth/register",
            json=_register_payload(username="dupuser", email="b@example.com"),
        )
        assert resp.status_code == 409
        assert resp.json()["detail"] == "username_taken"

    def test_register_duplicate_email(self, client):
        _register(client, username="user1", email="same@example.com")
        resp = client.post(
            "/auth/register",
            json=_register_payload(username="user2", email="same@example.com"),
        )
        assert resp.status_code == 409
        assert resp.json()["detail"] == "email_taken"

    def test_register_short_username(self, client):
        resp = client.post(
            "/auth/register",
            json=_register_payload(username="ab"),
        )
        assert resp.status_code in (400, 422)

    def test_register_reserved_username(self, client):
        resp = client.post(
            "/auth/register",
            json=_register_payload(username="admin", email="admin@example.com"),
        )
        assert resp.status_code == 400
        assert "reserved" in resp.json()["detail"].lower()

    def test_register_invalid_email(self, client):
        resp = client.post(
            "/auth/register",
            json={"username": "validuser", "email": "not-an-email", "password": _valid_password()},
        )
        assert resp.status_code == 400

    def test_register_weak_password(self, client):
        resp = client.post(
            "/auth/register",
            json={"username": "validuser", "email": "ok@example.com", "password": "password1A"},
        )
        # "password" matches weak pattern
        assert resp.status_code == 400

    def test_register_password_no_uppercase(self, client):
        resp = client.post(
            "/auth/register",
            json={"username": "validuser", "email": "ok@example.com", "password": "alllower1"},
        )
        assert resp.status_code == 400

    def test_register_password_too_short(self, client):
        resp = client.post(
            "/auth/register",
            json={"username": "validuser", "email": "ok@example.com", "password": "Sh1"},
        )
        assert resp.status_code in (400, 422)

    def test_register_special_chars_username(self, client):
        resp = client.post(
            "/auth/register",
            json=_register_payload(username="bad user!"),
        )
        assert resp.status_code in (400, 422)


# ---------------------------------------------------------------------------
# Login
# ---------------------------------------------------------------------------


class TestLogin:
    def test_login_success(self, client):
        _register(client)
        resp = client.post(
            "/auth/login",
            json={"username": "testuser", "password": _valid_password()},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert "access_token" in data
        assert "refresh_token" in data

    def test_login_invalid_credentials(self, client):
        _register(client)
        resp = client.post(
            "/auth/login",
            json={"username": "testuser", "password": "WrongPassword1"},
        )
        assert resp.status_code == 401
        assert resp.json()["detail"] == "invalid_credentials"

    def test_login_nonexistent_user(self, client):
        resp = client.post(
            "/auth/login",
            json={"username": "ghost", "password": _valid_password()},
        )
        assert resp.status_code == 401

    def test_login_rate_limited(self, client):
        """After MAX_LOGIN_ATTEMPTS failed attempts the endpoint should return 429."""
        os.environ["RATE_LIMIT_ENABLED"] = "true"
        os.environ["MAX_LOGIN_ATTEMPTS"] = "3"
        os.environ["LOGIN_COOLDOWN_MINUTES"] = "15"

        _register(client)
        for _ in range(3):
            client.post(
                "/auth/login",
                json={"username": "testuser", "password": "WrongPassword1"},
            )

        resp = client.post(
            "/auth/login",
            json={"username": "testuser", "password": _valid_password()},
        )
        assert resp.status_code == 429
        assert resp.json()["detail"] == "too_many_attempts"

        # Cleanup env
        os.environ.pop("MAX_LOGIN_ATTEMPTS", None)
        os.environ.pop("LOGIN_COOLDOWN_MINUTES", None)


# ---------------------------------------------------------------------------
# Refresh Token
# ---------------------------------------------------------------------------


class TestRefreshToken:
    def test_refresh_success(self, client):
        tokens = _register(client)
        resp = client.post(
            "/auth/refresh",
            headers={"Authorization": f"Bearer {tokens['refresh_token']}"},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert "access_token" in data
        assert "refresh_token" in data
        # The new refresh token should differ from the old one (rotation).
        assert data["refresh_token"] != tokens["refresh_token"]

    def test_refresh_missing_token(self, client):
        resp = client.post("/auth/refresh")
        assert resp.status_code == 401

    def test_refresh_invalid_token(self, client):
        resp = client.post(
            "/auth/refresh",
            headers={"Authorization": "Bearer totally.invalid"},
        )
        assert resp.status_code == 401

    def test_refresh_with_access_token_fails(self, client):
        """An access token should not be accepted as a refresh token."""
        tokens = _register(client)
        resp = client.post(
            "/auth/refresh",
            headers={"Authorization": f"Bearer {tokens['access_token']}"},
        )
        assert resp.status_code == 401

    def test_refresh_old_token_invalidated(self, client):
        """After a refresh, the old refresh token should no longer work (rotation)."""
        tokens = _register(client)
        old_refresh = tokens["refresh_token"]

        # First refresh succeeds
        resp1 = client.post(
            "/auth/refresh",
            headers={"Authorization": f"Bearer {old_refresh}"},
        )
        assert resp1.status_code == 200

        # Re-use old token => should fail because it's been deleted
        resp2 = client.post(
            "/auth/refresh",
            headers={"Authorization": f"Bearer {old_refresh}"},
        )
        assert resp2.status_code == 401


# ---------------------------------------------------------------------------
# /auth/me
# ---------------------------------------------------------------------------


class TestMe:
    def test_me_success(self, client):
        tokens = _register(client)
        resp = client.get(
            "/auth/me",
            headers={"Authorization": f"Bearer {tokens['access_token']}"},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["username"] == "testuser"
        assert data["email"] == "test@example.com"

    def test_me_no_token(self, client):
        resp = client.get("/auth/me")
        assert resp.status_code == 401

    def test_me_invalid_token(self, client):
        resp = client.get(
            "/auth/me",
            headers={"Authorization": "Bearer garbage.token"},
        )
        assert resp.status_code == 401


# ---------------------------------------------------------------------------
# Logout
# ---------------------------------------------------------------------------


class TestLogout:
    def test_logout_success(self, client):
        tokens = _register(client)
        resp = client.post(
            "/auth/logout",
            headers={"Authorization": f"Bearer {tokens['refresh_token']}"},
        )
        assert resp.status_code == 204

        # After logout the refresh token should no longer work
        resp2 = client.post(
            "/auth/refresh",
            headers={"Authorization": f"Bearer {tokens['refresh_token']}"},
        )
        assert resp2.status_code == 401

    def test_logout_missing_token(self, client):
        resp = client.post("/auth/logout")
        assert resp.status_code == 401


# ---------------------------------------------------------------------------
# Verify email
# ---------------------------------------------------------------------------


class TestVerifyEmail:
    def test_verify_email_success(self, client):
        _register(client)
        # Grab the verification token from DB
        with Session(get_engine()) as session:
            user = session.exec(select(User).where(User.username == "testuser")).first()
            assert user is not None
            token = user.email_verification_token

        resp = client.post("/auth/verify-email", json={"token": token})
        assert resp.status_code == 200

        with Session(get_engine()) as session:
            user = session.exec(select(User).where(User.username == "testuser")).first()
            assert user.email_verified is True
            assert user.email_verification_token is None

    def test_verify_email_invalid_token(self, client):
        resp = client.post("/auth/verify-email", json={"token": "bad-token"})
        assert resp.status_code == 400


# ---------------------------------------------------------------------------
# Reset password
# ---------------------------------------------------------------------------


class TestResetPassword:
    def test_reset_password_always_returns_ok(self, client):
        """Should not leak whether email exists."""
        resp = client.post("/auth/reset-password", json={"email": "nobody@example.com"})
        assert resp.status_code == 200

    def test_reset_password_confirm_invalid_token(self, client):
        resp = client.post(
            "/auth/reset-password-confirm",
            json={"token": "nonexistent", "new_password": "NewStrong1"},
        )
        assert resp.status_code == 400
