import secrets
import hashlib
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException, Query, Body
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, or_
from typing import List, Optional, Dict, Any

from ..database import get_db
from ..models.business import ApiKey
from ..models.settings import BusinessMetadata, UserSettings
from ..models.wallet import Transaction as TxModel, TransactionStatus 
from ..models.user import User
from ..schemas.business import (
    KeyCreate, KeyResponse, NewKeyResponse, 
    TeamMemberResponse, AnalyticsResponse, RegionalData,
    TransactionResponse, LedgerResponse
)
from ..schemas.settings import (
    BusinessProfileUpdate, FinancialSettingsUpdate, BusinessSettingsResponse,
    TeamMember, TeamInvite, SuccessResponse, ErrorResponse,
    )
from ..schemas.notification import NotificationCreate
from .auth import create_notification, get_current_user


router = APIRouter(tags=["Business Infrastructure"])

# ==================== BUSINESS PROFILE SETTINGS ====================

@router.get("/settings", response_model=BusinessSettingsResponse)
async def get_business_settings(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get comprehensive business settings including profile, team, and preferences."""
    user_id = current_user.get('operator_id') or current_user.get('id')
    role = current_user.get('role', '').upper()
    
    if role not in ['BUSINESS', 'ADMIN']:
        raise HTTPException(status_code=403, detail="Business access required")
    
    # Get business metadata
    business = db.query(BusinessMetadata).filter(
        BusinessMetadata.owner_id == user_id
    ).first()
    
    # Get user settings
    user_settings = db.query(UserSettings).filter(
        UserSettings.user_id == user_id
    ).first()
    
    # Get team members (users enrolled by this business)
    team_members = db.query(User).filter(
        User.enrolled_by == current_user.get('email')
    ).all()
    
    # Build profile data
    profile_data = {
        "company_name": business.company_name if business else None,
        "reg_number": business.reg_number if business else None,
        "tax_id": business.tax_id if business else None,
        "billing_address": business.billing_address if business else None,
        "business_email": current_user.get('email'),
        "business_phone": user_settings.business_phone if user_settings else None,
        "website": user_settings.website if user_settings else None,
        "country": user_settings.country if user_settings else None,
        "city": user_settings.city if user_settings else None,
        "postal_code": user_settings.postal_code if user_settings else None,
        "business_type": business.business_type if business else None,
        "industry": business.industry if business else None,
        "year_established": business.year_established if business else None,
        "employee_count": business.employee_count if business else None,
        "logo_url": business.logo_url if business else None,
        "description": business.description if business else None
    }
    
    # Build financial data
    financial_data = {
        "monthly_budget_limit": business.monthly_budget_limit if business else None,
        "dual_approval_required": business.dual_approval_required if business else None,
        "min_payout_threshold": user_settings.min_payout_threshold if user_settings else None,
        "payout_method": user_settings.payout_method if user_settings else None,
        "payout_account": user_settings.payout_account if user_settings else None,
        "auto_withdraw": user_settings.auto_withdraw if user_settings else None,
        "currency": user_settings.currency if user_settings else None
    }
    
    # Build team data
    team_data = [
        {
            "operator_id": member.operator_id,
            "full_name": member.full_name,
            "email": member.email,
            "role": member.role,
            "permissions": [],  # You can add permissions logic here
            "is_active": member.is_active,
            "joined_at": member.created_at,
            "last_login": member.last_login
        }
        for member in team_members
    ]
    
    # Build settings data
    settings_data = {
        "notifications": user_settings.notif_matrix if user_settings else {},
        "vault_config": user_settings.vault_config if user_settings else {}
    }
    
    return BusinessSettingsResponse(
        profile=profile_data,
        financial=financial_data,
        team=team_data,
        settings=settings_data
    )

@router.patch("/settings/profile", response_model=SuccessResponse)
async def update_business_profile(
    updates: BusinessProfileUpdate,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update business profile information."""
    user_id = current_user.get('operator_id') or current_user.get('id')
    
    business = db.query(BusinessMetadata).filter(
        BusinessMetadata.owner_id == user_id
    ).first()
    
    if not business:
        raise HTTPException(status_code=404, detail="Business profile not found")
    
    # Update business fields
    update_data = updates.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        if hasattr(business, field):
            setattr(business, field, value)
    
    # Update user settings for contact info
    user_settings = db.query(UserSettings).filter(
        UserSettings.user_id == user_id
    ).first()
    
    if user_settings:
        if updates.business_phone is not None:
            user_settings.business_phone = updates.business_phone
        if updates.website is not None:
            user_settings.website = updates.website
        if updates.country is not None:
            user_settings.country = updates.country
        if updates.city is not None:
            user_settings.city = updates.city
        if updates.postal_code is not None:
            user_settings.postal_code = updates.postal_code
    
    db.commit()
    
    return SuccessResponse(
        message="Profile updated successfully",
        target="business_profile"
    )

@router.patch("/settings/financial", response_model=SuccessResponse)
async def update_financial_settings(
    updates: FinancialSettingsUpdate,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update financial settings like budget limits and payout preferences."""
    user_id = current_user.get('operator_id') or current_user.get('id')
    
    business = db.query(BusinessMetadata).filter(
        BusinessMetadata.owner_id == user_id
    ).first()
    
    if not business:
        raise HTTPException(status_code=404, detail="Business profile not found")
    
    user_settings = db.query(UserSettings).filter(
        UserSettings.user_id == user_id
    ).first()
    
    if not user_settings:
        user_settings = UserSettings(user_id=user_id)
        db.add(user_settings)
    
    # Update business financial fields
    update_data = updates.model_dump(exclude_unset=True)
    
    if "monthly_budget_limit" in update_data:
        business.monthly_budget_limit = update_data["monthly_budget_limit"]
    if "dual_approval_required" in update_data:
        business.dual_approval_required = update_data["dual_approval_required"]
    
    # Update user payment settings
    if "min_payout_threshold" in update_data:
        user_settings.min_payout_threshold = update_data["min_payout_threshold"]
    if "payout_method" in update_data:
        user_settings.payout_method = update_data["payout_method"]
    if "payout_account" in update_data:
        user_settings.payout_account = update_data["payout_account"]
    if "auto_withdraw" in update_data:
        user_settings.auto_withdraw = update_data["auto_withdraw"]
    if "currency" in update_data:
        user_settings.currency = update_data["currency"]
    
    db.commit()
    
    return SuccessResponse(
        message="Financial settings updated",
        target="financial_settings"
    )

# ==================== TEAM MANAGEMENT ====================

@router.get("/team", response_model=List[TeamMember])
async def get_team(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all team members for the business."""
    user_id = current_user.get('operator_id') or current_user.get('id')
    
    # Get business to access team members
    business = db.query(BusinessMetadata).filter(
        BusinessMetadata.owner_id == user_id
    ).first()
    
    if not business:
        return []
    
    # Get team members from database
    team_members = db.query(User).filter(
        User.enrolled_by == current_user.get('email')
    ).all()
    
    return [
        TeamMember(
            operator_id=member.operator_id,
            full_name=member.full_name,
            email=member.email,
            role=member.role,
            permissions=[],  # You can add permissions logic here
            is_active=member.is_active,
            joined_at=member.created_at,
            last_login=member.last_login
        )
        for member in team_members
    ]

@router.post("/team/invite", response_model=SuccessResponse)
async def invite_team_member(
    invite: TeamInvite,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Invite a new team member to join the business."""
    user_id = current_user.get('operator_id') or current_user.get('id')
    
    business = db.query(BusinessMetadata).filter(
        BusinessMetadata.owner_id == user_id
    ).first()
    
    if not business:
        raise HTTPException(status_code=404, detail="Business profile not found")
    
    # Check if user already exists
    existing_user = db.query(User).filter(
        User.email == invite.email.lower()
    ).first()
    
    if existing_user:
        raise HTTPException(status_code=400, detail="User already registered")
    
    # Add to pending invites
    if not business.pending_invites:
        business.pending_invites = []
    
    invite_data = {
        "email": invite.email,
        "role": invite.role,
        "permissions": invite.permissions or [],
        "invited_at": datetime.now(timezone.utc).isoformat(),
        "expires_at": (datetime.now(timezone.utc) + timedelta(days=7)).isoformat(),
        "token": secrets.token_urlsafe(32)
    }
    
    business.pending_invites.append(invite_data)
    db.commit()
    
    # TODO: Send invitation email
    
    return SuccessResponse(
        message=f"Invitation sent to {invite.email}",
        id=invite_data["token"]
    )

@router.post("/team/invite/{token}/resend", response_model=SuccessResponse)
async def resend_invitation(
    token: str,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Resend invitation to a team member."""
    user_id = current_user.get('operator_id') or current_user.get('id')
    
    business = db.query(BusinessMetadata).filter(
        BusinessMetadata.owner_id == user_id
    ).first()
    
    if not business or not business.pending_invites:
        raise HTTPException(status_code=404, detail="Invitation not found")
    
    # Find the invitation
    for invite in business.pending_invites:
        if invite.get("token") == token:
            invite["invited_at"] = datetime.now(timezone.utc).isoformat()
            db.commit()
            
            # TODO: Resend email
            return SuccessResponse(
                message=f"Invitation resent to {invite['email']}"
            )
    
    raise HTTPException(status_code=404, detail="Invitation not found")

@router.delete("/team/{member_id}", response_model=SuccessResponse)
async def remove_team_member(
    member_id: str,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Remove a team member from the business."""
    user_id = current_user.get('operator_id') or current_user.get('id')
    
    # Check if removing self
    if member_id == user_id:
        raise HTTPException(status_code=400, detail="Cannot remove yourself")
    
    # Find the team member
    team_member = db.query(User).filter(
        User.operator_id == member_id
    ).first()
    
    if not team_member:
        raise HTTPException(status_code=404, detail="Team member not found")
    
    # Remove enrollment
    team_member.enrolled_by = None
    
    db.commit()
    
    # Notify the removed member
    create_notification(
        db=db,
        operator_id=member_id,
        title="Team Access Revoked",
        message="You have been removed from the business team",
        priority="MEDIUM",
        category="team"
    )
    
    return SuccessResponse(
        message="Team member removed successfully"
    )

@router.patch("/team/{member_id}/role", response_model=SuccessResponse)
async def update_team_member_role(
    member_id: str,
    role: str = Body(..., embed=True),
    is_active: Optional[bool] = Body(None, embed=True),
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update a team member's role or active status."""
    user_id = current_user.get('operator_id') or current_user.get('id')
    
    team_member = db.query(User).filter(
        User.operator_id == member_id
    ).first()
    
    if not team_member:
        raise HTTPException(status_code=404, detail="Team member not found")
    
    # Update role
    team_member.role = role
    
    # Update active status if provided
    if is_active is not None:
        team_member.is_active = is_active
    
    db.commit()
    
    # Notify the member
    create_notification(
        db=db,
        operator_id=member_id,
        title="Team Role Updated",
        message=f"Your role has been updated to {role}",
        priority="LOW",
        category="team"
    )
    
    return SuccessResponse(
        message="Team member updated successfully"
    )

# ==================== API KEY MANAGEMENT ====================

@router.get("/api-keys", response_model=List[KeyResponse])
async def list_keys(
    current_user: dict = Depends(get_current_user), 
    db: Session = Depends(get_db)
):
    """Lists all active API keys for the current business operator."""
    user_id = current_user.get('operator_id') or current_user.get('id')
    
    keys = db.query(ApiKey).filter(
        ApiKey.owner_id == user_id, 
        ApiKey.revoked_at == None
    ).all()
    
    return keys

@router.post("/api-keys", response_model=NewKeyResponse)
async def create_key(
    payload: KeyCreate, 
    current_user: dict = Depends(get_current_user), 
    db: Session = Depends(get_db)
):
    """Generates a secure API key and returns the secret only once."""
    user_id = current_user.get('operator_id') or current_user.get('id')
    
    raw_secret = f"ak_live_{secrets.token_urlsafe(32)}"
    hashed_key = hashlib.sha256(raw_secret.encode()).hexdigest()
    prefix = f"{raw_secret[:12]}...{raw_secret[-4:]}"
    
    new_key = ApiKey(
        name=payload.name,
        key_hash=hashed_key,
        prefix=prefix,
        owner_id=user_id,
        created_at=datetime.now(timezone.utc)
    )
    db.add(new_key)
    db.commit()
    db.refresh(new_key)
    
    # Log API key creation
    create_notification(
        db=db,
        operator_id=user_id,
        title="API Key Created",
        message=f"New API key '{payload.name}' was created",
        priority="MEDIUM",
        category="security"
    )
    
    return NewKeyResponse(
        id=new_key.id,
        name=new_key.name,
        prefix=new_key.prefix,
        usage_count=0,
        created_at=new_key.created_at,
        secret=raw_secret
    )

@router.delete("/api-keys/{key_id}", response_model=SuccessResponse)
async def revoke_key(
    key_id: str, 
    current_user: dict = Depends(get_current_user), 
    db: Session = Depends(get_db)
):
    """Soft-revokes an API key to disable access while maintaining logs."""
    user_id = current_user.get('operator_id') or current_user.get('id')
    
    key = db.query(ApiKey).filter(
        ApiKey.id == key_id, 
        ApiKey.owner_id == user_id
    ).first()
    
    if not key: 
        raise HTTPException(status_code=404, detail="Key identity not found")
        
    key.revoked_at = datetime.now(timezone.utc)
    db.commit()
    
    create_notification(
        db=db,
        operator_id=user_id,
        title="API Key Revoked",
        message=f"API key '{key.name}' was revoked",
        priority="MEDIUM",
        category="security"
    )
    
    return SuccessResponse(
        message="Key access terminated",
        target=f"api_key:{key_id}"
    )

# ==================== ANALYTICS ====================

@router.get("/analytics/overview", response_model=AnalyticsResponse)
async def get_analytics(
    period: str = Query("1M", pattern="^(1W|1M|1Y)$"),
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Calculates real-time throughput, escrow, and volume history for charts."""
    user_id = current_user.get('operator_id') or current_user.get('id')
    now = datetime.now(timezone.utc)
    
    delta_map = {"1W": timedelta(days=7), "1M": timedelta(days=30), "1Y": timedelta(days=365)}
    start_date = now - delta_map.get(period, delta_map["1M"])

    # Throughput (Sum of COMPLETED or RELEASED payments)
    throughput = db.query(func.sum(TxModel.amount)).filter(
        TxModel.business_id == user_id,
        TxModel.status.in_([TransactionStatus.COMPLETED, TransactionStatus.RELEASED]),
        TxModel.created_at >= start_date
    ).scalar() or 0

    # Escrow (Current locked funds)
    escrow = db.query(func.sum(TxModel.amount)).filter(
        TxModel.business_id == user_id,
        TxModel.status.in_([TransactionStatus.PENDING, TransactionStatus.ESCROW])
    ).scalar() or 0

    # Volume History (Daily grouping)
    history_query = db.query(
        func.date(TxModel.created_at).label("day"),
        func.sum(TxModel.amount).label("daily_sum")
    ).filter(
        TxModel.business_id == user_id,
        TxModel.created_at >= start_date
    ).group_by("day").order_by("day").all()
    
    volume_history = [float(row.daily_sum) for row in history_query]

    # Regional Distribution
    regional_query = db.query(
        TxModel.region,
        func.count(TxModel.id).label("tx_count")
    ).filter(
        TxModel.business_id == user_id
    ).group_by(TxModel.region).all()

    total_tx = sum(r.tx_count for r in regional_query) or 1
    colors = ["bg-rose-600", "bg-slate-900", "bg-slate-400", "bg-emerald-500"]
    
    regional_data = [
        RegionalData(
            label=r.region or "External",
            value=round((r.tx_count / total_tx) * 100),
            users=f"{r.tx_count} tx",
            color=colors[idx % len(colors)]
        )
        for idx, r in enumerate(regional_query)
    ]

    return AnalyticsResponse(
        throughput=float(throughput),
        escrow=float(escrow),
        latency="22ms",
        volumeHistory=volume_history if volume_history else [0] * 12,
        regionalData=regional_data
    )

# ==================== LEDGER ====================

@router.get("/ledger", response_model=LedgerResponse)
async def get_ledger(
    current_user: dict = Depends(get_current_user), 
    db: Session = Depends(get_db)
):
    """Fetches the live settlement ledger and node health metrics."""
    user_id = current_user.get('operator_id') or current_user.get('id')
    
    # Get transactions
    try:
        transactions = db.query(TxModel).filter(
            TxModel.business_id == user_id
        ).order_by(TxModel.created_at.desc()).limit(15).all()
    except Exception as e:
        print(f"Error querying transactions: {e}")
        transactions = []

    # Calculate trust score
    try:
        total_tx = db.query(TxModel).filter(TxModel.business_id == user_id).count()
        failed_tx = db.query(TxModel).filter(
            TxModel.business_id == user_id, 
            TxModel.status == TransactionStatus.FAILED
        ).count()
        
        trust_score = 100.0 if total_tx == 0 else round(((total_tx - failed_tx) / total_tx) * 100, 1)
    except:
        trust_score = 100.0

    # Build transaction responses
    transaction_responses = [
        TransactionResponse(
            id=str(tx.id),
            beneficiary=tx.beneficiary_name or "Internal Transfer",
            status=tx.status.value if hasattr(tx.status, 'value') else str(tx.status),
            valueKes=float(tx.amount),
            date=tx.created_at or datetime.now(timezone.utc),
            nodeId=tx.node_id or "Node-Alpha"
        )
        for tx in transactions
    ]

    return LedgerResponse(
        transactions=transaction_responses,
        nodeStatus="Active" if trust_score > 50 else "Degraded",
        trustScore=f"{trust_score}%",
        enterprise={
            "name": current_user.get('full_name', 'Business'),
            "id": user_id
        }
    )

# ==================== HEALTH CHECK ====================

@router.get("/health")
async def health_check():
    """Simple health check endpoint for business services."""
    return {
        "status": "healthy",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "service": "business-routes"
    }