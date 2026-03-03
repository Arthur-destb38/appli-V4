"""Génération .pkpass Apple Wallet — Gorillax Salles."""
import hashlib
import json
import os
import subprocess
import tempfile
import uuid
from pathlib import Path


def _get_config() -> dict | None:
    """Retourne la config Apple pass ou None si non configurée."""
    team_id = os.getenv("APPLE_PASS_TEAM_ID")
    pass_type_id = os.getenv("APPLE_PASS_TYPE_ID")
    cert_path = os.getenv("APPLE_PASS_CERT_PEM")
    key_path = os.getenv("APPLE_PASS_KEY_PEM")
    wwdr_path = os.getenv("APPLE_PASS_WWDR_PEM")
    if not all((team_id, pass_type_id, cert_path, key_path, wwdr_path)):
        return None
    if not os.path.isfile(cert_path) or not os.path.isfile(key_path) or not os.path.isfile(wwdr_path):
        return None
    return {
        "team_id": team_id,
        "pass_type_id": pass_type_id,
        "cert_path": cert_path,
        "key_path": key_path,
        "wwdr_path": wwdr_path,
    }


def generate_pkpass(token: str, organization_name: str = "Gorillax") -> bytes | None:
    """
    Génère un fichier .pkpass (ZIP) contenant pass.json, manifest.json, signature.
    Retourne les octets du ZIP ou None si la config Apple est absente / erreur.
    """
    config = _get_config()
    if not config:
        return None

    pass_json = {
        "formatVersion": 1,
        "passTypeIdentifier": config["pass_type_id"],
        "serialNumber": str(uuid.uuid4()),
        "teamIdentifier": config["team_id"],
        "organizationName": organization_name,
        "description": "Carte membre Gorillax",
        "barcode": {
            "format": "PKBarcodeFormatQR",
            "message": token,
            "messageEncoding": "iso-8859-1",
        },
    }
    pass_bytes = json.dumps(pass_json, separators=(",", ":")).encode("utf-8")

    manifest = {
        "pass.json": hashlib.sha1(pass_bytes).hexdigest(),
    }

    with tempfile.TemporaryDirectory() as tmpdir:
        tmp = Path(tmpdir)
        (tmp / "pass.json").write_bytes(pass_bytes)
        manifest_path = tmp / "manifest.json"
        manifest_path.write_text(json.dumps(manifest, separators=(",", ":")))

        # Signer manifest.json avec OpenSSL (PKCS7)
        signature_path = tmp / "signature"
        try:
            subprocess.run(
                [
                    "openssl", "smime", "-sign",
                    "-signer", config["cert_path"],
                    "-inkey", config["key_path"],
                    "-certfile", config["wwdr_path"],
                    "-in", str(manifest_path),
                    "-out", str(signature_path),
                    "-outform", "DER",
                    "-binary",
                ],
                check=True,
                capture_output=True,
                timeout=10,
            )
        except (subprocess.CalledProcessError, FileNotFoundError, subprocess.TimeoutExpired):
            return None

        if not signature_path.is_file():
            return None

        # Créer le ZIP (.pkpass)
        import zipfile
        from io import BytesIO
        buf = BytesIO()
        with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
            zf.writestr("pass.json", pass_bytes)
            zf.writestr("manifest.json", manifest_path.read_text())
            zf.writestr("signature", signature_path.read_bytes())
        return buf.getvalue()
