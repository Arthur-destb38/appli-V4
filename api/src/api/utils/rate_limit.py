"""Rate limiting utilities for authentication."""
import os
from datetime import datetime, timedelta
from typing import Optional

from sqlmodel import Session, select, func
from ..models import LoginAttempt


def is_rate_limited(session: Session, username: str, ip_address: str) -> bool:
    """Check if user/IP is rate limited for login attempts."""
    if not _is_rate_limiting_enabled():
        return False
    
    max_attempts = int(os.getenv("MAX_LOGIN_ATTEMPTS", "5"))
    cooldown_minutes = int(os.getenv("LOGIN_COOLDOWN_MINUTES", "15"))
    
    # Check attempts in the last cooldown period
    cutoff_time = datetime.now(timezone.utc) - timedelta(minutes=cooldown_minutes)
    
    # Count failed attempts for this username or IP
    username_attempts = session.exec(
        select(func.count())
        .select_from(LoginAttempt)
        .where(
            LoginAttempt.username == username,
            LoginAttempt.success == False,
            LoginAttempt.created_at > cutoff_time
        )
    ).one()
    
    ip_attempts = session.exec(
        select(func.count())
        .select_from(LoginAttempt)
        .where(
            LoginAttempt.ip_address == ip_address,
            LoginAttempt.success == False,
            LoginAttempt.created_at > cutoff_time
        )
    ).one()
    
    return username_attempts >= max_attempts or ip_attempts >= max_attempts


def record_login_attempt(session: Session, username: str, ip_address: str, success: bool) -> None:
    """Record a login attempt."""
    attempt = LoginAttempt(
        username=username,
        ip_address=ip_address,
        success=success
    )
    session.add(attempt)
    session.commit()


def get_remaining_cooldown(session: Session, username: str, ip_address: str) -> Optional[int]:
    """Get remaining cooldown time in minutes, if any."""
    if not _is_rate_limiting_enabled():
        return None
    
    cooldown_minutes = int(os.getenv("LOGIN_COOLDOWN_MINUTES", "15"))
    cutoff_time = datetime.now(timezone.utc) - timedelta(minutes=cooldown_minutes)
    
    # Get the most recent failed attempt
    recent_attempt = session.exec(
        select(LoginAttempt)
        .where(
            (LoginAttempt.username == username) | (LoginAttempt.ip_address == ip_address),
            LoginAttempt.success == False,
            LoginAttempt.created_at > cutoff_time
        )
        .order_by(LoginAttempt.created_at.desc())
        .limit(1)
    ).first()
    
    if not recent_attempt:
        return None
    
    elapsed = datetime.now(timezone.utc) - recent_attempt.created_at
    remaining = cooldown_minutes - elapsed.total_seconds() / 60
    
    return max(0, int(remaining))


def cleanup_old_attempts(session: Session) -> None:
    """Clean up old login attempts (older than 24 hours)."""
    cutoff_time = datetime.now(timezone.utc) - timedelta(hours=24)
    
    old_attempts = session.exec(
        select(LoginAttempt).where(LoginAttempt.created_at < cutoff_time)
    ).all()
    
    for attempt in old_attempts:
        session.delete(attempt)
    
    session.commit()


def _is_rate_limiting_enabled() -> bool:
    """Check if rate limiting is enabled."""
    return os.getenv("RATE_LIMIT_ENABLED", "true").lower() == "true"