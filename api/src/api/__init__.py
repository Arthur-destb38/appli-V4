"""API package exports."""

__all__ = ["bootstrap"]


def bootstrap() -> None:
    """Simple helper used in tests / scripts."""
    print("Hello from api!")
