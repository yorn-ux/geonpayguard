import os
import secrets
import uuid
from fastapi import APIRouter, BackgroundTasks, Depends, File, Form, HTTPException, UploadFile, status, Request
from sqlalchemy.orm import Session
from sqlalchemy.sql import func
from datetime import datetime, timedelta, timezone
from typing import List, Optional

from app.database import get_db
from app.models.user import AccountRole, User
from app.models.notification import Notification
from app.core.security import (
    hash_password, 
    verify_password, 
    generate_recovery_phrase, 
    generate_operator_id,
    create_access_token,
    decode_access_token,
    send_security_alert
)
from app.schemas.auth import (
    RegisterRequest, 
    RegisterResponse, 
    LoginRequest, 
    TokenResponse,
    UserBase,
    VerificationVerify
)
from app.services.email import (
    send_locked_email,
    send_restored_email,
    send_verification_email, 
    send_welcome_email, 
)

# Configuration
ADMIN_EMAIL = os.getenv("ADMIN_EMAIL", "root@geon.com")
ACCESS_TOKEN_EXPIRE_MINUTES = 30  # 30 minutes token expiry

# Protocol Router
router = APIRouter(tags=["Authentication"])

# --- 1. CORE DEPENDENCY ---

async def get_current_user(request: Request, db: Session = Depends(get_db)) -> dict:
    """
    Validates the Bearer token and returns a standardized dictionary.
    Checks token expiration and email verification status.
    """
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid token")

    token = auth_header.split(" ")[1]
    try:
        payload = decode_access_token(token)
        email = payload.get("sub")
        
        # Check token expiration
        exp = payload.get("exp")
        if exp and datetime.fromtimestamp(exp, tz=timezone.utc) < datetime.now(timezone.utc):
            raise HTTPException(status_code=401, detail="Token expired")
            
    except Exception:
        raise HTTPException(status_code=401, detail="Token expired or invalid")

    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Check if email is verified
    if not user.is_verified:
        raise HTTPException(status_code=403, detail="Email not verified")
        
    return {
        "id": user.id,
        "operator_id": user.operator_id,
        "email": user.email,
        "full_name": user.full_name,
        "role": user.role.value if hasattr(user.role, 'value') else user.role,
        "is_verified": user.is_verified,
        "kyc_status": getattr(user, 'kyc_status', 'UNVERIFIED'),
        "kyc_notes": getattr(user, 'kyc_notes', 'Documentation requires review.')
    }

@router.get("/verify")
async def verify_token(current_user: dict = Depends(get_current_user)):
    """Verify if token is still valid and return user info"""
    return {
        "valid": True,
        "is_verified": current_user["is_verified"],
        "user": current_user
    }

# --- 2. HELPER FUNCTION FOR NOTIFICATIONS ---

def create_notification(
    db: Session,
    operator_id: str,
    title: str,
    message: str,
    priority: str = "MEDIUM",
    category: str = "system",
    action_url: str = None
) -> Notification:
    """
    Create a new notification for a user.
    """
    notification = Notification(
        operator_id=operator_id,
        title=title,
        message=message,
        priority=priority,
        category=category,
        action_url=action_url
    )
    
    db.add(notification)
    db.commit()
    db.refresh(notification)
    
    return notification

# --- 3. IDENTITY & KYC ROUTES ---

@router.get("/me")
async def get_me(current_user: dict = Depends(get_current_user)):
    """Syncs protocol identity with the frontend state."""
    return current_user

