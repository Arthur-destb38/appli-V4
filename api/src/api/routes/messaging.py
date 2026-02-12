"""Routes pour la messagerie privée entre utilisateurs."""
from __future__ import annotations

from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
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

router = APIRouter(prefix="/messaging", tags=["messaging"])


def get_or_create_user(session: Session, user_id: str) -> User:
    """Récupère ou crée un utilisateur (mode démo)."""
    user = session.get(User, user_id)
    if user is None:
        # Générer un nom d'utilisateur unique
        base_username = f"User_{user_id[:8]}"
        username = base_username
        counter = 1
        
        # Vérifier l'unicité et ajouter un suffixe si nécessaire
        while True:
            existing = session.exec(select(User).where(User.username == username)).first()
            if existing is None:
                break
            username = f"{base_username}_{counter}"
            counter += 1
        
        user = User(
            id=user_id,
            username=username,
            email=f"{user_id}@temp.local",
            password_hash="temp_not_for_login",
            consent_to_public_share=True,
        )
        session.add(user)
        session.commit()
        session.refresh(user)
    return user


def find_existing_conversation(
    session: Session, user1_id: str, user2_id: str
) -> Optional[Conversation]:
    """Trouve une conversation existante entre deux utilisateurs."""
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
    """Retourne l'ID de l'autre participant dans la conversation."""
    if conversation.participant1_id == user_id:
        return conversation.participant2_id
    return conversation.participant1_id


@router.get("/conversations", response_model=ConversationListResponse)
def list_conversations(
    user_id: str,
    limit: int = Query(20, ge=1, le=50),
    cursor: Optional[str] = Query(None),
    session: Session = Depends(get_session),
) -> ConversationListResponse:
    """Liste toutes les conversations d'un utilisateur."""
    get_or_create_user(session, user_id)

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

    # Trier par date du dernier message (les plus récentes d'abord)
    statement = statement.order_by(Conversation.last_message_at.desc().nullslast())
    statement = statement.limit(limit + 1)

    conversations = session.exec(statement).all()

    next_cursor = None
    if len(conversations) > limit:
        last_conv = conversations[-1]
        if last_conv.last_message_at:
            next_cursor = last_conv.last_message_at.isoformat()
        conversations = conversations[:limit]

    # Récupérer les infos des participants et les derniers messages
    result_conversations = []
    for conv in conversations:
        other_user_id = get_other_participant(conv, user_id)
        other_user = session.get(User, other_user_id)

        if other_user is None:
            continue

        # Dernier message
        last_message_stmt = (
            select(Message)
            .where(Message.conversation_id == conv.id)
            .order_by(Message.created_at.desc())
            .limit(1)
        )
        last_message = session.exec(last_message_stmt).first()

        # Compteur de messages non lus
        unread_stmt = select(func.count(Message.id)).where(
            Message.conversation_id == conv.id,
            Message.sender_id != user_id,
            Message.read_at.is_(None),
        )
        unread_count = session.exec(unread_stmt).one()

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
    user_id: str,
    payload: CreateConversationRequest,
    session: Session = Depends(get_session),
) -> CreateConversationResponse:
    """Crée une nouvelle conversation ou retourne l'existante."""
    if user_id == payload.participant_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="cannot_message_self",
        )

    get_or_create_user(session, user_id)
    other_user = get_or_create_user(session, payload.participant_id)

    # Vérifier si une conversation existe déjà
    existing = find_existing_conversation(session, user_id, payload.participant_id)
    
    if existing:
        # Retourner la conversation existante
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

    # Créer une nouvelle conversation
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
    user_id: str,
    limit: int = Query(50, ge=1, le=100),
    cursor: Optional[str] = Query(None),
    session: Session = Depends(get_session),
) -> MessageListResponse:
    """Liste les messages d'une conversation."""
    conversation = session.get(Conversation, conversation_id)
    if conversation is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="conversation_not_found",
        )

    # Vérifier que l'utilisateur fait partie de la conversation
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

    # Messages les plus récents d'abord
    statement = statement.order_by(Message.created_at.desc()).limit(limit + 1)

    messages = session.exec(statement).all()

    next_cursor = None
    if len(messages) > limit:
        next_cursor = messages[-1].created_at.isoformat()
        messages = messages[:limit]

    # Marquer les messages comme lus
    for msg in messages:
        if msg.sender_id != user_id and msg.read_at is None:
            msg.read_at = datetime.now(timezone.utc)
    session.commit()

    # Inverser pour avoir l'ordre chronologique (ancien -> récent)
    messages = list(reversed(messages))

    return MessageListResponse(
        messages=[MessageRead.model_validate(m) for m in messages],
        next_cursor=next_cursor,
    )


@router.post("/conversations/{conversation_id}/messages", response_model=SendMessageResponse)
def send_message(
    conversation_id: str,
    user_id: str,
    payload: SendMessageRequest,
    session: Session = Depends(get_session),
) -> SendMessageResponse:
    """Envoie un message dans une conversation."""
    conversation = session.get(Conversation, conversation_id)
    if conversation is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="conversation_not_found",
        )

    # Vérifier que l'utilisateur fait partie de la conversation
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

    # Mettre à jour la date du dernier message
    conversation.last_message_at = datetime.now(timezone.utc)
    session.commit()
    session.refresh(message)

    return SendMessageResponse(
        message=MessageRead.model_validate(message),
        conversation_id=conversation_id,
    )


@router.post("/conversations/{conversation_id}/read", status_code=status.HTTP_204_NO_CONTENT)
def mark_as_read(
    conversation_id: str,
    user_id: str,
    session: Session = Depends(get_session),
) -> None:
    """Marque tous les messages d'une conversation comme lus."""
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

    # Marquer tous les messages non lus (envoyés par l'autre utilisateur) comme lus
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
    user_id: str,
    session: Session = Depends(get_session),
) -> dict:
    """Retourne le nombre total de messages non lus."""
    get_or_create_user(session, user_id)

    # Trouver toutes les conversations de l'utilisateur
    conv_statement = select(Conversation.id).where(
        or_(
            Conversation.participant1_id == user_id,
            Conversation.participant2_id == user_id,
        )
    )
    conversation_ids = [row for row in session.exec(conv_statement).all()]

    if not conversation_ids:
        return {"unread_count": 0}

    # Compter les messages non lus
    unread_stmt = select(func.count(Message.id)).where(
        Message.conversation_id.in_(conversation_ids),
        Message.sender_id != user_id,
        Message.read_at.is_(None),
    )
    unread_count = session.exec(unread_stmt).one()

    return {"unread_count": unread_count}


@router.delete("/conversations/{conversation_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_conversation(
    conversation_id: str,
    user_id: str,
    session: Session = Depends(get_session),
) -> None:
    """Supprime une conversation et tous ses messages."""
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

    # Supprimer tous les messages
    messages_stmt = select(Message).where(Message.conversation_id == conversation_id)
    messages = session.exec(messages_stmt).all()
    for msg in messages:
        session.delete(msg)

    # Supprimer la conversation
    session.delete(conversation)
    session.commit()



