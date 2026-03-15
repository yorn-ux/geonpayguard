# app/routes/admin.py
from fastapi import APIRouter, Depends, HTTPException, status, Query, Request
from sqlalchemy.orm import Session, selectinload
from sqlalchemy import or_, select, update, delete, func, and_
from typing import Dict, Any, List, Optional
import logging
from datetime import datetime, timedelta
import platform
import os
import time
import json
import sqlalchemy as sa 

# Try to import psutil, but don't fail if not available
try:
    import psutil
    PSUTIL_AVAILABLE = True
except ImportError:
    PSUTIL_AVAILABLE = False
    logging.warning("psutil not installed. System monitoring endpoints will return zeros.")

from app.models.settings import PlatformConfig, BroadcastMessage, AuditLog, UserSettings
from app.models.user import User
from app.database import get_db
from app.routes.auth import get_current_user

# Import wallet models for revenue
try:
    from app.models.wallet import Transaction, TransactionType, Wallet
    WALLET_MODELS_AVAILABLE = True
except ImportError:
    WALLET_MODELS_AVAILABLE = False
    logging.warning("Wallet models not found. Revenue endpoints will return zeros.")

# Try to import relay models, but don't fail if not available
try:
    from app.models.relay import RelayNode, Connection
    RELAY_MODELS_AVAILABLE = True
except ImportError:
    RELAY_MODELS_AVAILABLE = False
    logging.warning("Relay models not found. Relay endpoints will return empty data.")

# Try to import vault models
try:
    from app.models.vault import Vault
    VAULT_MODELS_AVAILABLE = True
except ImportError:
    VAULT_MODELS_AVAILABLE = False
    logging.warning("Vault models not found. Vault endpoints will return None.")

async def verify_admin(current_user: dict = Depends(get_current_user)):
    """Verify that the current user has admin privileges."""
    role = current_user.get('role', '').upper() if current_user.get('role') else ''
    if role not in ['ADMIN', 'OPERATOR']:
        raise HTTPException(status_code=403, detail="Admin privileges required")
    return current_user

router = APIRouter(tags=["Admin"]) 

# ==================== PLATFORM SETTINGS ENDPOINTS ====================

@router.get("/platform-settings")
async def get_platform_settings(
    current_user: dict = Depends(verify_admin),
    db: Session = Depends(get_db)
):
    """Get platform settings (admin only)"""
    try:
        config = db.execute(
            select(PlatformConfig).filter(PlatformConfig.id == 1)
        ).scalar_one_or_none()
        
        if not config:
            config = PlatformConfig(id=1)
            db.add(config)
            db.commit()
        
        return {
            "globalPlatformFee": float(config.platform_fee_percent) if config.platform_fee_percent else 0.0,
            "highValueThreshold": float(config.hard_freeze_vault_threshold) if config.hard_freeze_vault_threshold else 0.0,
            "escalationDelay": config.escalation_delay or "",
            "disputeAutoResolution": config.dispute_auto_resolution or "",
            "payoutCycle": config.payout_cycle or ""
        }
    except Exception as e:
        logging.error(f"Failed to fetch platform settings: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch platform settings")

@router.put("/platform-settings")
async def update_platform_settings(
    settings: Dict[str, Any],
    current_user: dict = Depends(verify_admin),
    db: Session = Depends(get_db)
):
    """Update platform settings (admin only)"""
    try:
        config = db.execute(
            select(PlatformConfig).filter(PlatformConfig.id == 1)
        ).scalar_one_or_none()
        
        if not config:
            config = PlatformConfig(id=1)
            db.add(config)
        
        # Update fields
        if "globalPlatformFee" in settings:
            config.platform_fee_percent = settings["globalPlatformFee"]
        if "highValueThreshold" in settings:
            config.hard_freeze_vault_threshold = settings["highValueThreshold"]
        if "escalationDelay" in settings:
            config.escalation_delay = settings["escalationDelay"]
        if "disputeAutoResolution" in settings:
            config.dispute_auto_resolution = settings["disputeAutoResolution"]
        if "payoutCycle" in settings:
            config.payout_cycle = settings["payoutCycle"]
        
        # Create audit log
        audit_log = AuditLog(
            user=current_user.get("full_name", "Admin"),
            action="UPDATE_PLATFORM_SETTINGS",
            old_value="",
            new_value=json.dumps(settings),
            ip_address=settings.get("ip_address", "127.0.0.1"),
            user_id=current_user.get("id")
        )
        db.add(audit_log)
        
        db.commit()
        return {"status": "success", "message": "Platform settings updated"}
    except Exception as e:
        db.rollback()
        logging.error(f"Failed to update platform settings: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to update platform settings")

# ==================== RISK SETTINGS ENDPOINTS ====================

@router.get("/risk-settings")
async def get_risk_settings(
    current_user: dict = Depends(verify_admin),
    db: Session = Depends(get_db)
):
    """Get risk settings (admin only)"""
    try:
        config = db.execute(
            select(PlatformConfig).filter(PlatformConfig.id == 1)
        ).scalar_one_or_none()
        
        if not config:
            config = PlatformConfig(id=1)
            db.add(config)
            db.commit()
        
        # Get blacklist
        blacklist = config.blacklist or []
        
        return {
            "autoFlagNodeThreshold": config.auto_flag_node_threshold or 0,
            "hardFreezeVaultThreshold": float(config.hard_freeze_vault_threshold) if config.hard_freeze_vault_threshold else 0.0,
            "enforceBiometricForAdmins": config.enforce_biometric_for_admins or False,
            "globalBlacklist": blacklist,
            "freezeWebsite": config.freeze_website or False,
            "freezeMessage": config.freeze_message or ""
        }
    except Exception as e:
        logging.error(f"Failed to fetch risk settings: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch risk settings")

@router.put("/risk-settings")
async def update_risk_settings(
    settings: Dict[str, Any],
    current_user: dict = Depends(verify_admin),
    db: Session = Depends(get_db)
):
    """Update risk settings (admin only)"""
    try:
        config = db.execute(
            select(PlatformConfig).filter(PlatformConfig.id == 1)
        ).scalar_one_or_none()
        
        if not config:
            config = PlatformConfig(id=1)
            db.add(config)
        
        # Update fields
        if "autoFlagNodeThreshold" in settings:
            config.auto_flag_node_threshold = settings["autoFlagNodeThreshold"]
        if "hardFreezeVaultThreshold" in settings:
            config.hard_freeze_vault_threshold = settings["hardFreezeVaultThreshold"]
        if "enforceBiometricForAdmins" in settings:
            config.enforce_biometric_for_admins = settings["enforceBiometricForAdmins"]
        if "globalBlacklist" in settings:
            config.blacklist = settings["globalBlacklist"]
        if "freezeWebsite" in settings:
            config.freeze_website = settings["freezeWebsite"]
        if "freezeMessage" in settings:
            config.freeze_message = settings["freezeMessage"]
        
        # Create audit log
        audit_log = AuditLog(
            user=current_user.get("full_name", "Admin"),
            action="UPDATE_RISK_SETTINGS",
            old_value="",
            new_value=json.dumps(settings),
            ip_address=settings.get("ip_address", "127.0.0.1"),
            user_id=current_user.get("id")
        )
        db.add(audit_log)
        
        db.commit()
        return {"status": "success", "message": "Risk settings updated"}
    except Exception as e:
        db.rollback()
        logging.error(f"Failed to update risk settings: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to update risk settings")

@router.post("/risk-settings/blacklist")
async def add_to_blacklist(
    request: Dict[str, str],
    current_user: dict = Depends(verify_admin),
    db: Session = Depends(get_db)
):
    """Add entry to blacklist (admin only)"""
    entry = request.get("entry")
    if not entry:
        raise HTTPException(status_code=400, detail="Entry is required")
    
    try:
        config = db.execute(
            select(PlatformConfig).filter(PlatformConfig.id == 1)
        ).scalar_one_or_none()
        
        if not config:
            config = PlatformConfig(id=1)
            db.add(config)
        
        blacklist = config.blacklist or []
        if entry not in blacklist:
            blacklist.append(entry)
            config.blacklist = blacklist
            
            # Create audit log
            audit_log = AuditLog(
                user=current_user.get("full_name", "Admin"),
                action="ADD_TO_BLACKLIST",
                old_value="",
                new_value=entry,
                ip_address=request.get("ip_address", "127.0.0.1"),
                user_id=current_user.get("id")
            )
            db.add(audit_log)
            
            db.commit()
        
        return {"status": "success", "message": f"Added {entry} to blacklist"}
    except Exception as e:
        db.rollback()
        logging.error(f"Failed to add to blacklist: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to add to blacklist")

