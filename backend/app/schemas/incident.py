# app/schemas/incident.py

from pydantic import BaseModel, Field
from typing import Optional, Literal, Annotated
from datetime import datetime

CategoryType = Literal[
    "Pothole", "Wildlife", "Street Light Out", "Debris/Trash",
    "Traffic Jam", "Car Accident", "Broken Down Car", "Lane Closure", "Police"
]

PriorityType = Literal["Low", "Medium", "High"]
StatusType = Literal["Open", "In Progress", "Resolved"]

class IncidentCreate(BaseModel):
    category: CategoryType
    priority: PriorityType
    description: Optional[str] = Field("", max_length=500)
    latitude: Annotated[float, Field(ge=-90, le=90)]
    longitude: Annotated[float, Field(ge=-180, le=180)]

class IncidentUpdate(BaseModel):
    status: StatusType
    description: Optional[str] = Field(None, max_length=500)

class IncidentResponse(BaseModel):
    id: int
    category: CategoryType
    priority: PriorityType
    status: StatusType
    description: Optional[str]
    latitude: float
    longitude: float
    address: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }

class UserLocationCreate(BaseModel):
    latitude: Annotated[float, Field(ge=-90, le=90)]
    longitude: Annotated[float, Field(ge=-180, le=180)]
    notification_radius: Optional[int] = Field(5000, ge=100, le=50000)  # 100m to 50km

class UserLocationResponse(BaseModel):
    id: int
    user_id: str
    latitude: float
    longitude: float
    notification_radius: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }

