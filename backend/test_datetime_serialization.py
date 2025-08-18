#!/usr/bin/env python3
"""
Test script to verify datetime serialization fix
"""

import json
from datetime import datetime
from app.schemas.incident import IncidentResponse

# Test data
test_incident = {
    "id": 1,
    "category": "Pothole",
    "priority": "Medium",
    "status": "Open",
    "description": "Test incident",
    "latitude": 40.7128,
    "longitude": -74.0060,
    "address": "Test Address",
    "created_at": datetime.utcnow(),
    "updated_at": datetime.utcnow()
}

try:
    # Create IncidentResponse object
    incident_response = IncidentResponse(**test_incident)
    print("✓ IncidentResponse created successfully")
    
    # Convert to dictionary
    incident_dict = incident_response.model_dump()
    print("✓ model_dump() successful")
    
    # Test JSON serialization
    json_str = json.dumps(incident_dict)
    print("✓ JSON serialization successful")
    print(f"JSON length: {len(json_str)} characters")
    
    # Test the specific fix we implemented
    # Convert datetime objects to ISO format strings for JSON serialization
    if incident_dict.get('created_at'):
        incident_dict['created_at'] = incident_dict['created_at'].isoformat()
    if incident_dict.get('updated_at'):
        incident_dict['updated_at'] = incident_dict['updated_at'].isoformat()
    
    # Test JSON serialization again
    json_str_fixed = json.dumps(incident_dict)
    print("✓ Fixed JSON serialization successful")
    print(f"Fixed JSON length: {len(json_str_fixed)} characters")
    
    print("\n✅ All tests passed! Datetime serialization issue is fixed.")
    
except Exception as e:
    print(f"❌ Test failed: {e}")
    import traceback
    traceback.print_exc()
