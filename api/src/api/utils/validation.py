"""Validation utilities for user input."""
import re
from typing import List, Optional


def validate_password(password: str) -> List[str]:
    """Validate password strength and return list of errors."""
    errors = []
    
    if len(password) < 8:
        errors.append("Password must be at least 8 characters long")
    
    if len(password) > 128:
        errors.append("Password must be less than 128 characters")
    
    if not re.search(r"[a-z]", password):
        errors.append("Password must contain at least one lowercase letter")
    
    if not re.search(r"[A-Z]", password):
        errors.append("Password must contain at least one uppercase letter")
    
    if not re.search(r"\d", password):
        errors.append("Password must contain at least one number")
    
    # Check for common weak passwords
    weak_patterns = [
        r"^password\d*$",
        r"^123456\d*$",
        r"^qwerty\d*$",
        r"^admin\d*$",
        r"^gorillax\d*$",
    ]
    
    for pattern in weak_patterns:
        if re.match(pattern, password.lower()):
            errors.append("Password is too common")
            break
    
    return errors


def validate_username(username: str) -> List[str]:
    """Validate username and return list of errors."""
    errors = []
    
    if len(username) < 3:
        errors.append("Username must be at least 3 characters long")
    
    if len(username) > 30:
        errors.append("Username must be less than 30 characters")
    
    if not re.match(r"^[a-zA-Z0-9_-]+$", username):
        errors.append("Username can only contain letters, numbers, underscores, and hyphens")
    
    if username.lower() in ["admin", "root", "user", "guest", "gorillax", "api", "www"]:
        errors.append("Username is reserved")
    
    return errors


def validate_email(email: str) -> List[str]:
    """Validate email format and return list of errors."""
    errors = []
    
    if len(email) > 254:
        errors.append("Email is too long")
    
    # Basic email regex (RFC 5322 compliant would be much more complex)
    email_pattern = r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$"
    if not re.match(email_pattern, email):
        errors.append("Invalid email format")
    
    return errors


def is_strong_password(password: str) -> bool:
    """Check if password meets minimum security requirements."""
    return len(validate_password(password)) == 0


def sanitize_input(text: str, max_length: Optional[int] = None) -> str:
    """Sanitize user input by trimming and limiting length."""
    sanitized = text.strip()
    
    if max_length and len(sanitized) > max_length:
        sanitized = sanitized[:max_length]
    
    return sanitized