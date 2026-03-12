import logging
import os
from fastapi import APIRouter, Depends, Request, status, Header
from sqlalchemy.orm import Session
from ..database import get_db
from ..models.wallet import Transaction, Wallet, TransactionStatus

logger = logging.getLogger("webhooks")
router = APIRouter(tags=["Webhooks"])
# --- 1. M-PESA STK CALLBACK ---
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

# --- 2. FLUTTERWAVE WEBHOOK ---
@router.post("/flutterwave")
async def flutterwave_webhook(
    request: Request, 
    db: Session = Depends(get_db),
    verif_hash: str = Header(None, alias="verif-hash") # Security Header
):
    """
    Flutterwave calls this for Card/Bank Transfer payments.
    """
    # 1. Verify Webhook Secret (Prevent spoofing)
    secret_hash = os.getenv("FLW_WEBHOOK_HASH")
    if verif_hash != secret_hash:
        logger.error("Unauthorized Flutterwave Webhook attempt")
        return {"status": "error", "message": "Invalid hash"}
    
    data = await request.json()
    tx_ref = data.get("tx_ref")
    status_flw = data.get("status") # 'successful' or 'failed'
    
    tx = db.query(Transaction).filter(Transaction.tx_ref == tx_ref).first()
    
    if not tx:
        return {"status": "ignored", "reason": "tx_not_found"}
        
    if tx.status == TransactionStatus.COMPLETED:
        return {"status": "ignored", "reason": "already_completed"}

    if status_flw == "successful":
        wallet = db.query(Wallet).filter(Wallet.id == tx.wallet_id).with_for_update().first()
        tx.status = TransactionStatus.COMPLETED
        wallet.kes_balance += tx.amount
        db.commit()
        logger.info(f"✅ Card Deposit Success: {tx_ref}")
    else:
        tx.status = TransactionStatus.FAILED
        db.commit()
    
    return {"status": "success"}