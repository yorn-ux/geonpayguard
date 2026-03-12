from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from datetime import datetime, timezone
from typing import List

from app.database import get_db
from app.models.notification import Notification
from app.schemas.notification import (
    NotificationResponse,
    NotificationReadResponse,
    NotificationDeleteResponse,
    NotificationList,
    NotificationCount
)
from app.routes.auth import get_current_user

router = APIRouter(tags=["Notifications"])


@router.get("/notifications/{operator_id}", response_model=List[NotificationResponse])
async def get_user_notifications(
    operator_id: str,
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Get notifications for a specific user.
    Users can only see their own notifications.
    """
    # Security check - users can only see their own notifications
    current_id = current_user.get('operator_id')
    if current_user.get('role') != 'admin' and current_id != operator_id:
        raise HTTPException(status_code=403, detail="You can only view your own notifications")
    
    # Get notifications from database
    notifications = db.query(Notification).filter(
        Notification.operator_id == operator_id
    ).order_by(Notification.created_at.desc()).limit(limit).all()
    
    # Format response
    return [
        NotificationResponse.model_validate({
            "id": n.notification_id,
            "user_id": n.operator_id,
            "title": n.title,
            "message": n.message,
            "priority": n.priority,
            "category": n.category,
            "is_read": n.is_read,
            "action_url": n.action_url,
            "created_at": n.created_at,
            "read_at": n.read_at
        }) for n in notifications
    ]


@router.get("/notifications/{operator_id}/with-count", response_model=NotificationList)
async def get_user_notifications_with_count(
    operator_id: str,
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Get notifications for a specific user with unread count.
    """
    # Security check
    current_id = current_user.get('operator_id')
    if current_user.get('role') != 'admin' and current_id != operator_id:
        raise HTTPException(status_code=403, detail="You can only view your own notifications")
    
    # Get notifications
    notifications = db.query(Notification).filter(
        Notification.operator_id == operator_id
    ).order_by(Notification.created_at.desc()).limit(limit).all()
    
    # Get unread count
    unread_count = db.query(Notification).filter(
        Notification.operator_id == operator_id,
        Notification.is_read == False
    ).count()
    
    # Format response
    return NotificationList(
        notifications=[
            NotificationResponse.model_validate({
                "id": n.notification_id,
                "user_id": n.operator_id,
                "title": n.title,
                "message": n.message,
                "priority": n.priority,
                "category": n.category,
                "is_read": n.is_read,
                "action_url": n.action_url,
                "created_at": n.created_at,
                "read_at": n.read_at
            }) for n in notifications
        ],
        unread_count=unread_count
    )


@router.post("/notifications/{notification_id}/read", response_model=NotificationReadResponse)
async def mark_notification_read(
    notification_id: str,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Mark a specific notification as read.
    """
    operator_id = current_user.get('operator_id')
    
    # Find the notification
    notification = db.query(Notification).filter(
        Notification.notification_id == notification_id,
        Notification.operator_id == operator_id
    ).first()
    
    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")
    
    # Mark as read
    notification.is_read = True
    notification.read_at = datetime.now(timezone.utc)
    db.commit()
    
    return {"success": True, "message": "Notification marked as read"}


@router.post("/notifications/mark-all-read/{operator_id}", response_model=NotificationReadResponse)
async def mark_all_notifications_read(
    operator_id: str,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Mark all notifications for a user as read.
    """
    # Security check
    current_id = current_user.get('operator_id')
    if current_user.get('role') != 'admin' and current_id != operator_id:
        raise HTTPException(status_code=403, detail="You can only mark your own notifications as read")
    
    # Update all unread notifications
    result = db.query(Notification).filter(
        Notification.operator_id == operator_id,
        Notification.is_read == False
    ).update({
        "is_read": True,
        "read_at": datetime.now(timezone.utc)
    })
    
    db.commit()
    
    return {
        "success": True, 
        "message": f"{result} notifications marked as read"
    }


@router.delete("/notifications/{notification_id}", response_model=NotificationDeleteResponse)
async def delete_notification(
    notification_id: str,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Delete a specific notification.
    """
    operator_id = current_user.get('operator_id')
    
    notification = db.query(Notification).filter(
        Notification.notification_id == notification_id,
        Notification.operator_id == operator_id
    ).first()
    
    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")
    
    db.delete(notification)
    db.commit()
    
    return {"success": True, "message": "Notification deleted"}


# ===== NEW ENDPOINT: Clear all notifications =====
@router.delete("/notifications/clear-all/{operator_id}", response_model=NotificationDeleteResponse)
async def clear_all_notifications(
    operator_id: str,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Delete ALL notifications for a user.
    This is a destructive operation - use with caution.
    """
    # Security check
    current_id = current_user.get('operator_id')
    if current_user.get('role') != 'admin' and current_id != operator_id:
        raise HTTPException(status_code=403, detail="You can only clear your own notifications")
    
    # Count notifications before deletion (for response message)
    count = db.query(Notification).filter(
        Notification.operator_id == operator_id
    ).count()
    
    # Delete all notifications for the user
    result = db.query(Notification).filter(
        Notification.operator_id == operator_id
    ).delete(synchronize_session=False)
    
    db.commit()
    
    return {
        "success": True, 
        "message": f"Successfully cleared {result} notifications"
    }


# ===== OPTIONAL: Clear only read notifications =====
@router.delete("/notifications/clear-read/{operator_id}", response_model=NotificationDeleteResponse)
async def clear_read_notifications(
    operator_id: str,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Delete only read notifications for a user.
    Keeps unread notifications intact.
    """
    # Security check
    current_id = current_user.get('operator_id')
    if current_user.get('role') != 'admin' and current_id != operator_id:
        raise HTTPException(status_code=403, detail="You can only clear your own notifications")
    
    # Count read notifications before deletion
    count = db.query(Notification).filter(
        Notification.operator_id == operator_id,
        Notification.is_read == True
    ).count()
    
    # Delete all read notifications
    result = db.query(Notification).filter(
        Notification.operator_id == operator_id,
        Notification.is_read == True
    ).delete(synchronize_session=False)
    
    db.commit()
    
    return {
        "success": True, 
        "message": f"Successfully cleared {result} read notifications"
    }


# ===== OPTIONAL: Clear notifications older than X days =====
@router.delete("/notifications/clear-old/{operator_id}", response_model=NotificationDeleteResponse)
async def clear_old_notifications(
    operator_id: str,
    days: int = Query(30, ge=1, le=365),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Delete notifications older than specified days.
    """
    # Security check
    current_id = current_user.get('operator_id')
    if current_user.get('role') != 'admin' and current_id != operator_id:
        raise HTTPException(status_code=403, detail="You can only clear your own notifications")
    
    # Calculate cutoff date
    cutoff_date = datetime.now(timezone.utc).replace(tzinfo=None)
    cutoff_date = cutoff_date.replace(hour=0, minute=0, second=0, microsecond=0)
    from datetime import timedelta
    cutoff_date = cutoff_date - timedelta(days=days)
    
    # Delete old notifications
    result = db.query(Notification).filter(
        Notification.operator_id == operator_id,
        Notification.created_at < cutoff_date
    ).delete(synchronize_session=False)
    
    db.commit()
    
    return {
        "success": True, 
        "message": f"Successfully cleared {result} notifications older than {days} days"
    }


@router.get("/notifications/{operator_id}/unread-count", response_model=NotificationCount)
async def get_unread_count(
    operator_id: str,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Get the number of unread notifications for a user.
    """
    # Security check
    current_id = current_user.get('operator_id')
    if current_user.get('role') != 'admin' and current_id != operator_id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    total = db.query(Notification).filter(
        Notification.operator_id == operator_id
    ).count()
    
    unread = db.query(Notification).filter(
        Notification.operator_id == operator_id,
        Notification.is_read == False
    ).count()
    
    return NotificationCount(total=total, unread=unread)