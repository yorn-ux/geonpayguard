from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime

# Base Notification Schema
class NotificationBase(BaseModel):
    title: str = Field(..., max_length=200)
    message: str
    priority: str = Field("MEDIUM", pattern="^(LOW|MEDIUM|HIGH|CRITICAL)$")  # ✅ Changed regex to pattern
    category: str = Field("system", pattern="^(system|security|kyc|payment|dispute|vault|welcome)$")  # ✅ Changed regex to pattern
    action_url: Optional[str] = None

# Schema for creating a notification
class NotificationCreate(NotificationBase):
    operator_id: str

# Schema for updating a notification (mark as read)
class NotificationUpdate(BaseModel):
    is_read: bool = True

# Schema for notification response
class NotificationResponse(NotificationBase):
    id: str
    user_id: str  # This will be operator_id from model
    is_read: bool
    created_at: datetime
    read_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

# Schema for list of notifications
class NotificationList(BaseModel):
    notifications: List[NotificationResponse]
    unread_count: int

# Schema for mark as read response
class NotificationReadResponse(BaseModel):
    success: bool
    message: str

# Schema for delete response
class NotificationDeleteResponse(BaseModel):
    success: bool
    message: str

# Schema for notification count
class NotificationCount(BaseModel):
    total: int
    unread: int