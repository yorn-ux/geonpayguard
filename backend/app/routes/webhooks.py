import logging
import os
from fastapi import APIRouter, Depends, Request, status, Header
from sqlalchemy.orm import Session
from datetime import datetime
from ..database import get_db
from ..models.wallet import Transaction, Wallet, TransactionStatus

logger = logging.getLogger("webhooks")
router = APIRouter(tags=["Webhooks"])

# --- 1. M-PESA STK CALLBACK (Daraja API) ---
@router.post("/mpesa/stk-callback")
async def mpesa_stk_callback(request: Request, db: Session = Depends(get_db)):
    """
    Safaricom Daraja API calls this after the user enters (or fails to enter) their PIN.
    """
    try:
        data = await request.json()
    except:
        data = {}
    
    stk_callback = data.get("Body", {}).get("stkCallback", {})
    
    # Safaricom identifies the session by CheckoutRequestID
    checkout_id = stk_callback.get("CheckoutRequestID")
    result_code = stk_callback.get("ResultCode")  # 0 = Success, 1032 = Cancelled
    
    logger.info(f"M-Pesa STK Callback received: {checkout_id} - ResultCode: {result_code}")
    
    # Find transaction by provider_ref (CheckoutRequestID) or tx_ref
    tx = db.query(Transaction).filter(
        (Transaction.provider_ref == checkout_id) | 
        (Transaction.tx_ref == checkout_id)
    ).first()
    
    if not tx:
        logger.error(f"Transaction not found for CheckoutID: {checkout_id}")
        # Always return 0 to Safaricom to stop retries
        return {"ResultCode": 0, "ResultDesc": "Accepted"}

    if tx.status == TransactionStatus.COMPLETED:
        logger.info(f"Transaction already completed: {tx.id}")
        return {"ResultCode": 0, "ResultDesc": "Already Processed"}

    if result_code == 0:
        # Extract transaction details from callback metadata
        callback_metadata = stk_callback.get("CallbackMetadata", {})
        items = callback_metadata.get("Item", []) if callback_metadata else []
        
        mpesa_receipt_number = None
        for item in items:
            if item.get("Name") == "MpesaReceiptNumber":
                mpesa_receipt_number = item.get("Value")
                break
        
        # Update transaction
        tx.status = TransactionStatus.COMPLETED
        tx.completed_at = datetime.utcnow()
        tx.provider_ref = mpesa_receipt_number or tx.provider_ref
        
        # Update wallet balance
        wallet = db.query(Wallet).filter(Wallet.id == tx.wallet_id).with_for_update().first()
        if wallet:
            wallet.kes_balance += tx.amount
            logger.info(f"✅ M-Pesa STK Success: {tx.amount} KES added to Wallet {wallet.operator_id}")
        
        db.commit()
        logger.info(f"✅ M-Pesa Payment Success: CheckoutID={checkout_id}, Receipt={mpesa_receipt_number}")
    else:
        # Payment failed or cancelled
        tx.status = TransactionStatus.FAILED
        tx.failure_reason = stk_callback.get("ResultDesc", f"Failed with code {result_code}")
        db.commit()
        logger.warning(f"❌ M-Pesa STK Failed Code {result_code}: {stk_callback.get('ResultDesc')}")

    return {"ResultCode": 0, "ResultDesc": "Success"}

