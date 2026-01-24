from datetime import datetime, timezone, timedelta
from typing import Annotated, Optional

from fastapi import APIRouter, Depends, HTTPException, status, Header, Request
from fastapi.responses import Response
from sqlmodel import Session, select

from ..db import get_session
from ..models import User, RefreshToken
from ..schemas import LoginRequest, RegisterRequest, RegisterRequestV2, TokenPair, MeResponse, ResetPasswordRequest, ResetPasswordConfirm, VerifyEmailRequest
from ..utils.auth import (
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_password,
)
from ..utils.rate_limit import (
    is_rate_limited,
    record_login_attempt,
    get_remaining_cooldown,
    cleanup_old_attempts,
)
from ..services.email import send_verification_email, send_password_reset_email, generate_verification_token

router = APIRouter(prefix="/auth", tags=["auth"])


def _get_client_ip(request: Request) -> str:
    """Get client IP address from request."""
    # Check for forwarded headers (for reverse proxies)
    forwarded_for = request.headers.get("X-Forwarded-For")
    if forwarded_for:
        return forwarded_for.split(",")[0].strip()
    
    real_ip = request.headers.get("X-Real-IP")
    if real_ip:
        return real_ip
    
    # Fallback to direct connection
    if request.client:
        return request.client.host
    
    return "unknown"


def _get_refresh_from_header(authorization: Optional[str]) -> str:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="missing_token")
    return authorization.split(" ", 1)[1]


def _get_current_user(
    authorization: Annotated[Optional[str], Header()] = None,
    session: Session = Depends(get_session),
) -> User:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="missing_token")
    token = authorization.split(" ", 1)[1]
    try:
        payload = decode_token(token)
    except Exception:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="invalid_token")
    if payload.get("type") != "access":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="invalid_token")
    user_id = payload.get("sub")
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="user_not_found")
    return user


@router.post("/register-v2", response_model=TokenPair, status_code=status.HTTP_201_CREATED)
def register_v2(payload: RegisterRequestV2, request: Request, session: Session = Depends(get_session)) -> TokenPair:
    # Validation manuelle supplémentaire
    username = payload.username.strip()
    email = payload.email.strip().lower()
    password = payload.password
    
    # Validation du nom d'utilisateur
    if len(username) < 3:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Username must be at least 3 characters")
    
    import re
    if not re.match(r"^[a-zA-Z0-9_-]+$", username):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Username can only contain letters, numbers, underscores, and hyphens")
    
    if username.lower() in ["admin", "root", "user", "guest", "gorillax", "api", "www"]:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Username is reserved")
    
    # Validation de l'email
    email_pattern = r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$"
    if not re.match(email_pattern, email):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid email format")
    
    # Validation du mot de passe
    if len(password) < 8:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Password must be at least 8 characters")
    
    errors = []
    if not re.search(r"[a-z]", password):
        errors.append("at least one lowercase letter")
    if not re.search(r"[A-Z]", password):
        errors.append("at least one uppercase letter")
    if not re.search(r"\d", password):
        errors.append("at least one number")
    
    # Vérifier les mots de passe faibles
    weak_patterns = [
        r"^password\d*$",
        r"^123456\d*$",
        r"^qwerty\d*$",
        r"^admin\d*$",
        r"^gorillax\d*$",
        r"^weakpass\d*$",
    ]
    
    for pattern in weak_patterns:
        if re.match(pattern, password.lower()):
            errors.append("password is too common")
            break
    
    if errors:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Password must contain {', '.join(errors)}")
    
    # Vérifier si l'utilisateur ou l'email existe déjà
    existing_user = session.exec(select(User).where(User.username == username)).first()
    if existing_user:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="username_taken")
    
    existing_email = session.exec(select(User).where(User.email == email)).first()
    if existing_email:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="email_taken")
    
    # Générer le token de vérification email
    verification_token = generate_verification_token()
    verification_expires = datetime.utcnow() + timedelta(hours=24)
    
    # Créer l'utilisateur
    user = User(
        id=username, 
        username=username, 
        email=email,
        password_hash=hash_password(password),
        email_verification_token=verification_token,
        email_verification_expires=verification_expires,
        email_verified=False  # L'utilisateur doit vérifier son email
    )
    session.add(user)
    
    # Envoyer l'email de vérification
    email_sent = send_verification_email(email, username, verification_token)
    if not email_sent:
        print(f"⚠️ Failed to send verification email to {email}")
    
    # Créer les tokens (même si l'email n'est pas vérifié)
    access = create_access_token(user.id)
    refresh_token, exp = create_refresh_token(user.id)
    session.add(RefreshToken(token=refresh_token, user_id=user.id, expires_at=exp))
    
    # Enregistrer la tentative réussie
    client_ip = _get_client_ip(request)
    record_login_attempt(session, username, client_ip, success=True)
    
    session.commit()
    return TokenPair(access_token=access, refresh_token=refresh_token)


