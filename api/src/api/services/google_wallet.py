"""Génération JWT Google Wallet (Generic pass) — Gorillax Salles."""
import json
import os
import time
from typing import Any

try:
    import jwt
except ImportError:
    jwt = None  # type: ignore


def _load_service_account() -> dict | None:
    """Charge le JSON du compte de service (GOOGLE_WALLET_SERVICE_ACCOUNT_JSON ou chemin fichier)."""
    raw = os.getenv("GOOGLE_WALLET_SERVICE_ACCOUNT_JSON")
    if raw:
        try:
            return json.loads(raw)
        except json.JSONDecodeError:
            pass
    path = os.getenv("GOOGLE_WALLET_SERVICE_ACCOUNT_PATH")
    if path and os.path.isfile(path):
        try:
            with open(path, encoding="utf-8") as f:
                return json.loads(f.read())
        except (json.JSONDecodeError, OSError):
            pass
    return None


def get_add_to_wallet_url(token: str) -> str | None:
    """
    Construit le JWT Google Wallet (Generic pass) avec barcode = token
    et retourne l'URL « Add to Google Wallet ».
    Retourne None si la config (compte de service, issuer_id) est absente.
    """
    if jwt is None:
        return None
    issuer_id = os.getenv("GOOGLE_WALLET_ISSUER_ID")
    sa = _load_service_account()
    if not issuer_id or not sa or "client_email" not in sa or "private_key" not in sa:
        return None

    class_suffix = "gorillax_member"
    object_suffix = f"token_{token[:8]}"

    new_class: dict[str, Any] = {"id": f"{issuer_id}.{class_suffix}"}

    new_object: dict[str, Any] = {
        "id": f"{issuer_id}.{object_suffix}",
        "classId": f"{issuer_id}.{class_suffix}",
        "state": "ACTIVE",
        "barcode": {"type": "QR_CODE", "value": token, "alternateText": "Gorillax"},
        "cardTitle": {"defaultValue": {"value": "Carte membre Gorillax"}},
    }

    payload = {
        "iss": sa["client_email"],
        "aud": "google",
        "typ": "savetowallet",
        "iat": int(time.time()),
        "origins": [],
        "payload": {
            "genericClasses": [new_class],
            "genericObjects": [new_object],
        },
    }

    try:
        encoded = jwt.encode(
            payload,
            sa["private_key"],
            algorithm="RS256",
        )
        if hasattr(encoded, "decode"):
            encoded = encoded.decode("utf-8")
        return f"https://pay.google.com/gp/v/save/{encoded}"
    except Exception:
        return None
