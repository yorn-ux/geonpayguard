import uuid
import hmac
import hashlib
from decimal import Decimal
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, status, Request
from sqlalchemy import func, select
from sqlalchemy.orm import Session
from datetime import datetime
import httpx
import os

from ..database import get_db
from ..models.wallet import Wallet, Transaction, TransactionType, TransactionStatus, PlatformRevenue
from ..models.user import User
from .auth import get_current_user
from ..services.email import send_deposit_notification, send_withdrawal_notification

# M-Pesa API Configuration
MPESA_ENVIRONMENT = os.getenv("MPESA_ENVIRONMENT", "sandbox")
MPESA_SHORTCODE = os.getenv("MPESA_SHORTCODE", "")
MPESA_CALLBACK_URL = os.getenv("MPESA_CALLBACK_URL", "")

router = APIRouter(tags=["Unified Wallet"])

# --- 1. UTILITIES ---

def calculate_withdrawal_fee(amount: Decimal, method: str, history_count: int, total_volume: Decimal) -> Decimal:
    """Calculates dynamic fee based on amount tiers, loyalty, and volume."""
    if amount >= 1000000: base_perc = Decimal("0.25")
    elif amount >= 100000: base_perc = Decimal("0.55")
    elif amount >= 10000: base_perc = Decimal("0.85")
    else: base_perc = Decimal("1.15")

    loyalty_discount = min(Decimal(history_count) * Decimal("0.01"), Decimal("0.15"))
    volume_discount = min(total_volume / Decimal("10000000"), Decimal("0.1"))
    
    final_perc = max(Decimal("0.25"), base_perc - loyalty_discount - volume_discount)
    if method == "mpesa": final_perc += Decimal("0.25")  # Increased for PesaPal payouts
    
    fee = (amount * final_perc) / 100
    min_fee = Decimal("45") if method == "mpesa" else Decimal("5")  # Min KES 45 for M-PESA
    return max(fee, min_fee)

def format_phone_for_mpesa(phone: str) -> str:
    """Format phone number for M-Pesa (254XXXXXXXXX format)"""
    # Remove all non-numeric characters
    cleaned = ''.join(filter(str.isdigit, phone))
    
    # Convert to 254 format
    if cleaned.startswith('0'):
        cleaned = '254' + cleaned[1:]
    elif cleaned.startswith('7'):
        cleaned = '254' + cleaned
    elif cleaned.startswith('254') and len(cleaned) == 12:
        pass  # Already correct
    else:
        raise ValueError("Invalid phone number format")
    
    return cleaned

def generate_mpesa_headers():
    """Generate headers for M-Pesa API requests"""
    return {
        "Content-Type": "application/json"
    }

async def check_mpesa_transaction_status(checkout_request_id: str) -> dict:
    """Check transaction status with M-Pesa"""
    from ..services.mpesa import check_stk_push_status
    try:
        result = await check_stk_push_status(checkout_request_id)
        return result
    except Exception as e:
        print(f"M-Pesa status check error: {e}")
        return {"status": "error"}

# --- 2. QUERY ROUTES ---