@router.post("/register", response_model=TokenPair, status_code=status.HTTP_201_CREATED)
def register(payload: RegisterRequest, request: Request, session: Session = Depends(get_session)) -> TokenPair:
    # Validation manuelle supplémentaire
    username = payload.username.strip()
    email = payload.email.strip().lower()
    password = payload.password
    
    # Validation du nom d'utilisateur
    if len(username) < 3:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Username must be at least 3 characters")
    
    import re
    if not re.match(r"^[a-zA-Z0-9_-]+$", username):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Username can only contain letters, numbers, underscores, and hyphens")
    
    if username.lower() in ["admin", "root", "user", "guest", "gorillax", "api", "www"]:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Username is reserved")
    
    # Validation de l'email
    email_pattern = r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$"
    if not re.match(email_pattern, email):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid email format")
    
    # Validation du mot de passe
    if len(password) < 8:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Password must be at least 8 characters")
    
    errors = []
    if not re.search(r"[a-z]", password):
        errors.append("at least one lowercase letter")
    if not re.search(r"[A-Z]", password):
        errors.append("at least one uppercase letter")
    if not re.search(r"\d", password):
        errors.append("at least one number")
    
    # Vérifier les mots de passe faibles
    weak_patterns = [
        r"^password\d*$",
        r"^123456\d*$",
        r"^qwerty\d*$",
        r"^admin\d*$",
        r"^gorillax\d*$",
        r"^weakpass\d*$",
    ]
    
    for pattern in weak_patterns:
        if re.match(pattern, password.lower()):
            errors.append("password is too common")
            break
    
    if errors:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Password must contain {', '.join(errors)}")
    
    # Vérifier si l'utilisateur ou l'email existe déjà
    existing_user = session.exec(select(User).where(User.username == username)).first()
    if existing_user:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="username_taken")
    
    existing_email = session.exec(select(User).where(User.email == email)).first()
    if existing_email:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="email_taken")
    
    # Générer le token de vérification email
    verification_token = generate_verification_token()
    verification_expires = datetime.utcnow() + timedelta(hours=24)
    
    # Créer l'utilisateur
    user = User(
        id=username, 
        username=username, 
        email=email,
        password_hash=hash_password(password),
        email_verification_token=verification_token,
        email_verification_expires=verification_expires,
        email_verified=False  # L'utilisateur doit vérifier son email
    )
    session.add(user)
    
    # Envoyer l'email de vérification
    email_sent = send_verification_email(email, username, verification_token)
    if not email_sent:
        print(f"⚠️ Failed to send verification email to {email}")
    
    # Créer les tokens (même si l'email n'est pas vérifié)
    access = create_access_token(user.id)
    refresh_token, exp = create_refresh_token(user.id)
    session.add(RefreshToken(token=refresh_token, user_id=user.id, expires_at=exp))
    
    # Enregistrer la tentative réussie
    client_ip = _get_client_ip(request)
    record_login_attempt(session, username, client_ip, success=True)
    
    session.commit()
    return TokenPair(access_token=access, refresh_token=refresh_token)


@router.post("/login", response_model=TokenPair)
def login(payload: LoginRequest, request: Request, session: Session = Depends(get_session)) -> TokenPair:
    client_ip = _get_client_ip(request)
    username = payload.username.strip()
    
    # Vérifier le rate limiting
    if is_rate_limited(session, username, client_ip):
        remaining = get_remaining_cooldown(session, username, client_ip)
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Too many failed attempts. Try again in {remaining} minutes."
        )
    
    # Vérifier les credentials
    user = session.exec(select(User).where(User.username == username)).first()
    if not user or not verify_password(payload.password, user.password_hash):
        # Enregistrer la tentative échouée
        record_login_attempt(session, username, client_ip, success=False)
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="invalid_credentials")
    
    # Créer les tokens
    access = create_access_token(user.id)
    refresh_token, exp = create_refresh_token(user.id)
    session.add(RefreshToken(token=refresh_token, user_id=user.id, expires_at=exp))
    
    # Enregistrer la tentative réussie
    record_login_attempt(session, username, client_ip, success=True)
    
    # Nettoyer les anciennes tentatives (occasionnellement)
    if hash(username) % 100 == 0:  # 1% de chance
        cleanup_old_attempts(session)
    
    session.commit()
    return TokenPair(access_token=access, refresh_token=refresh_token)


