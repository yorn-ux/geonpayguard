from fastapi import APIRouter, Depends, HTTPException, status, Body
from sqlalchemy.orm import Session
from sqlalchemy import select, update, delete
from typing import Dict, Any, List, Optional
import logging
from datetime import datetime

from app.models.settings import UserSettings, AuditLog
from app.models.user import User
from app.schemas.settings import SovereignSyncResponse
from app.database import get_db
from app.routes.auth import get_current_user

router = APIRouter(tags=["User Settings"])

# ==================== USER SETTINGS ROUTES ====================

@router.get("/sync", response_model=SovereignSyncResponse)
async def sync_user_settings(
    current_user: dict = Depends(get_current_user), 
    db: Session = Depends(get_db)
):
    """Sync all user settings and preferences"""
    user_id = current_user["operator_id"] 
    db_id = current_user["id"]
    role = current_user.get("role", "USER").upper()

    try:
        # 1. Fetch Core Settings
        query = select(UserSettings).filter(UserSettings.user_id == user_id)
        user_settings = db.execute(query).scalar_one_or_none()

        # 2. Build the Payload
        data_payload = {
            "profile": {
                "node_id": user_id,
                "name": user_settings.full_name if user_settings else current_user.get("full_name"),
                "full_name": user_settings.full_name if user_settings else current_user.get("full_name"),
                "username": user_settings.username if user_settings else f"user_{db_id}",
                "email": current_user.get("email", ""),
                "bio": user_settings.bio if user_settings else "",
                "is_public": user_settings.is_public if user_settings else True,
                "country": user_settings.country if user_settings else "Kenya",
                "location": user_settings.location if user_settings else "",
                "phone": user_settings.phone if user_settings else "",
                "avatar": user_settings.avatar_url if user_settings else "",
                "social": {
                    "instagram": user_settings.social_links.get("instagram", "") if user_settings and user_settings.social_links else "",
                    "twitter": user_settings.social_links.get("twitter", "") if user_settings and user_settings.social_links else "",
                    "youtube": user_settings.social_links.get("youtube", "") if user_settings and user_settings.social_links else "",
                    "tiktok": user_settings.social_links.get("tiktok", "") if user_settings and user_settings.social_links else ""
                }
            },
            "payments": {
                "mpesa_number": user_settings.payout_account if user_settings else "",
                "payout_account": user_settings.payout_account if user_settings else "",
                "payout_method": user_settings.payout_method if user_settings else "M-Pesa",
                "min_threshold": user_settings.min_payout_threshold if user_settings else 1000.0,
                "min_payout_threshold": user_settings.min_payout_threshold if user_settings else 1000.0,
                "auto_withdraw": user_settings.auto_withdraw if user_settings else False,
            },
            "vault": {
                "auto_release_days": user_settings.vault_config.get("auto_release_days", 7) if user_settings and user_settings.vault_config else 7,
                "require_contract": user_settings.vault_config.get("require_contract", False) if user_settings and user_settings.vault_config else False,
                "email_notifications": user_settings.vault_config.get("email_notifications", True) if user_settings and user_settings.vault_config else True,
                "sms_alerts": user_settings.vault_config.get("sms_alerts", False) if user_settings and user_settings.vault_config else False
            },
            "notifications": {
                "email": user_settings.notif_matrix.get("email", True) if user_settings and user_settings.notif_matrix else True,
                "sms": user_settings.notif_matrix.get("sms", False) if user_settings and user_settings.notif_matrix else False,
                "push": user_settings.notif_matrix.get("push", True) if user_settings and user_settings.notif_matrix else True,
                "vault_updates": user_settings.notif_matrix.get("vault_updates", True) if user_settings and user_settings.notif_matrix else True,
                "payments": user_settings.notif_matrix.get("payments", True) if user_settings and user_settings.notif_matrix else True,
                "security": user_settings.notif_matrix.get("security", True) if user_settings and user_settings.notif_matrix else True
            },
            "kyc": {
                "kyc_status": current_user.get("kyc_status", "UNVERIFIED"),
                "withdrawal_locked": user_settings.withdrawal_locked if user_settings else True
            }
        }

        return {"role": role.lower(), "data": data_payload}

    except Exception as e:
        logging.error(f"Settings Sync Failed: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to sync settings")