@router.post("/verify")
async def verify_identity(
    operator_id: str = Form(...),
    doc_type: str = Form(...),
    document: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    # Security: Ensure user is submitting for themselves
    if current_user["operator_id"] != operator_id:
        raise HTTPException(status_code=403, detail="Operator ID mismatch")

    # File Validation (15MB Limit)
    MAX_FILE_SIZE = 15 * 1024 * 1024
    content = await document.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="Document exceeds 15MB limit")

    # Storage Path
    upload_dir = "uploads/kyc"
    os.makedirs(upload_dir, exist_ok=True)
    
    # Secure random filename
    ext = os.path.splitext(document.filename)[1]
    safe_filename = f"{operator_id}_{uuid.uuid4().hex[:8]}{ext}"
    file_path = os.path.join(upload_dir, safe_filename)
    
    with open(file_path, "wb") as buffer:
        buffer.write(content)

    # Update user status
    user = db.query(User).filter(User.operator_id == operator_id).first()
    if user:
        user.kyc_status = "UNDER_REVIEW"
        user.kyc_notes = f"Submitted {doc_type.replace('_', ' ')} for review."
        db.commit()
        
        # Create notification for user
        create_notification(
            db=db,
            operator_id=operator_id,
            title="KYC Under Review",
            message=f"Your {doc_type.replace('_', ' ')} document has been submitted for review.",
            priority="MEDIUM",
            category="kyc"
        )
        
        # Create notification for admin
        admin_user = db.query(User).filter(User.email == ADMIN_EMAIL).first()
        if admin_user:
            create_notification(
                db=db,
                operator_id=admin_user.operator_id,
                title="New KYC Submission",
                message=f"User {user.full_name} submitted {doc_type.replace('_', ' ')} for review",
                priority="MEDIUM",
                category="kyc"
            )

    return {
        "status": "success", 
        "detail": "Documentation submitted for review",
        "kyc_status": "UNDER_REVIEW"
    }

# --- 4. AUTHENTICATION CORE ---

@router.post("/register", response_model=RegisterResponse)
async def register(
    payload: RegisterRequest, 
    request: Request, 
    background_tasks: BackgroundTasks, 
    db: Session = Depends(get_db)
):
    email_lowered = payload.email.lower().strip()
    is_root_admin = (email_lowered == ADMIN_EMAIL)
    
    # Privileged Enroller Logic
    is_privileged_enroller = False
    enroller_identity = "self_enroll"
    auth_header = request.headers.get("Authorization")
    
    if auth_header and auth_header.startswith("Bearer "):
        try:
            token = auth_header.split(" ")[1]
            token_data = decode_access_token(token)
            req_email = token_data.get("sub")
            enroller = db.query(User).filter(User.email == req_email).first()
            if enroller and (req_email == ADMIN_EMAIL or enroller.role.value in ["ADMIN", "BUSINESS"]):
                is_privileged_enroller = True
                enroller_identity = req_email
        except:
            pass

    # Existing User Handling
    existing_user = db.query(User).filter(User.email == email_lowered).first()
    if existing_user:
        if is_privileged_enroller:
            existing_user.role = payload.role.lower()
            existing_user.is_verified = True 
            db.commit()
            
            # Create notification
            create_notification(
                db=db,
                operator_id=existing_user.operator_id,
                title="Account Updated",
                message=f"Your role has been updated to {payload.role}",
                priority="LOW",
                category="account"
            )
            
            # Generate token for immediate login
            token = create_access_token(
                subject=existing_user.email,
                expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
            )
            
            return {
                "success": True, 
                "operator_id": existing_user.operator_id, 
                "access_token": token,
                "detail": "Identity updated."
            }
        raise HTTPException(status_code=400, detail="Identity already registered.")

    # New Identity Creation
    should_bypass = True if (is_root_admin or is_privileged_enroller) else False
    recovery_phrase = generate_recovery_phrase() 
    op_id = generate_operator_id()
    otp = "".join([str(secrets.randbelow(10)) for _ in range(6)]) if not should_bypass else None
    
    new_user = User(
        email=email_lowered,
        full_name=payload.full_name,
        hashed_password=hash_password(payload.password),
        recovery_hash=hash_password(recovery_phrase),
        operator_id=op_id,
        role=payload.role.lower(),
        is_active=True,
        is_verified=should_bypass,
        verification_code=otp,
        enrolled_by=enroller_identity,
        enrolled_at=func.now() if should_bypass else None
    )

    try:
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
        
        # Create welcome notification
        create_notification(
            db=db,
            operator_id=op_id,
            title="Welcome to Aethel",
            message=f"Welcome {payload.full_name}! Your account has been created successfully.",
            priority="LOW",
            category="welcome"
        )
        
        if not should_bypass:
            background_tasks.add_task(send_verification_email, email_lowered, otp, payload.full_name)
            return {
                "success": True, 
                "operator_id": op_id, 
                "recovery_phrase": recovery_phrase,
                "requires_verification": True
            }
        else:
            background_tasks.add_task(send_welcome_email, email_lowered, payload.full_name)
            # Generate token for immediate login for privileged users
            token = create_access_token(
                subject=new_user.email,
                expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
            )
            return {
                "success": True, 
                "operator_id": op_id, 
                "recovery_phrase": recovery_phrase,
                "access_token": token,
                "requires_verification": False
            }
    except Exception as e:
        db.rollback()
        print(f"Registration error: {e}")
        raise HTTPException(status_code=500, detail="Database protocol error.")

