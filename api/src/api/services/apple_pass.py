"""Génération .pkpass Apple Wallet — Gorillax Salles."""
import hashlib
import json
import os
import subprocess
import tempfile
import uuid
from pathlib import Path


def _pem_to_path(value: str | None, prefix: str, tmpdir: Path) -> str | None:
    """Si value est du contenu PEM (-----BEGIN), l'écrit dans un fichier tmp et retourne le chemin. Sinon traite value comme chemin fichier."""
    if not value or not value.strip():
        return None
    if "-----BEGIN" in value:
        path = tmpdir / f"{prefix}.pem"
        path.write_text(value.strip(), encoding="utf-8")
        return str(path)
    if os.path.isfile(value):
        return value
    return None


def _get_config(tmpdir: Path | None = None) -> dict | None:
    """Retourne la config Apple pass ou None si non configurée. Si tmpdir fourni, accepte contenu PEM inline (pour Render)."""
    team_id = os.getenv("APPLE_PASS_TEAM_ID")
    pass_type_id = os.getenv("APPLE_PASS_TYPE_ID")
    cert_val = os.getenv("APPLE_PASS_CERT_PEM")
    key_val = os.getenv("APPLE_PASS_KEY_PEM")
    wwdr_val = os.getenv("APPLE_PASS_WWDR_PEM")
    if not all((team_id, pass_type_id, cert_val, key_val, wwdr_val)):
        return None
    if tmpdir is not None:
        cert_path = _pem_to_path(cert_val, "cert", tmpdir)
        key_path = _pem_to_path(key_val, "key", tmpdir)
        wwdr_path = _pem_to_path(wwdr_val, "wwdr", tmpdir)
    else:
        cert_path = cert_val if os.path.isfile(cert_val) else None
        key_path = key_val if os.path.isfile(key_val) else None
        wwdr_path = wwdr_val if os.path.isfile(wwdr_val) else None
    if not all((cert_path, key_path, wwdr_path)):
        return None
    return {
        "team_id": team_id,
        "pass_type_id": pass_type_id,
        "cert_path": cert_path,
        "key_path": key_path,
        "wwdr_path": wwdr_path,
    }


def generate_pkpass(
    token: str,
    organization_name: str = "Gorillax",
    member_name: str = "Membre",
    member_id: str | None = None,
) -> bytes | None:
    """
    Génère un fichier .pkpass (ZIP) contenant pass.json, manifest.json, signature.
    Retourne les octets du ZIP ou None si la config Apple est absente / erreur.
    Supporte APPLE_PASS_* en chemins fichiers ou contenu PEM inline (pour Render).
    """
    with tempfile.TemporaryDirectory() as tmpdir:
        tmp = Path(tmpdir)
        config = _get_config(tmp)
        if not config:
            return None

        display_id = (member_id or token)[:12].upper()

        pass_json = {
            "formatVersion": 1,
            "passTypeIdentifier": config["pass_type_id"],
            "serialNumber": str(uuid.uuid4()),
            "teamIdentifier": config["team_id"],
            "organizationName": organization_name,
            "description": "Carte membre Gorillax",
            "foregroundColor": "rgb(255, 255, 255)",
            "backgroundColor": "rgb(20, 20, 20)",
            "labelColor": "rgb(200, 200, 200)",
            "logoText": organization_name,
            "generic": {
                "primaryFields": [
                    {"key": "member", "label": "MEMBRE", "value": member_name}
                ],
                "secondaryFields": [
                    {"key": "memberId", "label": "ID", "value": f"GX-{display_id}"}
                ],
            },
            "barcodes": [
                {
                    "format": "PKBarcodeFormatQR",
                    "message": token,
                    "messageEncoding": "iso-8859-1",
                }
            ],
            "barcode": {
                "format": "PKBarcodeFormatQR",
                "message": token,
                "messageEncoding": "iso-8859-1",
            },
        }
        pass_bytes = json.dumps(pass_json, separators=(",", ":")).encode("utf-8")
        manifest = {"pass.json": hashlib.sha1(pass_bytes).hexdigest()}

        (tmp / "pass.json").write_bytes(pass_bytes)
        manifest_path = tmp / "manifest.json"
        manifest_path.write_text(json.dumps(manifest, separators=(",", ":")))

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

        import zipfile
        from io import BytesIO
        buf = BytesIO()
        with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
            zf.writestr("pass.json", pass_bytes)
            zf.writestr("manifest.json", manifest_path.read_text())
            zf.writestr("signature", signature_path.read_bytes())
        return buf.getvalue()
