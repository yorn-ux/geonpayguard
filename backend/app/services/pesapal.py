import os
import httpx
import logging
import hashlib
import time
import json
from typing import Optional, Dict, Any
from fastapi import HTTPException

# Configure logging
logger = logging.getLogger(__name__)

# PesaPal API Configuration
PESAPAL_BASE_URL = os.getenv("PESAPAL_BASE_URL", "https://cybqa.pesapal.com")  # Sandbox
# PESAPAL_BASE_URL = "https://pay.pesapal.com"  # Production

PESAPAL_CONSUMER_KEY = os.getenv("PESAPAL_CONSUMER_KEY", "")
PESAPAL_CONSUMER_SECRET = os.getenv("PESAPAL_CONSUMER_SECRET", "")
PESAPAL_CALLBACK_URL = os.getenv("PESAPAL_CALLBACK_URL", "")
PESAPAL_IPN_URL = os.getenv("PESAPAL_IPN_URL", "")


def get_pesapal_credentials() -> Dict[str, str]:
    """Get PesaPal credentials."""
    if not PESAPAL_CONSUMER_KEY or not PESAPAL_CONSUMER_SECRET:
        logger.error("PesaPal credentials not configured")
        raise HTTPException(status_code=500, detail="Payment service not properly configured")
    
    return {
        "consumer_key": PESAPAL_CONSUMER_KEY,
        "consumer_secret": PESAPAL_CONSUMER_SECRET
    }


def format_phone_number(phone: str) -> str:
    """Format phone number for M-Pesa (254XXXXXXXXX format)."""
    formatted_phone = str(phone).replace("+", "").replace(" ", "").strip()
    
    if formatted_phone.startswith("0"):
        formatted_phone = "254" + formatted_phone[1:]
    elif formatted_phone.startswith("7"):
        formatted_phone = "254" + formatted_phone
    elif formatted_phone.startswith("254") and len(formatted_phone) == 12:
        pass  # Already in correct format
    else:
        raise HTTPException(status_code=400, detail="Invalid phone number format")
    
    return formatted_phone


def generate_pesapal_signature(*args) -> str:
    """Generate PesaPal signature using SHA256."""
    creds = get_pesapal_credentials()
    # Create signature string from all arguments
    signature_string = "".join([str(arg) for arg in args])
    signature_string += creds["consumer_secret"]
    
    # Generate SHA256 hash
    signature = hashlib.sha256(signature_string.encode()).hexdigest()
    return signature


async def get_pesapal_token() -> str:
    """
    Get PesaPal OAuth token.
    """
    try:
        creds = get_pesapal_credentials()
        url = f"{PESAPAL_BASE_URL}/api/Auth/RequestToken"
        
        payload = {
            "consumer_key": creds["consumer_key"],
            "consumer_secret": creds["consumer_secret"]
        }
        
        async with httpx.AsyncClient() as client:
            response = await client.post(url, json=payload, timeout=30)
            
            if response.status_code == 200:
                result = response.json()
                token = result.get("token")
                if not token:
                    raise HTTPException(status_code=400, detail="Failed to get PesaPal token")
                return token
            else:
                logger.error(f"PesaPal token error: {response.text}")
                raise HTTPException(status_code=400, detail="Failed to authenticate with PesaPal")
                
    except httpx.RequestError as e:
        logger.error(f"PesaPal network error: {str(e)}")
        raise HTTPException(status_code=502, detail="Payment gateway unreachable")
    except Exception as e:
        logger.error(f"Error getting PesaPal token: {str(e)}")
        raise HTTPException(status_code=500, detail="Payment service error")


