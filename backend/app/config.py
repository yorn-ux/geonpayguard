# app/config.py - UPDATED FOR NEON POSTGRESQL + RESEND + OAUTH + JWT
from pydantic_settings import BaseSettings
from typing import Optional, Any, List
from pydantic import field_validator, SecretStr, ConfigDict
import os
from urllib.parse import urlparse


class Settings(BaseSettings):
    # ========== ENVIRONMENT ==========
    ENVIRONMENT: str = "development"
    DEBUG: bool = False
    
    # ========== DATABASE ==========
    DATABASE_URL: str = "sqlite:///./geon.db"
    
    # ========== EMAIL SERVICE (RESEND ONLY) ==========
    # Resend.com configuration
    RESEND_API_KEY: Optional[SecretStr] = None
    RESEND_FROM_EMAIL: str = "onboarding@resend.dev"
    RESEND_FROM_NAME: str = "Geon PayGuard"
    
    # ========== GOOGLE OAUTH ==========
    GOOGLE_CLIENT_ID: Optional[str] = None
    GOOGLE_CLIENT_SECRET: Optional[SecretStr] = None
    GOOGLE_REDIRECT_URI: str = "http://localhost:8000/api/auth/google/callback"
    
    # ========== GITHUB OAUTH ==========
    GITHUB_CLIENT_ID: Optional[str] = None
    GITHUB_CLIENT_SECRET: Optional[SecretStr] = None
    GITHUB_REDIRECT_URI: str = "http://localhost:8000/api/auth/github/callback"
    
    # ========== JWT CONFIG ==========
    JWT_SECRET_KEY: str = "your-jwt-secret-key-change-in-production"
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440  # 24 hours
    
    # ========== APP CONFIGURATION ==========
    APP_NAME: str = "Geon PayGuard"
    APP_URL: str = "https://geonpayguard.vercel.app"
    SUPPORT_EMAIL: str = "support@geon.io"
    VERSION: str = "1.5.0"
    
    # ========== VERIFICATION ==========
    VERIFICATION_CODE_EXPIRE_MINUTES: int = 15
    MAX_VERIFICATION_ATTEMPTS: int = 3
    RESEND_COOLDOWN_MINUTES: int = 1
    
    # ========== CORS ==========
    CORS_ALLOWED_ORIGINS: Any = "http://localhost:3000,https://geonpayguard.vercel.app"
    
    @field_validator('CORS_ALLOWED_ORIGINS', mode='after')
    @classmethod
    def parse_cors_origins(cls, v):
        """Parse CORS origins from string or list to string"""
        if isinstance(v, list):
            return ",".join(v)
        elif isinstance(v, str):
            return v
        return str(v) if v else ""
    
    # ========== SECURITY ==========
    SECRET_KEY: str = "your-secret-key-change-in-production"
    ADMIN_SECRET: str = "geon-admin-secret-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440
    
    # ========== API ==========
    ENABLE_DOCS: bool = True
    PORT: int = 8000
    HOST: str = "0.0.0.0"

    # ========== HELPER PROPERTIES ==========
    @property
    def is_postgresql(self) -> bool:
        """Check if using PostgreSQL (Neon)"""
        return "postgresql" in self.DATABASE_URL or "postgres" in self.DATABASE_URL
    
    @property
    def database_type(self) -> str:
        """Get database type"""
        if self.is_postgresql:
            return "postgresql"
        return "sqlite"
    
    @property
    def active_email_provider(self) -> str:
        """Get active email provider"""
        if self.RESEND_API_KEY:
            return "resend"
        return "none"
    
    @property
    def is_email_enabled(self) -> bool:
        """Check if email service is enabled"""
        return bool(self.RESEND_API_KEY)
    
    @property
    def from_email(self) -> str:
        """Get from email (Resend)"""
        return self.RESEND_FROM_EMAIL
    
    @property
    def from_name(self) -> str:
        """Get from name (Resend)"""
        return self.RESEND_FROM_NAME
    
    @property
    def is_google_oauth_enabled(self) -> bool:
        return bool(self.GOOGLE_CLIENT_ID and self.GOOGLE_CLIENT_SECRET)
    
    @property
    def is_github_oauth_enabled(self) -> bool:
        return bool(self.GITHUB_CLIENT_ID and self.GITHUB_CLIENT_SECRET)
    
    @property
    def is_production(self) -> bool:
        return self.ENVIRONMENT.lower() == "production"
    
    @property
    def cors_origins_list(self) -> List[str]:
        if isinstance(self.CORS_ALLOWED_ORIGINS, list):
            return self.CORS_ALLOWED_ORIGINS
        elif isinstance(self.CORS_ALLOWED_ORIGINS, str):
            return [origin.strip() for origin in self.CORS_ALLOWED_ORIGINS.split(",") if origin.strip()]
        return []
    
    @property
    def email_info(self) -> dict:
        """Get email service information"""
        return {
            "provider": self.active_email_provider,
            "enabled": self.is_email_enabled,
            "from_email": self.from_email,
            "from_name": self.from_name,
            "resend_configured": bool(self.RESEND_API_KEY)
        }
    
    model_config = ConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore"
    )

settings = Settings()

# Clean up DATABASE_URL - ensure proper protocol
if settings.DATABASE_URL.startswith("postgres://"):
    settings.DATABASE_URL = settings.DATABASE_URL.replace("postgres://", "postgresql://", 1)

# Summary for console output
if __name__ == "__main__":
    print(f"✅ Configuration Summary:")
    print(f"   Environment: {settings.ENVIRONMENT}")
    print(f"   Database: {settings.database_type.upper()}")
    print(f"   Email: {'RESEND ✅' if settings.is_email_enabled else '❌ DISABLED'}")