@router.post("/login", response_model=TokenResponse)
async def login(
    payload: LoginRequest, 
    request: Request, 
    background_tasks: BackgroundTasks, 
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.email == payload.email.lower()).first()
    
    # Check if user exists
    if not user:
        raise HTTPException(status_code=401, detail="Incorrect email or password.")
    
    # Check password
    if not verify_password(payload.password, user.hashed_password):
        # Increment failed attempts (optional)
        raise HTTPException(status_code=401, detail="Incorrect email or password.")
    
    # Check if account is active
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account locked. Please contact support.")
    
    # Check if email is verified
    if not user.is_verified:
        # Resend verification email if needed
        if not user.verification_code:
            otp = "".join([str(secrets.randbelow(10)) for _ in range(6)])
            user.verification_code = otp
            db.commit()
            background_tasks.add_task(send_verification_email, user.email, otp, user.full_name)
        
        raise HTTPException(
            status_code=403, 
            detail="Email not verified. Please check your inbox for verification code.",
            headers={"X-Email-Verification-Required": "true"}
        )

    # Update last login
    user.last_login = func.now()
    db.commit()
    
    # Create token with 30-minute expiration
    token = create_access_token(
        subject=user.email,
        expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )

    # Create login notification
    create_notification(
        db=db,
        operator_id=user.operator_id,
        title="New Login Detected",
        message=f"New login from {request.client.host}",
        priority="LOW",
        category="security"
    )

    # Send security alert for non-admin users
    if user.email != ADMIN_EMAIL:
        background_tasks.add_task(
            send_security_alert, 
            to_email=user.email, 
            ip_address=request.client.host,
            user_agent=request.headers.get("user-agent", "Unknown Browser")
        )
    
    return {
        "access_token": token,
        "token_type": "bearer",
        "expires_in": ACCESS_TOKEN_EXPIRE_MINUTES * 60,  # in seconds
        "user": {
            "id": user.id, 
            "email": user.email, 
            "full_name": user.full_name,
            "role": user.role.value if hasattr(user.role, 'value') else user.role, 
            "operator_id": user.operator_id, 
            "is_verified": user.is_verified,
            "kyc_status": getattr(user, 'kyc_status', 'not_submitted'),
            "setup_complete": user.is_verified 
        }
    }