# --- 1. SUBMIT ORDER (M-PESA STK Push / Card Payment) ---
async def submit_pesapal_order(
    phone: str, 
    amount: float, 
    reference: str,
    description: str = "Payment"
) -> Dict[str, Any]:
    """
    Submit an order to PesaPal for payment.
    This can initiate M-Pesa STK Push or redirect to card payment.
    """
    try:
        token = await get_pesapal_token()
        formatted_phone = format_phone_number(phone)
        
        # Unique order ID
        order_id = f"{reference}_{int(time.time())}"
        
        url = f"{PESAPAL_BASE_URL}/api/Orders/SubmitOrderRequest"
        
        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }
        
        # Generate unique reference
        creds = get_pesapal_credentials()
        
        payload = {
            "consumer_key": creds["consumer_key"],
            "signature_method": "SHA256",
            "timestamp": time.strftime("%Y%m%d%H%M%S"),
            "Version": "3.3",
            "amount": str(int(amount)),
            "currency": "KES",
            "description": description[:50],
            "type": "MERCHANT",
            "reference": order_id,
            "phone_number": formatted_phone,
            "callback_url": PESAPAL_CALLBACK_URL or f"{os.getenv('APP_DOMAIN', '')}/api/webhooks/pesapal",
            "ipn_notification_id": PESAPAL_IPN_URL,
            "account_number": reference[:20]
        }
        
        # Add signature
        signature_string = f"{creds['consumer_key']}{payload['reference']}{payload['amount']}{payload['currency']}{creds['consumer_secret']}"
        payload["signature"] = hashlib.sha256(signature_string.encode()).hexdigest()
        
        async with httpx.AsyncClient() as client:
            response = await client.post(url, json=payload, headers=headers, timeout=30)
            
            if response.status_code == 200:
                result = response.json()
                
                if result.get("status") == "200" or result.get("order_tracking_id"):
                    logger.info(f"PesaPal order submitted: {result.get('order_tracking_id')}")
                    return {
                        "status": "success",
                        "message": "Payment request initiated",
                        "order_tracking_id": result.get("order_tracking_id"),
                        "merchant_reference": order_id,
                        "redirect_url": result.get("redirect_url", ""),
                        "provider": "pesapal"
                    }
                else:
                    error_msg = result.get("message", "Order submission failed")
                    logger.error(f"PesaPal order error: {error_msg}")
                    raise HTTPException(status_code=400, detail=error_msg)
            else:
                error_data = response.json()
                logger.error(f"PesaPal API error: {error_data}")
                raise HTTPException(
                    status_code=response.status_code,
                    detail=error_data.get("message", "Payment service error")
                )
                
    except httpx.RequestError as e:
        logger.error(f"PesaPal network error: {str(e)}")
        raise HTTPException(status_code=502, detail="Payment gateway unreachable")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error in PesaPal order: {str(e)}")
        raise HTTPException(status_code=500, detail="Payment processing failed")


# --- 2. CHECK PAYMENT STATUS ---
async def check_pesapal_status(order_tracking_id: str) -> Dict[str, Any]:
    """
    Check the status of a PesaPal payment.
    """
    try:
        token = await get_pesapal_token()
        
        url = f"{PESAPAL_BASE_URL}/api/Orders/GetTransactionStatus"
        
        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }
        
        payload = {
            "order_tracking_id": order_tracking_id
        }
        
        async with httpx.AsyncClient() as client:
            response = await client.post(url, json=payload, headers=headers, timeout=10)
            
            if response.status_code == 200:
                result = response.json()
                return {
                    "status": result.get("payment_status"),
                    "order_tracking_id": order_tracking_id,
                    "amount": result.get("amount"),
                    "reference": result.get("merchant_reference"),
                    "complete": result.get("payment_status") == "COMPLETED"
                }
            else:
                logger.error(f"Status check failed: {response.text}")
                return {"status": "unknown", "error": "Could not fetch status"}
                
    except Exception as e:
        logger.error(f"Error checking PesaPal status: {str(e)}")
        return {"status": "error", "detail": str(e)}


# --- 3. REGISTER IPN (Instant Payment Notification) ---
async def register_pesapal_ipn(url: str, ipn_name: str = "Geon IPN") -> Dict[str, Any]:
    """
    Register an IPN URL with PesaPal.
    """
    try:
        token = await get_pesapal_token()
        
        ipn_url = f"{PESAPAL_BASE_URL}/api/Recipes/RegisterIPN"
        
        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }
        
        payload = {
            "url": url,
            "ipn_name": ipn_name
        }
        
        async with httpx.AsyncClient() as client:
            response = await client.post(ipn_url, json=payload, headers=headers, timeout=30)
            
            if response.status_code == 200:
                result = response.json()
                return {
                    "status": "success",
                    "ipn_id": result.get("ipn_id"),
                    "url": url
                }
            else:
                logger.error(f"IPN registration failed: {response.text}")
                raise HTTPException(status_code=400, detail="Failed to register IPN")
                
    except Exception as e:
        logger.error(f"Error registering IPN: {str(e)}")
        raise HTTPException(status_code=500, detail="IPN registration failed")


