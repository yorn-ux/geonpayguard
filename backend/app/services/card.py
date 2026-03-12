import os
import json
import base64
import hashlib
import httpx
import re
from datetime import datetime
from typing import Dict, Any, Optional
from Crypto.Cipher import DES3
from fastapi import HTTPException, status

# --- 1. CARD VALIDATION UTILITIES ---

def validate_luhn(card_number: str) -> bool:
    """
    Verifies a card number using the Luhn algorithm (Mod 10).
    """
    card_number = card_number.replace(" ", "").replace("-", "")
    if not card_number.isdigit():
        return False

    digits = [int(d) for d in card_number]
    for i in range(len(digits) - 2, -1, -2):
        digits[i] *= 2
        if digits[i] > 9:
            digits[i] -= 9
            
    return sum(digits) % 10 == 0

def validate_expiry(expiry: str) -> bool:
    """
    Validates that the expiry date is in MM/YY format and is not in the past.
    """
    if not re.match(r"^(0[1-9]|1[0-2])\/?([0-9]{2})$", expiry):
        return False
    
    month, year = map(int, expiry.split('/'))
    # Convert YY to YYYY (assumes 20xx)
    year += 2000
    
    now = datetime.now()
    expiry_date = datetime(year, month, 1)
    
    # Check if the last day of the expiry month has passed
    if year < now.year or (year == now.year and month < now.month):
        return False
        
    return True

def mask_card(card_number: str) -> str:
    """
    Returns a masked version of the card (e.g., 411111******1111)
    """
    clean_num = card_number.replace(" ", "").replace("-", "")
    if len(clean_num) < 10:
        return "****"
    return f"{clean_num[:6]}******{clean_num[-4:]}"

def detect_card_type(card_number: str) -> str:
    """
    Identifies the card issuer based on the IIN (Issuer Identification Number).
    """
    num = card_number.replace(" ", "")
    patterns = {
        "Visa": r"^4",
        "Mastercard": r"^5[1-5]",
        "Amex": r"^3[47]",
        "Discover": r"^6(?:011|5)",
        "JCB": r"^(?:2131|1800|35)",
    }
    for brand, pattern in patterns.items():
        if re.match(pattern, num):
            return brand
    return "Unknown"

# --- 2. KEY DERIVATION (Flutterwave Specific) ---

def get_flw_encryption_key() -> Optional[str]:
    secret_key = os.getenv("FLW_SECRET_KEY")
    if not secret_key:
        return None

    hashed_seckey = hashlib.md5(secret_key.encode("utf-8")).hexdigest()
    hashed_seckey_last_12 = hashed_seckey[-12:]
    seckey_adjusted = secret_key.replace('FLWSECK-', '').replace('FLWSECK_TEST-', '')
    seckey_adjusted_first_12 = seckey_adjusted[:12]
    
    return seckey_adjusted_first_12 + hashed_seckey_last_12

# --- 3. ENCRYPTION ENGINE ---

def encrypt_payload(encryption_key: str, payload: Dict[str, Any]) -> str:
    try:
        text = json.dumps(payload)
        block_size = 8
        # Triple DES PKCS#7 padding
        pad_len = block_size - (len(text) % block_size)
        padded_text = text + (chr(pad_len) * pad_len)
        
        cipher = DES3.new(encryption_key.encode("utf-8"), DES3.MODE_ECB)
        encrypted_bytes = cipher.encrypt(padded_text.encode("utf-8"))
        
        return base64.b64encode(encrypted_bytes).decode("utf-8")
    except Exception as e:
        raise ValueError(f"Encryption failed: {str(e)}")

# --- 4. CORE GATEWAY LOGIC ---

async def initiate_gateway_charge(
    amount: float, 
    card_data: Any, 
    tx_ref: str, 
    email: str,
    currency: str = "KES"
) -> Dict[str, Any]:
    secret_key = os.getenv("FLW_SECRET_KEY")
    encryption_key = get_flw_encryption_key()

    if not secret_key or not encryption_key:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
            detail="Gateway configuration missing"
        )

    # Allow for Pydantic objects or raw dicts
    if hasattr(card_data, "model_dump"):
        c = card_data.model_dump()
    elif hasattr(card_data, "dict"):
        c = card_data.dict()
    else:
        c = card_data

    card_num = str(c.get('number', '')).replace(" ", "")
    month, year = c.get('expiry', '00/00').split('/')

    raw_payload = {
        "card_number": card_num,
        "cvv": str(c.get('cvc', '') or c.get('cvv', '')),
        "expiry_month": month.strip(),
        "expiry_year": year.strip(),
        "currency": currency,
        "amount": amount,
        "tx_ref": tx_ref,
        "email": email,
    }

    try:
        encrypted_string = encrypt_payload(encryption_key, raw_payload)
    except ValueError:
        raise HTTPException(status_code=500, detail="Secure encryption failed")

    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            response = await client.post(
                "https://api.flutterwave.com/v3/charges?type=card",
                json={"client": encrypted_string},
                headers={
                    "Authorization": f"Bearer {secret_key}",
                    "Content-Type": "application/json"
                }
            )
            res_data = response.json()
            
            if response.status_code == 200 and res_data.get("status") == "success":
                data = res_data.get("data", {})
                # Check for 3DS redirect
                auth_url = res_data.get("meta", {}).get("authorization", {}).get("redirect")

                return {
                    "status": "requires_action" if auth_url else "success",
                    "redirect_url": auth_url,
                    "flw_ref": data.get("flw_ref"),
                    "message": res_data.get("message")
                }
            
            return {
                "status": "error", 
                "message": res_data.get("message", "Transaction declined")
            }

        except httpx.RequestError as e:
            raise HTTPException(status_code=502, detail=f"Gateway timeout: {str(e)}")