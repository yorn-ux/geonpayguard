# app/routes/__init__.py
from .auth import router as auth_router
from .wallet import router as wallet_router
from .vaults import router as vaults_router
from .business import router as business_router
from .settings import router as settings_router
from .dispute import router as dispute_router
from .webhooks import router as webhooks_router
from .notifications import router as notifications_router
from .admin import router as admin_router  # Add this line

__all__ = [
    'auth_router',
    'wallet_router', 
    'vaults_router',
    'business_router',
    'settings_router',
    'dispute_router',
    'webhooks_router',
    'notifications_router',
    'admin_router'  # Add this
]