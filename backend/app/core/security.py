import secrets
import os
from datetime import datetime, timedelta, timezone
from typing import Optional, Union, Any, Dict
from jose import jwt, JWTError
from passlib.context import CryptContext

# --- CONFIGURATION ---
SECRET_KEY = os.getenv("SECRET_KEY", "AETHEL_ENCLAVE_SYSTEM_SECRET_KEY_2026") 
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 1 Day session (fallback)
SECURITY_TOKEN_EXPIRE_HOURS = 2        # Lockout links expire in 2 hours

pwd_context = CryptContext(
    schemes=["pbkdf2_sha256"], 
    deprecated="auto",
    pbkdf2_sha256__rounds=300000 
)

# --- PASSWORD LOGIC ---
def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

# --- JWT TOKEN LOGIC ---
def create_access_token(
    subject: Union[str, Any], 
    expires_delta: Optional[timedelta] = None
) -> str:
    """
    Create a JWT access token.
    
    Args:
        subject: The user identifier (usually email)
        expires_delta: Optional custom expiration time. If not provided,
                      uses ACCESS_TOKEN_EXPIRE_MINUTES from config.
    
    Returns:
        Encoded JWT token string
    """
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode = {
        "exp": expire, 
        "sub": str(subject), 
        "iat": datetime.now(timezone.utc), 
        "type": "access"
    }
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def create_security_token(email: str) -> str:
    """Generates a short-lived token specifically for locking accounts."""
    expire = datetime.now(timezone.utc) + timedelta(hours=SECURITY_TOKEN_EXPIRE_HOURS)
    to_encode = {"exp": expire, "sub": email, "type": "security_lock"}
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def decode_access_token(token: str) -> Optional[Dict[str, Any]]:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        return None

# --- SECURITY ALERT FUNCTION ---
async def send_security_alert(
    to_email: str, 
    ip_address: str, 
    user_agent: str
) -> bool:
    """
    Background task to notify user of a login and provide a lock link.
    The URL is now dynamically pulled from environment variables.
    """
    try:
        # 1. Create the special security token
        token = create_security_token(to_email)
        
        # 2. Get the Base URL from .env (fallback to localhost for safety)
        base_url = os.getenv("BACKEND_URL", "http://localhost:8000").rstrip("/")
        
        # 3. Construct the link using the dynamic base
        lock_link = f"{base_url}/auth/lock-account/{token}"
        
        # 4. Print to console for development visibility
        print("\n" + "!"*60)
        print(f"🚨 SECURITY ALERT: New Login for {to_email}")
        print(f"🌐 Location: {ip_address}")
        print(f"📱 Device: {user_agent}")
        print(f"🔒 LOCK LINK: {lock_link}")
        print("!"*60 + "\n")
        
        # 5. TODO: Add email sending logic here using your Resend service
        # from app.services.email import send_security_alert_email
        # await send_security_alert_email(to_email, ip_address, user_agent, lock_link)
        
        return True
    except Exception as e:
        print(f"Error sending security alert: {e}")
        return False

# --- AETHEL IDENTITY GENERATION ---
def generate_recovery_phrase() -> str:
    WORD_POOL = [
        "enclave", "shield", "vault", "matrix", "secure", "proxy", "guard", "protocol",
        "cipher", "vertex", "beacon", "kernel", "atomic", "binary", "static", "nexus",
        "tunnel", "quartz", "shadow", "legacy", "vector", "orbit", "plasma", "carbon",
        "stable", "active", "hybrid", "purity", "wisdom", "silent", "frozen", "planet",
        "alpha", "bravo", "delta", "echo", "foxtrot", "gamma", "hazard", "iron",
        "jupiter", "knight", "lambda", "mercury", "neon", "omega", "phantom", "quantum",
        "radar", "sigma", "titan", "ultra", "vortex", "winter", "xray", "yield",
        "zenith", "aspect", "bronze", "cannon", "divide", "entropy", "fossil", "gravity",
        "hollow", "index", "jungle", "kilo", "linear", "metric", "neutral", "ocean",
        "pulse", "river", "solar", "target", "unit", "valve", "whale",
        "axis", "bonus", "cloud", "direct", "eagle", "flow", "gear", "hope",
        "input", "joint", "key", "logic", "metal", "node", "open", "pixel",
        "relay", "sensor", "trace", "update", "voice", "wire", "zone", "anchor",
        "blast", "core", "drift", "entry", "flash", "grid", "humor", "image",
        "jump", "kind", "layer", "mesh", "net", "object", "path", "rigid",
        "shift", "task", "under", "view", "wave", "zero", "alert", "backup"
    ]
    return " ".join(secrets.choice(WORD_POOL) for _ in range(12))

def generate_operator_id() -> str:
    date_part = datetime.now(timezone.utc).strftime('%Y%m%d')
    alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
    random_part = ''.join(secrets.choice(alphabet) for _ in range(6))
    return f"OP-{date_part}-{random_part}"