@router.post("/refresh", response_model=TokenPair)
def refresh_token(
    authorization: Annotated[Optional[str], Header()] = None,
    session: Session = Depends(get_session),
) -> TokenPair:
    token = _get_refresh_from_header(authorization)
    try:
        payload = decode_token(token)
    except Exception:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="invalid_token")
    if payload.get("type") != "refresh":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="invalid_token")
    user_id = payload.get("sub")
    
    # Chercher le token par le champ 'token', pas par l'id
    db_token = session.exec(select(RefreshToken).where(RefreshToken.token == token)).first()
    if not db_token or db_token.user_id != user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="invalid_token")
    
    # Comparer les dates (utiliser datetime.utcnow() pour être cohérent avec le modèle)
    if db_token.expires_at < datetime.utcnow():
        session.delete(db_token)
        session.commit()
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="token_expired")
    
    # Supprimer l'ancien token et créer un nouveau
    session.delete(db_token)
    new_refresh, exp = create_refresh_token(user_id)
    session.add(RefreshToken(token=new_refresh, user_id=user_id, expires_at=exp))
    access = create_access_token(user_id)
    session.commit()
    return TokenPair(access_token=access, refresh_token=new_refresh)


@router.get("/me", response_model=MeResponse)
def me(current_user: User = Depends(_get_current_user)) -> MeResponse:
    return MeResponse.model_validate(current_user)


@router.post("/verify-email", status_code=status.HTTP_200_OK)
def verify_email(payload: VerifyEmailRequest, session: Session = Depends(get_session)):
    """Verify user email with token."""
    user = session.exec(
        select(User).where(
            User.email_verification_token == payload.token,
            User.email_verification_expires > datetime.utcnow()
        )
    ).first()
    
    if not user:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired verification token")
    
    # Marquer l'email comme vérifié
    user.email_verified = True
    user.email_verification_token = None
    user.email_verification_expires = None
    
    session.add(user)
    session.commit()
    
    return {"message": "Email verified successfully"}


@router.post("/resend-verification", status_code=status.HTTP_200_OK)
def resend_verification(current_user: User = Depends(_get_current_user), session: Session = Depends(get_session)):
    """Resend email verification."""
    if current_user.email_verified:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already verified")
    
    # Générer un nouveau token
    verification_token = generate_verification_token()
    verification_expires = datetime.utcnow() + timedelta(hours=24)
    
    current_user.email_verification_token = verification_token
    current_user.email_verification_expires = verification_expires
    
    session.add(current_user)
    session.commit()
    
    # Envoyer l'email
    email_sent = send_verification_email(current_user.email, current_user.username, verification_token)
    if not email_sent:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to send verification email")
    
    return {"message": "Verification email sent"}


@router.post("/reset-password", status_code=status.HTTP_200_OK)
def reset_password(payload: ResetPasswordRequest, session: Session = Depends(get_session)):
    """Request password reset."""
    user = session.exec(select(User).where(User.email == payload.email.lower())).first()
    
    # Toujours retourner succès pour éviter l'énumération d'emails
    if not user:
        return {"message": "If the email exists, a reset link has been sent"}
    
    # Générer le token de reset
    reset_token = generate_verification_token()
    reset_expires = datetime.utcnow() + timedelta(hours=1)  # 1 heure seulement
    
    user.reset_password_token = reset_token
    user.reset_password_expires = reset_expires
    
    session.add(user)
    session.commit()
    
    # Envoyer l'email de reset
    email_sent = send_password_reset_email(user.email, user.username, reset_token)
    if not email_sent:
        print(f"⚠️ Failed to send reset email to {user.email}")
    
    return {"message": "If the email exists, a reset link has been sent"}


@router.post("/reset-password-confirm", status_code=status.HTTP_200_OK)
def reset_password_confirm(payload: ResetPasswordConfirm, session: Session = Depends(get_session)):
    """Confirm password reset with token."""
    user = session.exec(
        select(User).where(
            User.reset_password_token == payload.token,
            User.reset_password_expires > datetime.utcnow()
        )
    ).first()
    
    if not user:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired reset token")
    
    # Valider le nouveau mot de passe
    import re
    password = payload.new_password
    
    if len(password) < 8:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Password must be at least 8 characters")
    
    errors = []
    if not re.search(r"[a-z]", password):
        errors.append("at least one lowercase letter")
    if not re.search(r"[A-Z]", password):
        errors.append("at least one uppercase letter")
    if not re.search(r"\d", password):
        errors.append("at least one number")
    
    if errors:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Password must contain {', '.join(errors)}")
    
    # Mettre à jour le mot de passe
    user.password_hash = hash_password(password)
    user.reset_password_token = None
    user.reset_password_expires = None
    
    # Révoquer tous les refresh tokens existants pour forcer une nouvelle connexion
    existing_tokens = session.exec(select(RefreshToken).where(RefreshToken.user_id == user.id)).all()
    for token in existing_tokens:
        session.delete(token)
    
    session.add(user)
    session.commit()
    
    return {"message": "Password reset successfully"}


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(
    authorization: Annotated[Optional[str], Header()] = None,
    session: Session = Depends(get_session),
) -> Response:
    token = _get_refresh_from_header(authorization)
    db_token = session.exec(select(RefreshToken).where(RefreshToken.token == token)).first()
    if db_token:
        session.delete(db_token)
        session.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
