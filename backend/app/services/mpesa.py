import os
import httpx
import logging
from typing import Optional, Dict, Any
from fastapi import HTTPException

# Configure logging
logger = logging.getLogger(__name__)

# Intasend API Configuration
INTASEND_BASE_URL = "https://sandbox.intasend.com/api"  # For sandbox
# INTASEND_BASE_URL = "https://api.intasend.com/api"   # For production

async def get_intasend_headers() -> Dict[str, str]:
    """Generate headers for Intasend API requests."""
    publishable_key = os.getenv("INTASEND_PUBLISHABLE_KEY")
    token = os.getenv("INTASEND_TOKEN")
    
    if not publishable_key or not token:
        logger.error("Intasend credentials not configured")
        raise HTTPException(status_code=500, detail="Payment service not properly configured")
    
    return {
        "X-IntaSend-Public-API-Key": publishable_key,
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }

def format_phone_number(phone: str) -> str:
    """Format phone number for Intasend (254XXXXXXXXX format)."""
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

# --- 1. STK PUSH (M-PESA Payments/Deposits) ---
async def trigger_stk_push(phone: str, amount: float, reference: str) -> Dict[str, Any]:
    """
    Triggers M-Pesa STK Push using Intasend API.
    This handles customer payments/deposits into your account.
    """
    try:
        headers = await get_intasend_headers()
        formatted_phone = format_phone_number(phone)
        
        # Intasend STK Push endpoint
        url = f"{INTASEND_BASE_URL}/v1/payment/mpesa-stk-push/"
        
        payload = {
            "phone_number": formatted_phone,
            "amount": int(amount),  # Amount in KES
            "api_ref": reference[:20],  # Reference/account number
            "email": os.getenv("CUSTOMER_EMAIL", ""),  # Optional
            "host": os.getenv("APP_DOMAIN", ""),  # Your app domain
            "currency": "KES"
        }
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                url, 
                json=payload, 
                headers=headers, 
                timeout=30
            )
            
            if response.status_code == 200 or response.status_code == 201:
                result = response.json()
                
                # Check Intasend specific response structure
                if result.get("status") == "success" or result.get("invoice"):
                    logger.info(f"STK Push initiated: {result.get('invoice_id')}")
                    return {
                        "status": "success",
                        "message": "STK Push sent to phone",
                        "invoice_id": result.get("invoice_id"),
                        "tracking_id": result.get("tracking_id"),
                        "provider": "intasend"
                    }
                else:
                    error_msg = result.get("detail", "STK Push failed")
                    logger.error(f"Intasend STK Push error: {error_msg}")
                    raise HTTPException(status_code=400, detail=error_msg)
            else:
                error_data = response.json()
                logger.error(f"Intasend API error: {error_data}")
                raise HTTPException(
                    status_code=response.status_code,
                    detail=error_data.get("detail", "Payment service error")
                )
                
    except httpx.RequestError as e:
        logger.error(f"Intasend network error: {str(e)}")
        raise HTTPException(status_code=502, detail="Payment gateway unreachable")
    except Exception as e:
        logger.error(f"Unexpected error in STK Push: {str(e)}")
        raise HTTPException(status_code=500, detail="Payment processing failed")

# --- 2. CHECK STK PUSH STATUS ---
async def check_stk_status(invoice_id: str) -> Dict[str, Any]:
    """
    Check the status of an STK Push transaction.
    Useful for verifying payment completion.
    """
    try:
        headers = await get_intasend_headers()
        url = f"{INTASEND_BASE_URL}/v1/payment/status/{invoice_id}/"
        
        async with httpx.AsyncClient() as client:
            response = await client.get(url, headers=headers, timeout=10)
            
            if response.status_code == 200:
                result = response.json()
                return {
                    "status": result.get("status"),
                    "invoice_id": result.get("invoice_id"),
                    "amount": result.get("amount"),
                    "phone_number": result.get("phone_number"),
                    "payment_status": result.get("payment_status"),
                    "complete": result.get("complete", False)
                }
            else:
                logger.error(f"Status check failed: {response.text}")
                return {"status": "unknown", "error": "Could not fetch status"}
                
    except Exception as e:
        logger.error(f"Error checking STK status: {str(e)}")
        return {"status": "error", "detail": str(e)}

