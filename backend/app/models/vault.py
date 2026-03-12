from sqlalchemy import Column, String, Numeric, Integer, JSON, DateTime, ForeignKey, Boolean, Index
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid
from app.database import Base 

class Campaign(Base):
    """The source of truth for the Marketplace."""
    __tablename__ = "campaigns"
    __table_args__ = (
        Index('ix_campaigns_status', 'is_active', 'category'),
        Index('ix_campaigns_created', 'created_at'),
        {'extend_existing': True}
    )

    id = Column(String, primary_key=True, default=lambda: f"CAMP-{uuid.uuid4().hex[:8].upper()}")
    company_name = Column(String, nullable=False)
    title = Column(String, nullable=False)
    description = Column(String)
    
    # Financials
    budget = Column(Numeric(precision=18, scale=2), nullable=False)
    currency = Column(String, default="KES")
    payout_method = Column(String, default="M-Pesa") # M-Pesa or Web3
    
    # Marketplace Logic
    category = Column(String) # UGC, Reels, Stories, etc.
    goal = Column(String, default="brand_awareness") # brand_awareness, conversions, etc.
    deadline = Column(String) # e.g., "3 Days left"
    is_verified = Column(Boolean, default=False)
    slots_available = Column(Integer, default=1)
    is_active = Column(Boolean, default=True)
    
    # Timeline
    application_deadline = Column(String)
    content_deadline = Column(String)
    campaign_start = Column(String)
    campaign_end = Column(String)
    draft_deadline = Column(String)
    
    # Media URLs
    cover_image = Column(String)
    campaign_video = Column(String)
    
    # Targeting
    locations = Column(JSON, default=list)
    min_followers = Column(Integer, default=1000)
    min_engagement = Column(Numeric(precision=5, scale=2), default=2.0)
    age_range = Column(JSON, default=list)
    gender = Column(String, default="any")
    languages = Column(JSON, default=list)
    niches = Column(JSON, default=list)
    
    # Compensation
    compensation_type = Column(String, default="fixed")
    fixed_rate = Column(Numeric(precision=18, scale=2), default=0)
    creator_count = Column(Integer, default=1)
    performance_commission = Column(Numeric(precision=5, scale=2), default=0)
    product_gifting = Column(Boolean, default=False)
    product_value = Column(Numeric(precision=18, scale=2), default=0)
    product_details = Column(String)
    allow_negotiation = Column(Boolean, default=False)
    
    # Deliverables & Creative
    deliverables = Column(JSON, default=list)
    mood_board = Column(String)
    product_images = Column(JSON, default=list)
    brand_guidelines = Column(String)
    music_files = Column(JSON, default=list)
    shot_list = Column(String)
    
    # Legal
    usage_rights = Column(String, default="perpetual")
    exclusivity_months = Column(Integer, default=0)
    disclosure_required = Column(Boolean, default=True)
    custom_terms = Column(String)
    require_contract = Column(Boolean, default=True)
    contract_file = Column(String)
    
    # Questions
    custom_questions = Column(JSON, default=list)
    
    # Additional
    tags = Column(JSON, default=list)
    visibility = Column(String, default="public")
    allow_applications = Column(Boolean, default=True)
    auto_approve = Column(Boolean, default=False)
    
    # Vault Settings
    require_vault = Column(Boolean, default=True)
    release_rule = Column(String, default="multi-sig")
    
    # Business owner (who created the campaign)
    business_id = Column(String, ForeignKey("users.operator_id"), index=True, nullable=False)

    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    
    # Link to applications
    applications = relationship("Application", back_populates="campaign", cascade="all, delete-orphan")
    
    # Relationship to business owner
    business = relationship("User", foreign_keys=[business_id])

class Vault(Base):
    """The Ledger for locked Escrow funds."""
    __tablename__ = "vaults"
    __table_args__ = (
        Index('ix_vaults_status', 'status'),
        Index('ix_vaults_participants', 'creator_id', 'counterparty_id'),
        Index('ix_vaults_created', 'created_at'),
        {'extend_existing': True}
    )

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    transaction_hash = Column(String, unique=True, index=True, nullable=True)
    title = Column(String, nullable=False)
    description = Column(String)
    vault_type = Column(String)  # 'escrow' or 'milestone'
    
    # Financials (High Precision)
    amount = Column(Numeric(precision=18, scale=2), nullable=False)
    platform_fee = Column(Numeric(precision=18, scale=2), default=0.00)
    net_payout = Column(Numeric(precision=18, scale=2), default=0.00)
    currency = Column(String, default="KES")
    
    # Participants
    creator_id = Column(String, ForeignKey("users.operator_id"), index=True, nullable=False)
    counterparty_id = Column(String, ForeignKey("users.operator_id"), index=True, nullable=True)
    
    counterparty_handle = Column(String)
    social_platform = Column(String)
    
    # State & Logic
    status = Column(String, default="active")  # active, pending, disputed, completed
    release_rule = Column(String)
    dispute_window = Column(Integer, default=7)
    milestones = Column(JSON, nullable=True) 
    
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    # Relationships
    creator = relationship("User", foreign_keys=[creator_id], back_populates="vaults_created")
    counterparty = relationship("User", foreign_keys=[counterparty_id], back_populates="vaults_involved")

class Application(Base):
    """The bridge between a Creator and a Campaign."""
    __tablename__ = "campaign_applications"
    __table_args__ = (
        Index('ix_applications_campaign', 'campaign_id', 'status'),
        Index('ix_applications_operator', 'operator_id', 'status'),
        Index('ix_applications_created', 'created_at'),
        {'extend_existing': True}
    )

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    
    # Foreign Keys
    campaign_id = Column(String, ForeignKey("campaigns.id"), index=True, nullable=False)
    operator_id = Column(String, ForeignKey("users.operator_id"), index=True, nullable=False)
    
    # Basic Info
    platform = Column(String)
    social_handle = Column(String)
    pitch = Column(String)
    portfolio_link = Column(String)
    delivery_time = Column(String)
    
    # Media & Assets
    media_kit = Column(String)
    previous_work = Column(JSON, default=list)
    new_work_link = Column(String)
    creative_samples = Column(JSON, default=list)
    mood_board = Column(String)
    
    # Rates & Availability
    proposed_rate = Column(Numeric(precision=18, scale=2), default=0)
    currency = Column(String, default="KES")
    available_from = Column(String)
    available_until = Column(String)
    
    # Questions
    answers = Column(JSON, default=dict)
    
    # Additional
    notes = Column(String)
    status = Column(String, default="pending") # pending, accepted, rejected, withdrawn
    
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    # Relationships
    campaign = relationship("Campaign", back_populates="applications")
    applicant = relationship("User", foreign_keys=[operator_id])