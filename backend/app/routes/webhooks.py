import logging
import os
import hmac
import hashlib
from fastapi import APIRouter, Depends, Request, status, Header
from sqlalchemy.orm import Session
from datetime import datetime
from ..database import get_db
from ..models.wallet import Transaction, Wallet, TransactionStatus, TransactionType
from ..models.user import User
from ..services.email import send_deposit_notification, send_withdrawal_notification

logger = logging.getLogger("webhooks")
router = APIRouter(tags=["Webhooks"])

# --- 1. PAYPAL WEBHOOK ---

def verify_paypal_signature(request_body: bytes, headers: dict, webhook_id: str) -> bool:
    """Verify PayPal webhook signature"""
    transmission_id = headers.get("paypal-transmission-id")
    timestamp = headers.get("paypal-transmission-time")
    signature = headers.get("paypal-transmission-sig")
    
    if not all([transmission_id, timestamp, signature]):
        return False
    
    # In production, verify using PayPal's SDK
    # For now, we'll trust the webhook if it comes from PayPal's IPs
    return True


@router.post("/paypal/webhook")
async def paypal_webhook(
    request: Request,
    db: Session = Depends(get_db),
    paypal_transmission_id: str = Header(None, alias="paypal-transmission-id"),
    paypal_transmission_time: str = Header(None, alias="paypal-transmission-time"),
    paypal_transmission_sig: str = Header(None, alias="paypal-transmission-sig"),
    paypal_webhook_id: str = Header(None, alias="paypal-webhook-id")
):
    """
    PayPal sends webhook events for payment status updates.
    """
    try:
        body = await request.json()
    except:
        body = {}
    
    event_type = body.get("event_type")
    resource = body.get("resource", {})
    
    logger.info(f"PayPal Webhook received: {event_type}")
    
    # Verify webhook signature in production
    webhook_id = os.getenv("PAYPAL_WEBHOOK_ID")
    if webhook_id and not verify_paypal_signature(await request.body(), 
                                                 {"paypal-transmission-id": paypal_transmission_id,
                                                  "paypal-transmission-time": paypal_transmission_time,
                                                  "paypal-transmission-sig": paypal_transmission_sig},
                                                 webhook_id):
        logger.warning("PayPal webhook signature verification failed")
        return {"status": "failure"}
    
    if event_type == "CHECKOUT.ORDER.APPROVED":
        # Order approved by user - capture payment
        order_id = resource.get("id")
        logger.info(f"PayPal order approved: {order_id}")
        
    elif event_type == "PAYMENT.CAPTURE.COMPLETED":
        # Payment completed successfully
        payment_id = resource.get("id")
        order_id = resource.get("supplementary_data", {}).get("related_ids", {}).get("order_id")
        
        # Find transaction by provider_ref (order_id)
        tx = db.query(Transaction).filter(
            Transaction.provider_ref == order_id
        ).first()
        
        if tx and tx.status == TransactionStatus.PROCESSING:
            tx.status = TransactionStatus.COMPLETED
            tx.completed_at = datetime.utcnow()
            tx.provider_ref = payment_id
            
            # Update wallet balance
            wallet = db.query(Wallet).filter(Wallet.id == tx.wallet_id).first()
            if wallet and tx.tx_type == TransactionType.DEPOSIT:
                if tx.currency == "KES":
                    wallet.kes_balance += tx.amount
                elif tx.currency == "USDT":
                    wallet.usdt_balance += tx.amount
                
                # Send notification
                user = db.query(User).filter(User.operator_id == tx.operator_id).first()
                if user:
                    try:
                        send_deposit_notification(
                            to_email=user.email,
                            amount=float(tx.amount),
                            reference=tx.tx_ref,
                            currency=tx.currency
                        )
                    except Exception as e:
                        logger.error(f"Failed to send deposit email: {e}")
            
            db.commit()
            logger.info(f"✅ PayPal payment completed: {payment_id}")
            
    elif event_type == "PAYMENT.CAPTURE.DENIED":
        # Payment denied
        payment_id = resource.get("id")
        order_id = resource.get("supplementary_data", {}).get("related_ids", {}).get("order_id")
        
        tx = db.query(Transaction).filter(
            Transaction.provider_ref == order_id
        ).first()
        
        if tx and tx.status == TransactionStatus.PROCESSING:
            tx.status = TransactionStatus.FAILED
            tx.failure_reason = "Payment denied by PayPal"
            db.commit()
            logger.warning(f"❌ PayPal payment denied: {payment_id}")
    
    elif event_type == "PAYOUT.PAYMENT.COMPLETED":
        # Payout completed
        payout_id = resource.get("id")
        tx = db.query(Transaction).filter(
            Transaction.provider_ref == payout_id
        ).first()
        
        if tx and tx.status == TransactionStatus.PROCESSING:
            tx.status = TransactionStatus.COMPLETED
            tx.completed_at = datetime.utcnow()
            db.commit()
            logger.info(f"✅ PayPal payout completed: {payout_id}")
            
    elif event_type == "PAYOUT.PAYMENT.FAILED":
        # Payout failed
        payout_id = resource.get("id")
        tx = db.query(Transaction).filter(
            Transaction.provider_ref == payout_id
        ).first()
        
        if tx and tx.status == TransactionStatus.PROCESSING:
            tx.status = TransactionStatus.FAILED
            tx.failure_reason = "PayPal payout failed"
            
            # Refund the wallet
            wallet = db.query(Wallet).filter(Wallet.id == tx.wallet_id).first()
            if wallet:
                refund_amount = tx.amount + (tx.fee or 0)
                if tx.currency == "KES":
                    wallet.kes_balance += refund_amount
                elif tx.currency == "USDT":
                    wallet.usdt_balance += refund_amount
            
            db.commit()
            logger.warning(f"❌ PayPal payout failed: {payout_id}")
    
    return {"status": "received"}


