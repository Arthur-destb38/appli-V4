"""Génération .pkpass Apple Wallet — Gorillax Salles.

Produit un pass premium avec :
- Logo Gorillax (gorille rouge)
- Strip banner gradient noir → rouge
- Champs : membre, ID, expiration
- Back fields (verso) : infos, lien
- QR code contenant le token pass
"""
import hashlib
import json
import os
import subprocess
import tempfile
import uuid
import zipfile
from datetime import datetime
from io import BytesIO
from pathlib import Path

from PIL import Image, ImageDraw

# ── Assets ────────────────────────────────────────────────────
ASSETS_DIR = Path(__file__).parent / "pass_assets"
LOGO_SOURCE = ASSETS_DIR / "gorillax_logo.png"

# Gorillax brand colors
BG_COLOR = (15, 18, 24)
ACCENT_RED = (200, 40, 40)


def _resize_logo(src: Path, size: tuple[int, int]) -> bytes:
    """Resize logo PNG, keeping aspect ratio, centered on transparent bg."""
    img = Image.open(src).convert("RGBA")
    img.thumbnail(size, Image.Resampling.LANCZOS)
    canvas = Image.new("RGBA", size, (0, 0, 0, 0))
    offset = ((size[0] - img.width) // 2, (size[1] - img.height) // 2)
    canvas.paste(img, offset, img)
    buf = BytesIO()
    canvas.save(buf, "PNG")
    return buf.getvalue()


def _make_icon(src: Path, size: int) -> bytes:
    """Create a square icon from the logo, cropped/resized to fill."""
    img = Image.open(src).convert("RGBA")
    side = min(img.width, img.height)
    left = (img.width - side) // 2
    top = (img.height - side) // 2
    img = img.crop((left, top, left + side, top + side))
    img = img.resize((size, size), Image.Resampling.LANCZOS)
    bg = Image.new("RGBA", (size, size), (*BG_COLOR, 255))
    bg.paste(img, (0, 0), img)
    buf = BytesIO()
    bg.convert("RGB").save(buf, "PNG")
    return buf.getvalue()


def _make_strip(width: int, height: int) -> bytes:
    """Generate a gradient strip banner: dark edges, red center glow."""
    img = Image.new("RGB", (width, height), BG_COLOR)
    draw = ImageDraw.Draw(img)

    for x in range(width):
        t = abs(x - width / 2) / (width / 2)
        t = max(0.0, 1.0 - t * t)
        r = int(BG_COLOR[0] + (ACCENT_RED[0] - BG_COLOR[0]) * t * 0.6)
        g = int(BG_COLOR[1] + (ACCENT_RED[1] - BG_COLOR[1]) * t * 0.3)
        b = int(BG_COLOR[2] + (ACCENT_RED[2] - BG_COLOR[2]) * t * 0.2)
        draw.line([(x, 0), (x, height)], fill=(r, g, b))

    for y in range(height // 2, height):
        alpha = (y - height // 2) / (height // 2)
        overlay = Image.new("RGB", (width, 1), BG_COLOR)
        img.paste(
            Image.blend(img.crop((0, y, width, y + 1)), overlay, alpha),
            (0, y),
        )

    buf = BytesIO()
    img.save(buf, "PNG")
    return buf.getvalue()


def _fallback_solid_png(w: int, h: int, r: int, g: int, b: int) -> bytes:
    """Minimal solid-color PNG without Pillow (fallback)."""
    import struct
    import zlib

    def _chunk(tag: bytes, data: bytes) -> bytes:
        return struct.pack(">I", len(data)) + tag + data + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)

    raw = b""
    for _ in range(h):
        raw += b"\x00" + bytes([r, g, b]) * w
    sig = b"\x89PNG\r\n\x1a\n"
    ihdr = struct.pack(">IIBBBBB", w, h, 8, 2, 0, 0, 0)
    return sig + _chunk(b"IHDR", ihdr) + _chunk(b"IDAT", zlib.compress(raw)) + _chunk(b"IEND", b"")


def _pem_to_path(value: str | None, prefix: str, tmpdir: Path) -> str | None:
    """Si value est du contenu PEM inline, l'écrit dans un fichier tmp."""
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
    """Retourne la config Apple pass ou None si non configurée."""
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
    expires_at: datetime | None = None,
) -> bytes | None:
    """
    Génère un fichier .pkpass premium avec branding Gorillax.
    Retourne les octets du ZIP ou None si la config Apple est absente.
    """
    with tempfile.TemporaryDirectory() as tmpdir:
        tmp = Path(tmpdir)
        config = _get_config(tmp)
        if not config:
            return None

        display_id = f"GX-{(member_id or token)[:8].upper()}"
        exp_str = expires_at.strftime("%d/%m/%Y") if expires_at else "—"

        # ── pass.json ─────────────────────────────────────────
        pass_json = {
            "formatVersion": 1,
            "passTypeIdentifier": config["pass_type_id"],
            "serialNumber": str(uuid.uuid4()),
            "teamIdentifier": config["team_id"],
            "organizationName": organization_name,
            "description": "Carte membre Gorillax Gym",
            "foregroundColor": "rgb(255, 255, 255)",
            "backgroundColor": "rgb(15, 18, 24)",
            "labelColor": "rgb(180, 180, 180)",
            "logoText": "GORILLAX",
            "generic": {
                "primaryFields": [
                    {
                        "key": "member",
                        "label": "MEMBRE",
                        "value": member_name,
                    }
                ],
                "secondaryFields": [
                    {
                        "key": "memberId",
                        "label": "ID MEMBRE",
                        "value": display_id,
                    },
                    {
                        "key": "expires",
                        "label": "EXPIRE",
                        "value": exp_str,
                        "textAlignment": "PKTextAlignmentRight",
                    },
                ],
                "auxiliaryFields": [
                    {
                        "key": "status",
                        "label": "STATUT",
                        "value": "Actif ✓",
                    },
                    {
                        "key": "type",
                        "label": "TYPE",
                        "value": "Premium",
                        "textAlignment": "PKTextAlignmentRight",
                    },
                ],
                "backFields": [
                    {
                        "key": "info",
                        "label": "À PROPOS",
                        "value": "Carte membre Gorillax Gym.\n\nPrésentez ce pass à l'entrée ou sur les machines en salle partenaire Gorillax pour être identifié automatiquement.",
                    },
                    {
                        "key": "app",
                        "label": "APPLICATION",
                        "value": "Téléchargez l'app Gorillax Gym pour suivre vos séances, vos objectifs et votre progression.",
                    },
                    {
                        "key": "token_info",
                        "label": "TOKEN",
                        "value": f"Ce pass contient un identifiant unique. Ne le partagez pas. En cas de problème, renouvelez-le depuis l'app.\n\nID: {display_id}",
                    },
                    {
                        "key": "support",
                        "label": "SUPPORT",
                        "value": "contact@gorillax.com",
                    },
                ],
            },
            "barcodes": [
                {
                    "format": "PKBarcodeFormatQR",
                    "message": token,
                    "messageEncoding": "iso-8859-1",
                    "altText": display_id,
                }
            ],
            "barcode": {
                "format": "PKBarcodeFormatQR",
                "message": token,
                "messageEncoding": "iso-8859-1",
                "altText": display_id,
            },
        }
        pass_bytes = json.dumps(pass_json, separators=(",", ":")).encode("utf-8")

        # ── Images ────────────────────────────────────────────
        has_logo = LOGO_SOURCE.is_file()

        if has_logo:
            icon_png = _make_icon(LOGO_SOURCE, 29)
            icon_2x_png = _make_icon(LOGO_SOURCE, 58)
            icon_3x_png = _make_icon(LOGO_SOURCE, 87)
            logo_png = _resize_logo(LOGO_SOURCE, (50, 50))
            logo_2x_png = _resize_logo(LOGO_SOURCE, (100, 100))
        else:
            icon_png = _fallback_solid_png(29, 29, *BG_COLOR)
            icon_2x_png = _fallback_solid_png(58, 58, *BG_COLOR)
            icon_3x_png = _fallback_solid_png(87, 87, *BG_COLOR)
            logo_png = _fallback_solid_png(50, 50, *BG_COLOR)
            logo_2x_png = _fallback_solid_png(100, 100, *BG_COLOR)

        strip_png = _make_strip(375, 123)
        strip_2x_png = _make_strip(750, 246)

        # ── Build .pkpass ZIP ─────────────────────────────────
        files = {
            "pass.json": pass_bytes,
            "icon.png": icon_png,
            "icon@2x.png": icon_2x_png,
            "icon@3x.png": icon_3x_png,
            "logo.png": logo_png,
            "logo@2x.png": logo_2x_png,
            "strip.png": strip_png,
            "strip@2x.png": strip_2x_png,
        }

        manifest = {name: hashlib.sha1(data).hexdigest() for name, data in files.items()}

        for name, data in files.items():
            (tmp / name).write_bytes(data)
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

        buf = BytesIO()
        with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
            for name, data in files.items():
                zf.writestr(name, data)
            zf.writestr("manifest.json", manifest_path.read_text())
            zf.writestr("signature", signature_path.read_bytes())
        return buf.getvalue()
