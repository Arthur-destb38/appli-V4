from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field, constr, validator


class LoginRequest(BaseModel):
    username: constr(min_length=3, max_length=30, strip_whitespace=True)
    password: constr(min_length=6, max_length=128)


class RegisterRequest(BaseModel):
    username: constr(min_length=3, max_length=30, strip_whitespace=True)
    email: constr(strip_whitespace=True)
    password: constr(min_length=8, max_length=128)
    
    @validator('username')
    def validate_username(cls, v):
        import re
        if not re.match(r"^[a-zA-Z0-9_-]+$", v):
            raise ValueError("Username can only contain letters, numbers, underscores, and hyphens")
        if v.lower() in ["admin", "root", "user", "guest", "gorillax", "api", "www"]:
            raise ValueError("Username is reserved")
        return v
    
    @validator('email')
    def validate_email(cls, v):
        import re
        if len(v) > 254:
            raise ValueError("Email is too long")
        
        email_pattern = r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$"
        if not re.match(email_pattern, v):
            raise ValueError("Invalid email format")
        return v.lower()
    
    @validator('password')
    def validate_password(cls, v):
        import re
        errors = []
        
        if not re.search(r"[a-z]", v):
            errors.append("at least one lowercase letter")
        if not re.search(r"[A-Z]", v):
            errors.append("at least one uppercase letter")
        if not re.search(r"\d", v):
            errors.append("at least one number")
        
        # Check for common weak passwords
        weak_patterns = [
            r"^password\d*$",
            r"^123456\d*$",
            r"^qwerty\d*$",
            r"^admin\d*$",
            r"^gorillax\d*$",
            r"^weakpass\d*$",
        ]
        
        for pattern in weak_patterns:
            if re.match(pattern, v.lower()):
                errors.append("password is too common")
                break
        
        if errors:
            raise ValueError(f"Password must contain {', '.join(errors)}")
        
        return v


class RegisterRequestV2(BaseModel):
    username: constr(min_length=3, max_length=30, strip_whitespace=True)
    email: constr(strip_whitespace=True)
    password: constr(min_length=8, max_length=128)
    
    @validator('username')
    def validate_username(cls, v):
        import re
        if not re.match(r"^[a-zA-Z0-9_-]+$", v):
            raise ValueError("Username can only contain letters, numbers, underscores, and hyphens")
        if v.lower() in ["admin", "root", "user", "guest", "gorillax", "api", "www"]:
            raise ValueError("Username is reserved")
        return v
    
    @validator('email')
    def validate_email(cls, v):
        import re
        if len(v) > 254:
            raise ValueError("Email is too long")
        
        email_pattern = r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$"
        if not re.match(email_pattern, v):
            raise ValueError("Invalid email format")
        return v.lower()
    
    @validator('password')
    def validate_password(cls, v):
        import re
        errors = []
        
        if not re.search(r"[a-z]", v):
            errors.append("at least one lowercase letter")
        if not re.search(r"[A-Z]", v):
            errors.append("at least one uppercase letter")
        if not re.search(r"\d", v):
            errors.append("at least one number")
        
        # Check for common weak passwords
        weak_patterns = [
            r"^password\d*$",
            r"^123456\d*$",
            r"^qwerty\d*$",
            r"^admin\d*$",
            r"^gorillax\d*$",
            r"^weakpass\d*$",
        ]
        
        for pattern in weak_patterns:
            if re.match(pattern, v.lower()):
                errors.append("password is too common")
                break
        
        if errors:
            raise ValueError(f"Password must contain {', '.join(errors)}")
        
        return v


class ResetPasswordRequest(BaseModel):
    email: constr(strip_whitespace=True)


class ResetPasswordConfirm(BaseModel):
    token: str
    new_password: constr(min_length=8, max_length=128)
    
    @validator('new_password')
    def validate_password(cls, v):
        import re
        errors = []
        
        if not re.search(r"[a-z]", v):
            errors.append("at least one lowercase letter")
        if not re.search(r"[A-Z]", v):
            errors.append("at least one uppercase letter")
        if not re.search(r"\d", v):
            errors.append("at least one number")
        
        if errors:
            raise ValueError(f"Password must contain {', '.join(errors)}")
        
        return v


class VerifyEmailRequest(BaseModel):
    token: str


