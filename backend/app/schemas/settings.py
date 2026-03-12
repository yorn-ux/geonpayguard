from datetime import datetime
from typing import Any, Dict, List, Optional, Union

from pydantic import BaseModel, ConfigDict, EmailStr, Field, validator


# ==================== USER SETTINGS SCHEMAS ====================

class ProfileData(BaseModel):
    """User profile information"""
    node_id: Optional[str] = None
    name: Optional[str] = None
    full_name: Optional[str] = None
    username: Optional[str] = None
    email: Optional[str] = None
    bio: Optional[str] = None
    country: Optional[str] = "Kenya"
    city: Optional[str] = "Nairobi"
    location: Optional[str] = None
    postal_code: Optional[str] = None
    phone: Optional[str] = None
    is_public: bool = True
    avatar: Optional[str] = None
    
    # Social links
    social: Optional[Dict[str, str]] = Field(default_factory=lambda: {
        "instagram": "",
        "twitter": "",
        "youtube": "",
        "tiktok": ""
    })
    
    model_config = ConfigDict(from_attributes=True)


class PaymentData(BaseModel):
    """User payment settings"""
    mpesa_number: Optional[str] = None
    payout_account: Optional[str] = None
    payout_method: Optional[str] = "M-Pesa"
    min_threshold: Optional[float] = 1000.0
    min_payout_threshold: Optional[float] = 1000.0
    auto_withdraw: Optional[bool] = False
    currency: Optional[str] = "KES"
    
    model_config = ConfigDict(from_attributes=True)


class VaultData(BaseModel):
    """User vault preferences"""
    auto_release_days: Optional[int] = 7
    require_contract: Optional[bool] = False
    email_notifications: Optional[bool] = True
    sms_alerts: Optional[bool] = False
    
    model_config = ConfigDict(from_attributes=True)


class NotificationPreferences(BaseModel):
    """User notification preferences"""
    email: Optional[bool] = True
    sms: Optional[bool] = False
    push: Optional[bool] = True
    vault_updates: Optional[bool] = True
    payments: Optional[bool] = True
    security: Optional[bool] = True
    
    model_config = ConfigDict(from_attributes=True)


class KYCData(BaseModel):
    """User KYC information"""
    kyc_status: str = "UNVERIFIED"
    withdrawal_locked: bool = True
    
    model_config = ConfigDict(from_attributes=True)


# ==================== BUSINESS SETTINGS SCHEMAS ====================

class CompanyData(BaseModel):
    """Business company information"""
    # Company Profile
    company_name: Optional[str] = None
    reg_number: Optional[str] = None
    tax_id: Optional[str] = None
    billing_address: Optional[str] = None
    business_email: Optional[str] = None
    business_phone: Optional[str] = None
    website: Optional[str] = None
    country: Optional[str] = "Kenya"
    city: Optional[str] = "Nairobi"
    postal_code: Optional[str] = None
    
    # Business Details
    business_type: Optional[str] = "Private Limited"
    industry: Optional[str] = "Financial Services"
    year_established: Optional[str] = "2024"
    employee_count: Optional[str] = "1-10"
    logo_url: Optional[str] = None
    description: Optional[str] = None
    
    # Financial Settings
    monthly_budget_limit: Optional[float] = 1000000.0
    dual_approval_required: Optional[bool] = True
    
    # Team (simplified for response)
    team_members: Optional[List[Dict[str, Any]]] = None
    
    # Verification
    verified: Optional[bool] = False
    
    model_config = ConfigDict(from_attributes=True)


class FinancialData(BaseModel):
    """Business financial settings"""
    monthly_budget_limit: Optional[float] = 1000000.0
    dual_approval_required: Optional[bool] = True
    min_payout_threshold: Optional[float] = 5000.0
    payout_method: Optional[str] = "M-Pesa"
    payout_account: Optional[str] = None
    auto_withdraw: Optional[bool] = False
    currency: Optional[str] = "KES"
    
    model_config = ConfigDict(from_attributes=True)


class TeamMember(BaseModel):
    """Team member information"""
    operator_id: str
    full_name: Optional[str] = None
    email: str
    role: str
    permissions: Optional[List[str]] = Field(default_factory=list)
    is_active: bool = True
    is_verified: bool = False
    is_suspended: bool = False
    assigned_pages: Optional[List[str]] = Field(default_factory=list)
    enrolled_by: Optional[str] = None
    enrolled_at: Optional[datetime] = None
    last_active: Optional[datetime] = None
    mfa_enabled: bool = False
    department: Optional[str] = None
    phone: Optional[str] = None
    notes: Optional[str] = None
    
    model_config = ConfigDict(from_attributes=True)


