import logging
from fastapi import APIRouter, Depends, HTTPException, Query, status
from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import func, or_, select
from datetime import datetime, timezone
import uuid

# Core Imports
from app.models.dispute import Dispute, SupportTicket
from app.schemas.dispute import (
    Dispute as DisputeSchema, 
    SupportTicketCreate, 
    SupportTicket as SupportSchema
)
from app.database import get_db
from app.routes.auth import get_current_user 

# Note: Prefix is removed from individual routes to be managed at the main app level
router = APIRouter(tags=["Dispute Protocol"])

# --- 1. DISPUTE REGISTRY ---

@router.get("/disputes", response_model=List[DisputeSchema])
def get_disputes(
    role: str = Query("admin"), 
    operator_id: Optional[str] = Query(None),  # FIXED: Use Query param, not just default
    db: Session = Depends(get_db)
):
    """
    Fetches the dispute registry. 
    Admins see all; users see only cases where they are the initiator or counterparty.
    """
    query = db.query(Dispute)
    
    if role != "admin" and operator_id:
        # Filter by initiator_id or counterparty_id for non-admin users
        query = query.filter(or_(
            Dispute.initiator_id == operator_id, 
            Dispute.counterparty_id == operator_id
        ))
    
    return query.order_by(Dispute.created_at.desc()).all()