class TokenPair(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class MeResponse(BaseModel):
    id: str
    username: str
    email: str
    created_at: datetime
    consent_to_public_share: bool
    avatar_url: Optional[str] = None
    bio: Optional[str] = None
    objective: Optional[str] = None
    email_verified: bool = False

    model_config = ConfigDict(from_attributes=True)


class ExerciseBase(BaseModel):
    name: str
    muscle_group: str
    equipment: str
    description: Optional[str] = None
    image_url: Optional[str] = None
    source_type: str = "local"
    source_value: Optional[str] = None


class ExerciseCreate(ExerciseBase):
    pass


class ExerciseRead(ExerciseBase):
    id: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class UserProfileBase(BaseModel):
    id: str
    username: str
    consent_to_public_share: bool


class UserProfileCreate(UserProfileBase):
    pass


class UserProfileRead(UserProfileBase):
    created_at: datetime
    bio: Optional[str] = None
    objective: Optional[str] = None
    avatar_url: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class ShareResponse(BaseModel):
    share_id: str
    owner_id: str
    owner_username: str
    workout_title: str
    exercise_count: int
    set_count: int
    created_at: datetime


class ShareRequest(BaseModel):
    user_id: str


class FollowRequest(BaseModel):
    follower_id: str


class CommentPreview(BaseModel):
    id: str
    username: str
    content: str


class FeedItem(BaseModel):
    share_id: str
    owner_id: str
    owner_username: str
    workout_title: str
    exercise_count: int
    set_count: int
    created_at: datetime
    like_count: int = 0
    comment_count: int = 0
    comments: list[CommentPreview] = []


class FeedResponse(BaseModel):
    items: list[FeedItem]
    next_cursor: Optional[datetime]


class SyncMutation(BaseModel):
    queue_id: int
    action: str
    payload: dict
    created_at: int


class SyncPushRequest(BaseModel):
    mutations: list[SyncMutation]


class SyncPushAck(BaseModel):
    queue_id: int
    server_id: str


class SyncPushResponse(BaseModel):
    processed: int
    server_time: datetime
    results: list[SyncPushAck] = []


class SyncEventRead(BaseModel):
    id: str
    action: str
    payload: dict
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class SyncPullResponse(BaseModel):
    server_time: datetime
    events: list[SyncEventRead]


# Programmes structurés
class ProgramSetBase(BaseModel):
    exercise_slug: str
    reps: Optional[str] = None
    weight: Optional[float] = None
    rpe: Optional[float] = None
    order_index: int = 0
    notes: Optional[str] = None


class ProgramSessionBase(BaseModel):
    day_index: int = 0
    title: str
    focus: Optional[str] = None
    estimated_minutes: Optional[int] = None
    sets: list[ProgramSetBase] = []


class ProgramBase(BaseModel):
    title: str
    objective: Optional[str] = None
    duration_weeks: Optional[int] = None
    user_id: Optional[str] = None
    sessions: list[ProgramSessionBase] = []


class ProgramCreate(ProgramBase):
    pass


class ProgramSetRead(ProgramSetBase):
    id: str

    model_config = ConfigDict(from_attributes=True)


class ProgramSessionRead(ProgramSessionBase):
    id: str
    sets: list[ProgramSetRead]

    model_config = ConfigDict(from_attributes=True)


class ProgramRead(ProgramBase):
    id: str
    sessions: list[ProgramSessionRead]

    model_config = ConfigDict(from_attributes=True)


# Stories
class StoryRead(BaseModel):
    id: str
    owner_id: str
    owner_username: str
    media_url: str
    title: str
    link: Optional[str] = None
    created_at: datetime
    expires_at: Optional[datetime] = None


# Auth
class RegisterRequest(BaseModel):
    username: constr(min_length=3, max_length=50)
    password: constr(min_length=6, max_length=100)


class LoginRequest(BaseModel):
    username: str
    password: str


class TokenPair(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class MeResponse(BaseModel):
    id: str
    username: str
    created_at: datetime
    consent_to_public_share: bool

    model_config = ConfigDict(from_attributes=True)


# Messaging
class MessageRead(BaseModel):
    id: str
    conversation_id: str
    sender_id: str
    content: str
    read_at: Optional[datetime] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ConversationParticipant(BaseModel):
    id: str
    username: str
    avatar_url: Optional[str] = None


class ConversationRead(BaseModel):
    id: str
    participant: ConversationParticipant
    last_message: Optional[MessageRead] = None
    unread_count: int = 0
    last_message_at: Optional[datetime] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ConversationListResponse(BaseModel):
    conversations: list[ConversationRead]
    next_cursor: Optional[str] = None


class MessageListResponse(BaseModel):
    messages: list[MessageRead]
    next_cursor: Optional[str] = None


class SendMessageRequest(BaseModel):
    content: constr(min_length=1, max_length=2000)


class SendMessageResponse(BaseModel):
    message: MessageRead
    conversation_id: str


class CreateConversationRequest(BaseModel):
    participant_id: str


class CreateConversationResponse(BaseModel):
    conversation: ConversationRead
    created: bool  # True si nouvelle conversation, False si existante
