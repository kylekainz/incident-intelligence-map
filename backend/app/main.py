# main.py (in your root directory)
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from app import models
from app.db import engine
from fastapi.middleware.cors import CORSMiddleware
from app.routes import incident
from app.routes import auth
from app.models import incident as incident_model
from app.websocket_manager import manager
import json
import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Create all tables in the database   
# Initialize FastAPI app
app = FastAPI()

import os

# Allow frontend (React) to call backend without CORS errors
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("ALLOWED_ORIGINS", "*").split(","),  # Comma-separated list of allowed origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Database tables are already created in Supabase
print("📊 Using existing Supabase database tables")

app.include_router(incident.router)
app.include_router(auth.router, prefix="/auth", tags=["authentication"])

# WebSocket endpoint
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    user_id = None
    
    try:
        while True:
            # Keep connection alive by waiting for messages
            data = await websocket.receive_text()
            try:
                message = json.loads(data)
                
                if message.get("type") == "ping":
                    # Respond to ping with pong
                    await websocket.send_text(json.dumps({"type": "pong"}))
                
                elif message.get("type") == "update_location":
                    # Handle user location updates
                    location_data = message.get("data", {})
                    user_id = location_data.get("user_id")
                    latitude = location_data.get("latitude")
                    longitude = location_data.get("longitude")
                    notification_radius = location_data.get("notification_radius", 5000)
                    
                    if user_id and latitude and longitude:
                        await manager.update_user_location(
                            user_id=user_id,
                            latitude=latitude,
                            longitude=longitude,
                            notification_radius=notification_radius,
                            websocket=websocket
                        )
                        # Confirm location update
                        await websocket.send_text(json.dumps({
                            "type": "location_updated",
                            "data": {"user_id": user_id}
                        }))
                
                elif message.get("type") == "register_user":
                    # Register a new user for notifications
                    user_data = message.get("data", {})
                    user_id = user_data.get("user_id")
                    latitude = user_data.get("latitude")
                    longitude = user_data.get("longitude")
                    notification_radius = user_data.get("notification_radius", 5000)
                    
                    if user_id and latitude and longitude:
                        await manager.update_user_location(
                            user_id=user_id,
                            latitude=latitude,
                            longitude=longitude,
                            notification_radius=notification_radius,
                            websocket=websocket
                        )
                        # Confirm registration
                        await websocket.send_text(json.dumps({
                            "type": "user_registered",
                            "data": {"user_id": user_id}
                        }))
                        
            except json.JSONDecodeError:
                # If it's not JSON, just ignore it
                pass
    except WebSocketDisconnect:
        print("WebSocket disconnected normally")
    except Exception as e:
        print(f"WebSocket connection error: {e}")
    finally:
        manager.disconnect(websocket)

# Temporary test route
@app.get("/")
def read_root():
    return {"message": "Backend is up and running!"}

# Health check for WebSocket
@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "websocket_connections": len(manager.active_connections),
        "registered_users": len(manager.user_locations)
    }
