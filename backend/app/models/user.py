from sqlalchemy import JSON, Column, String, Boolean, DateTime, Integer, Enum as SQLEnum, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from app.database import Base

class AccountRole(str, enum.Enum):
    INFLUENCER = "influencer"
    BUSINESS = "business"
    ADMIN = "admin"

class User(Base):
    __tablename__ = "users"
    __table_args__ = {'extend_existing': True} 

    id = Column(Integer, primary_key=True, index=True)
    
    # --- Identifiers ---
    operator_id = Column(String, unique=True, index=True, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    full_name = Column(String, nullable=False)
    business_name = Column(String, nullable=True)
    
    # --- Security ---
    hashed_password = Column(String, nullable=False)
    recovery_hash = Column(String, nullable=False)
    recovery_phrase = Column(String, nullable=True)
    
    # --- Verification ---
    verification_code = Column(String, nullable=True)
    verification_code_expires = Column(DateTime(timezone=True), nullable=True)
    is_verified = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)
    is_suspended = Column(Boolean, default=False)
    
    # --- Role ---
    role = Column(
        SQLEnum(AccountRole, native_enum=False, create_type=False), 
        default=AccountRole.INFLUENCER, 
        nullable=False
    )
    
    # --- KYC ---
    kyc_status = Column(String, default="UNVERIFIED")
    kyc_notes = Column(Text, nullable=True)
    kyc_documents = Column(JSON, default=[])
    kyc_verified_at = Column(DateTime(timezone=True), nullable=True)
    
    # --- Security & 2FA ---
    mfa_enabled = Column(Boolean, default=False)
    mfa_secret = Column(String, nullable=True)
    login_attempts = Column(Integer, default=0)
    locked_until = Column(DateTime(timezone=True), nullable=True)
    last_login_ip = Column(String, nullable=True)
    last_login_user_agent = Column(String, nullable=True)
    
    # --- Profile ---
    phone = Column(String, nullable=True)
    country = Column(String, default="Kenya")
    city = Column(String, default="Nairobi")
    avatar_url = Column(String, nullable=True)
    
    # --- Audit ---
    enrolled_by = Column(String, nullable=True, default="self_enroll")
    enrolled_at = Column(DateTime(timezone=True), nullable=True)
    last_login = Column(DateTime(timezone=True), nullable=True)
    deleted_at = Column(DateTime(timezone=True), nullable=True)
    
    # --- Timestamps ---
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # --- 🖇️ RELATIONSHIPS ---
    
    # 1. User Settings (One-to-One)
    settings = relationship(
        "UserSettings", 
        back_populates="user", 
        uselist=False, 
        cascade="all, delete-orphan",
        primaryjoin="User.operator_id == UserSettings.user_id",
        foreign_keys="[UserSettings.user_id]"
    )
    
    # 2. Business Metadata (One-to-One)
    business_metadata = relationship(
        "BusinessMetadata", 
        back_populates="owner",
        uselist=False, 
        cascade="all, delete-orphan",
        primaryjoin="User.operator_id == BusinessMetadata.owner_id",
        foreign_keys="[BusinessMetadata.owner_id]"
    )
    
    # 3. Transactions
    transactions = relationship(
        "Transaction", 
        back_populates="business", 
        cascade="all, delete-orphan",
        primaryjoin="User.operator_id == Transaction.operator_id",
        foreign_keys="[Transaction.operator_id]"
    )
    
    # 4. Wallet
    wallet = relationship(
        "Wallet", 
        back_populates="user", 
        uselist=False, 
        cascade="all, delete-orphan",
        primaryjoin="User.operator_id == Wallet.operator_id",
        foreign_keys="[Wallet.operator_id]"
    )

    # 5. Vaults Created/Involved
    vaults_created = relationship(
        "Vault",
        back_populates="creator",
        primaryjoin="User.operator_id == Vault.creator_id",
        foreign_keys="[Vault.creator_id]"
    )
    
    vaults_involved = relationship(
        "Vault",
        back_populates="counterparty",
        primaryjoin="User.operator_id == Vault.counterparty_id",
        foreign_keys="[Vault.counterparty_id]"
    )
    
    # 6. API Keys
    api_keys = relationship(
        "ApiKey", 
        back_populates="owner", 
        cascade="all, delete-orphan"
    )
    
    # 7. Notifications
    notifications = relationship(
        "Notification", 
        back_populates="user", 
        cascade="all, delete-orphan",
        primaryjoin="User.operator_id == Notification.operator_id",
        foreign_keys="[Notification.operator_id]"
    )
    
    # 8. Audit Logs
    audit_logs = relationship(
        "AuditLog", 
        back_populates="user_rel", 
        cascade="all, delete-orphan",
        primaryjoin="User.id == AuditLog.user_rel_id",
        foreign_keys="[AuditLog.user_rel_id]"
    )
    
    # 9. 🆕 Disputes (as initiator and counterparty)
    disputes_initiated = relationship(
        "Dispute",
        back_populates="initiator",
        primaryjoin="User.operator_id == Dispute.initiator_id",
        foreign_keys="[Dispute.initiator_id]",
        cascade="all, delete-orphan"
    )
    
    disputes_involved = relationship(
        "Dispute",
        back_populates="counterparty",
        primaryjoin="User.operator_id == Dispute.counterparty_id",
        foreign_keys="[Dispute.counterparty_id]",
        cascade="all, delete-orphan"
    )
    
    # 10. 🆕 Support Tickets
    support_tickets = relationship(
        "SupportTicket",
        back_populates="user",
        primaryjoin="User.operator_id == SupportTicket.operator_id",
        foreign_keys="[SupportTicket.operator_id]",
        cascade="all, delete-orphan"
    )
    
    # 11. 🆕 Campaigns (as business owner)
    campaigns = relationship(
        "Campaign",
        back_populates="business",
        primaryjoin="User.operator_id == Campaign.business_id",
        foreign_keys="[Campaign.business_id]",
        cascade="all, delete-orphan"
    )
    
    # 12. 🆕 Campaign Applications (as applicant)
    campaign_applications = relationship(
        "Application",
        back_populates="applicant",
        primaryjoin="User.operator_id == Application.operator_id",
        foreign_keys="[Application.operator_id]",
        cascade="all, delete-orphan"
    )

    def __repr__(self):
        return f"<User {self.operator_id} - {self.email} | Role: {self.role}>"