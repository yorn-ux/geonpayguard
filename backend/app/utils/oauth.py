import logging
import jwt # type: ignore
import httpx # Ensure httpx is installed
from typing import Optional, Dict, Any
from datetime import datetime, timedelta, timezone
from fastapi import HTTPException
from sqlalchemy.orm import Session
from authlib.integrations.starlette_client import OAuth # type: ignore
# Correct
from starlette.config import Config

from app.config import settings
from app.models.user import User
from app.utils.security import generate_recovery_phrase, generate_operator_id

logger = logging.getLogger(__name__)

# --- OAuth Setup ---
config_data = {
    'GOOGLE_CLIENT_ID': settings.GOOGLE_CLIENT_ID,
    'GOOGLE_CLIENT_SECRET': settings.GOOGLE_CLIENT_SECRET,
    'GITHUB_CLIENT_ID': settings.GITHUB_CLIENT_ID,
    'GITHUB_CLIENT_SECRET': settings.GITHUB_CLIENT_SECRET,
}
config = Config(environ=config_data)
oauth = OAuth(config)

oauth.register(
    name='google',
    server_metadata_url='https://accounts.google.com/.well-known/openid-configuration',
    client_kwargs={'scope': 'openid email profile'},
)

oauth.register(
    name='github',
    authorize_url='https://github.com/login/oauth/authorize',
    access_token_url='https://github.com/login/oauth/access_token',
    client_kwargs={'scope': 'user:email'},
)

# --- JWT Core ---
def create_jwt_token(data: dict) -> str:
    """Create JWT token with UTC-aware timestamps"""
    to_encode = data.copy()
    # Use timezone-aware UTC for modern Python standards
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)
    return encoded_jwt

def verify_jwt_token(token: str) -> Optional[dict]:
    """Verify JWT token and return payload"""
    try:
        payload = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        logger.error("Token expired")
        return None
    except jwt.InvalidTokenError as e:
        logger.error(f"Invalid token: {str(e)}")
        return None

# --- OAuth Logic ---
async def handle_oauth_user(
    db: Session,
    email: str,
    name: str,
    provider: str,
    provider_id: str
) -> Dict[str, Any]:
    """
    Handles OAuth logic and ensures the is_admin flag is carried into the token.
    """
    try:
        normalized_email = email.strip().lower()
        user = db.query(User).filter(User.email == normalized_email).first()
        
        now = datetime.now(timezone.utc)
        
        if user:
            # Update existing user info
            user.last_login_at = now
            user.oauth_provider = provider
            user.oauth_id = str(provider_id)
            db.commit()
            db.refresh(user)
            logger.info(f"OAuth Login: {user.email}")
        else:
            # Create new user via OAuth
            operator_id = generate_operator_id()
            recovery_phrase = generate_recovery_phrase()
            
            user = User(
                operator_id=operator_id,
                email=normalized_email,
                full_name=name,
                hashed_password=f"oauth_{provider}", 
                recovery_phrase=recovery_phrase,
                is_active=True,
                is_admin=False, # Default to False for security
                email_verified=True,
                email_verified_at=now,
                oauth_provider=provider,
                oauth_id=str(provider_id),
                created_at=now,
                last_login_at=now
            )
            
            db.add(user)
            db.commit()
            db.refresh(user)
            logger.info(f"OAuth Registration: {user.email}")
        
        # KEY: Ensure 'is_admin' is in the token data so our dependencies work
        token_data = {
            "sub": user.operator_id,
            "email": user.email,
            "is_admin": getattr(user, 'is_admin', False),
            "oauth": True
        }
        
        access_token = create_jwt_token(token_data)
        
        return {
            "success": True,
            "access_token": access_token,
            "token_type": "bearer",
            "user": {
                "operator_id": user.operator_id,
                "email": user.email,
                "full_name": user.full_name,
                "is_admin": user.is_admin,
                "oauth_provider": user.oauth_provider
            }
        }
        
    except Exception as e:
        logger.error(f"OAuth User Handling Failure: {e}")
        db.rollback()
        raise HTTPException(status_code=500, detail="Identity Protocol Failure")

# --- Helper functions for info retrieval ---
async def get_google_user_info(access_token: str) -> Dict[str, Any]:
    async with httpx.AsyncClient() as client:
        response = await client.get(
            "https://www.googleapis.com/oauth2/v2/userinfo",
            headers={"Authorization": f"Bearer {access_token}"}
        )
        if response.status_code != 200:
            raise HTTPException(status_code=400, detail="Google authentication failed")
        return response.json()

async def get_github_user_info(access_token: str) -> Dict[str, Any]:
    async with httpx.AsyncClient() as client:
        headers = {"Authorization": f"Bearer {access_token}", "Accept": "application/vnd.github.v3+json"}
        
        # Profile
        res = await client.get("https://api.github.com/user", headers=headers)
        if res.status_code != 200:
            raise HTTPException(status_code=400, detail="GitHub authentication failed")
        profile = res.json()
        
        # Emails
        res_email = await client.get("https://api.github.com/user/emails", headers=headers)
        emails = res_email.json() if res_email.status_code == 200 else []
        
        primary_email = next((e['email'] for e in emails if e.get('primary')), profile.get('email'))
        
        return {
            "id": profile.get("id"),
            "email": primary_email,
            "name": profile.get("name") or profile.get("login")
        }