@router.patch("/update")
async def update_setting(
    update_request: Dict[str, Any], 
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update a specific user setting"""
    user_id = current_user["operator_id"]
    path = update_request.get("path")
    value = update_request.get("value")

    if not path or value is None:
        raise HTTPException(status_code=400, detail="Path and value are required")

    try:
        # Ensure UserSettings record exists
        settings_query = select(UserSettings).filter(UserSettings.user_id == user_id)
        settings = db.execute(settings_query).scalar_one_or_none()
        
        if not settings:
            # Create default settings
            settings = UserSettings(
                user_id=user_id, 
                full_name=current_user.get("full_name", ""),
                social_links={},
                vault_config={"auto_release_days": 7},
                notif_matrix={"email": True, "sms": False, "push": True}
            )
            db.add(settings)
            db.flush()

        # Get old value for audit
        old_value = None

        # Handle nested paths
        if path.startswith("profile.social."):
            platform = path.split(".")[-1]
            updated_socials = dict(settings.social_links or {})
            old_value = updated_socials.get(platform)
            updated_socials[platform] = value
            settings.social_links = updated_socials

        elif path.startswith("vault."):
            field_name = path.split(".")[1]
            new_vault = dict(settings.vault_config or {"auto_release_days": 7})
            old_value = new_vault.get(field_name)
            new_vault[field_name] = value
            settings.vault_config = new_vault
        
        elif path.startswith("notifications."):
            field_name = path.split(".")[1]
            new_notif = dict(settings.notif_matrix or {})
            old_value = new_notif.get(field_name)
            new_notif[field_name] = value
            settings.notif_matrix = new_notif
        
        # Handle flat fields
        else:
            UPDATE_MAP = {
                "profile.name": ("full_name", str),
                "profile.full_name": ("full_name", str),
                "profile.username": ("username", str),
                "profile.bio": ("bio", str),
                "profile.is_public": ("is_public", bool),
                "profile.location": ("location", str),
                "profile.phone": ("phone", str),
                "profile.avatar": ("avatar_url", str),
                "profile.country": ("country", str),
                "profile.email": ("email", str, User),
                "payments.mpesa_number": ("payout_account", str),
                "payments.payout_method": ("payout_method", str),
                "payments.min_threshold": ("min_payout_threshold", float),
                "payments.auto_withdraw": ("auto_withdraw", bool),
            }

            if path in UPDATE_MAP:
                mapping = UPDATE_MAP[path]
                
                # Handle email separately (updates User table)
                if path == "profile.email":
                    old_value = current_user.get("email")
                    db.execute(
                        update(User)
                        .where(User.operator_id == user_id)
                        .values(email=value)
                    )
                else:
                    field_name = mapping[0]
                    old_value = getattr(settings, field_name)
                    setattr(settings, field_name, value)
            else:
                raise HTTPException(status_code=422, detail=f"Path '{path}' cannot be updated")

        # Create audit log
        audit_log = AuditLog(
            user=current_user.get("full_name", "User"),
            action="UPDATE",
            path=path,
            old_value=str(old_value) if old_value else None,
            new_value=str(value),
            ip_address=update_request.get("ip_address", "127.0.0.1")
        )
        db.add(audit_log)

        db.commit()
        return {
            "status": "success", 
            "path": path, 
            "value": value
        }

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logging.error(f"Settings update failed: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to update setting")

@router.post("/upload-avatar")
async def upload_avatar(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Upload profile avatar (handles file upload)"""
    # This would handle file upload - implement with your file storage solution
    # For now, return a placeholder
    return {"url": "https://example.com/avatar.jpg"}

@router.get("/audit-logs")
async def get_audit_logs(
    limit: int = 50,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get user's audit logs"""
    user_id = current_user["operator_id"]
    user_name = current_user.get("full_name", "User")
    
    logs = db.execute(
        select(AuditLog)
        .where(AuditLog.user == user_name)
        .order_by(AuditLog.timestamp.desc())
        .limit(limit)
    ).scalars().all()
    
    return [
        {
            "id": log.id,
            "timestamp": log.timestamp.isoformat(),
            "action": log.action,
            "path": log.path,
            "old_value": log.old_value,
            "new_value": log.new_value,
            "ip": log.ip_address
        }
        for log in logs
    ]

@router.delete("/account")
async def delete_account(
    confirmation: str = Body(..., embed=True),
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete user account (requires confirmation)"""
    if confirmation != "DELETE":
        raise HTTPException(status_code=400, detail="Please type DELETE to confirm")
    
    user_id = current_user["operator_id"]
    
    try:
        # Delete user settings
        db.execute(
            delete(UserSettings).where(UserSettings.user_id == user_id)
        )
        
        # Soft delete user account
        db.execute(
            update(User)
            .where(User.operator_id == user_id)
            .values(is_active=False, deleted_at=datetime.utcnow())
        )
        
        db.commit()
        return {"status": "success", "message": "Account deleted successfully"}
    
    except Exception as e:
        db.rollback()
        logging.error(f"Account deletion failed: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to delete account")

@router.post("/change-password")
async def change_password(
    passwords: Dict[str, str] = Body(...),
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Change user password"""
    current_password = passwords.get("current_password")
    new_password = passwords.get("new_password")
    confirm_password = passwords.get("confirm_password")
    
    if not all([current_password, new_password, confirm_password]):
        raise HTTPException(status_code=400, detail="All password fields are required")
    
    if new_password != confirm_password:
        raise HTTPException(status_code=400, detail="New passwords do not match")
    
    # Verify current password (implement with your auth logic)
    # This would typically check against your auth system
    
    # Update password (implement with your auth logic)
    # This would hash and store the new password
    
    return {"status": "success", "message": "Password updated successfully"}

@router.post("/enable-2fa")
async def enable_two_factor(
    current_user: dict = Depends(get_current_user)
):
    """Enable two-factor authentication"""
    # Generate and return 2FA secret
    # Implement with your 2FA solution (e.g., pyotp)
    return {
        "secret": "JBSWY3DPEHPK3PXP",
        "qr_code": "data:image/png;base64,..."
    }

@router.post("/verify-2fa")
async def verify_two_factor(
    code: str = Body(..., embed=True),
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Verify and enable 2FA"""
    # Verify the code (implement with your 2FA solution)
    is_valid = True  # Replace with actual verification
    
    if not is_valid:
        raise HTTPException(status_code=400, detail="Invalid verification code")
    
    # Update user settings to enable 2FA
    user_id = current_user["operator_id"]
    settings = db.execute(
        select(UserSettings).where(UserSettings.user_id == user_id)
    ).scalar_one_or_none()
    
    if settings:
        settings.mfa_enabled = True
        db.commit()
    
    return {"status": "success", "message": "2FA enabled successfully"}

@router.post("/disable-2fa")
async def disable_two_factor(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Disable two-factor authentication"""
    user_id = current_user["operator_id"]
    
    settings = db.execute(
        select(UserSettings).where(UserSettings.user_id == user_id)
    ).scalar_one_or_none()
    
    if settings:
        settings.mfa_enabled = False
        db.commit()
    
    return {"status": "success", "message": "2FA disabled successfully"}

@router.get("/sessions")
async def get_active_sessions(
    current_user: dict = Depends(get_current_user)
):
    """Get active user sessions"""
    # Implement with your session management
    return [
        {
            "id": "session_1",
            "device": "Chrome on Windows",
            "location": "Nairobi, Kenya",
            "last_active": datetime.utcnow().isoformat(),
            "current": True
        }
    ]

@router.post("/revoke-sessions")
async def revoke_all_sessions(
    current_user: dict = Depends(get_current_user)
):
    """Revoke all other active sessions"""
    # Implement with your session management
    return {"status": "success", "message": "All other sessions revoked"}