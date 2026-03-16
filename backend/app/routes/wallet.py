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
    
    fee = (amount * final_perc) / 100
    min_fee = Decimal("5")  # Minimum fee
    return max(fee, min_fee)

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

# --- 3. DEPOSIT ROUTES (PayPal) ---

@router.post("/deposit/paypal")
async def deposit_paypal(
    payload: dict,
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(get_current_user), 
    db: Session = Depends(get_db)
):
    """Process PayPal deposit - creates a PayPal order for the user to complete"""
    import requests
    
    user_op_id = current_user["operator_id"]
    wallet = db.query(Wallet).filter(Wallet.operator_id == user_op_id).first()
    
    if not wallet:
        raise HTTPException(404, "Wallet not found")
    
    amount = Decimal(str(payload.get("amount", 0)))
    currency = payload.get("currency", "KES")
    reference = payload.get("reference", f"DEP-{uuid.uuid4().hex[:8].upper()}")
    
    if amount <= 0:
        raise HTTPException(400, "Deposit amount must be greater than 0")
    
    # Get PayPal credentials
    paypal_client_id = os.getenv("PAYPAL_CLIENT_ID")
    paypal_client_secret = os.getenv("PAYPAL_CLIENT_SECRET")
    paypal_mode = os.getenv("PAYPAL_MODE", "sandbox")
    
    if not paypal_client_id or not paypal_client_secret:
        raise HTTPException(503, "PayPal not configured")
    
    # Create PayPal order
    base_url = "https://api-m.sandbox.paypal.com" if paypal_mode == "sandbox" else "https://api-m.paypal.com"
    
    # Get access token
    auth_response = requests.post(
        f"{base_url}/v1/oauth2/token",
        auth=(paypal_client_id, paypal_client_secret),
        data={"grant_type": "client_credentials"}
    )
    
    if auth_response.status_code != 200:
        raise HTTPException(502, "Failed to authenticate with PayPal")
    
    access_token = auth_response.json()["access_token"]
    
    # Create order
    order_response = requests.post(
        f"{base_url}/v2/checkout/orders",
        headers={
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json"
        },
        json={
            "intent": "CAPTURE",
            "purchase_units": [{
                "reference_id": reference,
                "amount": {
                    "currency_code": currency,
                    "value": str(amount)
                },
                "description": f"Wallet Deposit - {reference}"
            }]
        }
    )
    
    if order_response.status_code != 201:
        raise HTTPException(502, "Failed to create PayPal order")
    
    order_data = order_response.json()
    
    # Create transaction record
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
        currency=currency,
        tx_ref=reference,
        provider="paypal",
        provider_ref=order_data.get("id"),
        failure_reason=None,
        created_at=datetime.utcnow(),
        completed_at=None
    )
    db.add(tx)
    db.commit()
    
    # Find approval URL
    approval_url = None
    for link in order_data.get("links", []):
        if link.get("rel") == "approve":
            approval_url = link.get("href")
            break
    
    return {
        "status": "pending",
        "message": "PayPal order created",
        "order_id": order_data.get("id"),
        "approval_url": approval_url,
        "tx_id": tx_id,
        "tx_ref": reference
    }


@router.post("/deposit/crypto")
async def deposit_crypto(
    payload: dict,
    current_user: dict = Depends(get_current_user), 
    db: Session = Depends(get_db)
):
    """Generate crypto deposit address for wallet funding"""
    user_op_id = current_user["operator_id"]
    wallet = db.query(Wallet).filter(Wallet.operator_id == user_op_id).first()
    
    if not wallet:
        raise HTTPException(404, "Wallet not found")
    
    network = payload.get("network", "trc20")  # trc20, bep20, erc20
    amount = Decimal(str(payload.get("amount", 0)))
    reference = payload.get("reference", f"DEP-{uuid.uuid4().hex[:8].upper()}")
    
    if amount <= 0:
        raise HTTPException(400, "Deposit amount must be greater than 0")
    
    # For demo, return platform deposit address
    # In production, generate unique addresses per user
    hot_wallet_address = os.getenv("TRON_HOT_WALLET_ADDRESS") if network == "trc20" else os.getenv("HOT_WALLET_ADDRESS")
    
    if not hot_wallet_address:
        raise HTTPException(503, "Crypto wallet not configured")
    
    # Create pending transaction
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
        currency="USDT",
        tx_ref=reference,
        provider="crypto",
        provider_ref=f"{network}:{reference}",
        failure_reason=None,
        created_at=datetime.utcnow(),
        completed_at=None
    )
    db.add(tx)
    db.commit()
    
    return {
        "status": "pending",
        "message": f"Send {amount} USDT on {network} to the address below",
        "deposit_address": hot_wallet_address,
        "network": network,
        "currency": "USDT",
        "tx_id": tx_id,
        "tx_ref": reference
    }

# --- 4. WITHDRAWAL ROUTES (Crypto & PayPal) ---

