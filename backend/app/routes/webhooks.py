import logging
import os
from fastapi import APIRouter, Depends, Request, status, Header
from sqlalchemy.orm import Session
from ..database import get_db
from ..models.wallet import Transaction, Wallet, TransactionStatus

logger = logging.getLogger("webhooks")
router = APIRouter(tags=["Webhooks"])

# --- 1. PESAPAL WEBHOOK ---
@router.post("/pesapal")
async def pesapal_webhook(request: Request, db: Session = Depends(get_db)):
    """
    PesaPal calls this for payment notifications.
    """
    data = await request.json()
    
    # Get order tracking ID and payment status
    order_tracking_id = data.get("order_tracking_id")
    payment_status = data.get("payment_status", "").upper()
    merchant_reference = data.get("merchant_reference", "")
    
    logger.info(f"PesaPal webhook received: {order_tracking_id} - {payment_status}")
    
    # Find transaction by order tracking ID or merchant reference
    tx = db.query(Transaction).filter(
        (Transaction.tx_ref == order_tracking_id) | 
        (Transaction.tx_ref == merchant_reference)
    ).first()
    
    if not tx:
        logger.error(f"Transaction not found for PesaPal: {order_tracking_id}")
        return {"status": "ignored", "reason": "tx_not_found"}
        
    if tx.status == TransactionStatus.COMPLETED:
        return {"status": "ignored", "reason": "already_completed"}

    if payment_status == "COMPLETED":
        wallet = db.query(Wallet).filter(Wallet.id == tx.wallet_id).with_for_update().first()
        tx.status = TransactionStatus.COMPLETED
        wallet.kes_balance += tx.amount
        db.commit()
        logger.info(f"✅ PesaPal Payment Success: {merchant_reference}")
        return {"status": "success", "message": "Payment completed"}
    elif payment_status == "FAILED":
        tx.status = TransactionStatus.FAILED
        db.commit()
        logger.warning(f"❌ PesaPal Payment Failed: {merchant_reference}")
        return {"status": "failed", "message": "Payment failed"}
    else:
        # PENDING or other status
        logger.info(f"PesaPal Payment Pending: {merchant_reference} - Status: {payment_status}")
        return {"status": "pending", "message": "Payment pending"}

# --- 2. M-PESA STK CALLBACK ---
@router.post("/mpesa/stk-callback")
async def mpesa_stk_callback(request: Request, db: Session = Depends(get_db)):
    """
    Safaricom calls this after the user enters (or fails to enter) their PIN.
    """
    data = await request.json()
    stk_callback = data.get("Body", {}).get("stkCallback", {})
    
    # Safaricom identifies the session by CheckoutRequestID
    checkout_id = stk_callback.get("CheckoutRequestID")
    result_code = stk_callback.get("ResultCode") # 0 = Success, 1032 = Cancelled
    
    # IMPORTANT: Ensure your deposit route saves CheckoutRequestID in the tx_ref or a new column
    tx = db.query(Transaction).filter(Transaction.tx_ref == checkout_id).first()
    
    if not tx:
        logger.error(f"Transaction not found for CheckoutID: {checkout_id}")
        # Always return 0 to Safaricom to stop retries, even if we fail to find it
        return {"ResultCode": 0, "ResultDesc": "Accepted"}

    if tx.status == TransactionStatus.COMPLETED:
        return {"ResultCode": 0, "ResultDesc": "Already Processed"}

    if result_code == 0:
        wallet = db.query(Wallet).filter(Wallet.id == tx.wallet_id).with_for_update().first()
        tx.status = TransactionStatus.COMPLETED
        wallet.kes_balance += tx.amount
        logger.info(f"✅ M-Pesa Success: {tx.amount} KES added to Wallet {wallet.operator_id}")
    else:
        tx.status = TransactionStatus.FAILED
        logger.warning(f"❌ M-Pesa Failed Code {result_code}: {stk_callback.get('ResultDesc')}")

    db.commit()
    return {"ResultCode": 0, "ResultDesc": "Success"}