@router.delete("/risk-settings/blacklist")
async def remove_from_blacklist(
    request: Dict[str, str],
    current_user: dict = Depends(verify_admin),
    db: Session = Depends(get_db)
):
    """Remove entry from blacklist (admin only)"""
    entry = request.get("entry")
    if not entry:
        raise HTTPException(status_code=400, detail="Entry is required")
    
    try:
        config = db.execute(
            select(PlatformConfig).filter(PlatformConfig.id == 1)
        ).scalar_one_or_none()
        
        if config and config.blacklist:
            blacklist = config.blacklist
            if entry in blacklist:
                blacklist.remove(entry)
                config.blacklist = blacklist
                
                # Create audit log
                audit_log = AuditLog(
                    user=current_user.get("full_name", "Admin"),
                    action="REMOVE_FROM_BLACKLIST",
                    old_value=entry,
                    new_value="",
                    ip_address=request.get("ip_address", "127.0.0.1"),
                    user_id=current_user.get("id")
                )
                db.add(audit_log)
                
                db.commit()
        
        return {"status": "success", "message": f"Removed {entry} from blacklist"}
    except Exception as e:
        db.rollback()
        logging.error(f"Failed to remove from blacklist: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to remove from blacklist")

@router.post("/risk-settings/freeze")
async def toggle_website_freeze(
    request: Dict[str, Any],
    current_user: dict = Depends(verify_admin),
    db: Session = Depends(get_db)
):
    """Toggle website freeze status (admin only)"""
    freeze = request.get("freeze", True)
    message = request.get("message")
    
    try:
        config = db.execute(
            select(PlatformConfig).filter(PlatformConfig.id == 1)
        ).scalar_one_or_none()
        
        if not config:
            config = PlatformConfig(id=1)
            db.add(config)
        
        config.freeze_website = freeze
        if message:
            config.freeze_message = message
        
        # Create audit log
        audit_log = AuditLog(
            user=current_user.get("full_name", "Admin"),
            action="TOGGLE_WEBSITE_FREEZE",
            old_value=str(not freeze),
            new_value=str(freeze),
            ip_address=request.get("ip_address", "127.0.0.1"),
            user_id=current_user.get("id")
        )
        db.add(audit_log)
        
        db.commit()
        
        status = "frozen" if freeze else "unfrozen"
        return {"status": "success", "message": f"Website {status} successfully"}
    except Exception as e:
        db.rollback()
        logging.error(f"Failed to toggle website freeze: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to toggle website freeze")

# ==================== BROADCAST ENDPOINTS ====================

@router.get("/broadcasts")
async def get_broadcasts(
    current_user: dict = Depends(verify_admin),
    db: Session = Depends(get_db)
):
    """Get all broadcasts (admin only)"""
    try:
        broadcasts = db.execute(
            select(BroadcastMessage)
            .order_by(BroadcastMessage.created_at.desc())
        ).scalars().all()
        
        return [
            {
                "id": b.id,
                "title": b.title,
                "message": b.message,
                "type": b.type,
                "active": b.active,
                "createdAt": b.created_at.isoformat() if b.created_at else None,
                "expiresAt": b.expires_at.isoformat() if b.expires_at else None
            }
            for b in broadcasts
        ]
    except Exception as e:
        logging.error(f"Failed to fetch broadcasts: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch broadcasts")

@router.post("/broadcasts")
async def create_broadcast(
    broadcast: Dict[str, Any],
    current_user: dict = Depends(verify_admin),
    db: Session = Depends(get_db)
):
    """Create a new broadcast (admin only)"""
    try:
        new_broadcast = BroadcastMessage(
            title=broadcast.get("title"),
            message=broadcast.get("message"),
            type=broadcast.get("type", "info"),
            created_by=current_user.get("id"),
            active=True,
            expires_at=datetime.fromisoformat(broadcast.get("expiresAt")) if broadcast.get("expiresAt") else None
        )
        
        db.add(new_broadcast)
        
        # Create audit log
        audit_log = AuditLog(
            user=current_user.get("full_name", "Admin"),
            action="CREATE_BROADCAST",
            old_value="",
            new_value=broadcast.get("title"),
            ip_address=broadcast.get("ip_address", "127.0.0.1"),
            user_id=current_user.get("id")
        )
        db.add(audit_log)
        
        db.commit()
        
        return {
            "status": "success",
            "message": "Broadcast created",
            "id": new_broadcast.id
        }
    except Exception as e:
        db.rollback()
        logging.error(f"Failed to create broadcast: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to create broadcast")

@router.patch("/broadcasts/{broadcast_id}")
async def update_broadcast(
    broadcast_id: int,
    update: Dict[str, Any],
    current_user: dict = Depends(verify_admin),
    db: Session = Depends(get_db)
):
    """Update broadcast status (admin only)"""
    try:
        broadcast = db.execute(
            select(BroadcastMessage).filter(BroadcastMessage.id == broadcast_id)
        ).scalar_one_or_none()
        
        if not broadcast:
            raise HTTPException(status_code=404, detail="Broadcast not found")
        
        if "active" in update:
            broadcast.active = update["active"]
        
        # Create audit log
        audit_log = AuditLog(
            user=current_user.get("full_name", "Admin"),
            action="UPDATE_BROADCAST",
            old_value="",
            new_value=f"Broadcast {broadcast_id} - Active: {broadcast.active}",
            ip_address=update.get("ip_address", "127.0.0.1"),
            user_id=current_user.get("id")
        )
        db.add(audit_log)
        
        db.commit()
        
        return {"status": "success", "message": "Broadcast updated"}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logging.error(f"Failed to update broadcast: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to update broadcast")

@router.delete("/broadcasts/{broadcast_id}")
async def delete_broadcast(
    broadcast_id: int,
    current_user: dict = Depends(verify_admin),
    db: Session = Depends(get_db)
):
    """Delete a broadcast (admin only)"""
    try:
        broadcast = db.execute(
            select(BroadcastMessage).filter(BroadcastMessage.id == broadcast_id)
        ).scalar_one_or_none()
        
        if not broadcast:
            raise HTTPException(status_code=404, detail="Broadcast not found")
        
        # Create audit log before deletion
        audit_log = AuditLog(
            user=current_user.get("full_name", "Admin"),
            action="DELETE_BROADCAST",
            old_value=broadcast.title,
            new_value="",
            ip_address="127.0.0.1",
            user_id=current_user.get("id")
        )
        db.add(audit_log)
        
        db.execute(
            delete(BroadcastMessage).where(BroadcastMessage.id == broadcast_id)
        )
        
        db.commit()
        
        return {"status": "success", "message": "Broadcast deleted"}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logging.error(f"Failed to delete broadcast: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to delete broadcast")

# ==================== AUDIT LOGS ENDPOINTS ====================
@router.get("/audit-logs")
async def get_audit_logs(
    limit: int = Query(100, ge=1, le=1000),
    offset: int = Query(0, ge=0),
    current_user: dict = Depends(verify_admin),
    db: Session = Depends(get_db)
):
    """Get audit logs with user role information (admin only)"""
    try:
        # Cast user_id to integer for the join
        logs = db.execute(
            select(
                AuditLog,
                User.role.label('user_role'),
                User.operator_id.label('user_operator_id'),
                User.email.label('user_email'),
                User.full_name.label('user_full_name')
            )
            .outerjoin(User, sa.cast(AuditLog.user_id, sa.Integer) == User.id)
            .order_by(AuditLog.timestamp.desc())
            .offset(offset)
            .limit(limit)
        ).all()
        
        result = []
        for row in logs:
            log = row[0]  # AuditLog object
            user_role_value = row.user_role if hasattr(row, 'user_role') else None
            
            # Convert enum to string and lowercase
            user_role = None
            if user_role_value:
                if hasattr(user_role_value, 'value'):
                    user_role = user_role_value.value.lower()
                else:
                    user_role = str(user_role_value).lower()
            
            # Get user display name (prefer from User table if available)
            user_display = log.user
            if row.user_full_name:
                user_display = row.user_full_name
            elif row.user_email:
                user_display = row.user_email
            
            result.append({
                "id": log.id,
                "timestamp": log.timestamp.isoformat() if log.timestamp else None,
                "user": user_display,
                "user_role": user_role,
                "action": log.action,
                "oldValue": log.old_value,
                "newValue": log.new_value,
                "ip": log.ip_address,
                "user_id": log.user_id,
                "user_operator_id": row.user_operator_id if hasattr(row, 'user_operator_id') else None,
                "user_email": row.user_email if hasattr(row, 'user_email') else None
            })
        
        return result
    except Exception as e:
        logging.error(f"Failed to fetch audit logs: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch audit logs")

