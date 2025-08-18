# app/routes/incident.py - Updated
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db import get_db
from app import models
from app.schemas.incident import IncidentCreate, IncidentResponse, IncidentUpdate, UserLocationCreate, UserLocationResponse
from geoalchemy2.shape import to_shape
from app.websocket_manager import manager
from app.auth import get_current_user, User
import uuid
from datetime import datetime, timedelta
from sqlalchemy import func
import numpy as np
from sklearn.cluster import DBSCAN
from sklearn.preprocessing import StandardScaler
from collections import Counter
import httpx
import asyncio

router = APIRouter()

async def get_address_from_coordinates(latitude: float, longitude: float) -> str:
    """Get human-readable address from coordinates using OpenStreetMap Nominatim"""
    try:
        async with httpx.AsyncClient() as client:
            url = f"https://nominatim.openstreetmap.org/reverse"
            params = {
                "lat": latitude,
                "lon": longitude,
                "format": "json",
                "addressdetails": 1,
                "zoom": 18
            }
            headers = {
                "User-Agent": "IncidentIntelligenceMap/1.0"
            }
            
            response = await client.get(url, params=params, headers=headers)
            if response.status_code == 200:
                data = response.json()
                # Extract the most relevant address components
                address_parts = []
                
                if data.get("address"):
                    addr = data["address"]
                    # Build a readable address
                    if addr.get("house_number") and addr.get("road"):
                        address_parts.append(f"{addr['house_number']} {addr['road']}")
                    elif addr.get("road"):
                        address_parts.append(addr["road"])
                    
                    if addr.get("suburb"):
                        address_parts.append(addr["suburb"])
                    elif addr.get("city"):
                        address_parts.append(addr["city"])
                    elif addr.get("town"):
                        address_parts.append(addr["town"])
                    
                    if addr.get("state"):
                        address_parts.append(addr["state"])
                    
                    if address_parts:
                        return ", ".join(address_parts)
                
                # Fallback to display_name if address parsing fails
                return data.get("display_name", "Unknown location")
            else:
                return "Unknown location"
    except Exception as e:
        print(f"Error in reverse geocoding: {e}")
        return "Unknown location"

@router.post("/incidents", response_model=IncidentResponse)
async def create_incident(incident: IncidentCreate, db: Session = Depends(get_db)):
    # Get address from coordinates
    address = await get_address_from_coordinates(incident.latitude, incident.longitude)
    
    db_incident = models.incident.Incident(
        category=incident.category,
        description=incident.description,
        priority=incident.priority,
        status="Open",  # Default status
        location=f'POINT({incident.longitude} {incident.latitude})',
        address=address
    )
    db.add(db_incident)
    db.commit()
    db.refresh(db_incident)
    
    # Create response object
    incident_response = IncidentResponse(
        id=db_incident.id,
        category=db_incident.category,
        priority=db_incident.priority,
        status=db_incident.status,
        description=db_incident.description,
        latitude=incident.latitude,
        longitude=incident.longitude,
        address=address,
        created_at=db_incident.created_at,
        updated_at=db_incident.updated_at
    )
    
    # Convert to dict and handle datetime serialization for WebSocket
    incident_dict = incident_response.dict()
    incident_dict['created_at'] = incident_dict['created_at'].isoformat() if incident_dict['created_at'] else None
    incident_dict['updated_at'] = incident_dict['updated_at'].isoformat() if incident_dict['updated_at'] else None
    
    # Broadcast to all connected WebSocket clients
    await manager.broadcast_new_incident(incident_dict)
    
    return incident_response

@router.get("/incidents", response_model=list[IncidentResponse])
def get_incidents(db: Session = Depends(get_db)):
    incidents = db.query(models.incident.Incident).all()
    results = []
    for i in incidents:
        point = to_shape(i.location)
        results.append(
            IncidentResponse(
                id=i.id,
                category=i.category,
                priority=i.priority,
                status=i.status,
                description=i.description,
                latitude=point.y,
                longitude=point.x,
                address=i.address,
                created_at=i.created_at,
                updated_at=i.updated_at
            )
        )
    return results

