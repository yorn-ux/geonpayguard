from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import datetime

# --- USER DATA MODELS ---

class UserBase(BaseModel):
    email: EmailStr
    full_name: str
    role: str
    operator_id: str
    is_verified: bool = False
    enrolled_by: Optional[str] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True

# --- REQUEST SCHEMAS ---

class RegisterRequest(BaseModel):
    full_name: str = Field(..., min_length=2, example="Vincent Nyawanda")
    email: EmailStr = Field(..., example="operator@geon.com")
    password: str = Field(..., min_length=8)
    role: str = Field(..., example="operator")

class InviteRequest(BaseModel):
    """Specific schema for the Admin/Business 'Add Operator' flow."""
    full_name: str
    email: EmailStr
    role: str = "operator"

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

# --- RESPONSE SCHEMAS ---

class RegisterResponse(BaseModel):
    success: bool
    operator_id: str
    recovery_phrase: Optional[str] = None 
    # FIX: Added Optional and default None so validation doesn't fail if missing
    detail: Optional[str] = None 

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserBase 

class VerificationVerify(BaseModel):
    email: EmailStr
    code: str = Field(..., min_length=6, max_length=6)