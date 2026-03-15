"""
M-Pesa Direct Integration Service
Handles STK Push for deposits and B2C for withdrawals/payouts
"""
import os
import httpx
import logging
import base64
import hashlib
import time
import json
from typing import Optional, Dict, Any
from fastapi import HTTPException

# Configure logging
logger = logging.getLogger(__name__)

# M-Pesa API Configuration
MPESA_ENVIRONMENT = os.getenv("MPESA_ENVIRONMENT", "sandbox")  # sandbox or production
MPESA_BASE_URL = "https://sandbox.safaricom.co.ke" if MPESA_ENVIRONMENT == "sandbox" else "https://api.safaricom.co.ke"

# M-Pesa Credentials - Use environment variables or fall back to provided credentials
MPESA_CONSUMER_KEY = os.getenv("MPESA_CONSUMER_KEY", "eFd1HfCrZ12aGQBXiO79aaLL6OyAUb8qVgbc57XabVXThksn")
MPESA_CONSUMER_SECRET = os.getenv("MPESA_CONSUMER_SECRET", "lSVsuX0jGafFc4k6GkZnFAbPGy1AO1d3MsJ7QdArnPc4QAHootES2oylzvtWDJog")
MPESA_SHORTCODE = os.getenv("MPESA_SHORTCODE", "600991")
MPESA_PASSKEY = os.getenv("MPESA_PASSKEY", "Password123!")
MPESA_INITIATOR_NAME = os.getenv("MPESA_INITIATOR_NAME", "testapi")
MPESA_INITIATOR_PASSWORD = os.getenv("MPESA_INITIATOR_PASSWORD", "kStrzj9$Guk$W7B")
MPESA_SECURITY_CREDENTIAL = os.getenv("MPESA_SECURITY_CREDENTIAL", "loOFYgAWhQt0PIireZnntfMMmc3LlCH3gFUnEdiKTTfvoFyyW0dWvVh+ReuTIkm8NlTHGV+JylzU8xOy9AJ/JhVyivazmN6RdZeP5AtvL4lVqJq6ubzdiTI9LnbufyB8osCOTVM4jXE7jTskyzs4G34tPEAQV3ZYyzSCW8V5w7pEuWl9Zeh29Wq5ORE6mAdNm453Tvy4qO26AWKbFc6nZnSBuoKZgHjI/SvDia1GhlqUKRV7eO2BxrB2lMekkqFlS56xF4TBVQQ05Cr1Gaud0wSdJwJ3kRhhQNoF3CkqiOO/F8CqFSnWWVQAP6UdJuylGoK1s/iKm9JsH+YAPcGqQA==")
MPESA_CALLBACK_URL = os.getenv("MPESA_CALLBACK_URL", "")
MPESA_STK_CALLBACK_URL = os.getenv("MPESA_STK_CALLBACK_URL", "")
MPESA_B2C_CALLBACK_URL = os.getenv("MPESA_B2C_CALLBACK_URL", "")

# Token cache
_mpesa_token_cache = {
    "token": None,
    "expires_at": 0
}
CACHE_DURATION = 300  # Token valid for 5 minutes


