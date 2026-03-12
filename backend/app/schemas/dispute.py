from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Literal
from datetime import datetime, timezone
import uuid

# --- ENUMS ---
Role = Literal['influencer', 'business', 'admin']
DisputeStatus = Literal['OPEN', 'UNDER_REVIEW', 'RESOLVED']
TicketStatus = Literal['PENDING', 'ACTIVE', 'RESOLVED']

# --- SUB-MODELS ---
class EvidenceSchema(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str 
    size: str 
    type: str 
    url: str 

class TimelineEvent(BaseModel):
    event: str
    date: str 

# --- DISPUTE MODELS ---
class DisputeBase(BaseModel):
    # alias ensures React can send 'vaultTitle' and Python reads 'vault_title'
    vault_title: str = Field(..., alias="vaultTitle")
    amount: float
    initiator: str
    counterparty: str
    reason: str
    description: str
    risk_score: int = Field(default=0, alias="riskScore")

class DisputeCreate(DisputeBase):
    pass

class Dispute(DisputeBase):
    id: str
    status: DisputeStatus = "OPEN"
    evidence: List[EvidenceSchema] = []
    timeline: List[TimelineEvent] = []
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    model_config = ConfigDict(
        populate_by_name=True,
        from_attributes=True
    )

# --- SUPPORT MODELS 🎫 ---
class SupportTicketBase(BaseModel):
    subject: str
    category: str
    message: str

class SupportTicketCreate(SupportTicketBase):
    """Schema for incoming POST requests from React"""
    pass

class SupportTicket(SupportTicketBase):
    """Schema for outgoing responses to React"""
    id: str
    status: TicketStatus = "PENDING"
    # Frontend expects 'createdAt' (camelCase)
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        alias="createdAt" 
    )

    model_config = ConfigDict(
        populate_by_name=True,
        from_attributes=True
    )