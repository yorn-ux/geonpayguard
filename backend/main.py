import logging
import os
import time
from contextlib import asynccontextmanager
from typing import List
from fastapi import FastAPI, File, Request, Depends, Form, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import inspect, text, create_engine
from sqlalchemy.orm import Session, sessionmaker

# --- 1. DATABASE & MODELS ---
from app.database import engine, Base, get_db, SessionLocal
# Importing the models package triggers the registration of all classes in __init__.py
import app.models 

# --- 2. ROUTE IMPORTS ---
from app.routes import (
    auth,
    wallet as wallet_routes,
    vaults,
    business,
    settings,
    dispute,
    webhooks,
    notifications,
    admin
)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def ensure_public_schema():
    """Ensure the public schema exists and is set in the search path (PostgreSQL only)"""
    # Detect database type
    is_postgresql = "postgresql" in str(engine.url)
    is_sqlite = "sqlite" in str(engine.url)
    
    if is_sqlite:
        logger.info("📊 SQLite mode - skipping PostgreSQL schema configuration")
        return True
        
    try:
        with SessionLocal() as db:
            # Check if public schema exists (PostgreSQL only)
            result = db.execute(text("""
                SELECT schema_name 
                FROM information_schema.schemata 
                WHERE schema_name = 'public'
            """)).fetchone()
            
            if not result:
                logger.info("Creating public schema...")
                db.execute(text("CREATE SCHEMA IF NOT EXISTS public"))
                db.commit()
            
            # Set search path to public
            db.execute(text("SET search_path TO public"))
            db.commit()
            
            logger.info("✅ Public schema configured")
            return True
    except Exception as e:
        logger.warning(f"⚠️ Schema configuration warning (non-critical): {e}")
        return True  # Return True to continue initialization even if schema config fails

def safe_create_tables():
    """Safely create tables only if they don't exist - works with both PostgreSQL and SQLite"""
    try:
        # Detect database type
        is_postgresql = "postgresql" in str(engine.url)
        is_sqlite = "sqlite" in str(engine.url)
        
        logger.info(f"🔍 Database type: {'PostgreSQL' if is_postgresql else 'SQLite' if is_sqlite else 'Unknown'}")
        
        # For PostgreSQL only, ensure we're working with the public schema
        if is_postgresql:
            if not ensure_public_schema():
                logger.warning("⚠️ Proceeding without schema configuration")
        
        inspector = inspect(engine)
        existing_tables = inspector.get_table_names()
        logger.info(f"📊 Existing tables in database: {existing_tables}")
        
        # Get all tables defined in models
        all_tables = Base.metadata.tables.keys()
        logger.info(f"📋 Expected tables: {list(all_tables)}")
        
        # Create all tables with checkfirst=True
        # This handles tables, indexes, and enums properly for both databases
        Base.metadata.create_all(bind=engine, checkfirst=True)
        
        # Verify tables were created
        inspector = inspect(engine)
        final_tables = inspector.get_table_names()
        logger.info(f"✅ Database schema verification complete. Final tables: {final_tables}")
        
        return True
    except Exception as e:
        logger.error(f"❌ Error during table creation: {e}")
        import traceback
        logger.error(traceback.format_exc())
        return False

# LIFESPAN: Startup and Shutdown logic
@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("🚀 Sovereign Engine Initializing...")
    
    # Test database connection
    try:
        db = SessionLocal()
        db.execute(text("SELECT 1"))
        db.close()
        logger.info("✅ Database connection successful")
    except Exception as e:
        logger.error(f"❌ Database connection failed: {e}")
        # Don't raise - allow app to continue but log error
    
    # Safely create/verify tables
    if not safe_create_tables():
        logger.error("❌ Failed to initialize database schema")
    
    # Log environment (without sensitive data)
    env = os.getenv("ENVIRONMENT", "development")
    logger.info(f"🌍 Running in {env} mode")
    
    yield
    
    logger.info("🛑 Sovereign Engine Offline.")

