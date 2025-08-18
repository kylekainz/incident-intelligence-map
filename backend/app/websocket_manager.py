# app/websocket_manager.py
from fastapi import WebSocket, WebSocketDisconnect
from typing import List, Dict
import json
import asyncio
from geoalchemy2.functions import ST_DWithin, ST_SetSRID, ST_MakePoint
from sqlalchemy.orm import Session
from app.db import SessionLocal
from app.models import incident as incident_model

class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []
        self.user_locations: Dict[str, dict] = {}  # user_id -> location data

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        print(f"Client connected. Total connections: {len(self.active_connections)}")

    def disconnect(self, websocket: WebSocket):
        """Remove a WebSocket connection"""
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
            print(f"Client disconnected. Total connections: {len(self.active_connections)}")
            
            # Find and remove user from user_locations if this was their websocket
            user_id_to_remove = None
            for user_id, user_data in self.user_locations.items():
                if user_data.get('websocket') == websocket:
                    user_id_to_remove = user_id
                    break
            
            if user_id_to_remove:
                print(f"Removing user {user_id_to_remove} from active connections")
                del self.user_locations[user_id_to_remove]

    def _get_user_id_for_websocket(self, websocket: WebSocket) -> str:
        """Get user_id for a given WebSocket connection"""
        for user_id, user_data in self.user_locations.items():
            if user_data.get('websocket') == websocket:
                return user_id
        return None

    async def broadcast_new_incident(self, incident_data: dict):
        """Broadcast new incident to all connected clients"""
        if not self.active_connections:
            print("No active connections to broadcast to")
            return
            
        message = {
            "type": "new_incident",
            "data": incident_data
        }
        
        await self._broadcast_message(message)
        
        # Check for users in the area and send notifications
        await self._notify_users_in_area(incident_data)

    async def broadcast_status_update(self, incident_data: dict):
        """Broadcast incident status update to all connected clients"""
        message = {
            "type": "status_update",
            "data": incident_data
        }
        
        await self._broadcast_message(message)

    async def broadcast_incident_deleted(self, incident_id: int):
        """Broadcast incident deletion to all connected clients"""
        message = {
            "type": "incident_deleted",
            "data": {"id": incident_id}
        }
        
        await self._broadcast_message(message)

    async def _broadcast_message(self, message: dict):
        """Helper to broadcast any message to all connected clients"""
        message_str = json.dumps(message)
        disconnected = []
        
        for connection in self.active_connections:
            try:
                await connection.send_text(message_str)
                print(f"Broadcasted {message['type']} to client")
            except WebSocketDisconnect:
                print("Client disconnected during broadcast")
                disconnected.append(connection)
            except Exception as e:
                print(f"Failed to send to client: {e}")
                disconnected.append(connection)
        
        # Remove disconnected clients
        for connection in disconnected:
            self.disconnect(connection)

    async def _notify_users_in_area(self, incident_data: dict):
        """Notify users who are within notification radius of the incident"""
        db = SessionLocal()
        try:
            # Get incident location
            incident_lat = incident_data.get('latitude')
            incident_lon = incident_data.get('longitude')
            
            if not incident_lat or not incident_lon:
                print(f"Missing location data in incident: {incident_data}")
                return
            
            print(f"Checking for users near incident at {incident_lat}, {incident_lon}")
            
            # Find users within notification radius
            users_in_area = db.query(incident_model.UserLocation).filter(
                ST_DWithin(
                    incident_model.UserLocation.location,
                    ST_SetSRID(ST_MakePoint(incident_lon, incident_lat), 4326),
                    incident_model.UserLocation.notification_radius
                )
            ).all()
            
            print(f"Found {len(users_in_area)} users in notification area")
            print(f"Active connections: {list(self.user_locations.keys())}")
            
            # Send notifications to users in the area
            for user_location in users_in_area:
                user_id = user_location.user_id
                print(f"Checking user {user_id} in active connections...")
                
                if user_id in self.user_locations:
                    # Use the coordinates from memory instead of parsing WKB
                    user_lat = self.user_locations[user_id]['latitude']
                    user_lon = self.user_locations[user_id]['longitude']
                    
                    notification_message = {
                        "type": "area_notification",
                        "data": {
                            "incident": incident_data,
                            "distance": self._calculate_distance(
                                incident_lat, incident_lon,
                                user_lat, user_lon
                            )
                        }
                    }
                    
                    try:
                        websocket = self.user_locations[user_id]['websocket']
                        await websocket.send_text(json.dumps(notification_message))
                        print(f"Sent area notification to user {user_id}")
                    except Exception as e:
                        print(f"Failed to send area notification to user {user_id}: {e}")
                else:
                    print(f"User {user_id} not found in active connections")
                        
        except Exception as e:
            print(f"Error checking users in area: {e}")
            import traceback
            traceback.print_exc()
        finally:
            db.close()

    def _calculate_distance(self, lat1: float, lon1: float, lat2: float, lon2: float) -> float:
        """Calculate distance between two points in meters (approximate)"""
        from math import radians, cos, sin, asin, sqrt
        
        # Convert to radians
        lat1, lon1, lat2, lon2 = map(radians, [lat1, lon1, lat2, lon2])
        
        # Haversine formula
        dlat = lat2 - lat1
        dlon = lon2 - lon1
        a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlon/2)**2
        c = 2 * asin(sqrt(a))
        r = 6371000  # Radius of earth in meters
        return c * r

    async def update_user_location(self, user_id: str, latitude: float, longitude: float, 
                                 notification_radius: int = 5000, websocket: WebSocket = None):
        """Update user location and store in memory for quick access"""
        # Ensure consistent coordinate precision (6 decimal places)
        lat_rounded = round(latitude, 6)
        lng_rounded = round(longitude, 6)
        
        # If user already exists, update their websocket connection
        if user_id in self.user_locations:
            self.user_locations[user_id].update({
                'latitude': lat_rounded,
                'longitude': lng_rounded,
                'notification_radius': notification_radius,
                'websocket': websocket
            })
        else:
            self.user_locations[user_id] = {
                'latitude': lat_rounded,
                'longitude': lng_rounded,
                'notification_radius': notification_radius,
                'websocket': websocket
            }
        
        print(f"Updated location for user {user_id} with websocket: {websocket is not None}")
        
        # Also store in database
        db = SessionLocal()
        try:
            existing_location = db.query(incident_model.UserLocation).filter(
                incident_model.UserLocation.user_id == user_id
            ).first()
            
            if existing_location:
                existing_location.location = f'POINT({lng_rounded} {lat_rounded})'
                existing_location.notification_radius = notification_radius
            else:
                new_location = incident_model.UserLocation(
                    user_id=user_id,
                    location=f'POINT({lng_rounded} {lat_rounded})',
                    notification_radius=notification_radius
                )
                db.add(new_location)
            
            db.commit()
            print(f"Updated location for user {user_id}")
            
        except Exception as e:
            print(f"Error updating user location: {e}")
            db.rollback()
        finally:
            db.close()

# Global manager instance
manager = ConnectionManager()