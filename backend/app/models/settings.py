from sqlalchemy import Column, Integer, String, Boolean, Float, ForeignKey, JSON, DateTime, Text, Index
from sqlalchemy.orm import relationship
import datetime
from app.database import Base
from app.models.notification import Notification 

class UserSettings(Base):
    __tablename__ = "user_settings"
    __table_args__ = {'extend_existing': True}

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, ForeignKey("users.operator_id"), nullable=False)  # Removed unique and index from here
    
    # 1. Identity Core
    full_name = Column(String)
    username = Column(String, unique=True, nullable=True)
    bio = Column(Text, default="")
    country = Column(String, default="Kenya")
    city = Column(String, default="Nairobi")
    location = Column(String, default="")
    postal_code = Column(String, default="")
    is_public = Column(Boolean, default=True)
    phone = Column(String, nullable=True)
    
    # Contact Information
    business_phone = Column(String, nullable=True)
    website = Column(String, nullable=True)
    avatar_url = Column(String, nullable=True)
    
    # Social Links
    social_links = Column(JSON, default={
        "instagram": "",
        "tiktok": "",
        "youtube": "",
        "twitter": "",
        "linkedin": "",
        "facebook": ""
    })
    
    # 2. Trust Guard
    kyc_status = Column(String, default="PENDING")
    withdrawal_locked = Column(Boolean, default=True)
    kyc_notes = Column(Text, nullable=True)
    kyc_documents = Column(JSON, default=[])
    
    # 3. Liquidity Rails
    payout_method = Column(String, default="paypal")
    paypal_email = Column(String, nullable=True)
    crypto_address = Column(String, nullable=True)
    min_payout_threshold = Column(Float, default=1000.0)
    auto_withdraw = Column(Boolean, default=False)
    currency = Column(String, default="KES")
    
    # 4. Engine Configuration
    vault_config = Column(JSON, default={
        "auto_release_days": 7, 
        "require_contract": False,
        "allow_split": False,
        "default_dispute_window": 3,
        "email_notifications": True,
        "sms_alerts": False
    })
    
    # 5. Notification Preferences
    notif_matrix = Column(JSON, default={
        "email": True, 
        "sms": False, 
        "push": True,
        "vault_updates": True,
        "payments": True,
        "security": True,
        "marketing": False,
        "security_alerts": True
    })
    
    # 6. Security Settings
    mfa_enabled = Column(Boolean, default=False)
    mfa_secret = Column(String, nullable=True)
    last_login_ip = Column(String, nullable=True)
    last_login_at = Column(DateTime, nullable=True)
    login_attempts = Column(Integer, default=0)
    locked_until = Column(DateTime, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)
    
    # 🟢 Relationship to User
    user = relationship(
        "User", 
        back_populates="settings",
        primaryjoin="UserSettings.user_id == User.operator_id",
        foreign_keys=[user_id]
    )
    
    # ❌ REMOVED: problematic business relationship


class BusinessMetadata(Base):
    __tablename__ = "business_metadata"
    __table_args__ = {'extend_existing': True}

    id = Column(Integer, primary_key=True)
    owner_id = Column(String, ForeignKey("users.operator_id", ondelete="CASCADE"), unique=True, index=True)
    
    # Company Profile
    company_name = Column(String, nullable=False)
    reg_number = Column(String, nullable=True)
    tax_id = Column(String, nullable=True)
    billing_address = Column(String, default="")
    
    # Business Details
    business_type = Column(String, default="Private Limited")
    industry = Column(String, default="Financial Services")
    year_established = Column(String, default="2024")
    employee_count = Column(String, default="1-10")
    logo_url = Column(String, nullable=True)
    description = Column(Text, nullable=True)
    
    # Financial Settings
    monthly_budget_limit = Column(Float, default=1000000.0)
    dual_approval_required = Column(Boolean, default=True)
    business_email = Column(String, nullable=True)
    
    # Team
    team_members = Column(JSON, default=[])
    pending_invites = Column(JSON, default=[])
    
    # Business verification
    verified = Column(Boolean, default=False)
    verification_documents = Column(JSON, default=[])
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    # 🟢 Relationship to User
    owner = relationship(
        "User", 
        back_populates="business_metadata",
        primaryjoin="BusinessMetadata.owner_id == User.operator_id",
        foreign_keys=[owner_id]
    )
    
    # 🟢 FIXED: Relationship to UserSettings using viewonly
    user_settings = relationship(
        "UserSettings",
        primaryjoin="BusinessMetadata.owner_id == UserSettings.user_id",
        foreign_keys=[owner_id],
        viewonly=True
    )
    
    # API Keys relationship
    api_keys = relationship("ApiKey", back_populates="business", cascade="all, delete-orphan")


