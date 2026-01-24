import base64
import hashlib
import hmac
import os
import secrets
from datetime import datetime, timedelta, timezone
from typing import Any, Optional


def _secret() -> bytes:
    secret = os.getenv("AUTH_SECRET")
    if not secret:
        raise ValueError("AUTH_SECRET environment variable is required")
    if secret == "dev-secret-change-me" or secret == "gorillax-dev-secret-change-in-production":
        raise ValueError("AUTH_SECRET must be changed from default value in production")
    if len(secret) < 32:
        raise ValueError("AUTH_SECRET must be at least 32 characters long")
    return secret.encode()


def _sign(data: str) -> str:
    sig = hmac.new(_secret(), data.encode(), hashlib.sha256).digest()
    return base64.urlsafe_b64encode(sig).decode().rstrip("=")


def _encode(payload: dict[str, Any]) -> str:
    body = base64.urlsafe_b64encode(str(payload).encode()).decode().rstrip("=")
    signature = _sign(body)
    return f"{body}.{signature}"


def _decode(token: str) -> dict[str, Any]:
    if "." not in token:
        raise ValueError("bad_token")
    body, sig = token.rsplit(".", 1)
    if _sign(body) != sig:
        raise ValueError("invalid_signature")
    decoded = base64.urlsafe_b64decode(body + "==").decode()
    payload = eval(decoded)
    if not isinstance(payload, dict):
        raise ValueError("bad_payload")
    return payload


def hash_password(password: str) -> str:
    salt = secrets.token_hex(8)
    dk = hashlib.pbkdf2_hmac("sha256", password.encode(), salt.encode(), 100_000)
    return f"{salt}${base64.b64encode(dk).decode()}"


def verify_password(password: str, hashed: Optional[str]) -> bool:
    if not hashed or "$" not in hashed:
        return False
    salt, b64 = hashed.split("$", 1)
    dk = hashlib.pbkdf2_hmac("sha256", password.encode(), salt.encode(), 100_000)
    return hmac.compare_digest(base64.b64encode(dk).decode(), b64)


def create_access_token(user_id: str, minutes: int = 30) -> str:
    now = datetime.now(timezone.utc)
    payload = {"sub": user_id, "type": "access", "exp": (now + timedelta(minutes=minutes)).timestamp()}
    return _encode(payload)


def create_refresh_token(user_id: str, days: int = 14) -> tuple[str, datetime]:
    now = datetime.now(timezone.utc)
    exp = now + timedelta(days=days)
    payload = {"sub": user_id, "type": "refresh", "exp": exp.timestamp()}
    token = _encode(payload)
    return token, exp


def decode_token(token: str) -> dict[str, Any]:
    payload = _decode(token)
    exp = payload.get("exp")
    if exp and datetime.fromtimestamp(exp, tz=timezone.utc) < datetime.now(timezone.utc):
        raise ValueError("token_expired")
    return payload