class TeamInvite(BaseModel):
    """Team invitation request"""
    email: EmailStr
    role: str
    full_name: Optional[str] = None
    permissions: Optional[List[str]] = Field(default_factory=list)
    department: Optional[str] = None
    phone: Optional[str] = None
    
    model_config = ConfigDict(from_attributes=True)


class TeamMemberUpdate(BaseModel):
    """Update team member information"""
    full_name: Optional[str] = None
    department: Optional[str] = None
    phone: Optional[str] = None
    notes: Optional[str] = None
    permissions: Optional[List[str]] = None
    
    model_config = ConfigDict(from_attributes=True)


class TeamRoleUpdate(BaseModel):
    """Update team member role"""
    role: str
    is_active: Optional[bool] = None
    
    model_config = ConfigDict(from_attributes=True)


class TeamSuspendRequest(BaseModel):
    """Suspend or reactivate team member"""
    suspend: bool
    
    model_config = ConfigDict(from_attributes=True)


# ==================== API KEY SCHEMAS ====================

class KeyCreate(BaseModel):
    """Create a new API key"""
    name: str
    permissions: Optional[List[str]] = Field(default_factory=list)
    
    model_config = ConfigDict(from_attributes=True)


class KeyResponse(BaseModel):
    """API key response (without secret)"""
    id: int
    name: str
    prefix: str
    usage_count: int = 0
    created_at: datetime
    last_used: Optional[datetime] = None
    revoked_at: Optional[datetime] = None
    
    model_config = ConfigDict(from_attributes=True)


class NewKeyResponse(KeyResponse):
    """API key response with secret (only returned once)"""
    secret: str
    
    model_config = ConfigDict(from_attributes=True)


# ==================== ANALYTICS SCHEMAS ====================

class RegionalData(BaseModel):
    """Regional distribution data"""
    label: str
    value: int
    users: str
    color: str
    
    model_config = ConfigDict(from_attributes=True)


class AnalyticsResponse(BaseModel):
    """Analytics overview response"""
    throughput: float
    escrow: float
    latency: str
    volumeHistory: List[float]
    regionalData: List[RegionalData]
    
    model_config = ConfigDict(from_attributes=True)


class TransactionResponse(BaseModel):
    """Transaction ledger entry"""
    id: str
    beneficiary: str
    status: str
    valueKes: float
    date: datetime
    nodeId: str
    
    model_config = ConfigDict(from_attributes=True)


class LedgerResponse(BaseModel):
    """Ledger response"""
    transactions: List[TransactionResponse]
    nodeStatus: str
    trustScore: str
    enterprise: Dict[str, str]
    
    model_config = ConfigDict(from_attributes=True)


# ==================== MASTER SETTINGS RESPONSE ====================

class UserSettingsResponse(BaseModel):
    """Complete user settings response"""
    profile: ProfileData
    payments: PaymentData
    vault: VaultData
    notifications: NotificationPreferences
    kyc: KYCData
    
    model_config = ConfigDict(from_attributes=True)


class BusinessSettingsResponse(BaseModel):
    """Complete business settings response"""
    profile: CompanyData
    financial: FinancialData
    team: List[TeamMember]
    settings: Dict[str, Any] = Field(default_factory=dict)
    
    model_config = ConfigDict(from_attributes=True)


class SovereignSyncPayload(BaseModel):
    """Unified settings payload for sync endpoint"""
    profile: ProfileData
    payments: PaymentData
    vault: VaultData
    notifications: NotificationPreferences
    kyc: KYCData
    company: Optional[CompanyData] = None
    platform: Optional[Dict[str, Any]] = None
    logs: Optional[List[Dict[str, Any]]] = None
    
    model_config = ConfigDict(from_attributes=True)


class SovereignSyncResponse(BaseModel):
    """Sovereign sync response"""
    role: str
    data: SovereignSyncPayload
    
    model_config = ConfigDict(from_attributes=True)


class SettingsUpdate(BaseModel):
    """Update a specific setting"""
    path: str
    value: Any
    ip_address: Optional[str] = None
    
    model_config = ConfigDict(from_attributes=True)