# Initialize FastAPI app with lifespan
app = FastAPI(
    title="Sovereign Protocol API",
    description="Aethel PayGuard - Sovereign Financial Protocol",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc"
)

# --- 3. MIDDLEWARE ---
# Get allowed origins from environment variable or use defaults
# FIXED: Added your actual Vercel frontend URL
ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "").split(",") if os.getenv("ALLOWED_ORIGINS") else [
    "https://geonpayguard.vercel.app",  # Your Vercel frontend
    "http://localhost:3000",                # Local development
    "http://localhost:3001",                 # Alternative local port
    "https://geonpayguard.com",           # Your production domain (if you have one)
    "https://www.geonpayguard.com",       # www subdomain
]

# Add CORS middleware with proper configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["*"],
    expose_headers=["*"],
    max_age=600,  # Cache preflight requests for 10 minutes
)

@app.middleware("http")
async def add_process_time_header(request: Request, call_next):
    start_time = time.time()
    response = await call_next(request)
    process_time = time.time() - start_time
    response.headers["X-Process-Time"] = str(process_time)
    return response

# --- 4. CORE ROUTES & LEGACY ALIASES ---
app.include_router(auth.router, prefix="/api/v1/auth", tags=["Auth"])
app.include_router(wallet_routes.router, prefix="/api/v1/wallet", tags=["Wallet"])
app.include_router(vaults.router, prefix="/api/v1/vaults", tags=["Vaults"])
app.include_router(business.router, prefix="/api/v1/business", tags=["Business"])
app.include_router(settings.router, prefix="/api/v1/settings", tags=["Settings"])
app.include_router(dispute.router, prefix="/api/v1/dispute", tags=["Dispute"])
app.include_router(webhooks.router, prefix="/api/v1/webhooks", tags=["Webhooks"])
app.include_router(notifications.router, prefix="/api/v1", tags=["Notifications"])
app.include_router(admin.router, prefix="/api/v1/admin", tags=["Admin"])

# --- 5. ROOT ENDPOINTS ---
@app.get("/", tags=["Root"])
async def root():
    """Root endpoint with API information"""
    return {
        "success": True,
        "service": "Aethel PayGuard API",
        "version": "1.0.0",
        "environment": os.getenv("ENVIRONMENT", "development"),
        "status": "operational",
        "documentation": {
            "swagger": "/docs",
            "redoc": "/redoc"
        },
        "endpoints": {
            "health": "/health",
            "api": "/api/v1"
        }
    }

@app.get("/health", tags=["Health"])
async def health_check():
    """Health check endpoint for monitoring"""
    # Check database connection
    db_status = "unhealthy"
    db_details = {}
    
    try:
        db = SessionLocal()
        # Test connection and get basic stats
        result = db.execute(text("SELECT 1")).scalar()
        
        # Get table counts for monitoring
        inspector = inspect(engine)
        tables = inspector.get_table_names()
        table_counts = {}
        
        for table in tables[:5]:  # Limit to first 5 tables for performance
            try:
                count = db.execute(text(f"SELECT COUNT(*) FROM {table}")).scalar()
                table_counts[table] = count
            except:
                table_counts[table] = "error"
        
        db.close()
        db_status = "healthy"
        db_details = {
            "tables_count": len(tables),
            "sample_counts": table_counts
        }
    except Exception as e:
        logger.error(f"Health check database error: {e}")
        db_details = {"error": str(e)}
    
    return {
        "status": "healthy" if db_status == "healthy" else "degraded",
        "timestamp": time.time(),
        "service": "geonpayguard-api",
        "version": "1.0.0",
        "database": {
            "status": db_status,
            "details": db_details
        },
        "environment": os.getenv("ENVIRONMENT", "development")
    }

@app.get("/api/v1", tags=["API Info"])
async def api_info():
    """API version information"""
    return {
        "success": True,
        "api_version": "v1",
        "base_url": "/api/v1",
        "available_endpoints": [
            "/auth",
            "/wallet",
            "/vaults",
            "/business",
            "/settings",
            "/dispute",
            "/webhooks",
            "/notifications",
            "/admin"
        ]
    }

