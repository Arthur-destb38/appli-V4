"""Routes pour la messagerie privée entre utilisateurs."""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy import func, or_, and_
from sqlmodel import Session, select

from ..db import get_session
from ..models import Conversation, Message, User
from ..schemas import (
    ConversationListResponse,
    ConversationRead,
    ConversationParticipant,
    CreateConversationRequest,
    CreateConversationResponse,
    MessageListResponse,
    MessageRead,
    SendMessageRequest,
    SendMessageResponse,
)
from ..utils.dependencies import get_current_user as _get_current_user_required

router = APIRouter(prefix="/messaging", tags=["messaging"])


def find_existing_conversation(
    session: Session, user1_id: str, user2_id: str
) -> Optional[Conversation]:
    statement = select(Conversation).where(
        or_(
            and_(
                Conversation.participant1_id == user1_id,
                Conversation.participant2_id == user2_id,
            ),
            and_(
                Conversation.participant1_id == user2_id,
                Conversation.participant2_id == user1_id,
            ),
        )
    )
    return session.exec(statement).first()


def get_other_participant(conversation: Conversation, user_id: str) -> str:
    if conversation.participant1_id == user_id:
        return conversation.participant2_id
    return conversation.participant1_id


@router.get("/conversations", response_model=ConversationListResponse)
def list_conversations(
    limit: int = Query(20, ge=1, le=50),
    cursor: Optional[str] = Query(None),
    session: Session = Depends(get_session),
    current_user: User = Depends(_get_current_user_required),
) -> ConversationListResponse:
    user_id = current_user.id

    statement = select(Conversation).where(
        or_(
            Conversation.participant1_id == user_id,
            Conversation.participant2_id == user_id,
        )
    )

    if cursor:
        try:
            parsed_cursor = datetime.fromisoformat(cursor)
            statement = statement.where(Conversation.last_message_at <= parsed_cursor)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid cursor format",
            )

    statement = statement.order_by(Conversation.last_message_at.desc().nullslast())
    statement = statement.limit(limit + 1)

    conversations = session.exec(statement).all()

    next_cursor = None
    if len(conversations) > limit:
        last_conv = conversations[-1]
        if last_conv.last_message_at:
            next_cursor = last_conv.last_message_at.isoformat()
        conversations = conversations[:limit]

    # Batch-load to avoid N+1: users, last messages, unread counts
    conv_ids = [conv.id for conv in conversations]
    other_user_ids = list({get_other_participant(conv, user_id) for conv in conversations})

    # 1) Batch-load all other participants
    users_map: dict[str, User] = {}
    if other_user_ids:
        users_list = session.exec(select(User).where(User.id.in_(other_user_ids))).all()
        users_map = {u.id: u for u in users_list}

    # 2) Batch-load last message per conversation (using a lateral-style subquery)
    last_messages_map: dict[str, Message] = {}
    if conv_ids:
        # Get newest message per conversation via a window function approach
        from sqlalchemy import desc
        all_msgs = session.exec(
            select(Message)
            .where(Message.conversation_id.in_(conv_ids))
            .order_by(Message.conversation_id, desc(Message.created_at))
        ).all()
        for msg in all_msgs:
            if msg.conversation_id not in last_messages_map:
                last_messages_map[msg.conversation_id] = msg

    # 3) Batch-load unread counts per conversation
    unread_map: dict[str, int] = {cid: 0 for cid in conv_ids}
    if conv_ids:
        unread_rows = session.exec(
            select(Message.conversation_id, func.count(Message.id))
            .where(
                Message.conversation_id.in_(conv_ids),
                Message.sender_id != user_id,
                Message.read_at.is_(None),
            )
            .group_by(Message.conversation_id)
        ).all()
        for cid, cnt in unread_rows:
            unread_map[cid] = cnt

    result_conversations = []
    for conv in conversations:
        other_user_id = get_other_participant(conv, user_id)
        other_user = users_map.get(other_user_id)
        if other_user is None:
            continue

        last_message = last_messages_map.get(conv.id)
        unread_count = unread_map.get(conv.id, 0)

        result_conversations.append(
            ConversationRead(
                id=conv.id,
                participant=ConversationParticipant(
                    id=other_user.id,
                    username=other_user.username,
                    avatar_url=other_user.avatar_url,
                ),
                last_message=MessageRead.model_validate(last_message) if last_message else None,
                unread_count=unread_count,
                last_message_at=conv.last_message_at,
                created_at=conv.created_at,
            )
        )

    return ConversationListResponse(
        conversations=result_conversations,
        next_cursor=next_cursor,
    )


