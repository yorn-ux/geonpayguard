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

# PesaPal API Configuration - CORRECTED BASE URLS
PESAPAL_BASE_URL = os.getenv("PESAPAL_BASE_URL", "https://cybqa.pesapal.com/pesapalv3")  # Sandbox v3 (FIXED)
# PESAPAL_BASE_URL = "https://pay.pesapal.com/v3"  # Production v3

PESAPAL_CONSUMER_KEY = os.getenv("PESAPAL_CONSUMER_KEY", "")
PESAPAL_CONSUMER_SECRET = os.getenv("PESAPAL_CONSUMER_SECRET", "")
PESAPAL_CALLBACK_URL = os.getenv("PESAPAL_CALLBACK_URL", "")
PESAPAL_IPN_URL = os.getenv("PESAPAL_IPN_URL", "")


def get_pesapal_credentials() -> Dict[str, str]:
    """Get PesaPal credentials."""
    if not PESAPAL_CONSUMER_KEY or not PESAPAL_CONSUMER_SECRET:
        logger.error("PesaPal credentials not configured")
        raise HTTPException(status_code=500, detail="Payment service not properly configured - missing credentials")
    
    # Check for placeholder values
    if PESAPAL_CONSUMER_KEY == "YOUR_PESAPAL_CONSUMER_KEY_HERE" or PESAPAL_CONSUMER_SECRET == "YOUR_PESAPAL_CONSUMER_SECRET_HERE":
        logger.error("PesaPal credentials are placeholder values - please update in .env")
        raise HTTPException(status_code=500, detail="Payment service not configured - please update PesaPal credentials")
    
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
        
        # PesaPal requires JSON payload
        payload = {
            "consumer_key": creds["consumer_key"],
            "consumer_secret": creds["consumer_secret"]
        }
        
        async with httpx.AsyncClient() as client:
            # PesaPal v3 expects JSON
            response = await client.post(
                url, 
                json=payload,
                headers={"Content-Type": "application/json"},
                timeout=30
            )
            
            logger.info(f"PesaPal token request: {response.status_code}")
            
            if response.status_code == 200:
                result = response.json()
                # Check for error in response body (PesaPal sometimes returns 200 with error)
                if result.get("error") or result.get("status") == "500":
                    error_info = result.get("error", {})
                    error_code = error_info.get("code", "unknown_error")
                    logger.error(f"PesaPal token error: {error_code} - {result}")
                    raise HTTPException(
                        status_code=400, 
                        detail=f"PesaPal authentication failed: {error_code.replace('_', ' ').title()}"
                    )
                token = result.get("token") or result.get("access_token")
                if not token:
                    logger.error(f"PesaPal token response missing token field: {result}")
                    raise HTTPException(status_code=400, detail="Failed to get PesaPal token: no token in response")
                return token
            else:
                logger.error(f"PesaPal token error: {response.status_code} - {response.text}")
                error_detail = f"Failed to authenticate with PesaPal"
                try:
                    error_data = response.json()
                    if "error" in error_data:
                        error_detail = error_data["error"]
                    elif "message" in error_data:
                        error_detail = error_data["message"]
                except:
                    pass
                raise HTTPException(status_code=400, detail=error_detail)
                
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
        
        url = f"{PESAPAL_BASE_URL}/api/Transactions/SubmitOrderRequest"
        
        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }
        
        # Use registered IPN ID if available, otherwise omit
        ipn_id = os.getenv("PESAPAL_IPN_ID", "")
        
        # Current timestamp in required format
        timestamp = time.strftime("%Y-%m-%dT%H:%M:%SZ")
        
        payload = {
            "id": reference,
            "currency": "KES",
            "amount": amount,
            "description": description[:50],
            "callback_url": PESAPAL_CALLBACK_URL or f"{os.getenv('FRONTEND_URL', '')}/payment/callback",
            "notification_id": ipn_id if ipn_id else None,
            "billing_address": {
                "phone_number": formatted_phone,
                "email_address": "customer@example.com",  # You may want to make this dynamic
                "country_code": "KE",
                "first_name": "Customer",
                "last_name": "Name",
                "line_1": "Address Line 1",
                "city": "Nairobi",
                "state": "Nairobi",
                "postal_code": "00100"
            }
        }
        
        # Remove None values
        payload = {k: v for k, v in payload.items() if v is not None}
        
        logger.info(f"PesaPal order request to {url}")
        logger.debug(f"PesaPal order payload: {json.dumps(payload)}")
        
        async with httpx.AsyncClient() as client:
            response = await client.post(url, json=payload, headers=headers, timeout=30)
            
            logger.info(f"PesaPal order response: {response.status_code}")
            
            if response.status_code == 200:
                result = response.json()
                
                if result.get("status") == "200" or result.get("order_tracking_id"):
                    order_tracking_id = result.get("order_tracking_id") or result.get("tracking_id")
                    redirect_url = result.get("redirect_url") or result.get("merchant_reference")
                    
                    logger.info(f"PesaPal order submitted: {order_tracking_id}")
                    return {
                        "status": "success",
                        "message": "Payment request initiated",
                        "order_tracking_id": order_tracking_id,
                        "merchant_reference": result.get("merchant_reference", order_id),
                        "redirect_url": redirect_url,
                        "provider": "pesapal"
                    }
                else:
                    error_msg = result.get("error", {}).get("message", result.get("message", "Order submission failed"))
                    logger.error(f"PesaPal order error: {error_msg}")
                    raise HTTPException(status_code=400, detail=error_msg)
            else:
                error_text = response.text
                logger.error(f"PesaPal API error: {response.status_code} - {error_text}")
                try:
                    error_data = response.json()
                    error_msg = error_data.get("error", {}).get("message", error_data.get("message", "Payment service error"))
                except:
                    error_msg = f"Payment service error: {response.status_code}"
                raise HTTPException(status_code=response.status_code, detail=error_msg)
                
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
        
        url = f"{PESAPAL_BASE_URL}/api/Transactions/GetTransactionStatus"
        
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
                payment_status = result.get("payment_status") or result.get("status")
                return {
                    "status": payment_status,
                    "order_tracking_id": order_tracking_id,
                    "amount": result.get("amount"),
                    "reference": result.get("merchant_reference"),
                    "complete": payment_status == "COMPLETED"
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
        
        ipn_url = f"{PESAPAL_BASE_URL}/api/URLSetup/RegisterIPN"
        
        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }
        
        payload = {
            "url": url,
            "ipn_notification_type": "GET"
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
            "amount": amount,
            "currency": "KES",
            "description": description[:50],
            "reference": payout_ref,
            "phone_number": formatted_phone,
            "callback_url": PESAPAL_CALLBACK_URL or f"{os.getenv('FRONTEND_URL', '')}/withdrawal/callback",
            "node_type": "MNO",
            "node_name": "MPESA"
        }
        
        logger.info(f"PesaPal B2C request to {url}")
        
        async with httpx.AsyncClient() as client:
            response = await client.post(url, json=payload, headers=headers, timeout=30)
            
            if response.status_code in [200, 201]:
                result = response.json()
                
                if result.get("status") == "200" or result.get("order_tracking_id"):
                    order_tracking_id = result.get("order_tracking_id")
                    logger.info(f"PesaPal payout initiated: {order_tracking_id}")
                    return {
                        "status": "success",
                        "message": "Payout initiated",
                        "order_tracking_id": order_tracking_id,
                        "reference": payout_ref,
                        "amount": amount,
                        "phone": formatted_phone,
                        "provider": "pesapal"
                    }
                else:
                    error_msg = result.get("error", {}).get("message", result.get("message", "Payout failed"))
                    logger.error(f"PesaPal payout error: {error_msg}")
                    raise HTTPException(status_code=400, detail=error_msg)
            else:
                error_text = response.text
                logger.error(f"PesaPal payout API error: {response.status_code} - {error_text}")
                try:
                    error_data = response.json()
                    error_msg = error_data.get("error", {}).get("message", error_data.get("message", "Payout failed"))
                except:
                    error_msg = f"Payout service error: {response.status_code}"
                raise HTTPException(status_code=response.status_code, detail=error_msg)
                
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
                    "status": result.get("status") or result.get("payment_status"),
                    "order_tracking_id": order_tracking_id,
                    "amount": result.get("amount"),
                    "payment_status": result.get("payment_status"),
                    "description": result.get("description")
                }
            else:
                logger.error(f"Payout status check failed: {response.text}")
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