# Direct access for frontend compatibility
@app.get("/api/campaigns", tags=["Direct Support"])
async def campaigns_direct(db=Depends(get_db)):
    """Legacy endpoint for frontend compatibility"""
    return await vaults.list_public_campaigns(db=db)

@app.post("/api/campaigns/create", tags=["Direct Support"])
async def create_campaign_direct(
    current_user: dict = Depends(vaults.get_current_user),
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
    """Direct endpoint for campaign creation"""
    return await vaults.create_campaign(
        current_user=current_user,
        db=db,
        title=title,
        description=description,
        category=category,
        goal=goal,
        company_name=company_name,
        application_deadline=application_deadline,
        content_deadline=content_deadline,
        campaign_start=campaign_start,
        campaign_end=campaign_end,
        draft_deadline=draft_deadline,
        total_budget=total_budget,
        currency=currency,
        compensation_type=compensation_type,
        fixed_rate=fixed_rate,
        creator_count=creator_count,
        performance_commission=performance_commission,
        product_gifting=product_gifting,
        product_value=product_value,
        product_details=product_details,
        allow_negotiation=allow_negotiation,
        locations=locations,
        min_followers=min_followers,
        min_engagement=min_engagement,
        age_range=age_range,
        gender=gender,
        languages=languages,
        niches=niches,
        deliverables=deliverables,
        usage_rights=usage_rights,
        exclusivity_months=exclusivity_months,
        disclosure_required=disclosure_required,
        custom_terms=custom_terms,
        require_contract=require_contract,
        custom_questions=custom_questions,
        tags=tags,
        visibility=visibility,
        allow_applications=allow_applications,
        auto_approve=auto_approve,
        require_vault=require_vault,
        dispute_window=dispute_window,
        release_rule=release_rule,
        cover_image=cover_image,
        campaign_video=campaign_video,
        mood_board=mood_board,
        product_images=product_images,
        brand_guidelines=brand_guidelines,
        music_files=music_files,
        shot_list=shot_list,
        contract_file=contract_file,
    )

@app.post("/api/campaigns/{campaign_id}/apply", tags=["Direct Support"])
async def apply_to_campaign_direct(
    campaign_id: str,
    current_user: dict = Depends(vaults.get_current_user),
    db: Session = Depends(get_db),
    platform: str = Form("instagram"),
    social_handle: str = Form(...),
    pitch: str = Form(...),
    portfolio: str = Form(...),
    delivery_days: str = Form("3"),
    media_kit: UploadFile = File(None),
    previous_work: str = Form("[]"),
    new_work_link: str = Form(""),
    creative_samples: List[UploadFile] = File([]),
    mood_board: UploadFile = File(None),
    proposed_rate: float = Form(0),
    currency: str = Form("KES"),
    available_from: str = Form(""),
    available_until: str = Form(""),
    answers: str = Form("{}"),
    notes: str = Form(""),
):
    """Direct endpoint for applying to a campaign"""
    return await vaults.apply_to_campaign_form(
        campaign_id=campaign_id,
        current_user=current_user,
        db=db,
        platform=platform,
        social_handle=social_handle,
        pitch=pitch,
        portfolio=portfolio,
        delivery_days=delivery_days,
        media_kit=media_kit,
        previous_work=previous_work,
        new_work_link=new_work_link,
        creative_samples=creative_samples,
        mood_board=mood_board,
        proposed_rate=proposed_rate,
        currency=currency,
        available_from=available_from,
        available_until=available_until,
        answers=answers,
        notes=notes,
    )

# --- 6. GLOBAL EXCEPTION HANDLER ---
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"SYSTEM ERROR: {str(exc)}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={
            "success": False,
            "detail": "Internal Protocol Error",
            "message": str(exc) if os.getenv("ENVIRONMENT") == "development" else "An unexpected error occurred"
        }
    )

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    # Use string format "main:app" for hot-reloading
    uvicorn.run(
        "main:app", 
        host="0.0.0.0", 
        port=port, 
        reload=True if os.getenv("ENVIRONMENT") == "development" else False
    )