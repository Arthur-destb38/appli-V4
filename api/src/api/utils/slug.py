import re
import unicodedata


def normalize(value: str) -> str:
    normalized = unicodedata.normalize("NFKD", value)
    return "".join(ch for ch in normalized if not unicodedata.combining(ch))


def slugify(value: str) -> str:
    value = normalize(value).lower()
    value = re.sub(r"[^a-z0-9]+", "-", value)
    value = value.strip("-")
    return value or "item"


def make_exercise_slug(name: str, muscle_group: str) -> str:
    return slugify(f"{name}-{muscle_group}")
