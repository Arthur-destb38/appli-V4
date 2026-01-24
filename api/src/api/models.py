"""Database models for the Fitness App."""
import uuid
from datetime import datetime
from typing import Optional

from sqlmodel import Field, SQLModel


def generate_uuid() -> str:
    return str(uuid.uuid4())


class User(SQLModel, table=True):
    id: str = Field(default_factory=generate_uuid, primary_key=True)
    username: str = Field(unique=True, index=True)
    email: str = Field(unique=True, index=True)
    password_hash: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    consent_to_public_share: bool = Field(default=False)
    avatar_url: Optional[str] = Field(default=None)
    bio: Optional[str] = Field(default=None)
    objective: Optional[str] = Field(default=None)
    
    # Nouveaux champs pour la validation email
    email_verified: bool = Field(default=False)
    email_verification_token: Optional[str] = Field(default=None)
    email_verification_expires: Optional[datetime] = Field(default=None)
    
    # Champs pour reset password
    reset_password_token: Optional[str] = Field(default=None)
    reset_password_expires: Optional[datetime] = Field(default=None)
    
    # OAuth
    oauth_provider: Optional[str] = Field(default=None)  # google, apple, facebook
    oauth_id: Optional[str] = Field(default=None)
    
    # Sécurité
    last_login: Optional[datetime] = Field(default=None)
    login_count: int = Field(default=0)


class Workout(SQLModel, table=True):
    id: str = Field(default_factory=generate_uuid, primary_key=True)
    user_id: str = Field(index=True)
    client_id: Optional[str] = Field(default=None, index=True)
    title: str
    status: str = Field(default="draft")
    started_at: Optional[datetime] = None
    ended_at: Optional[datetime] = None
    deleted_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class Exercise(SQLModel, table=True):
    id: str = Field(default_factory=generate_uuid, primary_key=True)
    name: str
    slug: Optional[str] = Field(default=None, index=True)
    category: Optional[str] = Field(default=None)
    muscle_group: str
    equipment: Optional[str] = None
    instructions: Optional[str] = None
    video_url: Optional[str] = None


class WorkoutExercise(SQLModel, table=True):
    id: str = Field(default_factory=generate_uuid, primary_key=True)
    workout_id: str = Field(index=True)
    exercise_id: str
    order_index: int = Field(default=0)
    planned_sets: Optional[int] = None
    notes: Optional[str] = None


class Set(SQLModel, table=True):
    id: str = Field(default_factory=generate_uuid, primary_key=True)
    workout_exercise_id: str = Field(index=True)
    order: int = Field(default=0)
    reps: Optional[int] = None
    weight: Optional[float] = None
    rpe: Optional[float] = None
    duration_seconds: Optional[int] = None
    completed: bool = Field(default=False)
    done_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)


class Program(SQLModel, table=True):
    id: str = Field(default_factory=generate_uuid, primary_key=True)
    user_id: Optional[str] = Field(default="guest-user", index=True)
    title: str = Field(default="Programme")
    objective: Optional[str] = None
    duration_weeks: int = Field(default=4)
    created_at: datetime = Field(default_factory=datetime.utcnow)


class ProgramWorkout(SQLModel, table=True):
    id: str = Field(default_factory=generate_uuid, primary_key=True)
    program_id: str = Field(index=True)
    workout_template_id: str
    week: int
    day: int


class ProgramSession(SQLModel, table=True):
    """Session dans un programme."""
    id: str = Field(default_factory=generate_uuid, primary_key=True)
    program_id: str = Field(index=True)
    day_index: int = Field(default=0)
    title: str = Field(default="Séance")
    focus: Optional[str] = None
    estimated_minutes: Optional[int] = None


class ProgramSet(SQLModel, table=True):
    """Set dans une session de programme."""
    id: str = Field(default_factory=generate_uuid, primary_key=True)
    program_session_id: str = Field(index=True)
    exercise_slug: str
    reps: Optional[str] = None
    weight: Optional[float] = None
    rpe: Optional[float] = None
    order_index: int = Field(default=0)
    notes: Optional[str] = None