@router.get("/audit-logs/export")
async def export_audit_logs(
    current_user: dict = Depends(verify_admin),
    db: Session = Depends(get_db)
):
    """Export audit logs as CSV with user role information (admin only)"""
    try:
        # Cast user_id to integer for the join
        logs = db.execute(
            select(
                AuditLog,
                User.role.label('user_role'),
                User.operator_id.label('user_operator_id'),
                User.email.label('user_email'),
                User.full_name.label('user_full_name')
            )
            .outerjoin(User, sa.cast(AuditLog.user_id, sa.Integer) == User.id)
            .order_by(AuditLog.timestamp.desc())
        ).all()
        
        # Create CSV content
        import csv
        from io import StringIO
        from fastapi.responses import Response
        
        output = StringIO()
        writer = csv.writer(output)
        
        # Write header with role column
        writer.writerow([
            "ID", "Timestamp", "User", "User Role", "User Email", "Operator ID", 
            "Action", "Old Value", "New Value", "IP Address"
        ])
        
        # Write data
        for row in logs:
            log = row[0]  # AuditLog object
            user_role_value = row.user_role if hasattr(row, 'user_role') else None
            
            # Convert enum to string and lowercase
            user_role = ""
            if user_role_value:
                if hasattr(user_role_value, 'value'):
                    user_role = user_role_value.value.lower()
                else:
                    user_role = str(user_role_value).lower()
            
            # Get user display name
            user_display = log.user
            if row.user_full_name:
                user_display = row.user_full_name
            elif row.user_email:
                user_display = row.user_email
            
            writer.writerow([
                log.id,
                log.timestamp.isoformat() if log.timestamp else "",
                user_display,
                user_role,
                row.user_email if hasattr(row, 'user_email') else "",
                row.user_operator_id if hasattr(row, 'user_operator_id') else "",
                log.action,
                log.old_value,
                log.new_value,
                log.ip_address
            ])
        
        return Response(
            content=output.getvalue(),
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename=audit_logs_{datetime.now().strftime('%Y%m%d')}.csv"}
        )
    except Exception as e:
        logging.error(f"Failed to export audit logs: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to export audit logs")
@router.get("/audit-logs/by-role/{role}")
async def get_audit_logs_by_role(
    role: str,
    limit: int = Query(100, ge=1, le=1000),
    offset: int = Query(0, ge=0),
    current_user: dict = Depends(verify_admin),
    db: Session = Depends(get_db)
):
    """Get audit logs filtered by user role (admin only)"""
    try:
        # Validate role
        role_upper = role.upper()
        valid_roles = ['INFLUENCER', 'BUSINESS', 'ADMIN', 'OPERATOR']
        
        if role_upper not in valid_roles:
            raise HTTPException(status_code=400, detail=f"Invalid role: {role}. Valid roles: {', '.join(valid_roles)}")
        
        # Cast user_id to integer for the join
        logs = db.execute(
            select(
                AuditLog,
                User.role.label('user_role'),
                User.operator_id.label('user_operator_id'),
                User.email.label('user_email'),
                User.full_name.label('user_full_name')
            )
            .join(User, sa.cast(AuditLog.user_id, sa.Integer) == User.id)
            .where(User.role == role_upper)
            .order_by(AuditLog.timestamp.desc())
            .offset(offset)
            .limit(limit)
        ).all()
        
        result = []
        for row in logs:
            log = row[0]
            
            # Get user display name
            user_display = log.user
            if row.user_full_name:
                user_display = row.user_full_name
            elif row.user_email:
                user_display = row.user_email
            
            result.append({
                "id": log.id,
                "timestamp": log.timestamp.isoformat() if log.timestamp else None,
                "user": user_display,
                "user_role": role.lower(),
                "action": log.action,
                "oldValue": log.old_value,
                "newValue": log.new_value,
                "ip": log.ip_address,
                "user_id": log.user_id,
                "user_operator_id": row.user_operator_id,
                "user_email": row.user_email
            })
        
        return result
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Failed to fetch audit logs by role: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch audit logs")
        