@router.get("/balance")
async def get_wallet_balance(current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    user_op_id = current_user["operator_id"]
    wallet = db.query(Wallet).filter(Wallet.operator_id == user_op_id).first()
    
    if not wallet:
        # Create wallet if it doesn't exist for a new user
        wallet = Wallet(
            id=str(uuid.uuid4()),
            operator_id=user_op_id,
            kes_balance=Decimal("0.00"),
            usdt_balance=Decimal("0.00"),
            is_locked=False
        )
        db.add(wallet)
        db.commit()
        db.refresh(wallet)
    
    # Get pending transactions
    pending_kes = db.query(func.sum(Transaction.amount)).filter(
        Transaction.wallet_id == wallet.id,
        Transaction.currency == "KES",
        Transaction.status == TransactionStatus.PROCESSING
    ).scalar() or Decimal("0")
    
    pending_usdt = db.query(func.sum(Transaction.amount)).filter(
        Transaction.wallet_id == wallet.id,
        Transaction.currency == "USDT",
        Transaction.status == TransactionStatus.PROCESSING
    ).scalar() or Decimal("0")
        
    return {
        "operator_id": wallet.operator_id,
        "balance_kes": float(wallet.kes_balance),
        "balance_usdt": float(wallet.usdt_balance),
        "pending_kes": float(pending_kes),
        "pending_usdt": float(pending_usdt),
        "is_locked": wallet.is_locked,
        "last_sync": datetime.utcnow().isoformat()
    }

@router.get("/history")
async def get_transaction_history(
    limit: int = 50,
    current_user: dict = Depends(get_current_user), 
    db: Session = Depends(get_db)
):
    user_op_id = current_user["operator_id"]
    wallet = db.query(Wallet).filter(Wallet.operator_id == user_op_id).first()
    if not wallet: 
        return []
    
    transactions = db.query(Transaction).filter(
        Transaction.wallet_id == wallet.id
    ).order_by(Transaction.created_at.desc()).limit(limit).all()
    
    # Format for frontend
    result = []
    for tx in transactions:
        result.append({
            "id": tx.id,
            "tx_ref": tx.tx_ref,
            "tx_type": tx.tx_type.value,
            "status": tx.status.value,
            "currency": tx.currency,
            "amount": float(tx.amount),
            "fee": float(tx.fee) if tx.fee else 0,
            "net_amount": float(tx.net_amount) if tx.net_amount else float(tx.amount),
            "provider": tx.provider,
            "provider_ref": tx.provider_ref,
            "created_at": tx.created_at.isoformat()
        })
    
    return result

@router.get("/transaction/{transaction_id}")
async def get_transaction_status(
    transaction_id: str,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get status of a specific transaction"""
    user_op_id = current_user["operator_id"]
    wallet = db.query(Wallet).filter(Wallet.operator_id == user_op_id).first()
    
    if not wallet:
        raise HTTPException(404, "Wallet not found")
    
    transaction = db.query(Transaction).filter(
        Transaction.id == transaction_id,
        Transaction.wallet_id == wallet.id
    ).first()
    
    if not transaction:
        raise HTTPException(404, "Transaction not found")
    
    # If it's an M-Pesa transaction and still processing, check with provider
    if transaction.provider == "mpesa" and transaction.status == TransactionStatus.PROCESSING:
        if transaction.provider_ref:
            status_data = await check_mpesa_transaction_status(transaction.provider_ref)
            
            # Update status if changed
            if status_data.get("payment_status") == "COMPLETE" or status_data.get("complete") == True:
                transaction.status = TransactionStatus.COMPLETED
                db.commit()
            elif status_data.get("payment_status") == "FAILED":
                transaction.status = TransactionStatus.FAILED
                db.commit()
    
    return {
        "id": transaction.id,
        "status": transaction.status.value,
        "tx_type": transaction.tx_type.value,
        "amount": float(transaction.amount),
        "currency": transaction.currency,
        "provider": transaction.provider,
        "provider_ref": transaction.provider_ref,
        "created_at": transaction.created_at.isoformat(),
        "failure_reason": transaction.failure_reason
    }

# --- 3. DEPOSIT ROUTES (M-Pesa STK Push) ---

@router.post("/deposit/mpesa")
async def deposit_mpesa(
    payload: dict,
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(get_current_user), 
    db: Session = Depends(get_db)
):
    user_op_id = current_user["operator_id"]
    wallet = db.query(Wallet).filter(Wallet.operator_id == user_op_id).first()
    
    if not wallet:
        raise HTTPException(404, "Wallet not found")
    
    amount = Decimal(str(payload.get("amount", 0)))
    phone = payload.get("phone")
    reference = payload.get("reference", f"DEP-{uuid.uuid4().hex[:8].upper()}")
    
    if amount <= 0:
        raise HTTPException(400, "Deposit amount must be greater than 0")
    
    if not phone:
        raise HTTPException(400, "Phone number is required")
    
    # Create transaction record first
    tx_id = str(uuid.uuid4())
    tx = Transaction(
        id=tx_id,
        wallet_id=wallet.id,
        operator_id=user_op_id,
        business_id=None,
        tx_type=TransactionType.DEPOSIT,
        status=TransactionStatus.PROCESSING,
        amount=amount,
        fee=Decimal("0.00"),
        net_amount=amount,
        currency="KES",
        tx_ref=reference,
        provider="mpesa",
        provider_ref=None,
        failure_reason=None,
        created_at=datetime.utcnow(),
        completed_at=None
    )
    db.add(tx)
    
    try:
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(500, f"Failed to create transaction: {str(e)}")
    
    try:
        # Format phone for M-Pesa
        formatted_phone = format_phone_for_mpesa(phone)
        
        # Call M-Pesa STK Push
        from ..services.mpesa import stk_push_request
        mpesa_result = await stk_push_request(
            phone=formatted_phone,
            amount=float(amount),
            reference=reference,
            description=f"Wallet Deposit - {reference}"
        )
        
        # Update transaction with M-Pesa reference
        tx.provider_ref = mpesa_result.get("checkout_request_id")
        tx.beneficiary_phone = formatted_phone
        db.commit()
        
        return {
            "status": "pending",
            "message": "STK Push sent to phone",
            "checkout_request_id": tx.provider_ref,
            "tx_id": tx_id,
            "tx_ref": reference
        }
        
    except ValueError as e:
        tx.status = TransactionStatus.FAILED
        tx.failure_reason = str(e)
        db.commit()
        raise HTTPException(400, str(e))
    except httpx.RequestError as e:
        tx.status = TransactionStatus.FAILED
        tx.failure_reason = f"Network error: {str(e)}"
        db.commit()
        raise HTTPException(502, f"Payment gateway error: {str(e)}")
    except Exception as e:
        tx.status = TransactionStatus.FAILED
        tx.failure_reason = str(e)
        db.commit()
        raise HTTPException(500, f"Deposit failed: {str(e)}")

@router.post("/deposit/mpesa/webhook")
async def mpesa_webhook(request: Request, db: Session = Depends(get_db)):
    """Handle M-Pesa webhook for payment notifications"""
    try:
        payload = await request.json()
    except:
        payload = await request.body()
        try:
            import json
            payload = json.loads(payload)
        except:
            payload = {}
    
    # Verify webhook signature (implement based on PesaPal docs)
    
    event_type = payload.get("payment_status") or payload.get("status")
    order_tracking_id = payload.get("order_tracking_id")
    merchant_reference = payload.get("merchant_reference")
    
    if event_type == "COMPLETED" and order_tracking_id:
        # Payment successful
        transaction = db.query(Transaction).filter(
            (Transaction.provider_ref == order_tracking_id) | (Transaction.tx_ref == merchant_reference)
        ).first()
        
        if transaction and transaction.status == TransactionStatus.PROCESSING:
            transaction.status = TransactionStatus.COMPLETED
            transaction.completed_at = datetime.utcnow()
            
            # Update wallet balance
            wallet = db.query(Wallet).filter(Wallet.id == transaction.wallet_id).first()
            if wallet and transaction.tx_type == TransactionType.DEPOSIT:
                wallet.kes_balance += transaction.amount
                
                # Send deposit notification email
                user = db.query(User).filter(User.operator_id == transaction.operator_id).first()
                if user:
                    try:
                        send_deposit_notification(
                            to_email=user.email,
                            amount=float(transaction.amount),
                            reference=transaction.tx_ref,
                            currency=transaction.currency
                        )
                    except Exception as e:
                        print(f"Failed to send deposit email: {e}")
            
            db.commit()
            
    elif event_type == "FAILED" and order_tracking_id:
        # Payment failed
        transaction = db.query(Transaction).filter(Transaction.provider_ref == order_tracking_id).first()
        if transaction and transaction.status == TransactionStatus.PROCESSING:
            transaction.status = TransactionStatus.FAILED
            transaction.failure_reason = payload.get("reason", "Payment failed")
            db.commit()
    
    return {"status": "received"}

# --- 4. WITHDRAWAL ROUTES (M-Pesa B2C Payouts) ---

@router.post("/withdraw/mpesa")
async def withdraw_mpesa(
    payload: dict,
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(get_current_user), 
    db: Session = Depends(get_db)
):
    user_op_id = current_user["operator_id"]
    
    # Use with_for_update() to lock the row while we calculate balance
    wallet = db.query(Wallet).filter(Wallet.operator_id == user_op_id).with_for_update().first()
    
    if not wallet or wallet.is_locked: 
        raise HTTPException(403, "Account Restricted or Locked")
    
    amount = Decimal(str(payload.get("amount", 0)))
    phone = payload.get("phone")
    reference = payload.get("reference", f"WTH-{uuid.uuid4().hex[:8].upper()}")
    
    if amount <= 0:
        raise HTTPException(400, "Withdrawal amount must be greater than 0")
    
    if not phone:
        raise HTTPException(400, "Phone number is required")
    
    try:
        formatted_phone = format_phone_for_mpesa(phone)
    except ValueError as e:
        raise HTTPException(400, str(e))
    
    # Simple metrics query for fee calculation
    stats = db.query(
        func.count(Transaction.id),
        func.sum(Transaction.amount)
    ).filter(
        Transaction.wallet_id == wallet.id,
        Transaction.tx_type == TransactionType.WITHDRAWAL,
        Transaction.status == TransactionStatus.COMPLETED
    ).first()

    history_count = stats[0] or 0
    total_vol = stats[1] or Decimal("0")
    
    fee = calculate_withdrawal_fee(amount, "mpesa", history_count, total_vol)
    total_deduction = amount + fee

    if wallet.kes_balance < total_deduction: 
        raise HTTPException(400, f"Insufficient Balance. Need KES {total_deduction:.2f} including fees")

    # Deduct funds immediately to prevent double spending
    wallet.kes_balance -= total_deduction
    
    # Create transaction record
    tx_id = str(uuid.uuid4())
    tx = Transaction(
        id=tx_id,
        wallet_id=wallet.id,
        operator_id=user_op_id,
        business_id=None,
        tx_type=TransactionType.WITHDRAWAL,
        status=TransactionStatus.PROCESSING,
        amount=amount,
        fee=fee,
        net_amount=amount,
        currency="KES",
        tx_ref=reference,
        provider="mpesa",
        provider_ref=None,
        failure_reason=None,
        beneficiary_phone=formatted_phone,
        created_at=datetime.utcnow(),
        completed_at=None
    )
    db.add(tx)
    revenue = PlatformRevenue(
        id=str(uuid.uuid4()),
        transaction_id=tx_id,
        amount_kes=fee,
        source="withdrawal_fee"
    )
    db.add(revenue)
    
    try:
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(500, f"Ledger update failed: {str(e)}")
    
    # Process external payment via M-Pesa B2C
    from ..services.mpesa import b2c_payment
    try:
        mpesa_result = await b2c_payment(
            phone=formatted_phone,
            amount=float(amount),
            reference=reference,
            description=f"Withdrawal - {reference}"
        )
        
        # Store M-Pesa references
        tx.provider_ref = mpesa_result.get("conversation_id")
        db.commit()
        
        # Send withdrawal notification email
        try:
            send_withdrawal_notification(
                to_email=current_user["email"],
                amount=float(amount),
                reference=reference,
                currency="KES"
            )
        except Exception as e:
            print(f"Failed to send withdrawal email: {e}")
        
        return {
            "status": "processing",
            "message": "Withdrawal initiated",
            "withdrawal_id": tx_id,
            "conversation_id": tx.provider_ref,
            "tx_ref": reference
        }
    except Exception as e:
        # Refund the deducted amount
        wallet.kes_balance += total_deduction
        tx.status = TransactionStatus.FAILED
        tx.failure_reason = str(e)
        db.commit()
        raise HTTPException(400, str(e))

@router.get("/withdrawal/status/{payout_id}")
async def get_withdrawal_status(
    payout_id: str,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Check status of a withdrawal/payout"""
    user_op_id = current_user["operator_id"]
    wallet = db.query(Wallet).filter(Wallet.operator_id == user_op_id).first()
    
    if not wallet:
        raise HTTPException(404, "Wallet not found")
    
    transaction = db.query(Transaction).filter(
        Transaction.id == payout_id,
        Transaction.wallet_id == wallet.id
    ).first()
    
    if not transaction:
        # Try finding by provider_ref
        transaction = db.query(Transaction).filter(
            Transaction.provider_ref == payout_id,
            Transaction.wallet_id == wallet.id
        ).first()
    
    if not transaction:
        raise HTTPException(404, "Withdrawal not found")
    
    # If processing, check with M-Pesa
    if transaction.status == TransactionStatus.PROCESSING and transaction.provider_ref:
        from ..services.mpesa import check_stk_push_status
        try:
            result = await check_stk_push_status(transaction.provider_ref)
            
            # Update status based on M-Pesa response
            if result.get("complete") or result.get("success"):
                transaction.status = TransactionStatus.COMPLETED
                transaction.completed_at = datetime.utcnow()
                db.commit()
            elif result.get("status") == "FAILED":
                transaction.status = TransactionStatus.FAILED
                transaction.failure_reason = result.get("reason", "Payout failed")
                # Refund the wallet
                wallet.kes_balance += transaction.amount + transaction.fee
                db.commit()
        except Exception as e:
            print(f"Error checking payout status: {e}")
    
    return {
        "id": transaction.id,
        "status": transaction.status.value,
        "amount": float(transaction.amount),
        "fee": float(transaction.fee) if transaction.fee else 0,
        "phone": transaction.beneficiary_phone,
        "tx_ref": transaction.tx_ref,
        "provider_ref": transaction.provider_ref,
        "created_at": transaction.created_at.isoformat()
    }

@router.get("/deposit/status/{transaction_id}")
async def get_deposit_status(
    transaction_id: str,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Check status of a deposit transaction"""
    user_op_id = current_user["operator_id"]
    wallet = db.query(Wallet).filter(Wallet.operator_id == user_op_id).first()
    
    if not wallet:
        raise HTTPException(404, "Wallet not found")
    
    transaction = db.query(Transaction).filter(
        Transaction.id == transaction_id,
        Transaction.wallet_id == wallet.id
    ).first()
    
    if not transaction:
        # Try finding by provider_ref (order_tracking_id)
        transaction = db.query(Transaction).filter(
            Transaction.provider_ref == transaction_id,
            Transaction.wallet_id == wallet.id
        ).first()
    
    if not transaction:
        raise HTTPException(404, "Transaction not found")
    
    # If processing, check with M-Pesa
    if transaction.status == TransactionStatus.PROCESSING and transaction.provider_ref:
        from ..services.mpesa import check_stk_push_status
        try:
            result = await check_stk_push_status(transaction.provider_ref)
            
            # Update status based on M-Pesa response
            if result.get("complete") or result.get("success"):
                transaction.status = TransactionStatus.COMPLETED
                transaction.completed_at = datetime.utcnow()
                # Add funds to wallet
                wallet.kes_balance += transaction.amount
                db.commit()
            elif result.get("status") == "FAILED":
                transaction.status = TransactionStatus.FAILED
                transaction.failure_reason = result.get("reason", "Payment failed")
                db.commit()
        except Exception as e:
            print(f"Error checking deposit status: {e}")
    
    return {
        "id": transaction.id,
        "status": transaction.status.value,
        "payment_status": transaction.status.value,
        "amount": float(transaction.amount),
        "fee": float(transaction.fee) if transaction.fee else 0,
        "tx_ref": transaction.tx_ref,
        "provider_ref": transaction.provider_ref,
        "created_at": transaction.created_at.isoformat()
    }

# --- 5. CONVERSION ROUTES ---

@router.post("/convert")
async def wallet_convert(
    payload: dict,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    user_op_id = current_user["operator_id"]
    wallet = db.query(Wallet).filter(Wallet.operator_id == user_op_id).with_for_update().first()
    
    if not wallet or wallet.is_locked:
        raise HTTPException(403, "Conversion Disabled: Wallet Locked")

    from_currency = payload.get("from_currency")  # "USDT" or "KES"
    to_currency = payload.get("to_currency")  # "KES" or "USDT"
    amount = Decimal(str(payload.get("amount", 0)))
    rate = Decimal(str(payload.get("rate", "129.50")))
    fee = Decimal(str(payload.get("fee", 0)))
    reference = payload.get("reference", f"CONV-{uuid.uuid4().hex[:8].upper()}")
    
    if amount <= 0:
        raise HTTPException(400, "Amount must be greater than 0")
    
    # Calculate conversion
    if from_currency == "USDT" and to_currency == "KES":
        if wallet.usdt_balance < amount:
            raise HTTPException(400, f"Insufficient USDT. Need {amount} USDT")
        
        # Deduct USDT
        wallet.usdt_balance -= amount
        # Add KES
        kes_amount = amount * rate
        wallet.kes_balance += kes_amount
        
        # Create transaction record
        tx = Transaction(
            id=str(uuid.uuid4()),
            wallet_id=wallet.id,
            operator_id=user_op_id,
            tx_type=TransactionType.CONVERSION,
            status=TransactionStatus.COMPLETED,
            amount=amount,
            fee=fee,
            net_amount=kes_amount,
            currency="USDT",
            tx_ref=reference,
            provider="internal",
            created_at=datetime.utcnow(),
            completed_at=datetime.utcnow(),
            metadata_json={
                "from_currency": "USDT",
                "to_currency": "KES",
                "rate": float(rate),
                "result_amount": float(kes_amount)
            }
        )
        
    elif from_currency == "KES" and to_currency == "USDT":
        if wallet.kes_balance < amount:
            raise HTTPException(400, f"Insufficient KES. Need {amount} KES")
        
        # Deduct KES
        wallet.kes_balance -= amount
        # Add USDT
        usdt_amount = amount / rate
        wallet.usdt_balance += usdt_amount
        
        # Create transaction record
        tx = Transaction(
            id=str(uuid.uuid4()),
            wallet_id=wallet.id,
            operator_id=user_op_id,
            tx_type=TransactionType.CONVERSION,
            status=TransactionStatus.COMPLETED,
            amount=amount,
            fee=fee,
            net_amount=usdt_amount,
            currency="KES",
            tx_ref=reference,
            provider="internal",
            created_at=datetime.utcnow(),
            completed_at=datetime.utcnow(),
            metadata_json={
                "from_currency": "KES",
                "to_currency": "USDT",
                "rate": float(rate),
                "result_amount": float(usdt_amount)
            }
        )
    else:
        raise HTTPException(400, "Invalid currency pair")
    
    db.add(tx)
    db.commit()
    
    return {
        "status": "success",
        "conversion_id": tx.id,
        "tx_ref": reference,
        "from_currency": from_currency,
        "to_currency": to_currency,
        "amount": float(amount),
        "result_amount": float(tx.net_amount),
        "fee": float(fee)
    }

@router.get("/conversion/rate")
async def get_conversion_rate(pair: str = "USDT/KES"):
    """Get current conversion rate"""
    # This could be fetched from an oracle or exchange API
    # For now, returning hardcoded rates with spread
    base_rate = 129.50
    
    if pair == "USDT/KES":
        return {
            "pair": pair,
            "buy_rate": base_rate * 0.995,  # Slightly lower when buying KES
            "sell_rate": base_rate * 1.005,  # Slightly higher when selling KES
            "rate": base_rate,
            "timestamp": datetime.utcnow().isoformat()
        }
    else:
        raise HTTPException(400, "Unsupported pair")

@router.get("/conversion/metrics")
async def get_conversion_metrics(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get user conversion metrics for fee calculation"""
    user_op_id = current_user["operator_id"]
    wallet = db.query(Wallet).filter(Wallet.operator_id == user_op_id).first()
    
    if not wallet:
        return {"count": 0, "monthly_volume": 0, "tier": "bronze"}
    
    # Count conversions
    conversion_count = db.query(func.count(Transaction.id)).filter(
        Transaction.wallet_id == wallet.id,
        Transaction.tx_type == TransactionType.CONVERSION,
        Transaction.status == TransactionStatus.COMPLETED
    ).scalar() or 0
    
    # Monthly volume
    start_of_month = datetime.utcnow().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    monthly_volume = db.query(func.sum(Transaction.amount)).filter(
        Transaction.wallet_id == wallet.id,
        Transaction.tx_type == TransactionType.CONVERSION,
        Transaction.status == TransactionStatus.COMPLETED,
        Transaction.created_at >= start_of_month
    ).scalar() or 0
    
    # Determine tier
    if conversion_count > 100 or monthly_volume > 50000:
        tier = "platinum"
    elif conversion_count > 50 or monthly_volume > 10000:
        tier = "gold"
    elif conversion_count > 10 or monthly_volume > 1000:
        tier = "silver"
    else:
        tier = "bronze"
    
    return {
        "count": conversion_count,
        "monthly_volume": float(monthly_volume),
        "tier": tier
    }

# --- 6. WITHDRAWAL METRICS ---

@router.get("/withdrawals/metrics")
async def get_withdrawal_metrics(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get withdrawal metrics for the current user/business"""
    user_op_id = current_user["operator_id"]
    wallet = db.query(Wallet).filter(Wallet.operator_id == user_op_id).first()
    
    if not wallet:
        return {"totalAmount": 0, "count": 0, "total_withdrawn": 0}
    
    # Get total withdrawn amount
    total_withdrawn = db.query(func.sum(Transaction.amount)).filter(
        Transaction.wallet_id == wallet.id,
        Transaction.tx_type == TransactionType.WITHDRAWAL,
        Transaction.status == TransactionStatus.COMPLETED
    ).scalar() or 0
    
    # Get withdrawal count
    withdrawal_count = db.query(func.count(Transaction.id)).filter(
        Transaction.wallet_id == wallet.id,
        Transaction.tx_type == TransactionType.WITHDRAWAL,
        Transaction.status == TransactionStatus.COMPLETED
    ).scalar() or 0
    
    return {
        "totalAmount": float(total_withdrawn),
        "count": withdrawal_count,
        "total_withdrawn": float(total_withdrawn)
    }

# --- 7. MPESA SPECIFIC ROUTES ---

@router.get("/mpesa/stats")
async def get_mpesa_stats(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get M-Pesa transaction statistics"""
    user_op_id = current_user["operator_id"]
    wallet = db.query(Wallet).filter(Wallet.operator_id == user_op_id).first()
    
    if not wallet:
        return {"balance": 0, "transactions": 0}
    
    # Count M-Pesa transactions
    mpesa_count = db.query(func.count(Transaction.id)).filter(
        Transaction.wallet_id == wallet.id,
        Transaction.provider == "mpesa"
    ).scalar() or 0
    
    # Sum of M-Pesa deposits (pending might be at M-Pesa)
    mpesa_balance = db.query(func.sum(Transaction.amount)).filter(
        Transaction.wallet_id == wallet.id,
        Transaction.provider == "mpesa",
        Transaction.status == TransactionStatus.PROCESSING,
        Transaction.tx_type == TransactionType.DEPOSIT
    ).scalar() or 0
    
    return {
        "balance": float(mpesa_balance),
        "total_transactions": mpesa_count,
        "provider": "mpesa"
    }

# --- 8. ADMIN ROUTES ---

@router.get("/admin/mpesa/metrics")
async def get_admin_mpesa_metrics(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Admin endpoint for M-Pesa metrics (admin only)"""
    # Check if user is admin
    if current_user.get("role") != "admin":
        raise HTTPException(403, "Admin access required")
    
    # Get all M-Pesa transactions
    total_transactions = db.query(func.count(Transaction.id)).filter(
        Transaction.provider == "mpesa"
    ).scalar() or 0
    
    successful = db.query(func.count(Transaction.id)).filter(
        Transaction.provider == "mpesa",
        Transaction.status == TransactionStatus.COMPLETED
    ).scalar() or 0
    
    failed = db.query(func.count(Transaction.id)).filter(
        Transaction.provider == "mpesa",
        Transaction.status == TransactionStatus.FAILED
    ).scalar() or 0
    
    # Calculate success rate
    success_rate = (successful / total_transactions * 100) if total_transactions > 0 else 98
    
    # Total settled amount
    total_settled = db.query(func.sum(Transaction.amount)).filter(
        Transaction.provider == "mpesa",
        Transaction.status == TransactionStatus.COMPLETED
    ).scalar() or 0
    
    return {
        "total_transactions": total_transactions,
        "successful": successful,
        "failed": failed,
        "success_rate": round(success_rate, 1),
        "avg_time": "2.5s",  # Could calculate from actual data
        "total_settled": float(total_settled)
    }

@router.get("/admin/revenue/volume")
async def get_revenue_volume(
    timeframe: str = "monthly",
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Admin endpoint for revenue volume (admin only)"""
    if current_user.get("role") != "admin":
        raise HTTPException(403, "Admin access required")
    
    # This would aggregate data based on timeframe
    # For now, return placeholder structure
    return {
        "daily": [1000, 1200, 1100, 1300, 1400, 1250, 1350],
        "weekly": [8500, 9200, 8800, 9500],
        "monthly": [35000, 42000, 38000]
    }

# --- 9. WEBHOOK ROUTE ---