@router.post("/verify-email")
async def verify_email(
    payload: VerificationVerify, 
    background_tasks: BackgroundTasks, 
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.email == payload.email.lower()).first()
    if not user: 
        raise HTTPException(status_code=404, detail="Identity not found.")
    
    if user.is_verified: 
        # Generate token for immediate login
        token = create_access_token(
            subject=user.email,
            expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        )
        return {
            "success": True, 
            "detail": "Already verified.",
            "access_token": token,
            "operator_id": user.operator_id
        }

    if not user.verification_code or user.verification_code != payload.code:
        raise HTTPException(status_code=400, detail="Invalid verification code.")

    user.is_verified = True
    user.verification_code = None 
    db.commit()
    
    # Create verification success notification
    create_notification(
        db=db,
        operator_id=user.operator_id,
        title="Email Verified",
        message="Your email has been successfully verified.",
        priority="LOW",
        category="security"
    )
    
    background_tasks.add_task(send_welcome_email, user.email, user.full_name)
    
    # Generate token for immediate login after verification
    token = create_access_token(
        subject=user.email,
        expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    
    return {
        "success": True, 
        "operator_id": user.operator_id, 
        "access_token": token,
        "expires_in": ACCESS_TOKEN_EXPIRE_MINUTES * 60
    }

@router.post("/resend-verification")
async def resend_verification(
    payload: dict,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    email = payload.get("email", "").lower().strip()
    if not email:
        raise HTTPException(status_code=400, detail="Email required")
    
    user = db.query(User).filter(User.email == email).first()
    if not user:
        # Don't reveal that user doesn't exist for security
        return {"success": True, "message": "If account exists, verification email sent"}
    
    if user.is_verified:
        return {"success": True, "message": "Email already verified"}
    
    # Generate new OTP
    otp = "".join([str(secrets.randbelow(10)) for _ in range(6)])
    user.verification_code = otp
    db.commit()
    
    background_tasks.add_task(send_verification_email, email, otp, user.full_name)
    
    return {"success": True, "message": "Verification email sent"}

@router.post("/logout")
async def logout():
    # Client-side should clear tokens
    return {"success": True, "detail": "Session terminated."}

# --- 5. SECURITY PROTOCOLS ---

@router.post("/lock-account/{token}")
async def lock_account(
    token: str, 
    background_tasks: BackgroundTasks, 
    db: Session = Depends(get_db)
):
    payload = decode_access_token(token)
    if not payload or "sub" not in payload:
        raise HTTPException(status_code=400, detail="Invalid token.")
    
    user = db.query(User).filter(User.email == payload["sub"]).first()
    if user and user.is_active:
        user.is_active = False
        db.commit()
        
        # Create lock notification
        create_notification(
            db=db,
            operator_id=user.operator_id,
            title="Account Locked",
            message="Your account has been locked for security reasons.",
            priority="HIGH",
            category="security"
        )
        
        background_tasks.add_task(send_locked_email, to_email=user.email)
        
    return {"status": "success", "message": "Account locked."}

@router.post("/unlock-account/{user_email}")
async def unlock_account(
    user_email: str, 
    background_tasks: BackgroundTasks, 
    db: Session = Depends(get_db),
    current_admin: dict = Depends(get_current_user) 
):
    if current_admin.get("role", "").upper() != "ADMIN":
        raise HTTPException(status_code=403, detail="Unauthorized action.")
    
    user = db.query(User).filter(User.email == user_email.lower()).first()
    if not user: 
        raise HTTPException(status_code=404, detail="Identity not found.")
    
    user.is_active = True
    db.commit()
    
    # Create unlock notification
    create_notification(
        db=db,
        operator_id=user.operator_id,
        title="Account Unlocked",
        message="Your account has been unlocked by an administrator.",
        priority="MEDIUM",
        category="security"
    )
    
    background_tasks.add_task(send_restored_email, to_email=user.email)
    
    return {"status": "success", "message": f"Identity {user_email} restored."}

# --- 6. PUBLIC LOCK ACCOUNT ENDPOINT (GET) ---

@router.get("/lock-account/{token}")
async def lock_account_get(
    token: str,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """Public GET endpoint to lock account - displays confirmation page"""
    payload = decode_access_token(token)
    if not payload or "sub" not in payload:
        raise HTTPException(status_code=400, detail="Invalid or expired token.")
    
    user = db.query(User).filter(User.email == payload["sub"]).first()
    if user and user.is_active:
        user.is_active = False
        db.commit()
        
        # Create lock notification
        create_notification(
            db=db,
            operator_id=user.operator_id,
            title="Account Locked",
            message="Your account has been locked for security reasons.",
            priority="HIGH",
            category="security"
        )
        
        background_tasks.add_task(send_locked_email, to_email=user.email)
        
        return {
            "status": "success",
            "message": "Account has been locked successfully.",
            "email": user.email
        }
    
    return {
        "status": "info",
        "message": "Account is already locked or not found."
    }

# --- 7. SELF-LOCK ENDPOINT ---

@router.post("/security-lock/self")
async def self_lock_account(
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Allow users to lock their own account"""
    user = db.query(User).filter(User.email == current_user["sub"]).first()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if not user.is_active:
        raise HTTPException(status_code=400, detail="Account is already locked")
    
    # Generate a lock token for the user
    lock_token = create_access_token(
        subject=user.email,
        additional_claims={"type": "security_lock"}
    )
    
    # Lock the account immediately
    user.is_active = False
    db.commit()
    
    # Create notification
    create_notification(
        db=db,
        operator_id=user.operator_id,
        title="Account Self-Locked",
        message="You have locked your own account for security reasons. Click to view your account status.",
        priority="HIGH",
        category="security",
        action_url="/auth/locked"
    )
    
    # Send confirmation email
    background_tasks.add_task(send_locked_email, to_email=user.email)
    
    return {
        "status": "success",
        "message": "Account has been locked",
        "lock_token": lock_token
    }


# Export everything needed by other modules
__all__ = ["router", "get_current_user", "create_notification"]