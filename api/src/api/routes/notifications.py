"""API endpoints pour les notifications."""
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status, Header
from pydantic import BaseModel
from sqlmodel import Session, select

from ..db import get_session, set_session_user_id
from ..models import Notification, User
from ..utils.auth import decode_token

router = APIRouter(prefix="/notifications", tags=["notifications"])


def _get_current_user_required(
    authorization: Optional[str] = Header(None),
    session: Session = Depends(get_session),
) -> User:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="missing_token")
    token = authorization.split(" ", 1)[1]
    try:
        payload = decode_token(token)
        if payload.get("type") != "access":
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="invalid_token")
        user_id = payload.get("sub")
        user = session.get(User, user_id)
        if not user:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="user_not_found")
        set_session_user_id(session, str(user.id))
        return user
    except ValueError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="invalid_token")


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
    reference_id: Optional[str] = None,
) -> Notification:
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


@router.get("", response_model=NotificationListResponse)
def get_notifications(
    limit: int = Query(50, ge=1, le=100),
    session: Session = Depends(get_session),
    current_user: User = Depends(_get_current_user_required),
) -> NotificationListResponse:
    notifications = session.exec(
        select(Notification)
        .where(Notification.user_id == current_user.id)
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


@router.post("/read-all")
def mark_all_read(
    session: Session = Depends(get_session),
    current_user: User = Depends(_get_current_user_required),
) -> dict:
    notifications = session.exec(
        select(Notification)
        .where(Notification.user_id == current_user.id)
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
    session: Session = Depends(get_session),
    current_user: User = Depends(_get_current_user_required),
) -> dict:
    notification = session.get(Notification, notification_id)
    if not notification:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="notification_not_found")

    if notification.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="not_your_notification")

    notification.read = True
    session.add(notification)
    session.commit()
    return {"success": True}


@router.delete("/{notification_id}")
def delete_notification(
    notification_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(_get_current_user_required),
) -> dict:
    notification = session.get(Notification, notification_id)
    if not notification:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="notification_not_found")

    if notification.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="not_your_notification")

    session.delete(notification)
    session.commit()
    return {"success": True}
