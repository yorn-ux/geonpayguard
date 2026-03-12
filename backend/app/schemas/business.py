from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional, List

# --- API KEY SCHEMAS ---

class KeyCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=50, example="Production Mobile App")

class KeyBase(BaseModel):
    id: str
    name: str
    prefix: str
    usage_count: int
    created_at: datetime
    revoked_at: Optional[datetime] = None

    class Config:
        from_attributes = True 

class KeyResponse(KeyBase):
    """Used for listing keys - Secret is never included here."""
    pass

class NewKeyResponse(KeyBase):
    """Returned only once during POST /api-keys."""
    secret: str = Field(..., description="The raw API secret. Only shown once.")


# --- TEAM & PERSONNEL SCHEMAS ---

class TeamMemberResponse(BaseModel):
    operator_id: str
    full_name: str
    email: str
    role: str # e.g., 'admin', 'operator'
    created_at: datetime

    class Config:
        from_attributes = True


# --- ANALYTICS & LEDGER SCHEMAS ---

class RegionalData(BaseModel):
    label: str
    value: int
    users: str
    color: str

class AnalyticsResponse(BaseModel):
    throughput: float
    escrow: float
    latency: str
    volumeHistory: List[float]
    regionalData: List[RegionalData]

class TransactionResponse(BaseModel):
    id: str
    beneficiary: str
    status: str # 'released' | 'pending' | 'escrow' | 'failed'
    valueKes: float
    date: datetime
    nodeId: str

class LedgerResponse(BaseModel):
    transactions: List[TransactionResponse]
    nodeStatus: str
    trustScore: str
    enterprise: dict # Contains 'name' and 'id'