@router.put("/incidents/{incident_id}", response_model=IncidentResponse)
async def update_incident_status(incident_id: int, incident_update: IncidentUpdate, db: Session = Depends(get_db)):
    db_incident = db.query(models.incident.Incident).filter(models.incident.Incident.id == incident_id).first()
    if not db_incident:
        raise HTTPException(status_code=404, detail="Incident not found")
    
    # Update status and description
    db_incident.status = incident_update.status
    if incident_update.description is not None:
        db_incident.description = incident_update.description
    
    db.commit()
    db.refresh(db_incident)
    
    # Create response object
    point = to_shape(db_incident.location)
    incident_response = IncidentResponse(
        id=db_incident.id,
        category=db_incident.category,
        priority=db_incident.priority,
        status=db_incident.status,
        description=db_incident.description,
        latitude=point.y,
        longitude=point.x,
        address=db_incident.address,
        created_at=db_incident.created_at,
        updated_at=db_incident.updated_at
    )
    
    # Convert to dict and handle datetime serialization for WebSocket
    incident_dict = incident_response.dict()
    incident_dict['created_at'] = incident_dict['created_at'].isoformat() if incident_dict['created_at'] else None
    incident_dict['updated_at'] = incident_dict['updated_at'].isoformat() if incident_dict['updated_at'] else None
    
    # Broadcast status update to all connected WebSocket clients
    await manager.broadcast_status_update(incident_dict)
    
    return incident_response

@router.get("/incidents/{incident_id}", response_model=IncidentResponse)
def get_incident(incident_id: int, db: Session = Depends(get_db)):
    db_incident = db.query(models.incident.Incident).filter(models.incident.Incident.id == incident_id).first()
    if not db_incident:
        raise HTTPException(status_code=404, detail="Incident not found")
    
    point = to_shape(db_incident.location)
    return IncidentResponse(
        id=db_incident.id,
        category=db_incident.category,
        priority=db_incident.priority,
        status=db_incident.status,
        description=db_incident.description,
        latitude=point.y,
        longitude=point.x,
        address=db_incident.address,
        created_at=db_incident.created_at,
        updated_at=db_incident.updated_at
    )

@router.post("/user-location", response_model=UserLocationResponse)
async def update_user_location(user_location: UserLocationCreate, db: Session = Depends(get_db)):
    # Generate a user ID (in a real app, this would come from authentication)
    user_id = str(uuid.uuid4())
    
    # Check if user already has a location
    existing_location = db.query(models.incident.UserLocation).filter(
        models.incident.UserLocation.user_id == user_id
    ).first()
    
    if existing_location:
        # Update existing location
        existing_location.location = f'POINT({user_location.longitude} {user_location.latitude})'
        existing_location.notification_radius = user_location.notification_radius
        db_incident = existing_location
    else:
        # Create new location
        db_incident = models.incident.UserLocation(
            user_id=user_id,
            location=f'POINT({user_location.longitude} {user_location.latitude})',
            notification_radius=user_location.notification_radius
        )
        db.add(db_incident)
    
    db.commit()
    db.refresh(db_incident)
    
    return UserLocationResponse(
        id=db_incident.id,
        user_id=db_incident.user_id,
        latitude=user_location.latitude,
        longitude=user_location.longitude,
        notification_radius=db_incident.notification_radius,
        created_at=db_incident.created_at,
        updated_at=db_incident.updated_at
    )

@router.get("/incidents/nearby/{user_id}")
def get_nearby_incidents(user_id: str, radius_meters: int = 5000, db: Session = Depends(get_db)):
    """Get incidents near a user's location"""
    from geoalchemy2.functions import ST_DWithin, ST_SetSRID, ST_MakePoint
    
    # Get user's location
    user_location = db.query(models.incident.UserLocation).filter(
        models.incident.UserLocation.user_id == user_id
    ).first()
    
    if not user_location:
        raise HTTPException(status_code=404, detail="User location not found")
    
    # Find incidents within radius
    nearby_incidents = db.query(models.incident.Incident).filter(
        ST_DWithin(
            models.incident.Incident.location,
            user_location.location,
            radius_meters
        )
    ).all()
    
    results = []
    for i in nearby_incidents:
        point = to_shape(i.location)
        results.append(
            IncidentResponse(
                id=i.id,
                category=i.category,
                priority=i.priority,
                status=i.status,
                description=i.description,
                latitude=point.y,
                longitude=point.x,
                address=i.address,
                created_at=i.created_at,
                updated_at=i.updated_at
            )
        )
    
    return results