def get_mpesa_credentials() -> Dict[str, str]:
    """Get M-Pesa credentials."""
    if not MPESA_CONSUMER_KEY or not MPESA_CONSUMER_SECRET:
        logger.error("M-Pesa credentials not configured")
        raise HTTPException(
            status_code=500, 
            detail="Payment service not properly configured - missing M-Pesa credentials"
        )
    
    if not MPESA_SHORTCODE:
        logger.error("M-Pesa shortcode not configured")
        raise HTTPException(
            status_code=500,
            detail="Payment service not properly configured - missing M-Pesa shortcode"
        )
    
    return {
        "consumer_key": MPESA_CONSUMER_KEY,
        "consumer_secret": MPESA_CONSUMER_SECRET,
        "shortcode": MPESA_SHORTCODE,
        "initiator_name": MPESA_INITIATOR_NAME,
        "initiator_password": MPESA_INITIATOR_PASSWORD
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


def generate_security_credential() -> str:
    """Get security credential for B2C payments."""
    if MPESA_SECURITY_CREDENTIAL:
        return MPESA_SECURITY_CREDENTIAL
    
    raise HTTPException(status_code=500, detail="M-Pesa security credential not configured")


async def get_mpesa_token() -> str:
    """
    Get M-Pesa OAuth token with caching.
    """
    global _mpesa_token_cache
    
    # Check if we have a valid cached token
    current_time = time.time()
    if _mpesa_token_cache["token"] and _mpesa_token_cache["expires_at"] > current_time:
        logger.info("Using cached M-Pesa token")
        return _mpesa_token_cache["token"]
    
    try:
        creds = get_mpesa_credentials()
        url = f"{MPESA_BASE_URL}/oauth/v1/generate?grant_type=client_credentials"
        
        # Create auth string
        auth_string = f"{creds['consumer_key']}:{creds['consumer_secret']}"
        auth_bytes = auth_string.encode('ascii')
        auth_base64 = base64.b64encode(auth_bytes).decode('ascii')
        
        headers = {
            "Authorization": f"Basic {auth_base64}",
            "Content-Type": "application/json"
        }
        
        async with httpx.AsyncClient() as client:
            response = await client.get(url, headers=headers, timeout=30)
            
            logger.info(f"M-Pesa token request: {response.status_code}")
            
            if response.status_code == 200:
                result = response.json()
                token = result.get("access_token")
                expires_in = int(result.get("expires_in", 3600))  # Default 1 hour
                
                if not token:
                    logger.error(f"M-Pesa token response missing token field: {result}")
                    raise HTTPException(status_code=400, detail="Failed to get M-Pesa token: no token in response")
                
                # Cache the token
                _mpesa_token_cache["token"] = token
                _mpesa_token_cache["expires_at"] = current_time + min(expires_in - 60, CACHE_DURATION)
                
                logger.info(f"M-Pesa token obtained successfully, expires in {expires_in}s")
                return token
            else:
                logger.error(f"M-Pesa token error: {response.status_code} - {response.text}")
                raise HTTPException(status_code=400, detail="Failed to authenticate with M-Pesa")
                
    except httpx.RequestError as e:
        logger.error(f"M-Pesa network error: {str(e)}")
        raise HTTPException(status_code=502, detail="Payment gateway unreachable")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting M-Pesa token: {str(e)}")
        raise HTTPException(status_code=500, detail="Payment service error")


# --- 1. STK PUSH (Customer Payment / Deposit) ---
async def stk_push_request(
    phone: str, 
    amount: float, 
    reference: str,
    description: str = "Payment"
) -> Dict[str, Any]:
    """
    Initiate STK Push payment request.
    This prompts the customer to enter their M-Pesa PIN on their phone.
    """
    try:
        token = await get_mpesa_token()
        formatted_phone = format_phone_number(phone)
        
        # Generate unique transaction ID
        timestamp = time.strftime("%Y%m%d%H%M%S")
        transaction_id = f"{reference}_{timestamp}"
        
        url = f"{MPESA_BASE_URL}/mpesa/stkpush/v1/processrequest"
        
        # Create password (Base64 of Shortcode + Passkey + Timestamp)
        passkey = MPESA_PASSKEY  # Use configured passkey
        
        password_string = f"{MPESA_SHORTCODE}{passkey}{timestamp}"
        password = base64.b64encode(password_string.encode()).decode()
        
        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }
        
        callback_url = MPESA_STK_CALLBACK_URL or MPESA_CALLBACK_URL or f"{os.getenv('FRONTEND_URL', '')}/api/webhooks/mpesa/stk-callback"
        
        payload = {
            "BusinessShortCode": MPESA_SHORTCODE,
            "Password": password,
            "Timestamp": timestamp,
            "TransactionType": "CustomerBuyGoodsOnline",
            "Amount": int(amount),  # M-Pesa requires integer
            "PartyA": formatted_phone,
            "PartyB": MPESA_SHORTCODE,
            "PhoneNumber": formatted_phone,
            "CallBackURL": callback_url,
            "AccountReference": reference,
            "TransactionDesc": description[:50]
        }
        
        logger.info(f"M-Pesa STK Push request to {url}")
        logger.debug(f"M-Pesa STK Push payload: {json.dumps(payload)}")
        
        async with httpx.AsyncClient() as client:
            response = await client.post(url, json=payload, headers=headers, timeout=30)
            
            logger.info(f"M-Pesa STK Push response: {response.status_code}")
            
            if response.status_code == 200:
                result = response.json()
                
                response_code = result.get("ResponseCode")
                if response_code == "0":
                    checkout_request_id = result.get("CheckoutRequestID")
                    customer_message = result.get("CustomerMessage", "STK Push sent successfully")
                    
                    logger.info(f"M-Pesa STK Push initiated: {checkout_request_id}")
                    return {
                        "status": "success",
                        "message": customer_message,
                        "checkout_request_id": checkout_request_id,
                        "merchant_reference": reference,
                        "provider": "mpesa"
                    }
                else:
                    error_msg = result.get("ResponseDescription", "STK Push failed")
                    logger.error(f"M-Pesa STK Push error: {error_msg}")
                    raise HTTPException(status_code=400, detail=error_msg)
            else:
                error_text = response.text
                logger.error(f"M-Pesa API error: {response.status_code} - {error_text}")
                try:
                    error_data = response.json()
                    error_msg = error_data.get("errorMessage", error_data.get("ResponseDescription", "Payment service error"))
                except:
                    error_msg = f"Payment service error: {response.status_code}"
                raise HTTPException(status_code=response.status_code, detail=error_msg)
                
    except httpx.RequestError as e:
        logger.error(f"M-Pesa network error: {str(e)}")
        raise HTTPException(status_code=502, detail="Payment gateway unreachable")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error in M-Pesa STK Push: {str(e)}")
        raise HTTPException(status_code=500, detail="Payment processing failed")


