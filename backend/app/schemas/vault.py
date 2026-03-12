from pydantic import BaseModel, Field, HttpUrl, ConfigDict
from typing import List, Optional, Any
from datetime import datetime
from decimal import Decimal

# --- 1. MILESTONE SCHEMAS ---

class MilestoneSchema(BaseModel):
    id: str
    title: str
    amount: Decimal # Using Decimal for financial precision
    deadline: str
    description: Optional[str] = None
    status: str = "pending"

    model_config = ConfigDict(from_attributes=True)

# --- 2. QUESTION SCHEMAS ---

class QuestionSchema(BaseModel):
    id: str
    question: str
    type: str = "text"  # text, file, multiple-choice, rating, yes-no
    options: Optional[List[str]] = []
    required: bool = True
    answer: Optional[Any] = None

    model_config = ConfigDict(from_attributes=True)

# --- 3. DELIVERABLE SCHEMAS ---

class DeliverableSchema(BaseModel):
    platform: str
    type: str
    quantity: int = 1
    video_length: Optional[str] = None
    requirements: List[str] = []

    model_config = ConfigDict(from_attributes=True)

# --- 4. CAMPAIGN / MARKETPLACE SCHEMAS ---

class CampaignResponse(BaseModel):
    """Feeds the CampaignBoard.tsx frontend"""
    id: str
    company_name: str
    title: str
    description: Optional[str] = None
    budget: Decimal
    currency: str = "KES"
    payout_method: str
    category: str
    goal: Optional[str] = "brand_awareness"
    deadline: str
    is_verified: bool
    slots_available: int
    is_active: bool
    
    # Timeline
    application_deadline: Optional[str] = None
    content_deadline: Optional[str] = None
    campaign_start: Optional[str] = None
    campaign_end: Optional[str] = None
    draft_deadline: Optional[str] = None
    
    # Media URLs
    cover_image: Optional[str] = None
    campaign_video: Optional[str] = None
    
    # Targeting
    locations: Optional[List[str]] = []
    min_followers: int = 1000
    min_engagement: Optional[Decimal] = 2.0
    age_range: Optional[List[str]] = []
    gender: str = "any"
    languages: Optional[List[str]] = []
    niches: Optional[List[str]] = []
    
    # Compensation
    compensation_type: str = "fixed"
    fixed_rate: Optional[Decimal] = 0
    creator_count: int = 1
    performance_commission: Optional[Decimal] = 0
    product_gifting: bool = False
    product_value: Optional[Decimal] = 0
    product_details: Optional[str] = None
    allow_negotiation: bool = False
    
    # Deliverables & Creative
    deliverables: Optional[List[dict]] = []
    mood_board: Optional[str] = None
    product_images: Optional[List[str]] = []
    brand_guidelines: Optional[str] = None
    music_files: Optional[List[str]] = []
    shot_list: Optional[str] = None
    
    # Legal
    usage_rights: str = "perpetual"
    exclusivity_months: int = 0
    disclosure_required: bool = True
    custom_terms: Optional[str] = None
    require_contract: bool = True
    contract_file: Optional[str] = None
    
    # Questions
    custom_questions: Optional[List[dict]] = []
    
    # Additional
    tags: Optional[List[str]] = []
    visibility: str = "public"
    allow_applications: bool = True
    auto_approve: bool = False
    
    # Vault Settings
    require_vault: bool = True
    release_rule: str = "multi-sig"
    
    # Business
    business_id: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class CampaignCreate(BaseModel):
    """Used for Admin/Brands to post new gigs"""
    company_name: str
    title: str
    description: str
    budget: Decimal
    category: str # UGC, Reels, etc.
    payout_method: str = "M-Pesa"
    goal: str = "brand_awareness"
    deadline: str # e.g. "3 Days left"
    slots_available: int = 1
    
    # Timeline
    application_deadline: Optional[str] = None
    content_deadline: Optional[str] = None
    campaign_start: Optional[str] = None
    campaign_end: Optional[str] = None
    draft_deadline: Optional[str] = None
    
    # Targeting
    locations: Optional[List[str]] = []
    min_followers: int = 1000
    min_engagement: Optional[Decimal] = 2.0
    age_range: Optional[List[str]] = []
    gender: str = "any"
    languages: Optional[List[str]] = []
    niches: Optional[List[str]] = []
    
    # Compensation
    compensation_type: str = "fixed"
    fixed_rate: Optional[Decimal] = 0
    creator_count: int = 1
    performance_commission: Optional[Decimal] = 0
    product_gifting: bool = False
    product_value: Optional[Decimal] = 0
    product_details: Optional[str] = None
    allow_negotiation: bool = False
    
    # Deliverables
    deliverables: Optional[List[dict]] = []
    
    # Legal
    usage_rights: str = "perpetual"
    exclusivity_months: int = 0
    disclosure_required: bool = True
    custom_terms: Optional[str] = None
    require_contract: bool = True
    
    # Questions
    custom_questions: Optional[List[dict]] = []
    
    # Additional
    tags: Optional[List[str]] = []
    visibility: str = "public"
    allow_applications: bool = True
    auto_approve: bool = False
    
    # Vault Settings
    require_vault: bool = True
    dispute_window: int = 7
    release_rule: str = "multi-sig"
    
    model_config = ConfigDict(from_attributes=True)

# --- 3. VAULT ENGINE SCHEMAS ---

class VaultCreate(BaseModel):
    title: str
    description: str
    # Map Frontend (vaultType) to Backend (vault_type)
    vaultType: str = Field(..., serialization_alias="vault_type")
    counterpartyHandle: str = Field(..., serialization_alias="counterparty_handle")
    socialPlatform: str = Field(..., serialization_alias="social_platform")
    amount: Decimal
    fundingParty: str
    releaseRule: str = Field(..., serialization_alias="release_rule")
    disputeWindow: int = Field(..., serialization_alias="dispute_window")
    milestones: List[MilestoneSchema] = []
    visibility: str = "private"
    wallet_address: str
    platform_fee: Decimal
    net_payout: Decimal
    tags: Optional[List[str]] = []

class VaultResponse(BaseModel):
    id: str
    transaction_hash: Optional[str] = None
    title: str
    description: Optional[str] = None
    vault_type: str 
    amount: Decimal
    platform_fee: Decimal
    net_payout: Decimal
    currency: str = "KES"
    status: str
    creator_id: str
    counterparty_id: Optional[str] = None
    counterparty_handle: Optional[str] = None
    social_platform: Optional[str] = None
    release_rule: Optional[str] = None
    dispute_window: Optional[int] = None
    milestones: Optional[List[dict]] = []
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

# --- 4. APPLICATION SCHEMAS ---

class CampaignApplication(BaseModel):
    operator_id: str
    platform: str
    social_handle: str
    pitch: str = Field(..., min_length=30)
    portfolio_link: HttpUrl
    delivery_time: str
    
    # Media & Assets
    media_kit: Optional[str] = None
    previous_work: Optional[List[str]] = []
    new_work_link: Optional[str] = None
    creative_samples: Optional[List[str]] = []
    mood_board: Optional[str] = None
    
    # Rates & Availability
    proposed_rate: Optional[Decimal] = 0
    currency: str = "KES"
    available_from: Optional[str] = None
    available_until: Optional[str] = None
    
    # Questions
    answers: Optional[dict] = {}
    
    # Additional
    notes: Optional[str] = None
    
    # Default factory for UTC time
    timestamp: datetime = Field(default_factory=datetime.utcnow)

    model_config = ConfigDict(from_attributes=True)