@router.post("/withdraw/crypto")
async def withdraw_crypto(
    payload: dict,
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(get_current_user), 
    db: Session = Depends(get_db)
):
    """Process crypto withdrawal to external wallet"""
    from ..services.crypto import process_crypto_withdrawal, validate_crypto_address
    
    user_op_id = current_user["operator_id"]
    
    wallet = db.query(Wallet).filter(Wallet.operator_id == user_op_id).with_for_update().first()
    
    if not wallet or wallet.is_locked: 
        raise HTTPException(403, "Account Restricted or Locked")
    
    amount = Decimal(str(payload.get("amount", 0)))
    address = payload.get("address")
    network = payload.get("network", "trc20")  # trc20, bep20, erc20
    reference = payload.get("reference", f"WTH-{uuid.uuid4().hex[:8].upper()}")
    
    if amount <= 0:
        raise HTTPException(400, "Withdrawal amount must be greater than 0")
    
    if not address:
        raise HTTPException(400, "Crypto address is required")
    
    # Validate crypto address
    if not validate_crypto_address(address, network):
        raise HTTPException(400, f"Invalid {network} address")
    
    # Calculate fee (1% for crypto)
    fee = amount * Decimal("0.01")
    total_deduction = amount + fee

    if wallet.usdt_balance < total_deduction: 
        raise HTTPException(400, f"Insufficient USDT Balance. Need {total_deduction:.2f} including fees")

    # Deduct funds
    wallet.usdt_balance -= total_deduction
    
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
        currency="USDT",
        tx_ref=reference,
        provider="crypto",
        provider_ref=None,
        failure_reason=None,
        beneficiary_address=address,
        created_at=datetime.utcnow(),
        completed_at=None
    )
    db.add(tx)
    revenue = PlatformRevenue(
        id=str(uuid.uuid4()),
        transaction_id=tx_id,
        amount_kes=0,  # Crypto fees handled differently
        amount_usdt=fee,
        source="withdrawal_fee"
    )
    db.add(revenue)
    
    try:
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(500, f"Ledger update failed: {str(e)}")
    
    # Process crypto withdrawal
    try:
        tx_hash = await process_crypto_withdrawal(address, float(amount), network)
        
        tx.provider_ref = tx_hash
        tx.status = TransactionStatus.COMPLETED
        tx.completed_at = datetime.utcnow()
        db.commit()
        
        # Send withdrawal notification
        try:
            send_withdrawal_notification(
                to_email=current_user["email"],
                amount=float(amount),
                reference=reference,
                currency="USDT"
            )
        except Exception as e:
            print(f"Failed to send withdrawal email: {e}")
        
        return {
            "status": "completed",
            "message": "Withdrawal processed successfully",
            "withdrawal_id": tx_id,
            "tx_hash": tx_hash,
            "network": network,
            "tx_ref": reference
        }
    except Exception as e:
        wallet.usdt_balance += total_deduction
        tx.status = TransactionStatus.FAILED
        tx.failure_reason = str(e)
        db.commit()
        raise HTTPException(400, str(e))