# --- 2. CHECK STK PUSH STATUS ---
async def check_stk_push_status(checkout_request_id: str) -> Dict[str, Any]:
    """
    Check the status of an STK Push transaction.
    """
    try:
        token = await get_mpesa_token()
        
        url = f"{MPESA_BASE_URL}/mpesa/stkpushquery/v1/query"
        
        timestamp = time.strftime("%Y%m%d%H%M%S")
        passkey = "bfb279f9aa9b250cf98f1d8d614db3d1c13ed1c0e73e0c0c5e2d0e0c1e0d1c0e"
        if MPESA_ENVIRONMENT == "production":
            passkey = os.getenv("MPESA_PASSKEY", passkey)
        
        password_string = f"{MPESA_SHORTCODE}{passkey}{timestamp}"
        password = base64.b64encode(password_string.encode()).decode()
        
        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }
        
        payload = {
            "BusinessShortCode": MPESA_SHORTCODE,
            "Password": password,
            "Timestamp": timestamp,
            "CheckoutRequestID": checkout_request_id
        }
        
        async with httpx.AsyncClient() as client:
            response = await client.post(url, json=payload, headers=headers, timeout=30)
            
            if response.status_code == 200:
                result = response.json()
                
                response_code = result.get("ResponseCode")
                if response_code == "0":
                    # Transaction successful
                    return {
                        "status": "success",
                        "checkout_request_id": checkout_request_id,
                        "result_code": result.get("ResultCode"),
                        "result_desc": result.get("ResultDesc"),
                        "complete": True
                    }
                elif response_code == "1032":
                    # Transaction cancelled
                    return {
                        "status": "cancelled",
                        "checkout_request_id": checkout_request_id,
                        "result_code": result.get("ResultCode"),
                        "result_desc": result.get("ResultDesc", "Transaction cancelled by user")
                    }
                else:
                    return {
                        "status": "failed",
                        "checkout_request_id": checkout_request_id,
                        "result_code": result.get("ResultCode"),
                        "result_desc": result.get("ResultDesc")
                    }
            else:
                logger.error(f"STK status check failed: {response.text}")
                return {"status": "error", "error": "Could not fetch status"}
                
    except Exception as e:
        logger.error(f"Error checking M-Pesa STK status: {str(e)}")
        return {"status": "error", "detail": str(e)}