# --- 2. CRYPTO WEBHOOK (for deposit confirmations) ---

@router.post("/crypto/deposit")
async def crypto_deposit_webhook(
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Webhook for crypto deposit confirmations.
    In production, this would connect to blockchain monitors.
    """
    try:
        body = await request.json()
    except:
        body = {}
    
    tx_hash = body.get("tx_hash")
    network = body.get("network")
    confirmations = body.get("confirmations", 0)
    amount = body.get("amount")
    
    logger.info(f"Crypto deposit webhook: {tx_hash}, confirmations: {confirmations}")
    
    # Find transaction
    tx = db.query(Transaction).filter(
        Transaction.provider_ref.like(f"{network}:%")
    ).first()
    
    if not tx:
        logger.error(f"Transaction not found for crypto deposit: {tx_hash}")
        return {"status": "not_found"}
    
    # Check confirmations (require at least 12 for most chains)
    required_confirmations = {"trc20": 19, "bep20": 12, "erc20": 12}.get(network, 12)
    
    if confirmations >= required_confirmations and tx.status == TransactionStatus.PROCESSING:
        tx.status = TransactionStatus.COMPLETED
        tx.completed_at = datetime.utcnow()
        
        # Update wallet
        wallet = db.query(Wallet).filter(Wallet.id == tx.wallet_id).first()
        if wallet:
            wallet.usdt_balance += tx.amount
            
            # Send notification
            user = db.query(User).filter(User.operator_id == tx.operator_id).first()
            if user:
                try:
                    send_deposit_notification(
                        to_email=user.email,
                        amount=float(tx.amount),
                        reference=tx.tx_ref,
                        currency="USDT"
                    )
                except Exception as e:
                    logger.error(f"Failed to send deposit email: {e}")
        
        db.commit()
        logger.info(f"✅ Crypto deposit confirmed: {tx_hash}")
    
    return {"status": "received", "confirmations": confirmations}
