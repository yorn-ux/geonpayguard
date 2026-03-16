from pydantic import BaseModel, Field, EmailStr, ConfigDict
from typing import Optional, Dict, Any, List
from enum import Enum
from datetime import datetime
from decimal import Decimal

# --- ENUMS (Aligned with DB Models) ---

class TransactionStatus(str, Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"

class TransactionType(str, Enum):
    DEPOSIT = "deposit"
    WITHDRAWAL = "withdrawal"
    CONVERSION = "conversion"
    TRANSFER = "transfer"
    ESCROW_LOCK = "escrow_lock"
    ESCROW_RELEASE = "escrow_release"

class PaymentMethod(str, Enum):
    PAYPAL = "paypal"
    CARD = "card"
    CRYPTO = "crypto"
    INTERNAL = "internal"

class CryptoNetwork(str, Enum):
    BEP20 = "bep20"
    ERC20 = "erc20"
    TRC20 = "trc20"

# --- SUB-MODELS ---

class CardData(BaseModel):
    number: str = Field(..., description="Full card number without spaces")
    expiry: str = Field(..., pattern=r"^(0[1-9]|1[0-2])\/?([0-9]{2})$")
    cvc: str = Field(..., min_length=3, max_length=4)

# --- REQUEST SCHEMAS ---

class DepositRequest(BaseModel):
    amount: Decimal = Field(..., gt=10)
    method: PaymentMethod
    currency: str = Field("KES", pattern="^(KES|USDT)$")
    phone: Optional[str] = Field(None, pattern=r"^\+?[1-9]\d{1,14}$")
    card_data: Optional[CardData] = None

class WithdrawalRequest(BaseModel):
    amount: Decimal = Field(..., gt=0)
    method: PaymentMethod
    currency: str = Field(..., pattern="^(KES|USDT)$")
    phone: Optional[str] = None
    network: Optional[CryptoNetwork] = None
    address: Optional[str] = None
    expected_fee: Optional[Decimal] = None 

class ConversionRequest(BaseModel):
    from_currency: str = Field(..., pattern="^(KES|USDT)$")
    to_currency: str = Field(..., pattern="^(KES|USDT)$")
    amount: Decimal = Field(..., gt=0)

# --- RESPONSE SCHEMAS ---

class TransactionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True) # Modern Pydantic V2 config

    id: str # UUID String
    operator_id: str # 🎯 Keeping it anchored on Operator ID
    tx_type: TransactionType
    status: TransactionStatus
    amount: Decimal
    fee: Decimal
    net_amount: Decimal
    currency: str
    provider: Optional[str]
    tx_ref: str
    metadata_json: Optional[Dict[str, Any]] = None
    created_at: datetime
    completed_at: Optional[datetime] = None

class WalletBalance(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    operator_id: str # 🎯 Crucial for frontend identity check
    kes_balance: Decimal
    usdt_balance: Decimal
    escrow_balance: Decimal
    is_locked: bool
    # total_usd_valuation is often calculated at runtime or via a helper
    total_usd_valuation: Optional[Decimal] = Decimal("0.00") 
    updated_at: datetime

class RevenueSummary(BaseModel):
    """Specific for the Admin Revenue Tab"""
    total_revenue_usd: Decimal
    platform_fees_kes: Decimal
    net_balance_usd: Decimal
    available_kes: Decimal
    available_usdt: Decimal
    transactions: List[TransactionResponse]