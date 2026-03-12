import uuid
from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, Boolean, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base

class ApiKey(Base):
    __tablename__ = "api_keys"
    __table_args__ = {'extend_existing': True}

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(100), nullable=False)
    prefix = Column(String(20), nullable=False)
    key_hash = Column(String(64), nullable=False, unique=True, index=True)
    
    # Permissions - what this key can do
    permissions = Column(JSON, default=[])
    
    # Linked via your universal string identifier
    owner_id = Column(String, ForeignKey("users.operator_id"), nullable=False)
    business_id = Column(String, ForeignKey("business_metadata.owner_id"), nullable=True)
    
    usage_count = Column(Integer, default=0)
    last_used = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    revoked_at = Column(DateTime(timezone=True), nullable=True)
    
    # Metadata
    description = Column(String(255), nullable=True)
    environment = Column(String(20), default="production")  # production, development, test
    
    # --- 🖇️ RELATIONSHIPS ---
    
    # Relationship to User via operator_id
    owner = relationship(
        "User", 
        back_populates="api_keys",
        primaryjoin="ApiKey.owner_id == User.operator_id",
        foreign_keys=[owner_id]
    )
    
    # Relationship to BusinessMetadata (if this is a business API key)
    business = relationship(
        "BusinessMetadata",
        back_populates="api_keys",
        primaryjoin="ApiKey.business_id == BusinessMetadata.owner_id",
        foreign_keys=[business_id]
    )