# --- 3. B2C PAYMENT (Business to Customer / Withdrawals) ---
async def b2c_payment(
    phone: str, 
    amount: float, 
    reference: str,
    description: str = "Withdrawal"
) -> Dict[str, Any]:
    """
    Send funds from business to customer (withdrawals/payouts).
    Uses M-Pesa B2C API.
    """
    try:
        token = await get_mpesa_token()
        formatted_phone = format_phone_number(phone)
        
        # Unique payout reference
        payout_ref = f"WTH_{reference}_{int(time.time())}"
        
        url = f"{MPESA_BASE_URL}/mpesa/b2c/v1/paymentrequest"
        
        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }
        
        callback_url = MPESA_B2C_CALLBACK_URL or MPESA_CALLBACK_URL or f"{os.getenv('FRONTEND_URL', '')}/api/webhooks/mpesa/b2c-callback"
        
        # Generate security credential
        security_credential = generate_security_credential()
        
        payload = {
            "InitiatorName": MPESA_INITIATOR_NAME,
            "SecurityCredential": security_credential,
            "CommandID": "BusinessPayment",  # SalaryPayment, BusinessPayment, PromotionPayment
            "Amount": int(amount),
            "PartyA": MPESA_SHORTCODE,
            "PartyB": formatted_phone,
            "Remarks": description[:100],
            "QueueTimeOutURL": callback_url,
            "ResultURL": callback_url,
            "Occasion": payout_ref
        }
        
        logger.info(f"M-Pesa B2C request to {url}")
        logger.debug(f"M-Pesa B2C payload: {json.dumps(payload)}")
        
        async with httpx.AsyncClient() as client:
            response = await client.post(url, json=payload, headers=headers, timeout=30)
            
            logger.info(f"M-Pesa B2C response: {response.status_code}")
            
            if response.status_code == 200:
                result = response.json()
                
                response_code = result.get("ResponseCode")
                if response_code == "0":
                    conversation_id = result.get("ConversationID")
                    origin_conversation_id = result.get("OriginatorConversationID")
                    
                    logger.info(f"M-Pesa B2C initiated: {conversation_id}")
                    return {
                        "status": "success",
                        "message": "Withdrawal initiated successfully",
                        "conversation_id": conversation_id,
                        "origin_conversation_id": origin_conversation_id,
                        "reference": payout_ref,
                        "amount": amount,
                        "phone": formatted_phone,
                        "provider": "mpesa"
                    }
                else:
                    error_msg = result.get("ResponseDescription", "B2C payment failed")
                    logger.error(f"M-Pesa B2C error: {error_msg}")
                    raise HTTPException(status_code=400, detail=error_msg)
            else:
                error_text = response.text
                logger.error(f"M-Pesa B2C API error: {response.status_code} - {error_text}")
                try:
                    error_data = response.json()
                    error_msg = error_data.get("ResponseDescription", error_data.get("errorMessage", "Payout failed"))
                except:
                    error_msg = f"Payout service error: {response.status_code}"
                raise HTTPException(status_code=response.status_code, detail=error_msg)
                
    except httpx.RequestError as e:
        logger.error(f"M-Pesa B2C network error: {str(e)}")
        raise HTTPException(status_code=502, detail="Payout gateway unreachable")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error in M-Pesa B2C: {str(e)}")
        raise HTTPException(status_code=500, detail="Payout processing failed")


