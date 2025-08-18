//IncidentMap.jsx - Updated for better real-time handling and dark theme
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, useMap } from 'react-leaflet';
import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import UserLocationMarker from './UserLocationMarker';
import LocationPermission from './LocationPermission';

// Import MarkerCluster
import MarkerClusterGroup from 'react-leaflet-markercluster';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';

// Import leaflet.heat - this should load the plugin
import 'leaflet.heat/dist/leaflet-heat.js';

// Fix for default marker icon path issue in Vite
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: new URL('leaflet/dist/images/marker-icon-2x.png', import.meta.url).href,
  iconUrl: new URL('leaflet/dist/images/marker-icon.png', import.meta.url).href,
  shadowUrl: new URL('leaflet/dist/images/marker-shadow.png', import.meta.url).href,
});

// Define the complete lists to ensure consistency
const categoryOptions = [
  "Pothole", "Wildlife", "Street Light Out", "Debris/Trash",
  "Traffic Jam", "Car Accident", "Broken Down Car", "Lane Closure", "Police"
];

const priorityOptions = ["Low", "Medium", "High"];

// Priority weights for heatmap intensity
const priorityWeights = {
  "Low": 0.3,
  "Medium": 0.6,
  "High": 1.0
};

// Status colors for markers
const getStatusColor = (status) => {
  switch (status) {
    case 'Open':
      return '#ef4444'; // red
    case 'In Progress':
      return '#f59e0b'; // yellow
    case 'Resolved':
      return '#10b981'; // green
    default:
      return '#6b7280'; // gray
  }
};

function ClickHandler({ onMapClick }) {
  useMapEvents({
    click(e) {
      const { lat, lng } = e.latlng;
      onMapClick({ lat, lng });
    },
  });
  return null;
}

function MapController({ mapRef }) {
  const map = useMap();
  
  useEffect(() => {
    if (mapRef) {
      mapRef.current = map;
    }
  }, [map, mapRef]);
  
  return null;
}

// Custom heatmap layer component
function HeatmapLayer({ incidents, layerKey }) {
  const mapRef = useRef();
  const heatLayerRef = useRef();

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Clean up existing layer first
    if (heatLayerRef.current) {
      try {
        map.removeLayer(heatLayerRef.current);
      } catch (e) {
        // Layer might not be on map
      }
      heatLayerRef.current = null;
    }

    // If no incidents, don't create layer
    if (!incidents || incidents.length === 0) {
      console.log('No incidents for heatmap');
      return;
    }

    // Check if leaflet.heat is available
    if (typeof L === 'undefined' || !L.heatLayer) {
      console.error('leaflet.heat is not available. L.heatLayer:', typeof L.heatLayer);
      return;
    }

    try {
      // Convert incidents to heatmap data points [lat, lng, intensity]
      const heatData = incidents.map(incident => [
        parseFloat(incident.latitude),
        parseFloat(incident.longitude),
        priorityWeights[incident.priority] || 0.5
      ]);

      console.log('Creating heatmap with', heatData.length, 'points');
      console.log('Sample heat data:', heatData.slice(0, 3));

      // Create new heatmap layer with more visible settings
      heatLayerRef.current = L.heatLayer(heatData, {
        radius: 30,
        blur: 20,
        maxZoom: 18,
        max: 1.0,
        minOpacity: 0.4,
        gradient: {
          0.0: 'blue',
          0.2: 'cyan',
          0.4: 'lime',
          0.6: 'yellow',
          0.8: 'orange',
          1.0: 'red'
        }
      });

      heatLayerRef.current.addTo(map);
      console.log('Heatmap layer added to map successfully');

    } catch (error) {
      console.error('Error creating heatmap:', error);
    }

    // Cleanup function
    return () => {
      if (heatLayerRef.current) {
        try {
          map.removeLayer(heatLayerRef.current);
        } catch (e) {
          // Layer might not be on map
        }
        heatLayerRef.current = null;
      }
    };
  }, [incidents, layerKey]);

  // Get map reference
  const map = useMapEvents({});
  mapRef.current = map;

  return null;
}