@router.post("/withdraw/paypal")
async def withdraw_paypal(
    payload: dict,
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(get_current_user), 
    db: Session = Depends(get_db)
):
    """Process PayPal withdrawal"""
    import requests
    
    user_op_id = current_user["operator_id"]
    
    wallet = db.query(Wallet).filter(Wallet.operator_id == user_op_id).with_for_update().first()
    
    if not wallet or wallet.is_locked: 
        raise HTTPException(403, "Account Restricted or Locked")
    
    amount = Decimal(str(payload.get("amount", 0)))
    paypal_email = payload.get("paypal_email")
    currency = payload.get("currency", "KES")
    reference = payload.get("reference", f"WTH-{uuid.uuid4().hex[:8].upper()}")
    
    if amount <= 0:
        raise HTTPException(400, "Withdrawal amount must be greater than 0")
    
    if not paypal_email:
        raise HTTPException(400, "PayPal email is required")
    
    # Calculate fee (2.5% for PayPal)
    fee = amount * Decimal("0.025")
    total_deduction = amount + fee

    if wallet.kes_balance < total_deduction: 
        raise HTTPException(400, f"Insufficient Balance. Need {total_deduction:.2f} including fees")

    # Deduct funds
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
        currency=currency,
        tx_ref=reference,
        provider="paypal",
        provider_ref=None,
        failure_reason=None,
        beneficiary_account=paypal_email,
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
    
    # Process PayPal payout (simplified - in production use PayPal Payouts API)
    try:
        paypal_client_id = os.getenv("PAYPAL_CLIENT_ID")
        paypal_client_secret = os.getenv("PAYPAL_CLIENT_SECRET")
        paypal_mode = os.getenv("PAYPAL_MODE", "sandbox")
        
        if not paypal_client_id or not paypal_client_secret:
            # For demo, just mark as completed
            tx.provider_ref = f"PP-{reference}"
            tx.status = TransactionStatus.COMPLETED
            tx.completed_at = datetime.utcnow()
            db.commit()
            
            return {
                "status": "completed",
                "message": "Withdrawal processed",
                "withdrawal_id": tx_id,
                "payout_id": tx.provider_ref,
                "tx_ref": reference
            }
        
        base_url = "https://api-m.sandbox.paypal.com" if paypal_mode == "sandbox" else "https://api-m.paypal.com"
        
        # Get access token
        auth_response = requests.post(
            f"{base_url}/v1/oauth2/token",
            auth=(paypal_client_id, paypal_client_secret),
            data={"grant_type": "client_credentials"}
        )
        
        if auth_response.status_code != 200:
            wallet.kes_balance += total_deduction
            tx.status = TransactionStatus.FAILED
            tx.failure_reason = "PayPal authentication failed"
            db.commit()
            raise HTTPException(502, "Failed to authenticate with PayPal")
        
        access_token = auth_response.json()["access_token"]
        
        # Create payout
        payout_response = requests.post(
            f"{base_url}/v1/payments/payouts",
            headers={
                "Authorization": f"Bearer {access_token}",
                "Content-Type": "application/json"
            },
            json={
                "sender_batch_header": {
                    "sender_batch_id": reference,
                    "email_subject": "You have received a withdrawal from Geon PayGuard",
                    "email_message": f"Your withdrawal of {amount} {currency} has been processed."
                },
                "items": [{
                    "recipient_type": "EMAIL",
                    "amount": {
                        "value": str(amount),
                        "currency": currency
                    },
                    "receiver": paypal_email,
                    "note": f"Withdrawal - {reference}"
                }]
            }
        )
        
        if payout_response.status_code != 201:
            wallet.kes_balance += total_deduction
            tx.status = TransactionStatus.FAILED
            tx.failure_reason = f"PayPal payout failed: {payout_response.text}"
            db.commit()
            raise HTTPException(502, "Failed to process PayPal payout")
        
        payout_data = payout_response.json()
        tx.provider_ref = payout_data.get("batch_header", {}).get("payout_batch_id")
        tx.status = TransactionStatus.COMPLETED
        tx.completed_at = datetime.utcnow()
        db.commit()
        
        # Send notification
        try:
            send_withdrawal_notification(
                to_email=current_user["email"],
                amount=float(amount),
                reference=reference,
                currency=currency
            )
        except Exception as e:
            print(f"Failed to send withdrawal email: {e}")
        
        return {
            "status": "completed",
            "message": "Withdrawal processed successfully",
            "withdrawal_id": tx_id,
            "payout_id": tx.provider_ref,
            "tx_ref": reference
        }
    except HTTPException:
        raise
    except Exception as e:
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

# --- 7. PAYMENT PROVIDER STATS ---

@router.get("/payment/stats")
async def get_payment_stats(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get payment transaction statistics for all providers"""
    user_op_id = current_user["operator_id"]
    wallet = db.query(Wallet).filter(Wallet.operator_id == user_op_id).first()
    
    if not wallet:
        return {"balance": 0, "transactions": 0}
    
    # Count transactions by provider
    providers = ["paypal", "crypto", "card"]
    stats = {}
    
    for provider in providers:
        count = db.query(func.count(Transaction.id)).filter(
            Transaction.wallet_id == wallet.id,
            Transaction.provider == provider
        ).scalar() or 0
        
        balance = db.query(func.sum(Transaction.amount)).filter(
            Transaction.wallet_id == wallet.id,
            Transaction.provider == provider,
            Transaction.status == TransactionStatus.PROCESSING,
            Transaction.tx_type == TransactionType.DEPOSIT
        ).scalar() or 0
        
        stats[provider] = {
            "balance": float(balance),
            "total_transactions": count
        }
    
    return stats

# --- 8. ADMIN ROUTES ---

@router.get("/admin/payment/metrics")
async def get_admin_payment_metrics(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Admin endpoint for payment provider metrics"""
    if current_user.get("role") != "admin":
        raise HTTPException(403, "Admin access required")
    
    providers = ["paypal", "crypto", "card"]
    metrics = {}
    
    for provider in providers:
        total = db.query(func.count(Transaction.id)).filter(
            Transaction.provider == provider
        ).scalar() or 0
        
        successful = db.query(func.count(Transaction.id)).filter(
            Transaction.provider == provider,
            Transaction.status == TransactionStatus.COMPLETED
        ).scalar() or 0
        
        failed = db.query(func.count(Transaction.id)).filter(
            Transaction.provider == provider,
            Transaction.status == TransactionStatus.FAILED
        ).scalar() or 0
        
        success_rate = (successful / total * 100) if total > 0 else 0
        
        total_settled = db.query(func.sum(Transaction.amount)).filter(
            Transaction.provider == provider,
            Transaction.status == TransactionStatus.COMPLETED
        ).scalar() or 0
        
        metrics[provider] = {
            "total_transactions": total,
            "successful": successful,
            "failed": failed,
            "success_rate": round(success_rate, 1),
            "total_settled": float(total_settled)
        }
    
    return metrics

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

