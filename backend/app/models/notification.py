from sqlalchemy import Boolean, Column, String, DateTime, Text, Index, Integer, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database import Base
import uuid

class Notification(Base):
    __tablename__ = "notifications"
    __table_args__ = {'extend_existing': True}

    id = Column(Integer, primary_key=True, index=True)
    
    # --- Identifiers ---
    # Using operator_id as the main user identifier (matches User model)
    operator_id = Column(String, ForeignKey("users.operator_id"), nullable=False, index=True)
    notification_id = Column(String, unique=True, index=True, nullable=False, 
                           default=lambda: f"NOTIF-{uuid.uuid4().hex[:8].upper()}")
    
    # --- Content ---
    title = Column(String(200), nullable=False)
    message = Column(Text, nullable=False)
    priority = Column(String(20), nullable=False, default="MEDIUM")  # LOW, MEDIUM, HIGH, CRITICAL
    category = Column(String(50), nullable=False, default="system")  # system, security, kyc, payment, dispute, vault
    action_url = Column(String(500), nullable=True)
    
    # --- Status ---
    is_read = Column(Boolean, default=False)
    read_at = Column(DateTime(timezone=True), nullable=True)
    
    # --- Timestamps ---
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # --- 🖇️ RELATIONSHIPS ---
    # ✅ FIXED: Added relationship to User
    user = relationship(
        "User", 
        back_populates="notifications",
        primaryjoin="Notification.operator_id == User.operator_id",
        foreign_keys=[operator_id]
    )

    # Indexes for better query performance
    __table_args__ = (
        Index('ix_notifications_operator_unread', 'operator_id', 'is_read'),
        Index('ix_notifications_created_at', 'created_at'),
        Index('ix_notifications_priority', 'priority'),
    )

    def __repr__(self):
        return f"<Notification {self.notification_id} - {self.title} | User: {self.operator_id}>"

    def to_dict(self):
        """Convert notification to dictionary for API responses"""
        return {
            "id": self.notification_id,
            "user_id": self.operator_id,  # Keep as user_id for frontend compatibility
            "title": self.title,
            "message": self.message,
            "priority": self.priority,
            "category": self.category,
            "action_url": self.action_url,
            "is_read": self.is_read,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "read_at": self.read_at.isoformat() if self.read_at else None
        }