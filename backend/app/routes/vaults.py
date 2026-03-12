from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status, Query, UploadFile, File, Form
from sqlalchemy.orm import Session
from sqlalchemy import or_, select, func
from typing import List, Optional, Any
import uuid
from decimal import Decimal

# Core Imports
from app.database import get_db
from app.models.vault import Vault, Application, Campaign
from app.models.wallet import Wallet, Transaction, TransactionType, TransactionStatus
from app.schemas.vault import (
    VaultCreate, 
    VaultResponse, 
    CampaignApplication, 
    CampaignResponse,
    CampaignCreate
)
from .auth import get_current_user

router = APIRouter(tags=["Vaults"])

# --- 1. ENGINE UTILITIES ---

def calculate_platform_fee(amount: Decimal) -> Decimal:
    """
    Tiered Fee Logic for the Sovereign Engine.
    3% for small gigs, scaling down for high-value enterprise contracts.
    """
    if amount < 50000:
        rate = Decimal("0.03")
    elif amount < 200000:
        rate = Decimal("0.025")
    else:
        rate = Decimal("0.015")
    return (amount * rate).quantize(Decimal("0.01"))

def map_status_to_code(status_str: str) -> int:
    """
    Maps string status to integer codes for the Frontend Progress Bar.
    1: Draft, 2: Locked, 3: Working, 4: Review, 5: Paid
    """
    mapping = {
        "draft": 1,
        "active": 2,
        "locked": 2,
        "in_progress": 3,
        "working": 3,
        "review": 4,
        "completed": 5,
        "paid": 5
    }
    return mapping.get(status_str.lower(), 1)

# --- 2. CAMPAIGN MARKETPLACE ---

@router.get("/campaigns", response_model=List[CampaignResponse], tags=["Campaigns"])
async def list_public_campaigns(
    category: Optional[str] = None, 
    db: Session = Depends(get_db)
):
    stmt = select(Campaign).where(Campaign.is_active == True)
    if category and category != "All":
        stmt = stmt.where(Campaign.category == category)
    
    stmt = stmt.order_by(Campaign.created_at.desc())
    result = db.execute(stmt)
    return result.scalars().all()

# --- 3. THE VAULT ENGINE (DELEGATED LEDGER) ---