# --- 3. M-PESA B2C CALLBACK (Daraja API) ---
@router.post("/mpesa/b2c-callback")
async def mpesa_b2c_callback(request: Request, db: Session = Depends(get_db)):
    """
    Safaricom Daraja API calls this for B2C (Business to Customer) payment results.
    """
    try:
        data = await request.json()
    except:
        data = {}
    
    result = data.get("Result", {})
    result_code = result.get("ResultCode")
    result_type = result.get("ResultType")
    
    logger.info(f"M-Pesa B2C Callback received: ResultCode={result_code}, ResultType={result_type}")
    
    # Get transaction details from result
    transaction_data = result.get("Transaction", {})
    conversation_id = transaction_data.get("ConversationID")
    originator_conversation_id = transaction_data.get("OriginatorConversationID")
    
    # Find transaction by conversation ID
    tx = db.query(Transaction).filter(
        (Transaction.provider_ref == conversation_id) |
        (Transaction.provider_ref == originator_conversation_id)
    ).first()
    
    if not tx:
        logger.error(f"Transaction not found for B2C ConversationID: {conversation_id}")
        return {"ResultCode": 0, "ResultDesc": "Accepted"}

    if tx.status == TransactionStatus.COMPLETED:
        logger.info(f"Transaction already completed: {tx.id}")
        return {"ResultCode": 0, "ResultDesc": "Already Processed"}

    if result_code == 0:
        # Payment successful
        mpesa_receipt = transaction_data.get("TransactionID")
        
        tx.status = TransactionStatus.COMPLETED
        tx.completed_at = datetime.utcnow()
        tx.provider_ref = mpesa_receipt or tx.provider_ref
        
        logger.info(f"✅ M-Pesa B2C Success: {tx.amount} KES sent to {tx.beneficiary_phone}")
        db.commit()
    else:
        # Payment failed - refund the wallet
        tx.status = TransactionStatus.FAILED
        tx.failure_reason = result.get("ResultDesc", f"Failed with code {result_code}")
        
        # Refund the wallet
        wallet = db.query(Wallet).filter(Wallet.id == tx.wallet_id).with_for_update().first()
        if wallet:
            refund_amount = tx.amount + (tx.fee or 0)
            wallet.kes_balance += refund_amount
            logger.info(f"💰 Refunded {refund_amount} KES to wallet {wallet.operator_id}")
        
        db.commit()
        logger.warning(f"❌ M-Pesa B2C Failed Code {result_code}: {result.get('ResultDesc')}")

    return {"ResultCode": 0, "ResultDesc": "Success"}

# --- 4. M-PESA C2B REGISTER URL (For simulation) ---
@router.post("/mpesa/c2b-register")
async def mpesa_c2b_register(request: Request, db: Session = Depends(get_db)):
    """
    Register C2B validation and confirmation URLs with Safaricom.
    This endpoint is called by Safaricom to validate C2B transactions.
    """
    try:
        data = await request.json()
    except:
        data = {}
    
    # C2B Validation - returns ACCEPT or REJECT
    transaction_type = data.get("TransactionType")
    amount = data.get("Amount")
    account_reference = data.get("AccountReference")
    
    logger.info(f"M-Pesa C2B Validation: Type={transaction_type}, Amount={amount}, Ref={account_reference}")
    
    # For deposits, always accept (you could add validation here)
    return {
        "ResultCode": 0,
        "ResultDesc": "Accept",
        "ThirdPartyReference": data.get("ThirdPartyReference"),
        "QueueTimeOutURL": data.get("QueueTimeOutURL"),
        "ResponseURL": data.get("ResponseURL")
    }

# --- 5. M-PESA C2B CONFIRMATION ---
@router.post("/mpesa/c2b-confirm")
async def mpesa_c2b_confirm(request: Request, db: Session = Depends(get_db)):
    """
    Safaricom calls this to confirm a C2B transaction.
    """
    try:
        data = await request.json()
    except:
        data = {}
    
    transaction_type = data.get("TransactionType")
    amount = data.get("Amount")
    account_reference = data.get("AccountReference")
    mpesa_receipt = data.get("MpesaReceiptNumber")
    phone = data.get("MSISDN")
    
    logger.info(f"M-Pesa C2B Confirmation: Receipt={mpesa_receipt}, Amount={amount}, Phone={phone}")
    
    # Find transaction by account reference (our internal reference)
    tx = db.query(Transaction).filter(
        (Transaction.tx_ref == account_reference) |
        (Transaction.provider_ref == account_reference)
    ).first()
    
    if tx and tx.status == TransactionStatus.PROCESSING:
        tx.status = TransactionStatus.COMPLETED
        tx.completed_at = datetime.utcnow()
        tx.provider_ref = mpesa_receipt
        
        wallet = db.query(Wallet).filter(Wallet.id == tx.wallet_id).first()
        if wallet:
            wallet.kes_balance += tx.amount
        
        db.commit()
        logger.info(f"✅ C2B Payment Success: {amount} KES")

    return {"ResultCode": 0, "ResultDesc": "Success"}
