# app/models/relay.py
from sqlalchemy import Column, ForeignKey, String, Integer, Boolean, DateTime, Float
from sqlalchemy.sql import func
from app.database import Base
import uuid

class RelayNode(Base):
    __tablename__ = "relay_nodes"
    __table_args__ = {'extend_existing': True}

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String, nullable=False)
    region = Column(String, nullable=False)
    active = Column(Boolean, default=True)
    max_connections = Column(Integer, default=1000)
    version = Column(String, nullable=True)
    last_ping = Column(DateTime(timezone=True), nullable=True)
    uptime_seconds = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class Connection(Base):
    __tablename__ = "connections"
    __table_args__ = {'extend_existing': True}

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    relay_id = Column(String, ForeignKey("relay_nodes.id"), nullable=False)
    user_id = Column(String, nullable=True)
    active = Column(Boolean, default=True)
    connected_at = Column(DateTime(timezone=True), server_default=func.now())
    disconnected_at = Column(DateTime(timezone=True), nullable=True)