# --- 4. B2C: DISBURSEMENTS (Withdrawals/Payouts) ---
async def trigger_pesapal_b2c_payment(
    phone: str, 
    amount: float, 
    reference: str,
    description: str = "Withdrawal"
) -> Dict[str, Any]:
    """
    Send funds from business to customer (withdrawals/payouts).
    Uses PesaPal B2C API.
    """
    try:
        token = await get_pesapal_token()
        formatted_phone = format_phone_number(phone)
        
        # Unique payout reference
        payout_ref = f"WTH_{reference}_{int(time.time())}"
        
        url = f"{PESAPAL_BASE_URL}/api/B2C/SubmitDirectOrder"
        
        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }
        
        payload = {
            "amount": str(int(amount)),
            "currency": "KES",
            "description": description[:50],
            "reference": payout_ref,
            "phone_number": formatted_phone,
            "call_back_url": PESAPAL_CALLBACK_URL or f"{os.getenv('APP_DOMAIN', '')}/api/webhooks/pesapal",
            "node_type": "MNO",
            "node_name": "MPESA"
        }
        
        async with httpx.AsyncClient() as client:
            response = await client.post(url, json=payload, headers=headers, timeout=30)
            
            if response.status_code in [200, 201]:
                result = response.json()
                
                if result.get("status") == "200" or result.get("order_tracking_id"):
                    return {
                        "status": "success",
                        "message": "Payout initiated",
                        "order_tracking_id": result.get("order_tracking_id"),
                        "reference": payout_ref,
                        "amount": amount,
                        "phone": formatted_phone,
                        "provider": "pesapal"
                    }
                else:
                    error_msg = result.get("message", "Payout failed")
                    logger.error(f"PesaPal payout error: {error_msg}")
                    raise HTTPException(status_code=400, detail=error_msg)
            else:
                error_data = response.json()
                logger.error(f"PesaPal payout API error: {error_data}")
                raise HTTPException(
                    status_code=response.status_code,
                    detail=error_data.get("message", "Payout failed")
                )
                
    except httpx.RequestError as e:
        logger.error(f"PesaPal payout network error: {str(e)}")
        raise HTTPException(status_code=502, detail="Payout gateway unreachable")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error in PesaPal payout: {str(e)}")
        raise HTTPException(status_code=500, detail="Payout processing failed")


# --- 5. CHECK B2C PAYOUT STATUS ---
async def check_pesapal_payout_status(order_tracking_id: str) -> Dict[str, Any]:
    """
    Check the status of a B2C payout transaction.
    """
    try:
        token = await get_pesapal_token()
        
        url = f"{PESAPAL_BASE_URL}/api/B2C/GetTransactionStatus"
        
        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }
        
        payload = {
            "order_tracking_id": order_tracking_id
        }
        
        async with httpx.AsyncClient() as client:
            response = await client.post(url, json=payload, headers=headers, timeout=10)
            
            if response.status_code == 200:
                result = response.json()
                return {
                    "status": result.get("status"),
                    "order_tracking_id": order_tracking_id,
                    "amount": result.get("amount"),
                    "payment_status": result.get("payment_status"),
                    "description": result.get("description")
                }
            else:
                return {"status": "unknown", "error": "Could not fetch payout status"}
                
    except Exception as e:
        logger.error(f"Error checking PesaPal payout status: {str(e)}")
        return {"status": "error", "detail": str(e)}


# --- 6. WEBHOOK HANDLER FOR INCOMING NOTIFICATIONS ---
async def handle_pesapal_webhook(payload: Dict[str, Any]) -> Dict[str, Any]:
    """
    Handle incoming webhooks from PesaPal.
    Call this from your webhook endpoint.
    """
    order_tracking_id = payload.get("order_tracking_id", "")
    payment_status = payload.get("payment_status", "")
    merchant_reference = payload.get("merchant_reference", "")
    
    logger.info(f"PesaPal webhook received: {order_tracking_id} - {payment_status}")
    
    if payment_status == "COMPLETED":
        # Payment was successful
        return {
            "event": "payment.completed",
            "order_tracking_id": order_tracking_id,
            "merchant_reference": merchant_reference,
            "status": "completed"
        }
    elif payment_status == "FAILED":
        # Payment failed
        return {
            "event": "payment.failed",
            "order_tracking_id": order_tracking_id,
            "reason": payload.get("reason", "Unknown"),
            "status": "failed"
        }
    elif payment_status == "PENDING":
        # Payment is pending
        return {
            "event": "payment.pending",
            "order_tracking_id": order_tracking_id,
            "status": "pending"
        }
    else:
        # Other status
        return {
            "event": payment_status,
            "order_tracking_id": order_tracking_id,
            "data": payload,
            "status": "received"
        }


# --- 7. GET WALLETS (M-Pesa Registered Numbers) ---
async def get_pesapal_wallets() -> Dict[str, Any]:
    """
    Get registered M-Pesa wallets/customer IDs from PesaPal.
    """
    try:
        token = await get_pesapal_token()
        
        url = f"{PESAPAL_BASE_URL}/api/Wallet/GetWallets"
        
        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }
        
        async with httpx.AsyncClient() as client:
            response = await client.get(url, headers=headers, timeout=10)
            
            if response.status_code == 200:
                result = response.json()
                return {
                    "status": "success",
                    "wallets": result.get("wallets", [])
                }
            else:
                return {"status": "error", "wallets": []}
                
    except Exception as e:
        logger.error(f"Error getting PesaPal wallets: {str(e)}")
        return {"status": "error", "wallets": []}