class PlatformConfig(Base):
    __tablename__ = "platform_config"
    __table_args__ = {'extend_existing': True}

    id = Column(Integer, primary_key=True, default=1)
    
    platform_fee_percent = Column(Float, default=5.0)
    risk_auto_flag_limit = Column(Integer, default=3)
    max_vault_amount = Column(Float, default=1000000.0)
    escalation_delay = Column(String, default="24 Hours")
    dispute_auto_resolution = Column(String, default="14 Days")
    payout_cycle = Column(String, default="Real-time (STK)")
    auto_flag_node_threshold = Column(Integer, default=3)
    hard_freeze_vault_threshold = Column(Float, default=500000.0)
    enforce_biometric_for_admins = Column(Boolean, default=False)
    freeze_website = Column(Boolean, default=False)
    freeze_message = Column(String, default="System maintenance in progress. Please check back later.")
    blacklist = Column(JSON, default=[])
    features_enabled = Column(JSON, default={
        "vaults": True,
        "campaigns": True,
        "disputes": True,
        "api_access": True,
        "team_management": True
    })
    maintenance_mode = Column(Boolean, default=False)
    maintenance_message = Column(String, default="System undergoing scheduled maintenance.")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)


class BroadcastMessage(Base):
    __tablename__ = "broadcast_messages"
    __table_args__ = {'extend_existing': True}

    id = Column(Integer, primary_key=True)
    title = Column(String, nullable=False)
    message = Column(Text, nullable=False)
    priority = Column(String, default="info")
    type = Column(String, default="system")
    target_role = Column(String, default="all")
    target_users = Column(JSON, default=[])
    created_by = Column(Integer, ForeignKey("user_settings.id"), nullable=True)
    created_by_email = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    expires_at = Column(DateTime, nullable=True)
    active = Column(Boolean, default=True)
    read_by = Column(JSON, default=[])
    delivered_to = Column(JSON, default=[])
    action_url = Column(String, nullable=True)
    action_text = Column(String, nullable=True)
    
    creator = relationship("UserSettings", foreign_keys=[created_by])

class AuditLog(Base):
    __tablename__ = "audit_logs"
    __table_args__ = {'extend_existing': True}

    id = Column(Integer, primary_key=True)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow, index=True)
    user = Column(String, nullable=False)
    user_id = Column(String, nullable=True)
    action = Column(String, nullable=False, index=True)
    resource_type = Column(String, nullable=True)
    resource_id = Column(String, nullable=True)
    path = Column(String, nullable=True)
    old_value = Column(Text, nullable=True)
    new_value = Column(Text, nullable=True)
    ip_address = Column(String, nullable=True)
    user_agent = Column(String, nullable=True)
    status = Column(String, default="success")
    log_metadata = Column(JSON, default={})
    
    # 🟢 Relationship to User
    user_rel_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    user_rel = relationship(
        "User", 
        back_populates="audit_logs",
        foreign_keys=[user_rel_id]
    )

# Indexes - Define each index only once
Index('ix_audit_logs_timestamp_desc', AuditLog.timestamp.desc())
Index('ix_audit_logs_user_action', AuditLog.user, AuditLog.action)
Index('ix_audit_logs_resource', AuditLog.resource_type, AuditLog.resource_id)
Index('ix_audit_logs_user_id', AuditLog.user_id)

Index('ix_broadcast_active_expires', BroadcastMessage.active, BroadcastMessage.expires_at)
Index('ix_broadcast_target_role', BroadcastMessage.target_role)

# Notification indexes - only define if Notification is available
try:
    from app.models.notification import Notification
    Index('ix_notifications_user_unread', Notification.operator_id, Notification.is_read)
    Index('ix_notifications_created_desc', Notification.created_at.desc())
except ImportError:
    pass

# Business metadata index
Index('ix_business_owner', BusinessMetadata.owner_id)

# UserSettings indexes - defined ONCE here (not in the column definitions)
Index('ix_user_settings_user_id', UserSettings.user_id, unique=True)  # Unique index
Index('ix_user_settings_username', UserSettings.username)  # Regular index