# --- 3. COLLECTION (M-PESA PAYMENTS) - Alternative Method ---
async def initiate_collection(phone: str, amount: float, reference: str) -> Dict[str, Any]:
    """
    Alternative method using Intasend Collection API.
    This is similar to STK Push but uses a different endpoint.
    """
    try:
        headers = await get_intasend_headers()
        formatted_phone = format_phone_number(phone)
        
        url = f"{INTASEND_BASE_URL}/v1/payment/collection/"
        
        payload = {
            "phone_number": formatted_phone,
            "amount": int(amount),
            "api_ref": reference[:20],
            "email": os.getenv("CUSTOMER_EMAIL", ""),
            "method": "MPESA_STK_PUSH"
        }
        
        async with httpx.AsyncClient() as client:
            response = await client.post(url, json=payload, headers=headers, timeout=30)
            
            if response.status_code in [200, 201]:
                result = response.json()
                return {
                    "status": "success",
                    "invoice_id": result.get("invoice", {}).get("invoice_id"),
                    "tracking_id": result.get("tracking_id"),
                    "provider": "intasend"
                }
            else:
                raise HTTPException(
                    status_code=response.status_code,
                    detail="Collection initiation failed"
                )
                
    except Exception as e:
        logger.error(f"Collection error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to initiate collection")

# --- 4. B2C: DISBURSEMENTS (Withdrawals/Payouts) ---
async def trigger_b2c_payment(phone: str, amount: float, reference: str) -> Dict[str, Any]:
    """
    Sends funds from business to customer (withdrawals/payouts).
    Uses Intasend Payout API.
    """
    try:
        headers = await get_intasend_headers()
        formatted_phone = format_phone_number(phone)
        
        # Intasend Payout endpoint
        url = f"{INTASEND_BASE_URL}/v1/payout/"
        
        payload = {
            "phone_number": formatted_phone,
            "amount": int(amount),
            "api_ref": reference[:20],
            "currency": "KES",
            "provider": "MPESA",
            "email": os.getenv("CUSTOMER_EMAIL", ""),
            "narrative": f"Withdrawal: {reference}"
        }
        
        async with httpx.AsyncClient() as client:
            response = await client.post(url, json=payload, headers=headers, timeout=30)
            
            if response.status_code in [200, 201]:
                result = response.json()
                return {
                    "status": "success",
                    "message": "Payout initiated",
                    "payout_id": result.get("id"),
                    "tracking_id": result.get("tracking_id"),
                    "amount": amount,
                    "phone": formatted_phone,
                    "provider": "intasend"
                }
            else:
                error_data = response.json()
                logger.error(f"Payout error: {error_data}")
                raise HTTPException(
                    status_code=response.status_code,
                    detail=error_data.get("detail", "Payout failed")
                )
                
    except httpx.RequestError as e:
        logger.error(f"Payout network error: {str(e)}")
        raise HTTPException(status_code=502, detail="Payout gateway unreachable")
    except Exception as e:
        logger.error(f"Unexpected error in payout: {str(e)}")
        raise HTTPException(status_code=500, detail="Payout processing failed")

# --- 5. CHECK PAYOUT STATUS ---
async def check_payout_status(payout_id: str) -> Dict[str, Any]:
    """
    Check the status of a payout transaction.
    """
    try:
        headers = await get_intasend_headers()
        url = f"{INTASEND_BASE_URL}/v1/payout/{payout_id}/"
        
        async with httpx.AsyncClient() as client:
            response = await client.get(url, headers=headers, timeout=10)
            
            if response.status_code == 200:
                result = response.json()
                return {
                    "status": result.get("status"),
                    "payout_id": result.get("id"),
                    "amount": result.get("amount"),
                    "phone_number": result.get("phone_number"),
                    "transaction_state": result.get("transaction_state")
                }
            else:
                return {"status": "unknown", "error": "Could not fetch payout status"}
                
    except Exception as e:
        logger.error(f"Error checking payout status: {str(e)}")
        return {"status": "error", "detail": str(e)}

# --- 6. WEBHOOK HANDLER FOR INCOMING NOTIFICATIONS ---
async def handle_intasend_webhook(payload: Dict[str, Any]) -> Dict[str, Any]:
    """
    Handle incoming webhooks from Intasend.
    Call this from your webhook endpoint.
    """
    event_type = payload.get("event", "")
    data = payload.get("data", {})
    
    logger.info(f"Intasend webhook received: {event_type}")
    
    if event_type == "payment.completed":
        # Payment was successful
        return {
            "event": event_type,
            "invoice_id": data.get("invoice_id"),
            "amount": data.get("amount"),
            "phone": data.get("phone_number"),
            "reference": data.get("api_ref"),
            "status": "completed"
        }
    elif event_type == "payment.failed":
        # Payment failed
        return {
            "event": event_type,
            "invoice_id": data.get("invoice_id"),
            "reason": data.get("reason", "Unknown"),
            "status": "failed"
        }
    elif event_type == "payout.completed":
        # Payout completed
        return {
            "event": event_type,
            "payout_id": data.get("payout_id"),
            "amount": data.get("amount"),
            "status": "completed"
        }
    else:
        # Other events
        return {
            "event": event_type,
            "data": data,
            "status": "received"
        }