// New component to show real-time notifications
function RealTimeNotification({ lastIncident, onDismiss }) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (lastIncident) {
      setIsVisible(true);
      const timer = setTimeout(() => {
        setIsVisible(false);
        if (onDismiss) onDismiss();
      }, 5000); // Auto-dismiss after 5 seconds

      return () => clearTimeout(timer);
    }
  }, [lastIncident, onDismiss]);

  if (!isVisible || !lastIncident) return null;

  const getStatusColor = (status) => {
    switch (status) {
      case 'Open':
        return 'bg-red-900 text-red-200';
      case 'In Progress':
        return 'bg-yellow-900 text-yellow-200';
      case 'Resolved':
        return 'bg-green-900 text-green-200';
      default:
        return 'bg-gray-900 text-gray-200';
    }
  };

  return (
    <div className="fixed top-4 right-4 z-[1000] bg-gray-800 text-white p-4 rounded-lg shadow-2xl max-w-sm animate-slide-in border border-gray-700">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
            <span className="font-medium text-sm">New Incident Reported</span>
          </div>
          <p className="text-sm font-medium">{lastIncident.category}</p>
          {lastIncident.description && (
            <p className="text-xs opacity-90 mt-1">{lastIncident.description}</p>
          )}
          {lastIncident.address && (
            <p className="text-xs opacity-90 mt-1">📍 {lastIncident.address}</p>
          )}
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs opacity-75">Priority: {lastIncident.priority}</span>
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(lastIncident.status)}`}>
              {lastIncident.status}
            </span>
          </div>
        </div>
        <button
          onClick={() => setIsVisible(false)}
          className="text-white hover:text-gray-200 ml-2 hover:bg-gray-700 rounded-full w-6 h-6 flex items-center justify-center transition-colors"
        >
          ×
        </button>
      </div>
    </div>
  );
}

export default function IncidentMap({ incidents = [], onMapClick, onIncidentsUpdate, onIncidentSelect, isExpanded = false }) {
  const [fetchedIncidents, setFetchedIncidents] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedPriority, setSelectedPriority] = useState("All");
  const [selectedStatus, setSelectedStatus] = useState("All");
  const [viewMode, setViewMode] = useState("markers");
  const [lastNewIncident, setLastNewIncident] = useState(null);
  const [trendData, setTrendData] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const prevIncidentsCount = useRef(0);
  const mapRef = useRef(null);

  useEffect(() => {
    // Only fetch if we haven't fetched yet
    if (fetchedIncidents.length === 0) {
      fetch('http://localhost:8000/incidents')
        .then(res => res.json())
        .then(data => {
          setFetchedIncidents(data);
          prevIncidentsCount.current = data.length;
          if (onIncidentsUpdate) {
            onIncidentsUpdate(data);
          }
        })
        .catch(err => console.error('Failed to fetch incidents', err));
    }
  }, []);

  // Sync fetchedIncidents with incidents prop changes (including deletions)
  useEffect(() => {
    if (incidents.length < fetchedIncidents.length) {
      // If incidents prop is shorter, it means some were deleted
      setFetchedIncidents(incidents);
    }
  }, [incidents, fetchedIncidents.length]);

  // Fetch trend analysis data when view mode changes to potential incidents
  useEffect(() => {
    if (viewMode === "potential") {
      // Remove admin requirement - allow all users to view predictions
      fetch('http://localhost:8000/trend-analysis')
        .then(res => {
          if (res.ok) {
            return res.json();
          } else {
            console.error('Failed to fetch trend data:', res.status);
            setTrendData(null);
            return null;
          }
        })
        .then(data => {
          if (data) {
            setTrendData(data);
          }
        })
        .catch(err => {
          console.error('Failed to fetch trend data', err);
          setTrendData(null);
        });
    }
  }, [viewMode]);

  // Use incidents prop directly for real-time updates
  const allIncidents = useMemo(() => {
    // If we have incidents from props, use those (they're the source of truth)
    if (incidents.length > 0) {
      return incidents;
    }
    // Fallback to fetched incidents if no props
    return fetchedIncidents;
  }, [incidents, fetchedIncidents]);

  // Check for new incidents for notifications
  useEffect(() => {
    if (allIncidents.length > prevIncidentsCount.current) {
      // Get the newest incident (assuming they're added to the end)
      const newestIncident = allIncidents[allIncidents.length - 1];
      setLastNewIncident(newestIncident);
      prevIncidentsCount.current = allIncidents.length;
    }
  }, [allIncidents]);

  // Filter incidents
  const filteredIncidents = useMemo(() => {
    return allIncidents.filter((incident) => {
      const categoryMatch = selectedCategory === "All" || incident.category === selectedCategory;
      const priorityMatch = selectedPriority === "All" || incident.priority === selectedPriority;
      const statusMatch = selectedStatus === "All" || incident.status === selectedStatus;
      return categoryMatch && priorityMatch && statusMatch;
    });
  }, [allIncidents, selectedCategory, selectedPriority, selectedStatus]);

  // Use the predefined options for filter dropdowns
  const filterCategories = ["All", ...categoryOptions];
  const filterPriorities = ["All", ...priorityOptions];
  const filterStatuses = ["All", "Open", "In Progress", "Resolved"];

  const handleViewModeChange = (mode) => {
    setViewMode(mode);
  };

  const handleClearFilters = () => {
    setSelectedCategory("All");
    setSelectedPriority("All");
    setSelectedStatus("All");
  };

  const handleLocationUpdate = useCallback((location, accuracy) => {
    setUserLocation(location);
    console.log('User location updated:', location, 'Accuracy:', accuracy);
  }, []);

  const centerOnUserLocation = () => {
    if (userLocation && mapRef.current) {
      mapRef.current.setView([userLocation.lat, userLocation.lng], 15);
    }
  };

  return (
    <div className="w-full relative">
      {/* Location permission request */}
      <LocationPermission onPermissionGranted={() => console.log('Location permission granted')} />
      
      {/* Real-time notification */}
      <RealTimeNotification 
        lastIncident={lastNewIncident} 
        onDismiss={() => setLastNewIncident(null)}
      />

      {/* Filter UI - Enhanced Dark Theme */}
      <div className="bg-gray-800 border border-gray-700 rounded-xl shadow-2xl p-6 mb-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {/* View Mode Toggle */}
          <div className="lg:col-span-2 xl:col-span-3">
            <label className="block text-sm font-medium text-gray-300 mb-3">View Mode</label>
            <div className="flex rounded-lg shadow-sm border border-gray-600 overflow-hidden">
              <button
                onClick={() => handleViewModeChange("markers")}
                className={`flex-1 px-4 py-3 text-sm font-medium transition-all duration-200 ${
                  viewMode === "markers"
                    ? "bg-teal-600 text-white shadow-lg"
                    : "bg-gray-700 text-gray-200 hover:bg-gray-600 hover:text-white"
                }`}
              >
                🎯 Markers
              </button>
              <button
                onClick={() => handleViewModeChange("icons")}
                className={`flex-1 px-4 py-3 text-sm font-medium transition-all duration-200 ${
                  viewMode === "icons"
                    ? "bg-teal-600 text-white shadow-lg"
                    : "bg-gray-700 text-gray-200 hover:bg-gray-600 hover:text-white"
                }`}
              >
                😊 Icons
              </button>
              <button
                onClick={() => handleViewModeChange("heatmap")}
                className={`flex-1 px-4 py-3 text-sm font-medium transition-all duration-200 ${
                  viewMode === "heatmap"
                    ? "bg-teal-600 text-white shadow-lg"
                    : "bg-gray-700 text-gray-200 hover:bg-gray-600 hover:text-white"
                }`}
              >
                🔥 Heatmap
              </button>
              <button
                onClick={() => handleViewModeChange("potential")}
                className={`flex-1 px-4 py-3 text-sm font-medium transition-all duration-200 ${
                  viewMode === "potential"
                    ? "bg-teal-600 text-white shadow-lg"
                    : "bg-gray-700 text-gray-200 hover:bg-gray-600 hover:text-white"
                }`}
              >
                🔮 Predictions
              </button>
            </div>
          </div>

          {/* Category Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Category</label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all duration-200"
            >
              {filterCategories.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          {/* Priority Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Priority</label>
            <select
              value={selectedPriority}
              onChange={(e) => setSelectedPriority(e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all duration-200"
            >
              {filterPriorities.map((prio) => (
                <option key={prio} value={prio}>{prio}</option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Status</label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all duration-200"
            >
              {filterStatuses.map((status) => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>
          </div>

          {/* Action Buttons */}
          <div className="lg:col-span-2 xl:col-span-3 flex flex-wrap gap-3">
            <button
              onClick={handleClearFilters}
              className="px-4 py-2 bg-gray-700 text-gray-200 rounded-lg font-medium hover:bg-gray-600 hover:text-white transition-all duration-200 shadow-md hover:shadow-lg"
            >
              🗑️ Clear Filters
            </button>
            {userLocation && (
              <button
                onClick={centerOnUserLocation}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-all duration-200 shadow-md hover:shadow-lg"
                title="Center on my location"
              >
                📍 My Location
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Map Container */}
      <div className={`transition-all duration-300 ease-in-out ${
        isExpanded 
          ? 'h-screen' 
          : 'h-[70vh] rounded-xl overflow-hidden shadow-2xl border border-gray-700'
      }`}>
        <MapContainer 
          center={[38.8951, -77.0364]} 
          zoom={13} 
          className="w-full h-full"
          style={{ background: '#1f2937' }}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution="© OpenStreetMap contributors"
          />
          <ClickHandler onMapClick={onMapClick} />
          <MapController mapRef={mapRef} />
          
          {/* User Location Marker */}
          <UserLocationMarker onLocationUpdate={handleLocationUpdate} />

          {/* Conditionally render markers or heatmap */}
          {viewMode === "markers" && (
            <MarkerClusterGroup>
              {filteredIncidents.map((incident, index) => {
                // Create custom icon with status color (moved outside useMemo to avoid hooks violation)
                const customIcon = L.divIcon({
                  className: 'custom-marker',
                  html: `<div style="
                    width: 20px; 
                    height: 20px; 
                    background-color: ${getStatusColor(incident.status)}; 
                    border: 2px solid white; 
                    border-radius: 50%; 
                    box-shadow: 0 2px 4px rgba(0,0,0,0.3);
                  "></div>`,
                  iconSize: [20, 20],
                  iconAnchor: [10, 10]
                });

                return (
                  <Marker
                    key={`marker-${incident.id}-${incident.latitude}-${incident.longitude}`}
                    position={[incident.latitude, incident.longitude]}
                    icon={customIcon}
                  >
                   <Popup>
                     <div className="space-y-2">
                       <div className="flex items-center justify-between">
                         <p className="font-bold text-lg">{incident.category}</p>
                         <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                           incident.status === 'Open' ? 'bg-red-900 text-red-200' :
                           incident.status === 'In Progress' ? 'bg-yellow-900 text-yellow-200' :
                           'bg-green-900 text-green-200'
                         }`}>
                           {incident.status}
                         </span>
                       </div>
                       {incident.description && (
                         <p className="text-sm text-gray-700">{incident.description}</p>
                       )}
                       {incident.address && (
                         <p className="text-sm text-blue-600 font-medium">📍 {incident.address}</p>
                       )}
                       <div className="flex items-center gap-2">
                         <span className="text-xs text-gray-500">Priority: {incident.priority}</span>
                         {incident.id && (
                           <span className="text-xs text-gray-400">ID: {incident.id}</span>
                         )}
                       </div>
                       {incident.created_at && (
                         <p className="text-xs text-gray-400">
                           Created: {new Date(incident.created_at).toLocaleDateString()}
                         </p>
                       )}
                                             </div>
                    </Popup>
                  </Marker>
                );
              })}
            </MarkerClusterGroup>
          )}

          {viewMode === "icons" && (
           <MarkerClusterGroup>
             {filteredIncidents.map((incident, index) => {
               // Get category-specific emoji icon
               const getCategoryIcon = (category) => {
                 const icons = {
                   'Pothole': '🕳️',
                   'Wildlife': '🦌',
                   'Street Light Out': '💡',
                   'Debris/Trash': '🗑️',
                   'Traffic Jam': '🚗',
                   'Car Accident': '🚨',
                   'Broken Down Car': '🚗',
                   'Lane Closure': '🚧',
                   'Police': '👮'
                 };
                 return icons[category] || '📍';
               };

               const categoryEmoji = getCategoryIcon(incident.category);
               
               return (
                 <Marker
                   key={`icon-${incident.id}-${incident.latitude}-${incident.longitude}`}
                   position={[incident.latitude, incident.longitude]}
                   icon={L.divIcon({
                     className: 'icon-marker',
                     html: `<div style="
                       width: 30px; 
                       height: 30px; 
                       background-color: white; 
                       border: 2px solid #6b7280; 
                       border-radius: 50%; 
                       box-shadow: 0 2px 4px rgba(0,0,0,0.3);
                       display: flex;
                       align-items: center;
                       justify-content: center;
                       font-size: 18px;
                     ">${categoryEmoji}</div>`,
                     iconSize: [30, 30],
                     iconAnchor: [15, 15]
                   })}
                 >
                   <Popup>
                     <div className="space-y-2">
                       <div className="flex items-center justify-between">
                         <p className="font-bold text-lg">{incident.category}</p>
                         <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                           incident.status === 'Open' ? 'bg-red-900 text-red-200' :
                           incident.status === 'In Progress' ? 'bg-yellow-900 text-yellow-200' :
                           'bg-green-900 text-green-200'
                         }`}>
                           {incident.status}
                         </span>
                       </div>
                       {incident.description && (
                         <p className="text-sm text-gray-700">{incident.description}</p>
                       )}
                       {incident.address && (
                         <p className="text-sm text-blue-600 font-medium">📍 {incident.address}</p>
                       )}
                       <div className="flex items-center gap-2">
                         <span className="text-xs text-gray-500">Priority: {incident.priority}</span>
                         {incident.id && (
                           <span className="text-xs text-gray-400">ID: {incident.id}</span>
                         )}
                       </div>
                       {incident.created_at && (
                         <p className="text-xs text-gray-400">
                           Created: {new Date(incident.created_at).toLocaleDateString()}
                         </p>
                       )}
                                             </div>
                    </Popup>
                  </Marker>
                );
              })}
            </MarkerClusterGroup>
          )}

         {viewMode === "heatmap" && (
          <HeatmapLayer 
            incidents={filteredIncidents} 
            layerKey={`heatmap-${filteredIncidents.length}-${selectedCategory}-${selectedPriority}`}
          />
        )}

        {/* Potential Incidents View - Show hotspots and predictions */}
        {viewMode === "potential" && (
          <>
            {trendData ? (
              <>
                {/* Hotspot Markers */}
                {trendData.hotspots && trendData.hotspots.map((hotspot, index) => {
                  const riskColor = hotspot.risk_score > 70 ? '#ef4444' : 
                                   hotspot.risk_score > 40 ? '#f59e0b' : '#10b981';
                  
                  const hotspotIcon = L.divIcon({
                    className: 'hotspot-marker',
                    html: `<div style="
                      width: 30px; 
                      height: 30px; 
                      background-color: ${riskColor}; 
                      border: 3px solid white; 
                      border-radius: 50%; 
                      box-shadow: 0 4px 8px rgba(0,0,0,0.3);
                      display: flex;
                      align-items: center;
                      justify-content: center;
                      color: white;
                      font-weight: bold;
                      font-size: 12px;
                    ">🔥</div>`,
                    iconSize: [30, 30],
                    iconAnchor: [15, 15]
                  });

                  return (
                    <Marker
                      key={`hotspot-${hotspot.center.latitude}-${hotspot.center.longitude}-${index}`}
                      position={[hotspot.center.latitude, hotspot.center.longitude]}
                      icon={hotspotIcon}
                    >
                      <Popup>
                        <div className="space-y-2">
                                                     <div className="flex items-center justify-between">
                             <p className="font-bold text-lg">🔥 Hotspot #{index + 1}</p>
                             <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                               hotspot.risk_score > 70 ? 'bg-red-900 text-red-200' :
                               hotspot.risk_score > 40 ? 'bg-yellow-900 text-yellow-200' :
                               'bg-green-900 text-green-200'
                             }`}>
                               {hotspot.risk_score}% Risk
                             </span>
                           </div>
                          <div className="text-sm text-gray-800 bg-gray-50 p-2 rounded border border-gray-200">
                            <p><strong>Category:</strong> {hotspot.most_common_category}</p>
                            <p><strong>Priority:</strong> {hotspot.most_common_priority}</p>
                            <p><strong>Incidents:</strong> {hotspot.incident_count}</p>
                            <p><strong>Radius:</strong> {hotspot.radius_km}km</p>
                          </div>
                          <div className="text-xs text-gray-600 bg-gray-50 p-2 rounded border border-gray-200">
                            <p>Location: {hotspot.location_name || `${hotspot.center.latitude.toFixed(4)}, ${hotspot.center.longitude.toFixed(4)}`}</p>
                            {hotspot.location_name && (
                              <p className="text-xs text-gray-500">Coordinates: {hotspot.center.latitude.toFixed(4)}, {hotspot.center.longitude.toFixed(4)}</p>
                            )}
                          </div>
                          <div className="text-xs text-orange-600 bg-orange-50 p-2 rounded border border-orange-200">
                            <p><strong>🔥 What this means:</strong></p>
                            <p>This area has a high concentration of {hotspot.most_common_category?.toLowerCase()} incidents, indicating a potential problem zone that needs attention.</p>
                          </div>
                        </div>
                      </Popup>
                    </Marker>
                  );
                })}

                {/* Prediction Markers */}
                {trendData.predictions && trendData.predictions.map((prediction, index) => {
                  const confidenceColor = prediction.confidence > 70 ? '#ef4444' : 
                                        prediction.confidence > 40 ? '#f59e0b' : '#10b981';
                  
                  const predictionIcon = L.divIcon({
                    className: 'prediction-marker',
                    html: `<div style="
                      width: 25px; 
                      height: 25px; 
                      background-color: ${confidenceColor}; 
                      border: 2px solid white; 
                      border-radius: 50%; 
                      box-shadow: 0 2px 4px rgba(0,0,0,0.3);
                      display: flex;
                      align-items: center;
                      justify-content: center;
                      color: white;
                      font-weight: bold;
                      font-size: 10px;
                    ">🔮</div>`,
                    iconSize: [25, 25],
                    iconAnchor: [12.5, 12.5]
                  });

                  return (
                    <Marker
                      key={`prediction-${prediction.latitude}-${prediction.longitude}-${index}`}
                      position={[prediction.latitude, prediction.longitude]}
                      icon={predictionIcon}
                    >
                      <Popup>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <p className="font-bold text-lg">🔮 Prediction #{index + 1}</p>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              prediction.confidence > 70 ? 'bg-red-900 text-red-200' :
                              prediction.confidence > 40 ? 'bg-yellow-900 text-yellow-200' :
                              'bg-green-900 text-green-200'
                            }`}>
                              {prediction.confidence}% Confidence
                            </span>
                          </div>
                          <div className="text-sm text-gray-800 bg-gray-50 p-2 rounded border border-gray-200">
                            <p><strong>Predicted Category:</strong> {prediction.predicted_category}</p>
                            <p><strong>Predicted Priority:</strong> {prediction.predicted_priority}</p>
                            <p><strong>Based on:</strong> Hotspot #{prediction.hotspot_id + 1}</p>
                            <p><strong>AI Confidence:</strong> {prediction.confidence}%</p>
                          </div>
                          <div className="text-xs text-gray-600 bg-gray-50 p-2 rounded border border-gray-200">
                            <p>Location: {prediction.location_name || `${prediction.latitude.toFixed(4)}, ${prediction.longitude.toFixed(4)}`}</p>
                            {prediction.location_name && (
                              <p className="text-xs text-gray-500">Coordinates: {prediction.latitude.toFixed(4)}, {prediction.longitude.toFixed(4)}</p>
                            )}
                          </div>
                          <div className="text-xs text-blue-600 bg-blue-50 p-2 rounded border border-blue-200">
                            <p><strong>💡 What this means:</strong></p>
                            <p>AI predicts a {prediction.predicted_category?.toLowerCase()} incident may occur here with {prediction.predicted_priority?.toLowerCase()} priority.</p>
                          </div>
                        </div>
                      </Popup>
                    </Marker>
                  );
                })}
              </>
            ) : (
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-gray-900 bg-opacity-90 p-8 rounded-xl shadow-2xl text-center border border-gray-700 z-[1000]">
                <div className="text-6xl mb-4">⏳</div>
                <h3 className="text-xl font-semibold text-white mb-3">Loading Predictions</h3>
                <p className="text-gray-300 text-sm">Please wait while we analyze incident data...</p>
              </div>
            )}
          </>
        )}
        </MapContainer>
      </div>
      
      {/* Debug info - Enhanced Dark Theme */}
      <div className="mt-6 p-4 bg-gray-800 rounded-xl border border-gray-700 shadow-lg">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div className="text-sm text-gray-300">
            {viewMode === "potential" ? (
              <>
                {trendData ? (
                  <>
                    🔥 Hotspots: {trendData.hotspots?.length || 0} | 
                    🔮 Predictions: {trendData.predictions?.length || 0} | 
                    📊 Analyzed: {trendData.total_analyzed || 0} incidents
                  </>
                ) : (
                  "⏳ Loading trend analysis..."
                )}
              </>
            ) : (
              <>
                📍 Showing {filteredIncidents.length} of {allIncidents.length} incidents
                {selectedCategory !== "All" && ` | 🏷️ Category: ${selectedCategory}`}
                {selectedPriority !== "All" && ` | ⚡ Priority: ${selectedPriority}`}
                {selectedStatus !== "All" && ` | 📋 Status: ${selectedStatus}`}
              </>
            )}
            {userLocation && (
              <span className="ml-2 text-teal-400">
                📍 Location tracked
              </span>
            )}
          </div>
          <div className="text-right">
            <span className="font-medium text-white">
              🎯 Mode: {
                viewMode === "markers" ? "Markers" : 
                viewMode === "icons" ? "Icons" : 
                viewMode === "heatmap" ? "Heatmap" : 
                "Predictions"
              }
            </span>
            {viewMode === "heatmap" && (
              <div className="text-xs mt-2 text-gray-400">
                <span className="inline-block w-3 h-3 bg-blue-500 mr-1 rounded"></span>Low
                <span className="inline-block w-3 h-3 bg-yellow-500 mr-1 ml-2 rounded"></span>Medium
                <span className="inline-block w-3 h-3 bg-red-500 mr-1 ml-2 rounded"></span>High
                <div className="mt-1">🔥 Heat points: {filteredIncidents.length}</div>
              </div>
            )}
            {viewMode === "potential" && trendData && (
              <div className="text-xs mt-2 text-gray-400">
                <span className="inline-block w-3 h-3 bg-red-500 mr-1 rounded"></span>High Risk
                <span className="inline-block w-3 h-3 bg-yellow-500 mr-1 ml-2 rounded"></span>Medium Risk
                <span className="inline-block w-3 h-3 bg-green-500 mr-1 ml-2 rounded"></span>Low Risk
                <div className="mt-1">
                  🔥 Hotspots: {trendData.hotspots?.length || 0} | 
                  🔮 Predictions: {trendData.predictions?.length || 0}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}