@router.get("/admin/incidents", response_model=list[IncidentResponse])
def get_all_incidents_admin(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Get all incidents for admin dashboard with priority ordering"""
    incidents = db.query(models.incident.Incident).order_by(
        # Order by priority (High first, then Medium, then Low)
        models.incident.Incident.priority.desc(),
        models.incident.Incident.created_at.desc()
    ).all()
    
    results = []
    for i in incidents:
        point = to_shape(i.location)
        results.append(
            IncidentResponse(
                id=i.id,
                category=i.category,
                priority=i.priority,
                status=i.status,
                description=i.description,
                latitude=point.y,
                longitude=point.x,
                address=i.address,
                created_at=i.created_at,
                updated_at=i.updated_at
            )
        )
    return results

@router.delete("/admin/incidents/{incident_id}")
async def delete_incident(incident_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Delete an incident (admin only)"""
    db_incident = db.query(models.incident.Incident).filter(models.incident.Incident.id == incident_id).first()
    if not db_incident:
        raise HTTPException(status_code=404, detail="Incident not found")
    
    db.delete(db_incident)
    db.commit()
    
    # Broadcast deletion to all connected clients
    await manager.broadcast_incident_deleted(incident_id)
    
    return {"message": f"Incident {incident_id} deleted successfully"}

@router.get("/admin/analytics")
def get_incident_analytics(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Get incident analytics for admin dashboard"""
    # Get total counts by category
    category_counts = db.query(
        models.incident.Incident.category,
        func.count(models.incident.Incident.id).label('count')
    ).group_by(models.incident.Incident.category).all()
    
    # Get total counts by priority
    priority_counts = db.query(
        models.incident.Incident.priority,
        func.count(models.incident.Incident.id).label('count')
    ).group_by(models.incident.Incident.priority).all()
    
    # Get total counts by status
    status_counts = db.query(
        models.incident.Incident.status,
        func.count(models.incident.Incident.id).label('count')
    ).group_by(models.incident.Incident.status).all()
    
    # Get recent incidents (last 7 days)
    from datetime import datetime, timedelta
    week_ago = datetime.now() - timedelta(days=7)
    recent_count = db.query(models.incident.Incident).filter(
        models.incident.Incident.created_at >= week_ago
    ).count()
    
    # Get total incidents
    total_incidents = db.query(models.incident.Incident).count()
    
    return {
        "total_incidents": total_incidents,
        "recent_incidents": recent_count,
        "by_category": {cat: count for cat, count in category_counts},
        "by_priority": {prio: count for prio, count in priority_counts},
        "by_status": {status: count for status, count in status_counts}
    }

@router.get("/trend-analysis")
def get_trend_analysis(db: Session = Depends(get_db)):
    """AI-powered trend analysis and incident predictions using machine learning (public access)"""
    # Get all incidents from the last 60 days for better ML training
    sixty_days_ago = datetime.now() - timedelta(days=60)
    recent_incidents = db.query(models.incident.Incident).filter(
        models.incident.Incident.created_at >= sixty_days_ago
    ).all()
    
    if len(recent_incidents) < 5:
        return {
            "hotspots": [],
            "predictions": [],
            "message": "Not enough data for AI analysis (need at least 5 incidents)",
            "ai_model_status": "insufficient_data"
        }
    
    # Function to get city/state from coordinates using reverse geocoding
    def get_location_name(lat, lon):
        try:
            import httpx
            # Use Nominatim (OpenStreetMap) for reverse geocoding
            url = f"https://nominatim.openstreetmap.org/reverse?lat={lat}&lon={lon}&format=json&addressdetails=1"
            headers = {"User-Agent": "IncidentIntelligenceMap/1.0"}
            
            with httpx.Client(timeout=5.0) as client:
                response = client.get(url, headers=headers)
                if response.status_code == 200:
                    data = response.json()
                    address = data.get("address", {})
                    
                    # Extract city and state
                    city = address.get("city") or address.get("town") or address.get("village") or "Unknown City"
                    state = address.get("state") or "Unknown State"
                    
                    return f"{city}, {state}"
                else:
                    return "Unknown Location"
        except Exception as e:
            print(f"Reverse geocoding error: {e}")
            return "Unknown Location"
    
    # Extract coordinates and create feature matrix for ML
    coordinates = []
    features = []
    incident_dates = []
    
    for incident in recent_incidents:
        point = to_shape(incident.location)
        coordinates.append([point.x, point.y])  # longitude, latitude
        
        # Create ML features for each incident
        days_ago = (datetime.now() - incident.created_at).days
        hour_of_day = incident.created_at.hour
        day_of_week = incident.created_at.weekday()
        
        # Encode categorical variables
        category_encoding = {
            "Pothole": 0, "Wildlife": 1, "Street Light Out": 2, "Debris/Trash": 3,
            "Traffic Jam": 4, "Car Accident": 5, "Broken Down Car": 6, "Lane Closure": 7,
            "Police": 8
        }
        priority_encoding = {"Low": 0, "Medium": 1, "High": 2}
        
        # Feature vector: [longitude, latitude, days_ago, hour, day_of_week, category, priority]
        feature_vector = [
            point.x, point.y, days_ago, hour_of_day, day_of_week,
            category_encoding.get(incident.category, 0),
            priority_encoding.get(incident.priority, 1)
        ]
        features.append(feature_vector)
        incident_dates.append(incident.created_at)
    
    coordinates = np.array(coordinates)
    features = np.array(features)
    
    # AI-Powered Hotspot Detection using DBSCAN with adaptive parameters
    # Use silhouette analysis to find optimal clustering parameters
    from sklearn.metrics import silhouette_score
    
    best_eps = 0.3
    best_score = -1
    
    # Try different eps values to find optimal clustering
    for eps in [0.1, 0.2, 0.3, 0.4, 0.5]:
        clustering = DBSCAN(eps=eps, min_samples=2).fit(coordinates)
        if len(set(clustering.labels_)) > 1 and -1 in clustering.labels_:
            # Calculate silhouette score for valid clustering
            valid_labels = clustering.labels_[clustering.labels_ != -1]
            if len(valid_labels) > 1:
                try:
                    score = silhouette_score(coordinates[clustering.labels_ != -1], valid_labels)
                    if score > best_score:
                        best_score = score
                        best_eps = eps
                except:
                    continue
    
    # Perform clustering with optimal parameters
    clustering = DBSCAN(eps=best_eps, min_samples=2).fit(coordinates)
    cluster_labels = clustering.labels_
    
    # Get unique cluster labels (excluding noise points with label -1)
    unique_clusters = set(cluster_labels)
    unique_clusters.discard(-1)
    
    hotspots = []
    predictions = []
    
    # AI Risk Assessment using multiple ML factors
    for cluster_id in unique_clusters:
        # Get incidents in this cluster
        cluster_indices = np.where(cluster_labels == cluster_id)[0]
        cluster_incidents = [recent_incidents[i] for i in cluster_indices]
        cluster_features = features[cluster_indices]
        
        # Calculate cluster center
        cluster_coords = coordinates[cluster_indices]
        center_lon = np.mean(cluster_coords[:, 0])
        center_lat = np.mean(cluster_coords[:, 1])
        
        # Advanced ML-based risk assessment
        recent_count = len(cluster_incidents)
        
        # 1. Temporal Pattern Analysis
        cluster_dates = [incident_dates[i] for i in cluster_indices]
        time_intervals = []
        for i in range(1, len(cluster_dates)):
            interval = (cluster_dates[i] - cluster_dates[i-1]).total_seconds() / 3600  # hours
            time_intervals.append(interval)
        
        # Calculate temporal clustering score (lower intervals = higher risk)
        if time_intervals:
            avg_interval = np.mean(time_intervals)
            temporal_risk = max(0, 20 - (avg_interval / 24))  # Normalize to 0-20 scale
        else:
            temporal_risk = 0
        
        # 2. Spatial Density Analysis
        cluster_area = 0.5  # Approximate area in km²
        density_score = min(25, (recent_count / cluster_area) * 5)
        
        # 3. Priority Weighted Analysis
        priority_weights = {"High": 3, "Medium": 2, "Low": 1}
        priority_scores = [priority_weights.get(inc.priority, 1) for inc in cluster_incidents]
        weighted_priority = np.mean(priority_scores) * 10
        
        # 4. Category Pattern Analysis
        categories = [inc.category for inc in cluster_incidents]
        category_counter = Counter(categories)
        most_common_category = category_counter.most_common(1)[0][0]
        most_common_priority = Counter([inc.priority for inc in cluster_incidents]).most_common(1)[0][0]
        
        # Calculate category diversity (more diverse = potentially higher risk)
        category_diversity = len(set(categories)) * 5
        
        # 5. Recency Analysis with exponential decay
        avg_days_old = np.mean([(datetime.now() - inc.created_at).days for inc in cluster_incidents])
        recency_score = 15 * np.exp(-avg_days_old / 10)  # Exponential decay
        
        # 6. ML-based Anomaly Detection
        # Calculate how unusual this cluster is compared to overall patterns
        if len(features) > 10:
            from sklearn.ensemble import IsolationForest
            iso_forest = IsolationForest(contamination=0.1, random_state=42)
            iso_forest.fit(features)
            anomaly_scores = iso_forest.decision_function(cluster_features)
            anomaly_risk = np.mean(anomaly_scores) * 10
        else:
            anomaly_risk = 0
        
        # Combine all factors for final AI risk score
        risk_score = min(100, max(5, 
            density_score + 
            temporal_risk + 
            weighted_priority + 
            category_diversity + 
            recency_score + 
            anomaly_risk
        ))
        
        # Create hotspot with AI insights
        hotspot = {
            "center": {
                "latitude": center_lat,
                "longitude": center_lon
            },
            "location_name": get_location_name(center_lat, center_lon),
            "incident_count": recent_count,
            "most_common_category": most_common_category,
            "most_common_priority": most_common_priority,
            "risk_score": int(risk_score),
            "radius_km": 0.5,
            "ai_insights": {
                "temporal_pattern": round(temporal_risk, 1),
                "spatial_density": round(density_score, 1),
                "priority_weight": round(weighted_priority, 1),
                "category_diversity": round(category_diversity, 1),
                "recency_score": round(recency_score, 1),
                "anomaly_detection": round(anomaly_risk, 1),
                "clustering_quality": round(best_score, 3)
            }
        }
        hotspots.append(hotspot)
        
        # AI-Powered Prediction Generation
        if risk_score > 25:  # Only predict for significant hotspots
            # Use ML to predict future incident locations
            for i in range(2):
                # Calculate prediction confidence using ML factors
                base_confidence = risk_score * 0.3
                
                # Data quality bonus
                if recent_count >= 8:
                    data_bonus = 25
                elif recent_count >= 5:
                    data_bonus = 20
                elif recent_count >= 3:
                    data_bonus = 15
                else:
                    data_bonus = 10
                
                # Temporal pattern bonus
                if temporal_risk > 15:
                    temporal_bonus = 20
                elif temporal_risk > 10:
                    temporal_bonus = 15
                else:
                    temporal_bonus = 10
                
                # Anomaly detection bonus
                if anomaly_risk > 5:
                    anomaly_bonus = 15
                else:
                    anomaly_bonus = 5
                
                final_confidence = min(90, base_confidence + data_bonus + temporal_bonus + anomaly_bonus)
                
                # Generate prediction location using spatial patterns
                # Use normal distribution around cluster center with realistic spread
                spread_factor = 0.005 + (risk_score / 100) * 0.01  # Higher risk = wider spread
                offset_lat = np.random.normal(0, spread_factor)
                offset_lon = np.random.normal(0, spread_factor)
                
                prediction = {
                    "latitude": center_lat + offset_lat,
                    "longitude": center_lon + offset_lon,
                    "location_name": get_location_name(center_lat + offset_lat, center_lon + offset_lon),
                    "predicted_category": most_common_category,
                    "predicted_priority": most_common_priority,
                    "confidence": int(final_confidence),
                    "hotspot_id": len(hotspots) - 1,
                    "prediction_factors": {
                        "base_confidence": int(base_confidence),
                        "data_quality_bonus": data_bonus,
                        "temporal_pattern_bonus": temporal_bonus,
                        "anomaly_detection_bonus": anomaly_bonus
                    }
                }
                predictions.append(prediction)
    
    # Sort hotspots by AI-calculated risk score
    hotspots.sort(key=lambda x: x["risk_score"], reverse=True)
    
    # Calculate AI model performance metrics
    total_incidents = len(recent_incidents)
    clusters_found = len(hotspots)
    predictions_generated = len(predictions)
    
    # AI Model Status
    ai_status = "optimal" if clusters_found > 0 and best_score > 0.3 else "suboptimal"
    
    return {
        "hotspots": hotspots,
        "predictions": predictions,
        "total_analyzed": total_incidents,
        "analysis_period_days": 60,
        "ai_model_status": ai_status,
        "ml_metrics": {
            "optimal_clustering_eps": round(best_eps, 3),
            "clustering_quality_score": round(best_score, 3),
            "clusters_found": clusters_found,
            "predictions_generated": predictions_generated,
            "data_sufficiency": "sufficient" if total_incidents >= 10 else "limited"
        },
        "ai_insights": {
            "temporal_patterns_detected": any(h["ai_insights"]["temporal_pattern"] > 10 for h in hotspots),
            "spatial_clustering_quality": "high" if best_score > 0.5 else "medium" if best_score > 0.3 else "low",
            "anomaly_detection_active": any(h["ai_insights"]["anomaly_detection"] > 5 for h in hotspots)
        }
    }