@router.post("/conversations", response_model=CreateConversationResponse)
def create_or_get_conversation(
    payload: CreateConversationRequest,
    session: Session = Depends(get_session),
    current_user: User = Depends(_get_current_user_required),
) -> CreateConversationResponse:
    user_id = current_user.id

    if user_id == payload.participant_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="cannot_message_self",
        )

    other_user = session.get(User, payload.participant_id)
    if not other_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="user_not_found",
        )

    existing = find_existing_conversation(session, user_id, payload.participant_id)

    if existing:
        return CreateConversationResponse(
            conversation=ConversationRead(
                id=existing.id,
                participant=ConversationParticipant(
                    id=other_user.id,
                    username=other_user.username,
                    avatar_url=other_user.avatar_url,
                ),
                last_message=None,
                unread_count=0,
                last_message_at=existing.last_message_at,
                created_at=existing.created_at,
            ),
            created=False,
        )

    conversation = Conversation(
        participant1_id=user_id,
        participant2_id=payload.participant_id,
    )
    session.add(conversation)
    session.commit()
    session.refresh(conversation)

    return CreateConversationResponse(
        conversation=ConversationRead(
            id=conversation.id,
            participant=ConversationParticipant(
                id=other_user.id,
                username=other_user.username,
                avatar_url=other_user.avatar_url,
            ),
            last_message=None,
            unread_count=0,
            last_message_at=None,
            created_at=conversation.created_at,
        ),
        created=True,
    )


@router.get("/conversations/{conversation_id}/messages", response_model=MessageListResponse)
def list_messages(
    conversation_id: str,
    limit: int = Query(50, ge=1, le=100),
    cursor: Optional[str] = Query(None),
    session: Session = Depends(get_session),
    current_user: User = Depends(_get_current_user_required),
) -> MessageListResponse:
    user_id = current_user.id
    conversation = session.get(Conversation, conversation_id)
    if conversation is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="conversation_not_found",
        )

    if user_id not in [conversation.participant1_id, conversation.participant2_id]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="not_participant",
        )

    statement = select(Message).where(Message.conversation_id == conversation_id)

    if cursor:
        try:
            parsed_cursor = datetime.fromisoformat(cursor)
            statement = statement.where(Message.created_at < parsed_cursor)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid cursor format",
            )

    statement = statement.order_by(Message.created_at.desc()).limit(limit + 1)

    messages = session.exec(statement).all()

    next_cursor = None
    if len(messages) > limit:
        next_cursor = messages[-1].created_at.isoformat()
        messages = messages[:limit]

    for msg in messages:
        if msg.sender_id != user_id and msg.read_at is None:
            msg.read_at = datetime.now(timezone.utc)
    session.commit()

    messages = list(reversed(messages))

    return MessageListResponse(
        messages=[MessageRead.model_validate(m) for m in messages],
        next_cursor=next_cursor,
    )