@router.post("/deploy", status_code=status.HTTP_201_CREATED)
async def deploy_vault(
    payload: VaultCreate, 
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    operator_id = current_user["operator_id"]
    wallet = db.query(Wallet).filter(Wallet.operator_id == operator_id).with_for_update().first()
    
    if not wallet:
        raise HTTPException(404, "Sovereign Wallet not initialized")

    total_amount = Decimal(str(payload.amount))
    if wallet.kes_balance < total_amount:
        raise HTTPException(400, detail="Insufficient balance")

    calculated_fee = calculate_platform_fee(total_amount)
    net_payout = total_amount - calculated_fee
    vault_id = str(uuid.uuid4())
    
    new_vault = Vault(
        id=vault_id,
        title=payload.title,
        description=payload.description,
        vault_type=payload.vaultType,
        amount=total_amount,
        platform_fee=calculated_fee,
        net_payout=net_payout,
        creator_id=operator_id, 
        counterparty_handle=payload.counterpartyHandle,
        social_platform=payload.socialPlatform,
        release_rule=payload.releaseRule,
        dispute_window=payload.disputeWindow,
        milestones=[m.dict() for m in payload.milestones] if payload.milestones else [],
        status="active"
    )

    wallet.kes_balance -= total_amount
    db.add(new_vault)
    db.commit()
    db.refresh(new_vault)

    return {"status": "success", "vault_id": new_vault.id}

# --- 4. DATA ACCESS & ANALYTICS ---

@router.get("/latest")
async def get_latest_vault(
    operator_id: str, 
    role: str = "user", 
    db: Session = Depends(get_db)
):
    """
    Feeds the InfluencerDashboard 'Active Collaboration' card.
    Expects status_code for the UI progress items.
    """
    stmt = select(Vault).where(
        or_(Vault.creator_id == operator_id, Vault.counterparty_handle == operator_id)
    ).order_by(Vault.created_at.desc())
    
    vault = db.execute(stmt).scalars().first()
    
    if not vault:
        return None

    # Transform for Frontend expectations
    return {
        "vault_id": vault.id,
        "title": vault.title,
        "status": vault.status,
        "status_code": map_status_to_code(vault.status),
        "amount": float(vault.amount),
        "created_at": vault.created_at
    }

@router.get("/stats")
async def get_vault_stats(
    current_user: dict = Depends(get_current_user), 
    db: Session = Depends(get_db)
):
    op_id = current_user["operator_id"]
    stmt = select(
        func.count(Vault.id).label("total"),
        func.sum(Vault.amount).label("total_volume")
    ).where(or_(Vault.creator_id == op_id, Vault.counterparty_handle == op_id))
    
    res = db.execute(stmt).first()
    app_count = db.query(Application).filter(Application.operator_id == op_id).count()

    return {
        "active_count": res.total or 0,
        "total_locked": float(res.total_volume or 0),
        "pending_applications": app_count
    }

@router.get("/{vault_id}", response_model=VaultResponse)
async def get_vault_details(vault_id: str, db: Session = Depends(get_db)):
    if vault_id == "NEW":
        return {
            "id": "NEW", "title": "", "amount": Decimal("0"), "status": "draft",
            "vault_type": "standard", "creator_id": "system", "created_at": datetime.utcnow(),
            "platform_fee": Decimal("0"), "net_payout": Decimal("0"), "currency": "KES",
            "milestones": []
        }

    stmt = select(Vault).where(Vault.id == vault_id)
    vault = db.execute(stmt).scalars().first()

    if not vault:
        raise HTTPException(status_code=404, detail="Vault not found")
    return vault

# --- 5. MARKETPLACE ACTIONS ---

@router.post("/campaigns/create", status_code=status.HTTP_201_CREATED)
async def create_campaign(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
    # Basic Info
    title: str = Form(...),
    description: str = Form(...),
    category: str = Form("beauty"),
    goal: str = Form("brand_awareness"),
    company_name: str = Form(""),
    
    # Timeline
    application_deadline: str = Form(""),
    content_deadline: str = Form(""),
    campaign_start: str = Form(""),
    campaign_end: str = Form(""),
    draft_deadline: str = Form(""),
    
    # Budget
    total_budget: float = Form(0),
    currency: str = Form("KES"),
    compensation_type: str = Form("fixed"),
    fixed_rate: float = Form(0),
    creator_count: int = Form(1),
    performance_commission: float = Form(0),
    product_gifting: bool = Form(False),
    product_value: float = Form(0),
    product_details: str = Form(""),
    allow_negotiation: bool = Form(False),
    
    # Targeting
    locations: str = Form("[]"),
    min_followers: int = Form(1000),
    min_engagement: float = Form(2.0),
    age_range: str = Form('["18-34"]'),
    gender: str = Form("any"),
    languages: str = Form("[]"),
    niches: str = Form("[]"),
    
    # Deliverables
    deliverables: str = Form("[]"),
    
    # Legal
    usage_rights: str = Form("perpetual"),
    exclusivity_months: int = Form(0),
    disclosure_required: bool = Form(True),
    custom_terms: str = Form(""),
    require_contract: bool = Form(True),
    
    # Questions
    custom_questions: str = Form("[]"),
    
    # Additional
    tags: str = Form("[]"),
    visibility: str = Form("public"),
    allow_applications: bool = Form(True),
    auto_approve: bool = Form(False),
    
    # Vault Settings
    require_vault: bool = Form(True),
    dispute_window: int = Form(7),
    release_rule: str = Form("multi-sig"),
    
    # Files
    cover_image: UploadFile = File(None),
    campaign_video: UploadFile = File(None),
    mood_board: UploadFile = File(None),
    product_images: List[UploadFile] = File([]),
    brand_guidelines: UploadFile = File(None),
    music_files: List[UploadFile] = File([]),
    shot_list: UploadFile = File(None),
    contract_file: UploadFile = File(None),
):
    """
    Create a new campaign with all the fields from the frontend CampaignModal.
    Handles both form data and file uploads.
    """
    import json
    import asyncio
    import os
    
    operator_id = current_user["operator_id"]
    
    # Parse JSON fields
    try:
        locations_list = json.loads(locations) if locations else []
        age_range_list = json.loads(age_range) if age_range else ["18-34"]
        languages_list = json.loads(languages) if languages else []
        niches_list = json.loads(niches) if niches else []
        deliverables_list = json.loads(deliverables) if deliverables else []
        custom_questions_list = json.loads(custom_questions) if custom_questions else []
        tags_list = json.loads(tags) if tags else []
    except json.JSONDecodeError:
        raise HTTPException(400, detail="Invalid JSON format in form fields")
    
    # Create campaign ID
    campaign_id = f"CAMP-{uuid.uuid4().hex[:8].upper()}"
    
    # Handle file uploads - store paths (in production, upload to S3/cloud storage)
    cover_image_path = None
    campaign_video_path = None
    mood_board_path = None
    product_images_paths = []
    brand_guidelines_path = None
    music_files_paths = []
    shot_list_path = None
    contract_file_path = None
    
    # For now, we'll just save file names (in production, upload to cloud storage)
    if cover_image:
        cover_image_path = f"campaigns/{campaign_id}/cover_{cover_image.filename}"
    if campaign_video:
        campaign_video_path = f"campaigns/{campaign_id}/video_{campaign_video.filename}"
    if mood_board:
        mood_board_path = f"campaigns/{campaign_id}/moodboard_{mood_board.filename}"
    if product_images:
        for img in product_images:
            product_images_paths.append(f"campaigns/{campaign_id}/product_{img.filename}")
    if brand_guidelines:
        brand_guidelines_path = f"campaigns/{campaign_id}/guidelines_{brand_guidelines.filename}"
    if music_files:
        for music in music_files:
            music_files_paths.append(f"campaigns/{campaign_id}/music_{music.filename}")
    if shot_list:
        shot_list_path = f"campaigns/{campaign_id}/shotlist_{shot_list.filename}"
    if contract_file:
        contract_file_path = f"campaigns/{campaign_id}/contract_{contract_file.filename}"
    
    # Calculate deadline string
    deadline_str = f"{application_deadline}" if application_deadline else "Open"
    
    # Create campaign
    new_campaign = Campaign(
        id=campaign_id,
        company_name=company_name or operator_id,
        title=title,
        description=description,
        budget=Decimal(str(total_budget)),
        currency=currency,
        payout_method="M-Pesa",
        category=category,
        goal=goal,
        deadline=deadline_str,
        slots_available=creator_count,
        
        # Timeline
        application_deadline=application_deadline,
        content_deadline=content_deadline,
        campaign_start=campaign_start,
        campaign_end=campaign_end,
        draft_deadline=draft_deadline,
        
        # Media URLs
        cover_image=cover_image_path,
        campaign_video=campaign_video_path,
        
        # Targeting
        locations=locations_list,
        min_followers=min_followers,
        min_engagement=Decimal(str(min_engagement)),
        age_range=age_range_list,
        gender=gender,
        languages=languages_list,
        niches=niches_list,
        
        # Compensation
        compensation_type=compensation_type,
        fixed_rate=Decimal(str(fixed_rate)),
        creator_count=creator_count,
        performance_commission=Decimal(str(performance_commission)),
        product_gifting=product_gifting,
        product_value=Decimal(str(product_value)),
        product_details=product_details if product_details else None,
        allow_negotiation=allow_negotiation,
        
        # Deliverables
        deliverables=deliverables_list,
        mood_board=mood_board_path,
        product_images=product_images_paths,
        brand_guidelines=brand_guidelines_path,
        music_files=music_files_paths,
        shot_list=shot_list_path,
        
        # Legal
        usage_rights=usage_rights,
        exclusivity_months=exclusivity_months,
        disclosure_required=disclosure_required,
        custom_terms=custom_terms if custom_terms else None,
        require_contract=require_contract,
        contract_file=contract_file_path,
        
        # Questions
        custom_questions=custom_questions_list,
        
        # Additional
        tags=tags_list,
        visibility=visibility,
        allow_applications=allow_applications,
        auto_approve=auto_approve,
        
        # Vault Settings
        require_vault=require_vault,
        dispute_window=dispute_window,
        release_rule=release_rule,
        
        # Business
        business_id=operator_id,
        is_active=True
    )
    
    db.add(new_campaign)
    db.commit()
    db.refresh(new_campaign)
    
    return {
        "status": "success",
        "id": new_campaign.id,
        "message": "Campaign created successfully"
    }

# --- 7. APPLY TO CAMPAIGN WITH FORM DATA ---

@router.post("/campaigns/{campaign_id}/apply")
async def apply_to_campaign_form(
    campaign_id: str,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
    # Basic Info
    platform: str = Form("instagram"),
    social_handle: str = Form(...),
    pitch: str = Form(...),
    portfolio: str = Form(...),
    delivery_days: str = Form("3"),
    
    # Media & Assets
    media_kit: UploadFile = File(None),
    previous_work: str = Form("[]"),
    new_work_link: str = Form(""),
    creative_samples: List[UploadFile] = File([]),
    mood_board: UploadFile = File(None),
    
    # Rates & Availability
    proposed_rate: float = Form(0),
    currency: str = Form("KES"),
    available_from: str = Form(""),
    available_until: str = Form(""),
    
    # Questions
    answers: str = Form("{}"),
    
    # Additional
    notes: str = Form(""),
):
    """
    Apply to a campaign with form data including file uploads.
    """
    import json
    
    campaign = db.get(Campaign, campaign_id)
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign no longer active")
    
    if not campaign.allow_applications:
        raise HTTPException(status_code=400, detail="This campaign is not accepting applications")
    
    operator_id = current_user["operator_id"]
    
    # Parse JSON fields
    try:
        previous_work_list = json.loads(previous_work) if previous_work else []
        answers_dict = json.loads(answers) if answers else {}
    except json.JSONDecodeError:
        raise HTTPException(400, detail="Invalid JSON format in form fields")
    
    # Handle file uploads
    media_kit_path = None
    creative_samples_paths = []
    mood_board_path = None
    
    if media_kit:
        media_kit_path = f"applications/{campaign_id}/{operator_id}/media_kit_{media_kit.filename}"
    if creative_samples:
        for sample in creative_samples:
            creative_samples_paths.append(f"applications/{campaign_id}/{operator_id}/sample_{sample.filename}")
    if mood_board:
        mood_board_path = f"applications/{campaign_id}/{operator_id}/moodboard_{mood_board.filename}"
    
    # Create application
    new_app = Application(
        id=str(uuid.uuid4()),
        campaign_id=campaign_id,
        operator_id=operator_id,
        platform=platform,
        social_handle=social_handle,
        pitch=pitch,
        portfolio_link=portfolio,
        delivery_time=delivery_days,
        
        # Media & Assets
        media_kit=media_kit_path,
        previous_work=previous_work_list,
        new_work_link=new_work_link if new_work_link else None,
        creative_samples=creative_samples_paths,
        mood_board=mood_board_path,
        
        # Rates & Availability
        proposed_rate=Decimal(str(proposed_rate)),
        currency=currency,
        available_from=available_from if available_from else None,
        available_until=available_until if available_until else None,
        
        # Questions
        answers=answers_dict,
        
        # Additional
        notes=notes if notes else None,
        status="pending"
    )
    
    db.add(new_app)
    db.commit()
    db.refresh(new_app)
    
    return {
        "status": "success",
        "message": "Application filed successfully",
        "id": new_app.id
    }