# ==================== PROFILE UPDATE SCHEMAS ====================

class ProfileUpdate(BaseModel):
    """Update user profile"""
    name: Optional[str] = None
    username: Optional[str] = None
    bio: Optional[str] = None
    location: Optional[str] = None
    phone: Optional[str] = None
    is_public: Optional[bool] = None
    country: Optional[str] = None
    
    model_config = ConfigDict(from_attributes=True)


class SocialLinksUpdate(BaseModel):
    """Update social media links"""
    instagram: Optional[str] = None
    twitter: Optional[str] = None
    youtube: Optional[str] = None
    tiktok: Optional[str] = None
    
    model_config = ConfigDict(from_attributes=True)


class BusinessProfileUpdate(BaseModel):
    """Update business profile"""
    company_name: Optional[str] = None
    reg_number: Optional[str] = None
    tax_id: Optional[str] = None
    billing_address: Optional[str] = None
    business_phone: Optional[str] = None
    website: Optional[str] = None
    country: Optional[str] = None
    city: Optional[str] = None
    postal_code: Optional[str] = None
    business_type: Optional[str] = None
    industry: Optional[str] = None
    year_established: Optional[str] = None
    employee_count: Optional[str] = None
    logo_url: Optional[str] = None
    description: Optional[str] = None
    
    model_config = ConfigDict(from_attributes=True)


class FinancialSettingsUpdate(BaseModel):
    """Update financial settings"""
    monthly_budget_limit: Optional[float] = None
    dual_approval_required: Optional[bool] = None
    min_payout_threshold: Optional[float] = None
    payout_method: Optional[str] = None
    payout_account: Optional[str] = None
    auto_withdraw: Optional[bool] = None
    currency: Optional[str] = None
    
    model_config = ConfigDict(from_attributes=True)


# ==================== SECURITY SCHEMAS ====================

class PasswordChange(BaseModel):
    """Change password request"""
    current_password: str
    new_password: str
    confirm_password: str
    
    @validator('new_password')
    def password_strength(cls, v):
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters')
        if not any(c.isupper() for c in v):
            raise ValueError('Password must contain at least one uppercase letter')
        if not any(c.islower() for c in v):
            raise ValueError('Password must contain at least one lowercase letter')
        if not any(c.isdigit() for c in v):
            raise ValueError('Password must contain at least one number')
        return v
    
    @validator('confirm_password')
    def passwords_match(cls, v, values, **kwargs):
        if 'new_password' in values and v != values['new_password']:
            raise ValueError('Passwords do not match')
        return v
    
    model_config = ConfigDict(from_attributes=True)


class TwoFactorSetup(BaseModel):
    """2FA setup response"""
    secret: str
    qr_code: str
    
    model_config = ConfigDict(from_attributes=True)


class TwoFactorVerify(BaseModel):
    """Verify 2FA code"""
    code: str
    
    @validator('code')
    def code_format(cls, v):
        if not v.isdigit() or len(v) != 6:
            raise ValueError('Code must be 6 digits')
        return v
    
    model_config = ConfigDict(from_attributes=True)


class SessionInfo(BaseModel):
    """Active session information"""
    id: str
    device: str
    location: str
    last_active: datetime
    current: bool = False
    
    model_config = ConfigDict(from_attributes=True)


# ==================== AVATAR SCHEMAS ====================

class AvatarResponse(BaseModel):
    """Avatar upload response"""
    url: str
    
    model_config = ConfigDict(from_attributes=True)


# ==================== AUDIT LOG SCHEMAS ====================

class AuditLogResponse(BaseModel):
    """Audit log entry"""
    id: int
    timestamp: datetime
    user: str
    action: str
    path: Optional[str] = None
    old_value: Optional[str] = None
    new_value: Optional[str] = None
    ip: Optional[str] = None
    
    model_config = ConfigDict(from_attributes=True)


# ==================== ERROR & SUCCESS SCHEMAS ====================

class ErrorResponse(BaseModel):
    """Error response"""
    detail: str
    status_code: int
    
    model_config = ConfigDict(from_attributes=True)


class SuccessResponse(BaseModel):
    """Success response"""
    status: str = "success"
    message: str
    id: Optional[Union[int, str]] = None
    target: Optional[str] = None
    mutation: Optional[Any] = None
    
    model_config = ConfigDict(from_attributes=True)

