import uuid
import enum
from sqlalchemy import Column, String, Numeric, Enum, DateTime, ForeignKey, JSON, Index, Boolean, Integer
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base

class TransactionStatus(str, enum.Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    RELEASED = "released" 
    ESCROW = "escrow"     
    FAILED = "failed"
    CANCELLED = "cancelled"

class TransactionType(str, enum.Enum):
    DEPOSIT = "deposit"
    WITHDRAWAL = "withdrawal"
    CONVERSION = "conversion"
    TRANSFER = "transfer"
    ESCROW_LOCK = "escrow_lock"
    ESCROW_RELEASE = "escrow_release"

class Wallet(Base):
    __tablename__ = "wallets"
    __table_args__ = {'extend_existing': True}

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    # Universal identifier link
    operator_id = Column(String, ForeignKey("users.operator_id"), nullable=False, unique=True)
    
    kes_balance = Column(Numeric(precision=18, scale=2), default=0.00)
    usdt_balance = Column(Numeric(precision=18, scale=8), default=0.00000000)
    escrow_balance = Column(Numeric(precision=18, scale=2), default=0.00)
    
    is_locked = Column(Boolean, default=False)
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    
    # --- 🖇️ RELATIONSHIPS ---
    user = relationship("User", back_populates="wallet")
    transactions = relationship("Transaction", back_populates="wallet", cascade="all, delete-orphan")

class Transaction(Base):
    __tablename__ = "transactions"
    __table_args__ = (
        Index('ix_wallet_created_at', 'wallet_id', 'created_at'),
        Index('ix_operator_analytics', 'operator_id', 'status', 'created_at'),
        Index('ix_transaction_status', 'status'),  # Added for faster status queries
        Index('ix_transaction_created', 'created_at'),  # Added for date range queries
        Index('ix_transaction_provider', 'provider', 'provider_ref'),  # New index for provider lookups
        {'extend_existing': True}
    )

    id = Column(String, primary_key=True, default=lambda: f"TX-{uuid.uuid4().hex[:8].upper()}")
    wallet_id = Column(String, ForeignKey("wallets.id"), nullable=True)
    
    # --- Identity Fields ---
    operator_id = Column(String, ForeignKey("users.operator_id"), nullable=False, index=True)
    business_id = Column(String, ForeignKey("users.operator_id"), nullable=True, index=True)  # FIXED: Changed to String to match operator_id
    
    tx_type = Column(Enum(TransactionType), nullable=True)  # FIXED: removed native_enum=False for SQLite
    status = Column(Enum(TransactionStatus), default=TransactionStatus.PENDING)  # FIXED: removed native_enum=False
    
    amount = Column(Numeric(precision=18, scale=8), nullable=False)
    fee = Column(Numeric(precision=18, scale=8), default=0.00)
    net_amount = Column(Numeric(precision=18, scale=8), nullable=False)
    currency = Column(String(10), nullable=False)
    
    # --- Business Data ---
    beneficiary_name = Column(String(255), nullable=True)
    beneficiary_phone = Column(String(20), nullable=True)
    region = Column(String(100), nullable=True) 
    node_id = Column(String(50), nullable=True)
    tx_ref = Column(String(100), unique=True, index=True) 
    
    # --- Payment Provider Fields ---
    provider = Column(String(50), nullable=True)  # 'mpesa', 'internal', etc.
    provider_ref = Column(String(100), nullable=True, index=True)  # M-Pesa checkout_request_id or conversation_id
    provider_data = Column(JSON, nullable=True)  # Store full provider response
    
    metadata_json = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=func.now())
    completed_at = Column(DateTime, nullable=True)
    
    # --- Failure tracking ---
    failure_reason = Column(String(500), nullable=True)

    # --- 🖇️ RELATIONSHIPS ---
    wallet = relationship("Wallet", back_populates="transactions")
    
    # FIXED: Changed to use operator_id for both relationships
    business = relationship(
        "User", 
        back_populates="transactions",
        primaryjoin="Transaction.operator_id == User.operator_id",
        foreign_keys=[operator_id]
    )
    
    # FIXED: Added relationship for business_id if needed
    counterparty = relationship(
        "User",
        primaryjoin="Transaction.business_id == User.operator_id",
        foreign_keys=[business_id],
        viewonly=True
    )
    
    revenue_record = relationship("PlatformRevenue", back_populates="transaction", uselist=False, cascade="all, delete-orphan")

class PlatformRevenue(Base):
    __tablename__ = "platform_revenue"
    __table_args__ = {'extend_existing': True}
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    transaction_id = Column(String, ForeignKey("transactions.id"), unique=True)  # Added unique=True
    amount_kes = Column(Numeric(precision=18, scale=2), nullable=False)
    source = Column(String(50))
    created_at = Column(DateTime, default=func.now())
    
    transaction = relationship("Transaction", back_populates="revenue_record")
