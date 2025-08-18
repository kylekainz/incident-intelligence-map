# app/models/incident.py

from sqlalchemy import Column, Integer, String, DateTime
from geoalchemy2 import Geometry
from app.db import Base
from datetime import datetime

class Incident(Base):
    __tablename__ = "incidents"

    id = Column(Integer, primary_key=True, index=True)
    category = Column(String, nullable=False)
    description = Column(String)
    priority = Column(String, nullable=False)
    status = Column(String, nullable=False, default="Open")  # Open, In Progress, Resolved
    location = Column(Geometry(geometry_type="POINT", srid=4326), nullable=False)
    address = Column(String)  # Human-readable address
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class UserLocation(Base):
    __tablename__ = "user_locations"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, nullable=False, index=True)  # Could be session ID or user identifier
    location = Column(Geometry(geometry_type="POINT", srid=4326), nullable=False)
    notification_radius = Column(Integer, default=5000)  # Radius in meters for notifications
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