@router.get("/audit-logs/summary")
async def get_audit_logs_summary(
    current_user: dict = Depends(verify_admin),
    db: Session = Depends(get_db)
):
    """Get summary statistics of audit logs by role (admin only)"""
    try:
        # Get counts by role using direct joins with cast
        role_counts = {}
        
        for role in ['INFLUENCER', 'BUSINESS', 'ADMIN', 'OPERATOR']:
            # Count audit logs for users with this role - cast user_id to integer
            count = db.execute(
                select(func.count(AuditLog.id))
                .join(User, sa.cast(AuditLog.user_id, sa.Integer) == User.id)
                .where(User.role == role)
            ).scalar() or 0
            
            role_counts[role.lower()] = count
        
        # Get total counts
        total_logs = db.execute(select(func.count()).select_from(AuditLog)).scalar() or 0
        
        # Get today's logs
        today_start = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
        today_logs = db.execute(
            select(func.count())
            .select_from(AuditLog)
            .where(AuditLog.timestamp >= today_start)
        ).scalar() or 0
        
        # Get logs without associated users (system logs or deleted users) - cast to handle type mismatch
        orphaned_logs = db.execute(
            select(func.count(AuditLog.id))
            .outerjoin(User, sa.cast(AuditLog.user_id, sa.Integer) == User.id)
            .where(User.id == None)
        ).scalar() or 0
        
        return {
            "total": total_logs,
            "today": today_logs,
            "orphaned": orphaned_logs,
            "byRole": role_counts,
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        logging.error(f"Failed to get audit logs summary: {str(e)}")
        return {
            "total": 0,
            "today": 0,
            "orphaned": 0,
            "byRole": {
                "influencer": 0,
                "business": 0,
                "admin": 0,
                "operator": 0
            },
            "timestamp": datetime.now().isoformat()
        }
# Debug endpoint to check raw data
@router.get("/audit-logs/debug")
async def debug_audit_logs(
    current_user: dict = Depends(verify_admin),
    db: Session = Depends(get_db)
):
    """Debug endpoint to see raw audit log data (admin only)"""
    try:
        # Get a sample of audit logs with user info
        logs = db.execute(
            select(
                AuditLog.id,
                AuditLog.user_id,
                AuditLog.user,
                AuditLog.action,
                User.role,
                User.operator_id,
                User.email,
                User.full_name
            )
            .outerjoin(User, AuditLog.user_id == User.id)
            .order_by(AuditLog.timestamp.desc())
            .limit(20)
        ).all()
        
        result = []
        for log in logs:
            role_value = None
            if log.role:
                if hasattr(log.role, 'value'):
                    role_value = log.role.value
                else:
                    role_value = str(log.role)
            
            result.append({
                "log_id": log.id,
                "log_user_id": log.user_id,
                "log_user_name": log.user,
                "log_action": log.action,
                "db_user_role": role_value,
                "db_user_operator_id": log.operator_id,
                "db_user_email": log.email,
                "db_user_full_name": log.full_name,
                "has_matching_user": log.user_id is not None and log.role is not None
            })
        
        return {
            "sample_logs": result,
            "total_logs": db.execute(select(func.count()).select_from(AuditLog)).scalar(),
            "users_with_roles": db.execute(
                select(func.count()).select_from(User).where(User.role != None)
            ).scalar()
        }
    except Exception as e:
        logging.error(f"Debug endpoint failed: {str(e)}")
        return {"error": str(e)}

# ==================== SYSTEM STATUS ENDPOINTS ====================
import psutil
import platform
import os
import time
from datetime import datetime, timedelta
from sqlalchemy import text
import logging

# ===== SERVER / HOST SYSTEM MONITORING =====
# These endpoints check the actual server where your FastAPI app runs

@router.get("/system-status")
async def get_system_status(
    current_user: dict = Depends(verify_admin),
    db: Session = Depends(get_db)
):
    """Get REAL system status from the host machine (admin only)"""
    try:
        if not PSUTIL_AVAILABLE:
            return {
                "apiLatency": "0ms",
                "vaultLiquidity": "0",
                "totalUsers": 0,
                "totalTransactions": 0,
                "systemLoad": "Unknown",
                "dbLatency": 0,
                "cpuLoad": "0%",
                "storageUsage": "0GB / 0GB (0%)",
                "memoryUsage": "0GB / 0GB (0%)",
                "uptimeHours": 0
            }
        
        # Get actual system metrics
        cpu_percent = psutil.cpu_percent(interval=1)
        memory = psutil.virtual_memory()
        disk = psutil.disk_usage('/')
        
        # Get process uptime
        process = psutil.Process(os.getpid())
        process_create_time = process.create_time()
        uptime_seconds = time.time() - process_create_time
        uptime_hours = round(uptime_seconds / 3600, 1)
        
        # Get database latency
        start_time = time.time()
        db.execute(text("SELECT 1")).scalar()
        db_latency = int((time.time() - start_time) * 1000)
        
        # Get user and transaction counts
        user_count = db.execute(select(func.count()).select_from(User)).scalar() or 0
        tx_count = 0
        if WALLET_MODELS_AVAILABLE:
            tx_count = db.execute(select(func.count()).select_from(Transaction)).scalar() or 0
        
        return {
            "apiLatency": f"{db_latency}ms",
            "vaultLiquidity": "Stable" if tx_count > 0 else "Low",
            "totalUsers": user_count,
            "totalTransactions": tx_count,
            "systemLoad": "Normal" if cpu_percent < 70 else "High",
            "dbLatency": db_latency,
            "cpuLoad": f"{cpu_percent}%",
            "storageUsage": f"{disk.used // (1024**3)}GB / {disk.total // (1024**3)}GB ({disk.percent}%)",
            "memoryUsage": f"{memory.used // (1024**3)}GB / {memory.total // (1024**3)}GB ({memory.percent}%)",
            "uptimeHours": uptime_hours
        }
    except Exception as e:
        logging.error(f"Failed to fetch system status: {str(e)}")
        return {
            "apiLatency": "0ms",
            "vaultLiquidity": "0",
            "totalUsers": 0,
            "totalTransactions": 0,
            "systemLoad": "Unknown",
            "dbLatency": 0,
            "cpuLoad": "0%",
            "storageUsage": "0GB / 0GB (0%)",
            "memoryUsage": "0GB / 0GB (0%)",
            "uptimeHours": 0
        }

@router.get("/system/info")
async def get_system_info(
    current_user: dict = Depends(verify_admin)
):
    """Get detailed REAL system information from the host"""
    try:
        if not PSUTIL_AVAILABLE:
            return {
                "system": "",
                "release": "",
                "version": "",
                "processor": "",
                "python_version": platform.python_version(),
                "hostname": platform.node(),
                "cores": {
                    "physical": 0,
                    "logical": 0
                },
                "machine": "",
                "architecture": "",
                "memory_total_gb": 0,
                "network_interfaces": [],
                "detailed": {
                    "system_name": "",
                    "node_name": "",
                    "release": "",
                    "version": "",
                    "machine": ""
                }
            }
        
        import multiprocessing
        
        uname = platform.uname()
        cpu_count_physical = psutil.cpu_count(logical=False) or 0
        cpu_count_logical = psutil.cpu_count(logical=True) or 0
        memory = psutil.virtual_memory()
        
        # Get network interfaces
        net_if_addrs = psutil.net_if_addrs()
        interfaces = []
        for interface_name, interface_addresses in net_if_addrs.items():
            for address in interface_addresses:
                if address.family == 2:  # AF_INET (IPv4)
                    interfaces.append({
                        "name": interface_name,
                        "ip": address.address,
                        "netmask": address.netmask
                    })
        
        return {
            "system": platform.system(),
            "release": platform.release(),
            "version": platform.version(),
            "processor": platform.processor(),
            "python_version": platform.python_version(),
            "hostname": platform.node(),
            "cores": {
                "physical": cpu_count_physical,
                "logical": cpu_count_logical
            },
            "machine": platform.machine(),
            "architecture": platform.architecture()[0],
            "memory_total_gb": round(memory.total / (1024**3), 2) if memory.total else 0,
            "network_interfaces": interfaces,
            "detailed": {
                "system_name": uname.system,
                "node_name": uname.node,
                "release": uname.release,
                "version": uname.version,
                "machine": uname.machine
            }
        }
    except Exception as e:
        logging.error(f"Failed to get system info: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get system information")

@router.get("/system/uptime")
async def get_uptime(
    current_user: dict = Depends(verify_admin)
):
    """Get REAL system uptime from the host"""
    try:
        if not PSUTIL_AVAILABLE:
            return {
                "process": {
                    "uptime_seconds": 0,
                    "uptime_hours": 0,
                    "uptime_days": 0,
                    "start_time": None,
                    "start_time_formatted": ""
                },
                "system": {
                    "uptime_seconds": 0,
                    "uptime_hours": 0,
                    "uptime_days": 0,
                    "boot_time": None,
                    "boot_time_formatted": ""
                }
            }
        
        process = psutil.Process(os.getpid())
        process_create_time = process.create_time()
        process_uptime_seconds = time.time() - process_create_time
        
        boot_time = psutil.boot_time()
        system_uptime_seconds = time.time() - boot_time
        
        boot_datetime = datetime.fromtimestamp(boot_time)
        process_start = datetime.fromtimestamp(process_create_time)
        
        return {
            "process": {
                "uptime_seconds": round(process_uptime_seconds, 2),
                "uptime_hours": round(process_uptime_seconds / 3600, 2),
                "uptime_days": round(process_uptime_seconds / 86400, 2),
                "start_time": process_start.isoformat(),
                "start_time_formatted": process_start.strftime("%Y-%m-%d %H:%M:%S")
            },
            "system": {
                "uptime_seconds": round(system_uptime_seconds, 2),
                "uptime_hours": round(system_uptime_seconds / 3600, 2),
                "uptime_days": round(system_uptime_seconds / 86400, 2),
                "boot_time": boot_datetime.isoformat(),
                "boot_time_formatted": boot_datetime.strftime("%Y-%m-%d %H:%M:%S")
            }
        }
    except Exception as e:
        logging.error(f"Failed to get uptime: {str(e)}")
        return {
            "process": {
                "uptime_seconds": 0,
                "uptime_hours": 0,
                "uptime_days": 0,
                "start_time": None,
                "start_time_formatted": ""
            },
            "system": {
                "uptime_seconds": 0,
                "uptime_hours": 0,
                "uptime_days": 0,
                "boot_time": None,
                "boot_time_formatted": ""
            }
        }

@router.get("/system/cpu")
async def get_cpu_load(
    current_user: dict = Depends(verify_admin)
):
    """Get REAL CPU load percentage from the host"""
    try:
        if not PSUTIL_AVAILABLE:
            return {
                "load_percent": {"1s": 0, "5s": 0, "15s": 0},
                "per_core": [],
                "load_average": {
                    "1min": None,
                    "5min": None,
                    "15min": None,
                    "percent": []
                },
                "cores": {
                    "physical": 0,
                    "logical": 0
                },
                "frequency": {
                    "current_mhz": None
                },
                "times": {
                    "user": 0,
                    "system": 0,
                    "idle": 0
                },
                "timestamp": datetime.now().isoformat()
            }
        
        cpu_percent_1s = psutil.cpu_percent(interval=1)
        cpu_percent_5s = psutil.cpu_percent(interval=5)
        cpu_percent_15s = psutil.cpu_percent(interval=15)
        per_cpu = psutil.cpu_percent(interval=0.1, percpu=True)
        
        load_avg = None
        load_percent = []
        if hasattr(os, 'getloadavg'):
            load_avg = os.getloadavg()
            cpu_count = psutil.cpu_count()
            if cpu_count:
                load_percent = [round((x / cpu_count) * 100, 1) for x in load_avg]
        
        freq = psutil.cpu_freq()
        freq_current = round(freq.current, 2) if freq else None
        
        cpu_times = psutil.cpu_times_percent(interval=1)
        
        return {
            "load_percent": {
                "1s": cpu_percent_1s,
                "5s": cpu_percent_5s,
                "15s": cpu_percent_15s
            },
            "per_core": per_cpu,
            "load_average": {
                "1min": load_avg[0] if load_avg else None,
                "5min": load_avg[1] if load_avg else None,
                "15min": load_avg[2] if load_avg else None,
                "percent": load_percent if load_percent else []
            },
            "cores": {
                "physical": psutil.cpu_count(logical=False) or 0,
                "logical": psutil.cpu_count(logical=True) or 0
            },
            "frequency": {
                "current_mhz": freq_current
            },
            "times": {
                "user": round(cpu_times.user, 1),
                "system": round(cpu_times.system, 1),
                "idle": round(cpu_times.idle, 1)
            },
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        logging.error(f"Failed to get CPU load: {str(e)}")
        return {
            "load_percent": {"1s": 0, "5s": 0, "15s": 0},
            "per_core": [],
            "cores": {"physical": 0, "logical": 0},
            "timestamp": datetime.now().isoformat()
        }

@router.get("/system/memory")
async def get_memory_usage(
    current_user: dict = Depends(verify_admin)
):
    """Get REAL memory usage from the host"""
    try:
        if not PSUTIL_AVAILABLE:
            return {
                "virtual": {
                    "total_gb": 0,
                    "available_gb": 0,
                    "used_gb": 0,
                    "percent": 0,
                    "details": {
                        "active_gb": 0,
                        "inactive_gb": 0
                    }
                },
                "swap": {
                    "total_gb": 0,
                    "used_gb": 0,
                    "free_gb": 0,
                    "percent": 0
                },
                "timestamp": datetime.now().isoformat()
            }
        
        memory = psutil.virtual_memory()
        swap = psutil.swap_memory()
        
        return {
            "virtual": {
                "total_gb": round(memory.total / (1024**3), 2) if memory.total else 0,
                "available_gb": round(memory.available / (1024**3), 2) if memory.available else 0,
                "used_gb": round(memory.used / (1024**3), 2) if memory.used else 0,
                "percent": memory.percent or 0,
                "details": {
                    "active_gb": round(getattr(memory, 'active', 0) / (1024**3), 2),
                    "inactive_gb": round(getattr(memory, 'inactive', 0) / (1024**3), 2)
                }
            },
            "swap": {
                "total_gb": round(swap.total / (1024**3), 2) if swap.total else 0,
                "used_gb": round(swap.used / (1024**3), 2) if swap.used else 0,
                "free_gb": round(swap.free / (1024**3), 2) if swap.free else 0,
                "percent": swap.percent or 0
            },
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        logging.error(f"Failed to get memory usage: {str(e)}")
        return {
            "virtual": {
                "total_gb": 0,
                "available_gb": 0,
                "used_gb": 0,
                "percent": 0
            },
            "swap": {"total_gb": 0, "used_gb": 0, "free_gb": 0, "percent": 0},
            "timestamp": datetime.now().isoformat()
        }

@router.get("/system/storage")
async def get_storage_usage(
    current_user: dict = Depends(verify_admin)
):
    """Get REAL disk storage usage from the host"""
    try:
        if not PSUTIL_AVAILABLE:
            return {
                "partitions": [],
                "total": {
                    "total_gb": 0,
                    "used_gb": 0,
                    "free_gb": 0,
                    "percent": 0
                },
                "timestamp": datetime.now().isoformat()
            }
        
        partitions = []
        total_used = 0
        total_total = 0
        
        for partition in psutil.disk_partitions():
            try:
                usage = psutil.disk_usage(partition.mountpoint)
                total_used += usage.used
                total_total += usage.total
                
                partitions.append({
                    "device": partition.device,
                    "mountpoint": partition.mountpoint,
                    "fstype": partition.fstype,
                    "total_gb": round(usage.total / (1024**3), 2) if usage.total else 0,
                    "used_gb": round(usage.used / (1024**3), 2) if usage.used else 0,
                    "free_gb": round(usage.free / (1024**3), 2) if usage.free else 0,
                    "percent": usage.percent or 0
                })
            except PermissionError:
                continue
        
        return {
            "partitions": partitions,
            "total": {
                "total_gb": round(total_total / (1024**3), 2) if total_total else 0,
                "used_gb": round(total_used / (1024**3), 2) if total_used else 0,
                "free_gb": round((total_total - total_used) / (1024**3), 2) if total_total else 0,
                "percent": round((total_used / total_total * 100), 1) if total_total > 0 else 0
            },
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        logging.error(f"Failed to get storage usage: {str(e)}")
        return {
            "partitions": [],
            "total": {"total_gb": 0, "used_gb": 0, "free_gb": 0, "percent": 0},
            "timestamp": datetime.now().isoformat()
        }


# ===== DATABASE STORAGE MONITORING =====
# These endpoints check your actual PostgreSQL database storage

@router.get("/system/database-storage")
async def get_database_storage(
    current_user: dict = Depends(verify_admin),
    db: Session = Depends(get_db)
):
    """Get REAL database storage usage from PostgreSQL (table sizes, indexes, etc.)"""
    try:
        # Database size
        db_size_query = text("""
            SELECT 
                pg_database_size(current_database()) as total_bytes,
                pg_size_pretty(pg_database_size(current_database())) as total_pretty,
                current_database() as db_name
        """)
        db_size = db.execute(db_size_query).first()
        
        # Table sizes
        tables_query = text("""
            SELECT
                tablename,
                pg_size_pretty(pg_total_relation_size('public.' || tablename)) as total_size,
                pg_size_pretty(pg_relation_size('public.' || tablename)) as table_size,
                pg_size_pretty(pg_indexes_size('public.' || tablename)) as index_size,
                pg_total_relation_size('public.' || tablename) as total_bytes
            FROM pg_tables
            WHERE schemaname = 'public'
            ORDER BY pg_total_relation_size('public.' || tablename) DESC
            LIMIT 20
        """)
        tables = db.execute(tables_query).all()
        
        # Index sizes
        indexes_query = text("""
            SELECT
                tablename,
                indexname,
                pg_size_pretty(pg_relation_size('public.' || indexname::text)) as index_size
            FROM pg_indexes
            WHERE schemaname = 'public'
            ORDER BY pg_relation_size('public.' || indexname::text) DESC
            LIMIT 20
        """)
        indexes = db.execute(indexes_query).all()
        
        # Database stats
        stats_query = text("""
            SELECT
                numbackends,
                xact_commit,
                xact_rollback,
                blks_hit,
                blks_read,
                deadlocks,
                temp_files,
                temp_bytes
            FROM pg_stat_database
            WHERE datname = current_database()
        """)
        stats = db.execute(stats_query).first()
        
        # Calculate cache hit ratio
        hit_ratio = 0
        if stats and stats.blks_hit and stats.blks_read:
            total = stats.blks_hit + stats.blks_read
            hit_ratio = round((stats.blks_hit / total * 100), 2) if total > 0 else 0
        
        return {
            "database": {
                "name": db_size.db_name if db_size else "",
                "total_size_bytes": db_size.total_bytes if db_size else 0,
                "total_size_mb": round(db_size.total_bytes / (1024**2), 2) if db_size and db_size.total_bytes else 0,
                "total_size_gb": round(db_size.total_bytes / (1024**3), 2) if db_size and db_size.total_bytes else 0,
                "total_size_pretty": db_size.total_pretty if db_size else "0 bytes"
            },
            "tables": [
                {
                    "name": t.tablename,
                    "total_size": t.total_size,
                    "table_size": t.table_size,
                    "index_size": t.index_size,
                    "total_bytes": t.total_bytes
                } for t in tables
            ] if tables else [],
            "indexes": [
                {
                    "table": i.tablename,
                    "name": i.indexname,
                    "size": i.index_size
                } for i in indexes
            ] if indexes else [],
            "statistics": {
                "backends": stats.numbackends if stats else 0,
                "transactions": {
                    "committed": stats.xact_commit if stats else 0,
                    "rolled_back": stats.xact_rollback if stats else 0,
                    "success_rate": round((stats.xact_commit / (stats.xact_commit + stats.xact_rollback) * 100), 2) if stats and (stats.xact_commit + stats.xact_rollback) > 0 else 0
                },
                "cache": {
                    "hit_ratio": hit_ratio,
                    "blocks_hit": stats.blks_hit if stats else 0,
                    "blocks_read": stats.blks_read if stats else 0
                },
                "problems": {
                    "deadlocks": stats.deadlocks if stats else 0,
                    "temp_files": stats.temp_files if stats else 0,
                    "temp_bytes": stats.temp_bytes if stats else 0
                }
            },
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        logging.error(f"Failed to get database storage: {str(e)}")
        return {
            "database": {
                "name": "",
                "total_size_bytes": 0,
                "total_size_mb": 0,
                "total_size_gb": 0,
                "total_size_pretty": "0 bytes"
            },
            "tables": [],
            "indexes": [],
            "statistics": {
                "backends": 0,
                "transactions": {"committed": 0, "rolled_back": 0, "success_rate": 0},
                "cache": {"hit_ratio": 0, "blocks_hit": 0, "blocks_read": 0},
                "problems": {"deadlocks": 0, "temp_files": 0, "temp_bytes": 0}
            },
            "timestamp": datetime.now().isoformat()
        }

@router.get("/system/database-size")
async def get_database_size(
    current_user: dict = Depends(verify_admin),
    db: Session = Depends(get_db)
):
    """Get simple database size information (quick overview)"""
    try:
        query = text("""
            SELECT 
                pg_database_size(current_database()) as total_bytes,
                current_database() as db_name,
                (SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public') as table_count
        """)
        result = db.execute(query).first()
        
        # Get largest 5 tables
        tables_query = text("""
            SELECT
                tablename,
                pg_size_pretty(pg_total_relation_size('public.' || tablename)) as size
            FROM pg_tables
            WHERE schemaname = 'public'
            ORDER BY pg_total_relation_size('public.' || tablename) DESC
            LIMIT 5
        """)
        tables = db.execute(tables_query).all()
        
        return {
            "database_name": result.db_name if result else "",
            "total_size_bytes": result.total_bytes if result else 0,
            "total_size_mb": round(result.total_bytes / (1024**2), 2) if result and result.total_bytes else 0,
            "total_size_gb": round(result.total_bytes / (1024**3), 2) if result and result.total_bytes else 0,
            "total_size_pretty": f"{result.total_bytes / (1024**3):.2f} GB" if result and result.total_bytes else "0 GB",
            "table_count": result.table_count if result else 0,
            "largest_tables": [
                {"name": t.tablename, "size": t.size} for t in tables
            ] if tables else [],
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        logging.error(f"Failed to get database size: {str(e)}")
        return {
            "database_name": "",
            "total_size_bytes": 0,
            "total_size_mb": 0,
            "total_size_gb": 0,
            "total_size_pretty": "0 GB",
            "table_count": 0,
            "largest_tables": [],
            "timestamp": datetime.now().isoformat()
        }

@router.get("/system/db-ping")
async def db_ping(
    current_user: dict = Depends(verify_admin),
    db: Session = Depends(get_db)
):
    """Measure REAL database latency with simple query"""
    start_time = time.time()
    try:
        db.execute(text("SELECT 1")).scalar()
        query_time = time.time() - start_time
        latency_ms = int(query_time * 1000)
        
        return {
            "latency_ms": latency_ms,
            "status": "healthy" if latency_ms < 100 else "degraded" if latency_ms < 500 else "unhealthy",
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        query_time = time.time() - start_time
        return {
            "latency_ms": int(query_time * 1000),
            "status": "unhealthy",
            "error": str(e),
            "timestamp": datetime.now().isoformat()
        }
# ==================== OPERATOR LEDGER ENDPOINTS ====================

@router.get("/operators")
async def get_operators(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    search: Optional[str] = None,
    role: Optional[str] = None,
    status: Optional[bool] = None,
    current_user: dict = Depends(verify_admin),
    db: Session = Depends(get_db)
):
    """Get all operators/users with pagination and filters (admin only)"""
    try:
        # Build base query
        query = select(User)
        
        # Apply filters
        if search:
            query = query.where(
                or_(
                    User.email.ilike(f"%{search}%"),
                    User.full_name.ilike(f"%{search}%"),
                    User.operator_id.ilike(f"%{search}%")
                )
            )
        
        # Handle role filtering correctly with enum values
        if role:
            # Convert role to uppercase for enum comparison
            role_upper = role.upper()
            # Valid enum values in database
            valid_roles = ['INFLUENCER', 'BUSINESS', 'ADMIN', 'OPERATOR']
            if role_upper in valid_roles:
                query = query.where(User.role == role_upper)
        
        if status is not None:
            query = query.where(User.is_active == status)
        
        # Get total count
        total = db.execute(select(func.count()).select_from(query.subquery())).scalar() or 0
        
        # Apply pagination
        query = query.order_by(User.created_at.desc())
        query = query.offset((page - 1) * limit).limit(limit)
        
        users = db.execute(query).scalars().all()
        
        # Get settings for each user
        result = []
        for user in users:
            # Safely get settings
            try:
                settings = db.execute(
                    select(UserSettings).where(UserSettings.user_id == user.operator_id)
                ).scalar_one_or_none()
            except:
                settings = None
            
            # Safely get role value - convert enum to string
            role_value = user.role
            if hasattr(user.role, 'value'):
                role_value = user.role.value
            elif isinstance(user.role, str):
                role_value = user.role
            
            # Convert to lowercase for frontend consistency
            if isinstance(role_value, str):
                role_value = role_value.lower()
            
            result.append({
                "id": user.id,
                "operator_id": user.operator_id,
                "email": user.email,
                "full_name": user.full_name,
                "role": role_value,  # Will be 'influencer', 'business', 'admin', or 'operator'
                "is_active": user.is_active,
                "is_verified": user.is_verified,
                "kyc_status": user.kyc_status or "PENDING",
                "created_at": user.created_at.isoformat() if user.created_at else None,
                "last_login": user.last_login.isoformat() if user.last_login else None,
                "enrolled_by": user.enrolled_by
            })
        
        return {
            "operators": result,
            "pagination": {
                "page": page,
                "limit": limit,
                "total": total,
                "total_pages": (total + limit - 1) // limit if total > 0 else 0
            }
        }
    except Exception as e:
        logging.error(f"Failed to fetch operators: {str(e)}")
        # Return empty result instead of 500 error
        return {
            "operators": [],
            "pagination": {
                "page": page,
                "limit": limit,
                "total": 0,
                "total_pages": 0
            }
        }

@router.get("/operators/{operator_id}")
async def get_operator_details(
    operator_id: str,
    current_user: dict = Depends(verify_admin),
    db: Session = Depends(get_db)
):
    """Get detailed information about a specific operator"""
    try:
        user = db.execute(
            select(User).where(User.operator_id == operator_id)
        ).scalar_one_or_none()
        
        if not user:
            raise HTTPException(status_code=404, detail="Operator not found")
        
        # Get settings
        try:
            settings = db.execute(
                select(UserSettings).where(UserSettings.user_id == operator_id)
            ).scalar_one_or_none()
        except:
            settings = None
        
        # Get audit logs for this operator
        try:
            audit_logs = db.execute(
                select(AuditLog)
                .where(AuditLog.user_id == user.id)
                .order_by(AuditLog.timestamp.desc())
                .limit(20)
            ).scalars().all()
        except:
            audit_logs = []
        
        # Get recent activity
        recent_activity = []
        for log in audit_logs:
            recent_activity.append({
                "timestamp": log.timestamp.isoformat() if log.timestamp else None,
                "action": log.action,
                "ip": log.ip_address,
                "details": f"{log.old_value} → {log.new_value}" if log.old_value and log.new_value else log.action
            })
        
        # Safely get role value
        role_value = user.role
        if hasattr(user.role, 'value'):
            role_value = user.role.value
        elif isinstance(user.role, str):
            role_value = user.role
        
        # Convert to lowercase for frontend
        if isinstance(role_value, str):
            role_value = role_value.lower()
        
        return {
            "operator": {
                "id": user.id,
                "operator_id": user.operator_id,
                "email": user.email,
                "full_name": user.full_name,
                "role": role_value,
                "is_active": user.is_active,
                "is_verified": user.is_verified,
                "kyc_status": user.kyc_status,
                "kyc_notes": user.kyc_notes,
                "created_at": user.created_at.isoformat() if user.created_at else None,
                "last_login": user.last_login.isoformat() if user.last_login else None,
                "enrolled_by": user.enrolled_by,
                "enrolled_at": user.enrolled_at.isoformat() if user.enrolled_at else None
            },
            "settings": {
                "full_name": settings.full_name if settings else user.full_name,
                "username": settings.username if settings else None,
                "country": settings.country if settings else "",
                "bio": settings.bio if settings else "",
                "is_public": settings.is_public if settings else True,
                "social_links": settings.social_links if settings else {},
                "payout_method": settings.payout_method if settings else "",
                "payout_account": settings.payout_account if settings else None,
                "min_payout_threshold": float(settings.min_payout_threshold) if settings and settings.min_payout_threshold else 0.0,
                "auto_withdraw": settings.auto_withdraw if settings else False
            } if settings else None,
            "recent_activity": recent_activity
        }
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Failed to fetch operator details: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch operator details")

@router.post("/users/status")
async def update_user_status(
    request: Dict[str, Any],
    current_user: dict = Depends(verify_admin),
    db: Session = Depends(get_db)
):
    """Update user status (lock/unlock/verify/suspend/activate)"""
    operator_id = request.get("operator_id")
    action = request.get("action")  # lock, unlock, verify, suspend, activate
    
    if not operator_id or not action:
        raise HTTPException(status_code=400, detail="Operator ID and action required")
    
    try:
        user = db.execute(
            select(User).where(User.operator_id == operator_id)
        ).scalar_one_or_none()
        
        if not user:
            raise HTTPException(status_code=404, detail="Operator not found")
        
        # Prevent self-modification for critical actions
        if user.email == current_user.get("email") and action in ["lock", "suspend", "deactivate"]:
            raise HTTPException(status_code=400, detail="Cannot modify your own account")
        
        # Track old values for audit
        old_status = {
            "is_active": user.is_active,
            "is_verified": user.is_verified
        }
        
        # Perform action
        if action == "lock" or action == "suspend" or action == "deactivate":
            user.is_active = False
        elif action == "unlock" or action == "activate":
            user.is_active = True
        elif action == "verify":
            user.is_verified = True
        else:
            raise HTTPException(status_code=400, detail=f"Unknown action: {action}")
        
        # Create audit log
        audit_log = AuditLog(
            user=current_user.get("full_name", "Admin"),
            action=f"USER_{action.upper()}",
            old_value=json.dumps(old_status),
            new_value=json.dumps({"is_active": user.is_active, "is_verified": user.is_verified}),
            ip_address=request.get("ip_address", "127.0.0.1"),
            user_id=user.id
        )
        db.add(audit_log)
        
        db.commit()
        
        return {
            "status": "success",
            "message": f"User {action} successful",
            "operator_id": operator_id,
            "new_status": action
        }
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logging.error(f"Failed to update user status: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to update user status")

@router.post("/users/role")
async def update_user_role(
    request: Dict[str, Any],
    current_user: dict = Depends(verify_admin),
    db: Session = Depends(get_db)
):
    """Update user role (promote/demote between admin/business/influencer/operator)"""
    operator_id = request.get("operator_id")
    new_role = request.get("role")
    
    if not operator_id:
        raise HTTPException(status_code=400, detail="Operator ID required")
    
    if not new_role:
        raise HTTPException(status_code=400, detail="Role required")
    
    try:
        user = db.execute(
            select(User).where(User.operator_id == operator_id)
        ).scalar_one_or_none()
        
        if not user:
            raise HTTPException(status_code=404, detail="Operator not found")
        
        # Prevent self-modification
        if user.email == current_user.get("email"):
            raise HTTPException(status_code=400, detail="Cannot modify your own role")
        
        old_role = user.role
        if hasattr(user.role, 'value'):
            old_role = user.role.value
        elif isinstance(user.role, str):
            old_role = user.role
        
        # Validate new role against actual enum values in database
        valid_roles = ["influencer", "business", "admin", "operator"]
        if new_role.lower() not in valid_roles:
            raise HTTPException(status_code=400, detail=f"Invalid role: {new_role}. Valid roles: {valid_roles}")
        
        # Convert to uppercase for database enum
        user.role = new_role.upper()
        
        # Create audit log
        audit_log = AuditLog(
            user=current_user.get("full_name", "Admin"),
            action="USER_ROLE_CHANGE",
            old_value=str(old_role),
            new_value=new_role,
            ip_address=request.get("ip_address", "127.0.0.1"),
            user_id=user.id
        )
        db.add(audit_log)
        
        db.commit()
        
        return {
            "status": "success",
            "message": f"User role updated successfully",
            "operator_id": operator_id,
            "old_role": str(old_role).lower() if old_role else None,
            "new_role": new_role
        }
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logging.error(f"Failed to update user role: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to update user role")

@router.get("/users/stats")
async def get_user_statistics(
    current_user: dict = Depends(verify_admin),
    db: Session = Depends(get_db)
):
    """Get user statistics with role breakdown"""
    try:
        # Total users
        total = db.execute(select(func.count()).select_from(User)).scalar() or 0
        
        # Active/Inactive
        active = db.execute(
            select(func.count()).select_from(User).where(User.is_active == True)
        ).scalar() or 0
        
        # Verified users
        verified = db.execute(
            select(func.count()).select_from(User).where(User.is_verified == True)
        ).scalar() or 0
        
        # KYC status breakdown
        kyc_pending = db.execute(
            select(func.count()).select_from(User).where(User.kyc_status == "PENDING")
        ).scalar() or 0
        
        kyc_verified = db.execute(
            select(func.count()).select_from(User).where(User.kyc_status == "VERIFIED")
        ).scalar() or 0
        
        kyc_rejected = db.execute(
            select(func.count()).select_from(User).where(User.kyc_status == "REJECTED")
        ).scalar() or 0
        
        kyc_under_review = db.execute(
            select(func.count()).select_from(User).where(User.kyc_status == "UNDER_REVIEW")
        ).scalar() or 0
        
        # Role breakdown - using uppercase for database enum
        admins = db.execute(
            select(func.count()).select_from(User).where(User.role == "ADMIN")
        ).scalar() or 0
        
        operators = db.execute(
            select(func.count()).select_from(User).where(User.role == "OPERATOR")
        ).scalar() or 0
        
        businesses = db.execute(
            select(func.count()).select_from(User).where(User.role == "BUSINESS")
        ).scalar() or 0
        
        influencers = db.execute(
            select(func.count()).select_from(User).where(User.role == "INFLUENCER")
        ).scalar() or 0
        
        # Recent registrations (last 7/30 days)
        seven_days_ago = datetime.now() - timedelta(days=7)
        thirty_days_ago = datetime.now() - timedelta(days=30)
        
        new_last_7 = db.execute(
            select(func.count())
            .select_from(User)
            .where(User.created_at >= seven_days_ago)
        ).scalar() or 0
        
        new_last_30 = db.execute(
            select(func.count())
            .select_from(User)
            .where(User.created_at >= thirty_days_ago)
        ).scalar() or 0
        
        return {
            "total": total,
            "active": active,
            "inactive": total - active,
            "verified": verified,
            "kyc": {
                "pending": kyc_pending,
                "under_review": kyc_under_review,
                "verified": kyc_verified,
                "rejected": kyc_rejected
            },
            "roles": {
                "admin": admins,
                "operator": operators,
                "business": businesses,
                "influencer": influencers
            },
            "trends": {
                "new_last_7_days": new_last_7,
                "new_last_30_days": new_last_30
            }
        }
    except Exception as e:
        logging.error(f"Failed to get user stats: {str(e)}")
        # Return empty stats instead of 500
        return {
            "total": 0,
            "active": 0,
            "inactive": 0,
            "verified": 0,
            "kyc": {
                "pending": 0,
                "under_review": 0,
                "verified": 0,
                "rejected": 0
            },
            "roles": {
                "admin": 0,
                "operator": 0,
                "business": 0,
                "influencer": 0
            },
            "trends": {
                "new_last_7_days": 0,
                "new_last_30_days": 0
            }
        }

# ==================== VAULT ENDPOINTS ====================

@router.get("/vaults")
async def get_vaults(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    status: Optional[str] = None,
    search: Optional[str] = None,
    current_user: dict = Depends(verify_admin),
    db: Session = Depends(get_db)
):
    """Get all vaults with pagination (admin only)"""
    try:
        if not VAULT_MODELS_AVAILABLE:
            return {
                "vaults": [],
                "pagination": {
                    "page": page,
                    "limit": limit,
                    "total": 0,
                    "total_pages": 0
                }
            }
        
        # Build query
        query = select(Vault)
        
        if status:
            query = query.where(Vault.status == status)
        
        if search:
            query = query.where(
                or_(
                    Vault.title.ilike(f"%{search}%"),
                    Vault.description.ilike(f"%{search}%")
                )
            )
        
        # Get total count
        total = db.execute(select(func.count()).select_from(query.subquery())).scalar() or 0
        
        # Apply pagination
        query = query.order_by(Vault.created_at.desc())
        query = query.offset((page - 1) * limit).limit(limit)
        
        vaults = db.execute(query).scalars().all()
        
        result = []
        for vault in vaults:
            creator_name = "Unknown"
            if hasattr(vault, 'creator') and vault.creator:
                creator_name = vault.creator.full_name or vault.creator.email or "Unknown"
            
            result.append({
                "id": vault.id,
                "vault_id": getattr(vault, 'vault_id', str(vault.id)),
                "title": getattr(vault, 'title', ''),
                "status": getattr(vault, 'status', ''),
                "amount": float(getattr(vault, 'amount', 0)),
                "creator": creator_name,
                "created_at": vault.created_at.isoformat() if vault.created_at else None,
                "description": getattr(vault, 'description', '')[:100] + '...' if getattr(vault, 'description', None) else ''
            })
        
        return {
            "vaults": result,
            "pagination": {
                "page": page,
                "limit": limit,
                "total": total,
                "total_pages": (total + limit - 1) // limit if total > 0 else 0
            }
        }
    except Exception as e:
        logging.error(f"Failed to fetch vaults: {str(e)}")
        return {
            "vaults": [],
            "pagination": {
                "page": page,
                "limit": limit,
                "total": 0,
                "total_pages": 0
            }
        }

@router.get("/vaults/recent")
async def get_recent_vault(
    current_user: dict = Depends(verify_admin),
    db: Session = Depends(get_db)
):
    """Get most recent vault for dashboard (admin only)"""
    try:
        if not VAULT_MODELS_AVAILABLE:
            return None
        
        # Get the most recent vault
        vault = db.execute(
            select(Vault)
            .order_by(Vault.created_at.desc())
            .limit(1)
        ).scalar_one_or_none()
        
        if not vault:
            return None
        
        # Get creator name safely
        creator_name = "Unknown"
        creator_id = None
        if hasattr(vault, 'creator') and vault.creator:
            creator_name = vault.creator.full_name or vault.creator.email or "Unknown"
            creator_id = vault.creator.operator_id
        
        # Get counterparty/client name safely
        client_name = "Unknown"
        if hasattr(vault, 'counterparty') and vault.counterparty:
            client_name = vault.counterparty.full_name or vault.counterparty.email or "Unknown"
        elif hasattr(vault, 'client') and vault.client:
            client_name = vault.client.full_name or vault.client.email or "Unknown"
        
        return {
            "id": vault.id,
            "vault_id": getattr(vault, 'vault_id', str(vault.id)),
            "title": getattr(vault, 'title', ''),
            "status": getattr(vault, 'status', ''),
            "creator_name": creator_name,
            "creator_id": creator_id,
            "client_name": client_name,
            "amount": float(getattr(vault, 'amount', 0)),
            "created_at": vault.created_at.isoformat() if vault.created_at else None
        }
        
    except Exception as e:
        logging.error(f"Failed to fetch recent vault: {str(e)}")
        return None

@router.get("/vaults/{vault_id}")
async def get_vault_details(
    vault_id: str,
    current_user: dict = Depends(verify_admin),
    db: Session = Depends(get_db)
):
    """Get detailed information about a specific vault"""
    try:
        if not VAULT_MODELS_AVAILABLE:
            raise HTTPException(status_code=404, detail="Vault not found")
        
        vault = db.execute(
            select(Vault).where(Vault.id == vault_id)
        ).scalar_one_or_none()
        
        if not vault:
            raise HTTPException(status_code=404, detail="Vault not found")
        
        # Get creator info
        creator_name = "Unknown"
        creator_email = None
        if hasattr(vault, 'creator') and vault.creator:
            creator_name = vault.creator.full_name or vault.creator.email or "Unknown"
            creator_email = vault.creator.email
        
        # Get counterparty info
        counterparty_name = "Unknown"
        counterparty_email = None
        if hasattr(vault, 'counterparty') and vault.counterparty:
            counterparty_name = vault.counterparty.full_name or vault.counterparty.email or "Unknown"
            counterparty_email = vault.counterparty.email
        elif hasattr(vault, 'client') and vault.client:
            counterparty_name = vault.client.full_name or vault.client.email or "Unknown"
            counterparty_email = vault.client.email
        
        return {
            "id": vault.id,
            "vault_id": getattr(vault, 'vault_id', str(vault.id)),
            "title": getattr(vault, 'title', ''),
            "description": getattr(vault, 'description', ''),
            "status": getattr(vault, 'status', ''),
            "amount": float(getattr(vault, 'amount', 0)),
            "creator": {
                "name": creator_name,
                "email": creator_email,
                "id": vault.creator_id if hasattr(vault, 'creator_id') else None
            },
            "counterparty": {
                "name": counterparty_name,
                "email": counterparty_email,
                "id": vault.counterparty_id if hasattr(vault, 'counterparty_id') else 
                      vault.client_id if hasattr(vault, 'client_id') else None
            },
            "terms": getattr(vault, 'terms', ''),
            "milestones": getattr(vault, 'milestones', []),
            "created_at": vault.created_at.isoformat() if vault.created_at else None,
            "updated_at": vault.updated_at.isoformat() if hasattr(vault, 'updated_at') and vault.updated_at else None,
            "released_at": vault.released_at.isoformat() if hasattr(vault, 'released_at') and vault.released_at else None
        }
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Failed to fetch vault details: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch vault details")

# ==================== RELAY ENDPOINTS ====================

@router.get("/relays/status")
async def get_relay_status(
    current_user: dict = Depends(verify_admin),
    db: Session = Depends(get_db)
):
    """Get relay node statuses (admin only)"""
    try:
        if RELAY_MODELS_AVAILABLE:
            relays = db.execute(
                select(RelayNode)
                .order_by(RelayNode.region)
            ).scalars().all()
            
            result = []
            for relay in relays:
                result.append({
                    "id": relay.id,
                    "name": relay.name,
                    "status": "active" if getattr(relay, 'is_active', True) else "inactive",
                    "load": f"{getattr(relay, 'load', 0)}%",
                    "latency": getattr(relay, 'latency', 0),
                    "connections": getattr(relay, 'connections', 0),
                    "region": relay.region,
                    "version": getattr(relay, 'version', '')
                })
            
            return {"relays": result}
        
        # Return empty data
        return {"relays": []}
    except Exception as e:
        logging.error(f"Failed to get relay status: {str(e)}")
        return {"relays": []}

# ==================== SETTINGS ENDPOINT ====================

@router.get("/settings")
async def get_admin_settings(
    current_user: dict = Depends(verify_admin),
    db: Session = Depends(get_db)
):
    """Get admin settings (admin only)"""
    try:
        # Get platform config
        config = db.execute(
            select(PlatformConfig).filter(PlatformConfig.id == 1)
        ).scalar_one_or_none()
        
        # Get user counts
        total_users = db.execute(select(func.count()).select_from(User)).scalar() or 0
        
        # Get transaction counts if available
        total_transactions = 0
        if WALLET_MODELS_AVAILABLE:
            total_transactions = db.execute(select(func.count()).select_from(Transaction)).scalar() or 0
        
        # Get pending KYC count
        pending_kyc = db.execute(
            select(func.count())
            .select_from(User)
            .where(User.kyc_status == "PENDING")
        ).scalar() or 0
        
        return {
            "platform": {
                "name": "Aethel PayGuard",
                "version": "1.0.0",
                "environment": os.getenv("ENVIRONMENT", "production"),
                "maintenance_mode": config.freeze_website if config else False,
                "maintenance_message": config.freeze_message if config else None
            },
            "stats": {
                "total_users": total_users,
                "total_transactions": total_transactions,
                "active_disputes": 0,
                "pending_kyc": pending_kyc
            },
            "features": {
                "deposits": True,
                "withdrawals": True,
                "conversions": True,
                "disputes": True,
                "escrow": True
            }
        }
    except Exception as e:
        logging.error(f"Failed to fetch admin settings: {str(e)}")
        return {
            "platform": {
                "name": "Aethel PayGuard",
                "version": "1.0.0",
                "environment": os.getenv("ENVIRONMENT", "production"),
                "maintenance_mode": False
            },
            "stats": {
                "total_users": 0,
                "total_transactions": 0,
                "active_disputes": 0,
                "pending_kyc": 0
            },
            "features": {
                "deposits": True,
                "withdrawals": True,
                "conversions": True,
                "disputes": True,
                "escrow": True
            }
        }

# ==================== REVENUE ENDPOINTS ====================

@router.get("/revenue/volume")
async def get_revenue_volume(
    timeframe: str = Query("monthly", pattern="^(daily|weekly|monthly)$"),
    current_user: dict = Depends(verify_admin),
    db: Session = Depends(get_db)
):
    """Get revenue volume data for charts"""
    if not WALLET_MODELS_AVAILABLE:
        # Return empty data
        if timeframe == "daily":
            return {"daily": []}
        elif timeframe == "weekly":
            return {"weekly": []}
        else:
            return {"monthly": []}
    
    now = datetime.now()
    
    try:
        if timeframe == "daily":
            # Last 30 days
            start_date = now - timedelta(days=30)
            query = db.execute(
                select(
                    func.date(Transaction.created_at).label('date'),
                    func.sum(Transaction.amount).label('total')
                )
                .where(
                    Transaction.created_at >= start_date,
                    Transaction.tx_type.in_(['DEPOSIT', 'ESCROW_LOCK'])
                )
                .group_by(func.date(Transaction.created_at))
                .order_by('date')
            ).all()
            
            if query:
                return {"daily": [float(row.total) for row in query]}
            else:
                return {"daily": []}
            
        elif timeframe == "weekly":
            # Last 12 weeks
            start_date = now - timedelta(weeks=12)
            # Use EXTRACT for PostgreSQL compatibility
            query = db.execute(
                select(
                    func.concat(
                        func.extract('year', Transaction.created_at), '-',
                        func.lpad(func.cast(func.extract('week', Transaction.created_at), sa.String), 2, '0')
                    ).label('week'),
                    func.sum(Transaction.amount).label('total')
                )
                .where(
                    Transaction.created_at >= start_date,
                    Transaction.tx_type.in_(['DEPOSIT', 'ESCROW_LOCK'])
                )
                .group_by('week')
                .order_by('week')
            ).all()
            
            if query:
                return {"weekly": [float(row.total) for row in query]}
            else:
                return {"weekly": []}
            
        else:  # monthly
            # Last 12 months
            start_date = now - timedelta(days=365)
            # Use EXTRACT for PostgreSQL compatibility
            query = db.execute(
                select(
                    func.concat(
                        func.extract('year', Transaction.created_at), '-',
                        func.lpad(func.cast(func.extract('month', Transaction.created_at), sa.String), 2, '0')
                    ).label('month'),
                    func.sum(Transaction.amount).label('total')
                )
                .where(
                    Transaction.created_at >= start_date,
                    Transaction.tx_type.in_(['DEPOSIT', 'ESCROW_LOCK'])
                )
                .group_by('month')
                .order_by('month')
            ).all()
            
            if query:
                return {"monthly": [float(row.total) for row in query]}
            else:
                return {"monthly": []}
    except Exception as e:
        logging.error(f"Failed to get revenue volume: {str(e)}")
        # Return empty data on error
        if timeframe == "daily":
            return {"daily": []}
        elif timeframe == "weekly":
            return {"weekly": []}
        else:
            return {"monthly": []}

# ==================== MPESA METRICS ENDPOINT ====================

@router.get("/mpesa/metrics")
async def get_mpesa_metrics(
    current_user: dict = Depends(verify_admin),
    db: Session = Depends(get_db)
):
    """Get M-Pesa metrics for admin dashboard"""
    try:
        # Try to get real metrics from transactions
        if WALLET_MODELS_AVAILABLE:
            # Get all M-Pesa transactions
            total_transactions = db.execute(
                select(func.count())
                .select_from(Transaction)
                .where(Transaction.provider == "mpesa")
            ).scalar() or 0
            
            successful = db.execute(
                select(func.count())
                .select_from(Transaction)
                .where(
                    Transaction.provider == "mpesa",
                    Transaction.status == "completed"
                )
            ).scalar() or 0
            
            failed = db.execute(
                select(func.count())
                .select_from(Transaction)
                .where(
                    Transaction.provider == "mpesa",
                    Transaction.status == "failed"
                )
            ).scalar() or 0
            
            # Calculate success rate
            success_rate = (successful / total_transactions * 100) if total_transactions > 0 else 0
            
            # Total settled amount
            total_settled = db.execute(
                select(func.sum(Transaction.amount))
                .select_from(Transaction)
                .where(
                    Transaction.provider == "mpesa",
                    Transaction.status == "completed"
                )
            ).scalar() or 0
            
            return {
                "total_transactions": total_transactions,
                "successful": successful,
                "failed": failed,
                "success_rate": round(success_rate, 1),
                "avg_time": "0s",
                "total_settled": float(total_settled)
            }
        
        # Return empty data if no real data
        return {
            "total_transactions": 0,
            "successful": 0,
            "failed": 0,
            "success_rate": 0,
            "avg_time": "0s",
            "total_settled": 0
        }
    except Exception as e:
        logging.error(f"Failed to get M-Pesa metrics: {str(e)}")
        # Return empty data on error
        return {
            "total_transactions": 0,
            "successful": 0,
            "failed": 0,
            "success_rate": 0,
            "avg_time": "0s",
            "total_settled": 0
        }
    
    # End of mpesa metrics endpoint