class Share(SQLModel, table=True):
    """Partage d'une séance."""
    share_id: str = Field(default_factory=generate_uuid, primary_key=True)
    owner_id: str = Field(index=True)
    owner_username: str
    workout_id: Optional[str] = Field(default=None, index=True)
    workout_title: str
    exercise_count: int = Field(default=0)
    set_count: int = Field(default=0)
    created_at: datetime = Field(default_factory=datetime.utcnow)


class Like(SQLModel, table=True):
    """Like sur un partage."""
    id: str = Field(default_factory=generate_uuid, primary_key=True)
    share_id: str = Field(index=True)
    user_id: str = Field(index=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)


class Comment(SQLModel, table=True):
    """Commentaire sur un partage."""
    id: str = Field(default_factory=generate_uuid, primary_key=True)
    share_id: str = Field(index=True)
    user_id: str = Field(index=True)
    username: str
    content: str
    created_at: datetime = Field(default_factory=datetime.utcnow)


class CommentLike(SQLModel, table=True):
    """Like sur un commentaire."""
    id: str = Field(default_factory=generate_uuid, primary_key=True)
    comment_id: str = Field(index=True)
    user_id: str = Field(index=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)


class Follower(SQLModel, table=True):
    """Relation de suivi entre utilisateurs."""
    id: str = Field(default_factory=generate_uuid, primary_key=True)
    follower_id: str = Field(index=True)
    followed_id: str = Field(index=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)


class Notification(SQLModel, table=True):
    """Notification utilisateur."""
    id: str = Field(default_factory=generate_uuid, primary_key=True)
    user_id: str = Field(index=True)
    type: str  # 'like', 'comment', 'follow', 'mention'
    actor_id: str  # Utilisateur qui a déclenché la notification
    actor_username: str
    reference_id: Optional[str] = None  # ID du share/comment concerné
    message: str
    read: bool = Field(default=False)
    created_at: datetime = Field(default_factory=datetime.utcnow)


class Story(SQLModel, table=True):
    """Story (conseils, recettes, etc.)."""
    id: str = Field(default_factory=generate_uuid, primary_key=True)
    title: str
    owner_username: str
    media_url: Optional[str] = None
    link: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)


class RefreshToken(SQLModel, table=True):
    """Token de rafraîchissement JWT."""
    id: str = Field(default_factory=generate_uuid, primary_key=True)
    user_id: str = Field(index=True)
    token: str = Field(unique=True, index=True)
    expires_at: datetime
    revoked: bool = Field(default=False)
    created_at: datetime = Field(default_factory=datetime.utcnow)


class LoginAttempt(SQLModel, table=True):
    """Tentative de connexion pour rate limiting."""
    id: str = Field(default_factory=generate_uuid, primary_key=True)
    username: str = Field(index=True)
    ip_address: str = Field(index=True)
    success: bool = Field(default=False)
    created_at: datetime = Field(default_factory=datetime.utcnow)


class SyncEvent(SQLModel, table=True):
    """Événement de synchronisation."""
    id: str = Field(default_factory=generate_uuid, primary_key=True)
    user_id: Optional[str] = Field(default=None, index=True)
    action: str
    entity_type: Optional[str] = Field(default=None)
    entity_id: Optional[str] = Field(default=None)
    payload: Optional[str] = Field(default=None)
    created_at: datetime = Field(default_factory=datetime.utcnow)


class Conversation(SQLModel, table=True):
    """Conversation privée entre deux utilisateurs."""
    id: str = Field(default_factory=generate_uuid, primary_key=True)
    participant1_id: str = Field(index=True)
    participant2_id: str = Field(index=True)
    last_message_at: Optional[datetime] = Field(default=None)
    created_at: datetime = Field(default_factory=datetime.utcnow)


class Message(SQLModel, table=True):
    """Message dans une conversation."""
    id: str = Field(default_factory=generate_uuid, primary_key=True)
    conversation_id: str = Field(index=True)
    sender_id: str = Field(index=True)
    content: str
    read_at: Optional[datetime] = Field(default=None)
    created_at: datetime = Field(default_factory=datetime.utcnow)