@router.post("/conversations/{conversation_id}/messages", response_model=SendMessageResponse)
def send_message(
    conversation_id: str,
    payload: SendMessageRequest,
    session: Session = Depends(get_session),
    current_user: User = Depends(_get_current_user_required),
) -> SendMessageResponse:
    user_id = current_user.id
    conversation = session.get(Conversation, conversation_id)
    if conversation is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="conversation_not_found",
        )

    if user_id not in [conversation.participant1_id, conversation.participant2_id]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="not_participant",
        )

    message = Message(
        conversation_id=conversation_id,
        sender_id=user_id,
        content=payload.content.strip(),
    )
    session.add(message)
    conversation.last_message_at = datetime.now(timezone.utc)

    try:
        session.commit()
        session.refresh(message)
    except Exception:
        session.rollback()
        raise HTTPException(status_code=500, detail="send_message_failed")

    return SendMessageResponse(
        message=MessageRead.model_validate(message),
        conversation_id=conversation_id,
    )


@router.post("/conversations/{conversation_id}/read", status_code=status.HTTP_204_NO_CONTENT)
def mark_as_read(
    conversation_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(_get_current_user_required),
) -> None:
    user_id = current_user.id
    conversation = session.get(Conversation, conversation_id)
    if conversation is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="conversation_not_found",
        )

    if user_id not in [conversation.participant1_id, conversation.participant2_id]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="not_participant",
        )

    statement = select(Message).where(
        Message.conversation_id == conversation_id,
        Message.sender_id != user_id,
        Message.read_at.is_(None),
    )
    unread_messages = session.exec(statement).all()

    now = datetime.now(timezone.utc)
    for msg in unread_messages:
        msg.read_at = now
    session.commit()


@router.get("/unread-count")
def get_unread_count(
    session: Session = Depends(get_session),
    current_user: User = Depends(_get_current_user_required),
) -> dict:
    user_id = current_user.id

    conv_statement = select(Conversation.id).where(
        or_(
            Conversation.participant1_id == user_id,
            Conversation.participant2_id == user_id,
        )
    )
    conversation_ids = [row for row in session.exec(conv_statement).all()]

    if not conversation_ids:
        return {"unread_count": 0}

    unread_stmt = select(func.count(Message.id)).where(
        Message.conversation_id.in_(conversation_ids),
        Message.sender_id != user_id,
        Message.read_at.is_(None),
    )
    unread_count = session.exec(unread_stmt).one()

    return {"unread_count": unread_count}


class DirectSendRequest(BaseModel):
    recipient_id: str
    content: str


@router.post("/send", response_model=SendMessageResponse)
def send_direct_message(
    payload: DirectSendRequest,
    session: Session = Depends(get_session),
    current_user: User = Depends(_get_current_user_required),
) -> SendMessageResponse:
    """Send a message to a user, creating a conversation if needed."""
    user_id = current_user.id

    if user_id == payload.recipient_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="cannot_message_self",
        )

    other_user = session.get(User, payload.recipient_id)
    if not other_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="user_not_found",
        )

    conversation = find_existing_conversation(session, user_id, payload.recipient_id)
    if not conversation:
        conversation = Conversation(
            participant1_id=user_id,
            participant2_id=payload.recipient_id,
        )
        session.add(conversation)
        session.flush()

    message = Message(
        conversation_id=conversation.id,
        sender_id=user_id,
        content=payload.content.strip(),
    )
    session.add(message)
    conversation.last_message_at = datetime.now(timezone.utc)

    try:
        session.commit()
        session.refresh(message)
    except Exception:
        session.rollback()
        raise HTTPException(status_code=500, detail="send_message_failed")

    return SendMessageResponse(
        message=MessageRead.model_validate(message),
        conversation_id=conversation.id,
    )


@router.delete("/conversations/{conversation_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_conversation(
    conversation_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(_get_current_user_required),
) -> None:
    user_id = current_user.id
    conversation = session.get(Conversation, conversation_id)
    if conversation is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="conversation_not_found",
        )

    if user_id not in [conversation.participant1_id, conversation.participant2_id]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="not_participant",
        )

    messages_stmt = select(Message).where(Message.conversation_id == conversation_id)
    messages = session.exec(messages_stmt).all()
    for msg in messages:
        session.delete(msg)

    session.delete(conversation)
    session.commit()
