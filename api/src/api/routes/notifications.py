"""API endpoints pour les notifications."""
from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlmodel import Session, select
from typing import Optional

from ..db import get_session
from ..models import Notification, User, Share, Like, Comment, Follower

router = APIRouter(prefix="/notifications", tags=["notifications"])


class NotificationResponse(BaseModel):
    id: str
    type: str
    actor_id: str
    actor_username: str
    reference_id: Optional[str]
    message: str
    read: bool
    created_at: str


class NotificationListResponse(BaseModel):
    notifications: list[NotificationResponse]
    unread_count: int


def create_notification(
    session: Session,
    user_id: str,
    type: str,
    actor_id: str,
    actor_username: str,
    message: str,
    reference_id: Optional[str] = None
) -> Notification:
    """Créer une nouvelle notification."""
    notification = Notification(
        user_id=user_id,
        type=type,
        actor_id=actor_id,
        actor_username=actor_username,
        reference_id=reference_id,
        message=message,
        read=False,
    )
    session.add(notification)
    session.commit()
    session.refresh(notification)
    return notification


@router.get("/{user_id}", response_model=NotificationListResponse)
def get_notifications(
    user_id: str,
    limit: int = Query(50, ge=1, le=100),
    session: Session = Depends(get_session)
) -> NotificationListResponse:
    """Récupérer les notifications d'un utilisateur."""
    
    notifications = session.exec(
        select(Notification)
        .where(Notification.user_id == user_id)
        .order_by(Notification.created_at.desc())
        .limit(limit)
    ).all()
    
    unread_count = len([n for n in notifications if not n.read])
    
    return NotificationListResponse(
        notifications=[
            NotificationResponse(
                id=n.id,
                type=n.type,
                actor_id=n.actor_id,
                actor_username=n.actor_username,
                reference_id=n.reference_id,
                message=n.message,
                read=n.read,
                created_at=n.created_at.isoformat(),
            )
            for n in notifications
        ],
        unread_count=unread_count,
    )


@router.post("/{user_id}/read-all")
def mark_all_read(
    user_id: str,
    session: Session = Depends(get_session)
) -> dict:
    """Marquer toutes les notifications comme lues."""
    
    notifications = session.exec(
        select(Notification)
        .where(Notification.user_id == user_id)
        .where(Notification.read == False)
    ).all()
    
    for n in notifications:
        n.read = True
        session.add(n)
    
    session.commit()
    
    return {"marked_read": len(notifications)}


@router.post("/{notification_id}/read")
def mark_read(
    notification_id: str,
    session: Session = Depends(get_session)
) -> dict:
    """Marquer une notification comme lue."""
    
    notification = session.get(Notification, notification_id)
    if notification:
        notification.read = True
        session.add(notification)
        session.commit()
        return {"success": True}
    
    return {"success": False, "error": "Notification not found"}


@router.delete("/{notification_id}")
def delete_notification(
    notification_id: str,
    session: Session = Depends(get_session)
) -> dict:
    """Supprimer une notification."""
    
    notification = session.get(Notification, notification_id)
    if notification:
        session.delete(notification)
        session.commit()
        return {"success": True}
    
    return {"success": False, "error": "Notification not found"}