@router.get("/disputes/{case_id}", response_model=DisputeSchema)
def get_dispute_details(case_id: str, db: Session = Depends(get_db)):
    case = db.query(Dispute).filter(Dispute.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Dispute case not found")
    return case

# --- 2. VERDICT PROTOCOL ---

@router.patch("/disputes/{case_id}/verdict")
def submit_verdict(
    case_id: str, 
    verdict: str = Query(...), 
    notes: Optional[str] = Query(None),  # FIXED: Add notes parameter
    db: Session = Depends(get_db)
):
    """
    Broadcasts the Alpha Node verdict.
    Updates the status and appends the decision to the timeline.
    """
    case = db.query(Dispute).filter(Dispute.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case entry missing")
    
    if case.status == "RESOLVED":
        raise HTTPException(status_code=400, detail="Case already finalized")
    
    case.status = "RESOLVED"
    case.verdict = verdict
    case.verdict_details = notes  # FIXED: Store verdict notes
    case.resolved_at = datetime.now(timezone.utc)
    
    # Update timeline (Safe append for JSONB columns)
    new_event = {
        "event": f"Verdict Issued: {verdict.upper()}", 
        "date": datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M"),
        "notes": notes
    }
    
    # Re-assigning the list triggers the SQLAlchemy 'modified' flag
    case.timeline = (case.timeline or []) + [new_event]
    
    db.commit()
    db.refresh(case)
    return {"status": "SUCCESS", "message": f"Verdict '{verdict}' broadcasted to ledger"}

# --- 3. SUPPORT & TICKETING ---

@router.post("/support", response_model=SupportSchema, status_code=201)
def create_support_ticket(
    ticket: SupportTicketCreate, 
    db: Session = Depends(get_db)
):
    """Creates a support packet (SupportView on Frontend)"""
    # FIXED: Include operator_id from the request
    new_ticket = SupportTicket(
        id=f"SR-{uuid.uuid4().hex[:6].upper()}",
        category=ticket.category,
        subject=ticket.subject,
        message=ticket.message,
        operator_id=ticket.operator_id,  # FIXED: Added operator_id
        status="PENDING",
        created_at=datetime.now(timezone.utc)
    )
    db.add(new_ticket)
    db.commit()
    db.refresh(new_ticket)
    return new_ticket

@router.get("/support", response_model=List[SupportSchema])
def list_support_tickets(
    operator_id: Optional[str] = Query(None),  # FIXED: Add operator_id filter
    db: Session = Depends(get_db)
):
    """Feeds the 'HistoryView' on the Global Resolution Center"""
    query = db.query(SupportTicket).order_by(SupportTicket.created_at.desc())
    
    # FIXED: Filter by operator_id if provided
    if operator_id:
        query = query.filter(SupportTicket.operator_id == operator_id)
    
    return query.all()

# --- 4. USER-SPECIFIC SUPPORT TICKETS (kept for backward compatibility) ---

@router.get("/support/user/{operator_id}", response_model=List[SupportSchema])
def get_user_support_tickets(
    operator_id: str, 
    db: Session = Depends(get_db)
):
    """Get support tickets for a specific user"""
    return db.query(SupportTicket).filter(
        SupportTicket.operator_id == operator_id
    ).order_by(SupportTicket.created_at.desc()).all()

# --- 5. ADMIN ASSIGNMENT ENDPOINT ---

@router.post("/admin/assign/{case_id}")
def assign_dispute_to_admin(
    case_id: str,
    request: dict,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Assign a dispute to an admin (admin only)"""
    # Verify admin access
    role = current_user.get("role", "USER").upper()
    if role not in ["ADMIN", "OPERATOR"]:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    case = db.query(Dispute).filter(Dispute.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Dispute case not found")
    
    admin_id = request.get("admin_id")
    if not admin_id:
        raise HTTPException(status_code=400, detail="Admin ID required")
    
    case.assigned_admin = admin_id
    case.status = "UNDER_REVIEW"
    
    # Add to timeline
    new_event = {
        "event": f"Case assigned to admin", 
        "date": datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M"),
        "admin_id": admin_id
    }
    case.timeline = (case.timeline or []) + [new_event]
    
    db.commit()
    
    return {"status": "SUCCESS", "message": "Case assigned successfully"}

# --- 6. SYSTEM MOCKS (REMOVE IN PRODUCTION) ---

@router.get("/admin/notifications/{operator_id}")
def get_mock_notifications(operator_id: str):
    """Silences 404 logs from the frontend sidebar polling - REMOVE IN PRODUCTION"""
    return [
        {
            "id": "1", 
            "type": "info", 
            "message": "Protocol Engine Online", 
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
    ]

# --- 7. HEALTH CHECK ---

@router.get("/health")
def dispute_health_check():
    """Health check endpoint for dispute protocol"""
    return {
        "status": "operational",
        "service": "dispute-protocol",
        "timestamp": datetime.now(timezone.utc).isoformat()
    }

# --- 8. ADMIN QUEUE STATISTICS ---

@router.get("/admin/queue")
async def get_admin_queue(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get admin queue statistics (pending cases, in review, resolved today)"""
    # Verify admin access
    role = current_user.get("role", "USER").upper()
    if role not in ["ADMIN", "OPERATOR"]:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    try:
        # Count pending disputes (OPEN)
        pending = db.execute(
            select(func.count()).select_from(Dispute).where(Dispute.status == "OPEN")
        ).scalar() or 0
        
        # Count disputes under review
        in_review = db.execute(
            select(func.count()).select_from(Dispute).where(Dispute.status == "UNDER_REVIEW")
        ).scalar() or 0
        
        # Count disputes resolved today
        today_start = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
        resolved_today = db.execute(
            select(func.count())
            .select_from(Dispute)
            .where(
                Dispute.status == "RESOLVED",
                Dispute.resolved_at >= today_start
            )
        ).scalar() or 0
        
        # Calculate average resolution time (in hours)
        resolved_disputes = db.execute(
            select(Dispute)
            .where(Dispute.status == "RESOLVED")
            .limit(100)
        ).scalars().all()
        
        total_time = 0
        count = 0
        for dispute in resolved_disputes:
            if dispute.resolved_at and dispute.created_at:
                time_diff = dispute.resolved_at - dispute.created_at
                total_time += time_diff.total_seconds() / 3600  # Convert to hours
                count += 1
        
        avg_resolution_time = f"{round(total_time / count, 1)}h" if count > 0 else "0h"
        
        return {
            "pending": pending,
            "in_review": in_review,
            "resolved_today": resolved_today,
            "avg_resolution_time": avg_resolution_time
        }
    except Exception as e:
        logging.error(f"Failed to get admin queue: {str(e)}")
        # Return default values instead of failing
        return {
            "pending": 0,
            "in_review": 0,
            "resolved_today": 0,
            "avg_resolution_time": "0h"
        }