# --- 4. CHECK B2C TRANSACTION STATUS ---
async def check_b2c_status(conversation_id: str) -> Dict[str, Any]:
    """
    Check the status of a B2C transaction.
    """
    try:
        token = await get_mpesa_token()
        
        url = f"{MPESA_BASE_URL}/mpesa/b2c/v1/paymentstatusquery"
        
        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }
        
        # Generate security credential
        security_credential = generate_security_credential()
        
        payload = {
            "InitiatorName": MPESA_INITIATOR_NAME,
            "SecurityCredential": security_credential,
            "CommandID": "TransactionStatusQuery",
            "TransactionID": conversation_id,
            "PartyA": MPESA_SHORTCODE,
            "IdentifierType": "4",  # Shortcode
            "ResultURL": MPESA_CALLBACK_URL,
            "QueueTimeOutURL": MPESA_CALLBACK_URL,
            "Remarks": "Status check"
        }
        
        async with httpx.AsyncClient() as client:
            response = await client.post(url, json=payload, headers=headers, timeout=30)
            
            if response.status_code == 200:
                result = response.json()
                return {
                    "status": result.get("ResponseCode") == "0" and "success" or "failed",
                    "conversation_id": conversation_id,
                    "result": result
                }
            else:
                logger.error(f"B2C status check failed: {response.text}")
                return {"status": "error", "error": "Could not fetch status"}
                
    except Exception as e:
        logger.error(f"Error checking M-Pesa B2C status: {str(e)}")
        return {"status": "error", "detail": str(e)}


# --- 5. PARSE STK CALLBACK ---
def parse_stk_callback(payload: Dict[str, Any]) -> Dict[str, Any]:
    """
    Parse STK Push callback from Safaricom.
    """
    try:
        stk_callback = payload.get("Body", {}).get("stkCallback", {})
        
        checkout_request_id = stk_callback.get("CheckoutRequestID")
        result_code = stk_callback.get("ResultCode")
        result_desc = stk_callback.get("ResultDesc")
        
        # Parse metadata if available
        callback_metadata = stk_callback.get("CallbackMetadata", {})
        items = callback_metadata.get("Item", []) if callback_metadata else []
        
        # Extract transaction details
        amount = None
        mpesa_receipt_number = None
        transaction_date = None
        phone_number = None
        
        for item in items:
            name = item.get("Name")
            value = item.get("Value")
            
            if name == "Amount":
                amount = value
            elif name == "MpesaReceiptNumber":
                mpesa_receipt_number = value
            elif name == "TransactionDate":
                transaction_date = value
            elif name == "PhoneNumber":
                phone_number = value
        
        return {
            "checkout_request_id": checkout_request_id,
            "result_code": result_code,
            "result_desc": result_desc,
            "amount": amount,
            "receipt_number": mpesa_receipt_number,
            "transaction_date": transaction_date,
            "phone_number": phone_number,
            "success": result_code == 0
        }
        
    except Exception as e:
        logger.error(f"Error parsing STK callback: {str(e)}")
        return {
            "success": False,
            "error": str(e)
        }


# --- 6. PARSE B2C CALLBACK ---
def parse_b2c_callback(payload: Dict[str, Any]) -> Dict[str, Any]:
    """
    Parse B2C callback from Safaricom.
    """
    try:
        result = payload.get("Result", {})
        
        result_type = result.get("ResultType")
        result_code = result.get("ResultCode")
        result_desc = result.get("ResultDesc")
        
        # Get transaction details
        transaction = result.get("Transaction", {})
        
        transaction_id = transaction.get("TransactionID")
        amount = transaction.get("TransactionAmount")
        receiver = transaction.get("ReceiverParty")
        sender = transaction.get("SenderParty")
        transaction_time = transaction.get("TransactionTime")
        
        return {
            "result_type": result_type,
            "result_code": result_code,
            "result_desc": result_desc,
            "transaction_id": transaction_id,
            "amount": amount,
            "receiver": receiver,
            "sender": sender,
            "transaction_time": transaction_time,
            "success": result_code == 0
        }
        
    except Exception as e:
        logger.error(f"Error parsing B2C callback: {str(e)}")
        return {
            "success": False,
            "error": str(e)
        }
