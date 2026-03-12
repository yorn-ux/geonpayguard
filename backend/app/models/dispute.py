from sqlalchemy import Column, String, Float, Integer, DateTime, JSON, ForeignKey, Index, Text
from sqlalchemy.orm import relationship
from app.database import Base
import datetime
import uuid

class Dispute(Base):
    __tablename__ = "disputes"
    __table_args__ = (
        Index('ix_disputes_status', 'status'),
        Index('ix_disputes_participants', 'initiator_id', 'counterparty_id'),  # FIXED: changed to initiator_id
        Index('ix_disputes_created', 'created_at'),
        Index('ix_disputes_risk', 'risk_score'),
        Index('ix_disputes_vault', 'vault_id'),  # Added for vault lookups
        {'extend_existing': True}
    )

    id = Column(String, primary_key=True, default=lambda: f"DIS-{uuid.uuid4().hex[:8].upper()}")
    
    # Foreign Keys to users
    initiator_id = Column(String, ForeignKey("users.operator_id"), nullable=False, index=True)
    counterparty_id = Column(String, ForeignKey("users.operator_id"), nullable=False, index=True)
    
    # Vault reference
    vault_id = Column(String, ForeignKey("vaults.id"), nullable=True, index=True)
    vault_title = Column(String, nullable=False)
    
    # Financial details
    amount = Column(Float, default=0.0)
    currency = Column(String, default="KES")
    
    # Dispute details
    reason = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    status = Column(String, default="OPEN")  # OPEN, UNDER_REVIEW, RESOLVED, CLOSED
    risk_score = Column(Integer, default=0)
    
    # Case data
    timeline = Column(JSON, default=[]) 
    evidence = Column(JSON, default=[])
    
    # Verdict
    verdict = Column(String, nullable=True)  # influencer, business, split, dismissed
    verdict_details = Column(Text, nullable=True)
    resolved_at = Column(DateTime, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime, default=lambda: datetime.datetime.now(datetime.timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.datetime.now(datetime.timezone.utc), onupdate=datetime.datetime.now(datetime.timezone.utc))

    # --- 🖇️ RELATIONSHIPS ---
    initiator = relationship(
        "User", 
        foreign_keys=[initiator_id],
        back_populates="disputes_initiated"
    )
    
    counterparty = relationship(
        "User", 
        foreign_keys=[counterparty_id],
        back_populates="disputes_involved"
    )
    
    vault = relationship("Vault", foreign_keys=[vault_id])

class SupportTicket(Base):
    __tablename__ = "support_tickets"
    __table_args__ = (
        Index('ix_tickets_status', 'status'),
        Index('ix_tickets_operator', 'operator_id', 'status'),
        Index('ix_tickets_created', 'created_at'),
        {'extend_existing': True}
    )

    id = Column(String, primary_key=True, default=lambda: f"SR-{uuid.uuid4().hex[:5].upper()}")
    
    # User reference
    operator_id = Column(String, ForeignKey("users.operator_id"), nullable=False, index=True)
    
    # Ticket details
    category = Column(String, nullable=False)  # technical, billing, dispute, general
    subject = Column(String, nullable=False)
    message = Column(Text, nullable=False)
    status = Column(String, default="PENDING")  # PENDING, ACTIVE, RESOLVED, CLOSED
    priority = Column(String, default="MEDIUM")  # LOW, MEDIUM, HIGH, CRITICAL
    
    # Attachments
    attachments = Column(JSON, default=[])
    
    # Admin response
    response = Column(Text, nullable=True)
    responded_by = Column(String, ForeignKey("users.operator_id"), nullable=True)
    responded_at = Column(DateTime, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime, default=lambda: datetime.datetime.now(datetime.timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.datetime.now(datetime.timezone.utc), onupdate=datetime.datetime.now(datetime.timezone.utc))
    resolved_at = Column(DateTime, nullable=True)

    # --- 🖇️ RELATIONSHIPS ---
    user = relationship(
        "User", 
        foreign_keys=[operator_id],
        back_populates="support_tickets"
    )
    
    responder = relationship(
        "User", 
        foreign_keys=[responded_by]
    )