// App.jsx - Updated with WebSocket
import React, { useState, useEffect, useRef } from 'react';
import './App.css';
import IncidentMap from './components/IncidentMap';
import IncidentForm from './components/IncidentForm';
import AdminPanel from './components/AdminPanel';
import LoginModal from './components/LoginModal';
import DataAnalytics from './components/DataAnalytics';
import NotificationPanel from './components/NotificationPanel';
import NotificationSettings from './components/NotificationSettings';

function App() {
  const [incidents, setIncidents] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showDataAnalytics, setShowDataAnalytics] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showNotificationSettings, setShowNotificationSettings] = useState(false);
  const [isMapExpanded, setIsMapExpanded] = useState(false);
  const [recentlyUpdatedIncidents, setRecentlyUpdatedIncidents] = useState(new Set());
  const wsRef = useRef(null);



  useEffect(() => {
    // Initialize WebSocket connection
    const connectWebSocket = () => {
      const ws = new WebSocket('ws://localhost:8000/ws');
      wsRef.current = ws;
      // Make WebSocket reference globally accessible for notification settings
      window.wsRef = wsRef;

      ws.onopen = () => {
        console.log('WebSocket connected');
        setIsConnected(true);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('WebSocket message received:', JSON.stringify(data, null, 2));
          if (data.type === 'new_incident') {
            setIncidents(prev => {
              const existingIndex = prev.findIndex(inc => inc.id === data.data.id);
              if (existingIndex >= 0) {
                const updated = [...prev];
                updated[existingIndex] = data.data;
                return updated;
              } else {
                return [...prev, data.data];
              }
            });
          } else if (data.type === 'status_update') {
            setIncidents(prev => {
              const existingIndex = prev.findIndex(inc => inc.id === data.data.id);
              if (existingIndex >= 0) {
                const updated = [...prev];
                updated[existingIndex] = data.data;
                return updated;
              }
              return prev;
            });
          } else if (data.type === 'incident_deleted') {
            console.log('Received deletion message for incident ID:', data.data.id);
            setIncidents(prev => prev.filter(inc => inc.id !== data.data.id));
          } else if (data.type === 'notification') {
            setNotifications(prev => [...prev, data.notification]);
          } else if (data.type === 'area_notification') {
            // Handle area notifications for incidents near user
            const distanceMiles = (data.data.distance * 0.000621371).toFixed(1); // Convert meters to miles
            setNotifications(prev => [...prev, {
              type: 'area',
              title: 'Incident Nearby',
              message: `New ${data.data.incident.category} incident reported ${distanceMiles} miles from your location`,
              details: {
                category: data.data.incident.category,
                priority: data.data.incident.priority,
                distance: `${distanceMiles} miles`
              },
              incident: data.data.incident
            }]);
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      ws.onclose = () => {
        console.log('WebSocket disconnected');
        setIsConnected(false);
        // Attempt to reconnect after 3 seconds
        setTimeout(connectWebSocket, 3000);
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };
    };

    connectWebSocket();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  // Check token expiration every minute
  useEffect(() => {
    const checkTokenExpiration = () => {
      const token = localStorage.getItem('adminToken');
      if (token) {
        try {
          // Decode JWT token to check expiration
          const payload = JSON.parse(atob(token.split('.')[1]));
          const currentTime = Math.floor(Date.now() / 1000);
          const timeLeft = payload.exp - currentTime;
          
          if (timeLeft > 0) {
            // Auto logout when expired
            if (timeLeft <= 0) {
              console.log('Token expired, logging out automatically');
              handleLogout();
            }
          } else {
            console.log('Token expired, logging out automatically');
            handleLogout();
          }
        } catch (error) {
          console.error('Error checking token expiration:', error);
          // If token is malformed, remove it and logout
          handleLogout();
        }
      }
    };

    // Check immediately
    checkTokenExpiration();
    
    // Check every minute for expiration
    const interval = setInterval(checkTokenExpiration, 60000);
    
    return () => clearInterval(interval);
  }, []);

  const handleMapClick = (location) => {
    setSelectedLocation(location);
  };

  const handleIncidentsUpdate = (updatedIncidents) => {
    setIncidents(updatedIncidents);
    
    // Track which incidents were recently manually updated
    const updatedIds = new Set();
    incidents.forEach(inc => {
      const updated = updatedIncidents.find(u => u.id === inc.id);
      if (updated && (updated.priority !== inc.priority || updated.status !== inc.status)) {
        updatedIds.add(inc.id);
      }
    });
    
    // Add to recently updated set
    setRecentlyUpdatedIncidents(prev => new Set([...prev, ...updatedIds]));
    
    // Clear from recently updated after 5 seconds
    setTimeout(() => {
      setRecentlyUpdatedIncidents(prev => {
        const newSet = new Set(prev);
        updatedIds.forEach(id => newSet.delete(id));
        return newSet;
      });
    }, 5000);
  };

  const handleIncidentSelect = (incident) => {
    if (showAdminPanel) {
      // If admin panel is open, you might want to highlight the incident
      console.log('Incident selected:', incident);
    }
  };

  const handleNewIncident = (newIncident) => {
    setIncidents(prev => [...prev, newIncident]);
    setSelectedLocation(null);
  };

  const handleCloseForm = () => {
    setSelectedLocation(null);
  };

  const handleLogout = () => {
    // Clear the auth token
    localStorage.removeItem('adminToken');
    // Clear session timer
    // setSessionTimeLeft(null); // Removed as per edit hint
    // Close admin panel and login modal
    setShowAdminPanel(false);
    setShowLoginModal(false);
  };

  // Check JWT token expiration every 5 minutes
  useEffect(() => {
    const checkTokenExpiration = () => {
      const token = localStorage.getItem('adminToken');
      if (token) {
        try {
          // Decode JWT token to check expiration
          const payload = JSON.parse(atob(token.split('.')[1]));
          const currentTime = Math.floor(Date.now() / 1000);
          
          if (payload.exp && payload.exp < currentTime) {
            // Token expired, log out user
            handleLogout();
          }
        } catch (error) {
          // If token is invalid, log out user
          handleLogout();
        }
      }
    };

    // Check every 5 minutes (300000 ms)
    const interval = setInterval(checkTokenExpiration, 300000);
    
    // Initial check
    checkTokenExpiration();
    
    return () => clearInterval(interval);
  }, []);

  // Check if any modal is open (excluding notification settings since we want map visible)
  const isAnyModalOpen = selectedLocation || showAdminPanel || showLoginModal || showDataAnalytics || showHelp;

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100">
      {/* Top Navigation Bar */}
      <nav className="bg-gray-800 border-b border-gray-700 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo and Title */}
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-teal-500 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">I</span>
              </div>
              <h1 className="text-xl font-bold text-white">Incident Intelligence</h1>
            </div>

            {/* Navigation Items */}
            <div className="flex items-center space-x-6">
              <button
                onClick={() => setShowDataAnalytics(!showDataAnalytics)}
                className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                  showDataAnalytics 
                    ? 'bg-teal-600 text-white shadow-lg' 
                    : 'bg-gray-700 text-gray-200 hover:bg-gray-600 hover:text-white'
                }`}
              >
                {showDataAnalytics ? '📊 Exit Analytics' : '📊 Data Analytics'}
              </button>

              <button
                onClick={() => setShowNotificationSettings(true)}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-all duration-200 shadow-md hover:shadow-lg"
              >
                🔔 Notifications
              </button>

              <button
                onClick={() => setShowHelp(true)}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-all duration-200 shadow-md hover:shadow-lg"
              >
                ❓ Help & FAQ
              </button>

              {localStorage.getItem('adminToken') ? (
                <>
                  <button
                    onClick={() => setShowAdminPanel(true)}
                    className="px-4 py-2 bg-teal-600 text-white rounded-lg font-medium hover:bg-teal-700 transition-all duration-200 shadow-md hover:shadow-lg"
                  >
                    🛠️ Admin Panel
                  </button>
                  <button
                    onClick={handleLogout}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-all duration-200 shadow-md hover:shadow-lg"
                  >
                    Logout
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setShowLoginModal(true)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-all duration-200 shadow-md hover:shadow-lg"
                >
                  🔐 Admin Login
                </button>
              )}

              {/* Connection Status */}
              <div className="flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400' : 'bg-red-400'}`}></div>
                <span className="text-sm text-gray-300">
                  {isConnected ? 'Connected' : 'Disconnected'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content Area - Show when no modals are open, or adjust for notification panel */}
      {(!isAnyModalOpen || showNotificationSettings) && !selectedLocation ? (
        <div className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 transition-all duration-300 ${
          showNotificationSettings ? 'ml-80' : ''
        }`}>
          {/* Map Expansion Toggle */}
          <div className="mb-6 flex justify-between items-center">
            <h2 className="text-2xl font-bold text-white">Interactive Incident Map</h2>
            <button
              onClick={() => setIsMapExpanded(!isMapExpanded)}
              className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                isMapExpanded 
                  ? 'bg-gray-700 text-gray-200 hover:bg-gray-600' 
                  : 'bg-teal-600 text-white hover:bg-teal-700 shadow-md hover:shadow-lg'
              }`}
            >
              {isMapExpanded ? '📱 Compact View' : '🖥️ Expand Map'}
            </button>
          </div>

          {/* Map Container */}
          <div className={`transition-all duration-300 ease-in-out ${
            isMapExpanded 
              ? 'fixed inset-0 z-50 bg-gray-900' 
              : 'relative bg-gray-800 rounded-xl shadow-2xl border border-gray-700'
          }`}>
            {isMapExpanded && (
              <div className="absolute top-4 right-4 z-[1001]">
                <button
                  onClick={() => setIsMapExpanded(false)}
                  className="w-10 h-10 bg-gray-800 text-white rounded-full flex items-center justify-center hover:bg-gray-700 transition-all duration-200 shadow-lg"
                >
                  ✕
                </button>
              </div>
            )}
            
            <IncidentMap
              incidents={incidents}
              onMapClick={handleMapClick}
              onIncidentsUpdate={handleIncidentsUpdate}
              onIncidentSelect={handleIncidentSelect}
              isExpanded={isMapExpanded}
            />
          </div>

          {/* Notification Panel - Hidden when notification settings is open */}
          {!showNotificationSettings && (
            <NotificationPanel
              notifications={[]}
              onClear={() => setNotifications([])}
            />
          )}
        </div>
      ) : null}

      {/* Incident Form Modal */}
      {selectedLocation && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-xl shadow-2xl w-full max-w-md border border-gray-700">
            <IncidentForm
              location={selectedLocation}
              onSubmit={handleNewIncident}
              onClose={handleCloseForm}
            />
          </div>
        </div>
      )}

      {/* Admin Panel Modal */}
      {showAdminPanel && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-xl shadow-2xl w-full max-w-6xl h-[90vh] border border-gray-700">
            <AdminPanel
              incidents={incidents}
              onClose={() => setShowAdminPanel(false)}
              onIncidentsUpdate={handleIncidentsUpdate}
              // sessionTimeLeft={sessionTimeLeft} // Removed as per edit hint
            />
          </div>
        </div>
      )}

      {/* Login Modal */}
      {showLoginModal && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-xl shadow-2xl w-full max-w-md border border-gray-700">
            <LoginModal
              onClose={() => setShowLoginModal(false)}
              onLoginSuccess={(token) => {
                // Store the auth token
                localStorage.setItem('adminToken', token);
                setShowLoginModal(false);
                setShowAdminPanel(true);
              }}
            />
          </div>
        </div>
      )}

      {/* Data Analytics Modal */}
      {showDataAnalytics && (
        <DataAnalytics
          isVisible={showDataAnalytics}
          onClose={() => setShowDataAnalytics(false)}
          incidents={incidents}
        />
      )}

      {/* Notification Settings Modal */}
              {showNotificationSettings && (
          <NotificationSettings
            isVisible={showNotificationSettings}
            onClose={() => setShowNotificationSettings(false)}
            notifications={notifications}
          />
        )}

      {/* Help Modal */}
      {showHelp && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto border border-gray-700">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-white">❓ Help & FAQ</h2>
                <button
                  onClick={() => setShowHelp(false)}
                  className="text-gray-400 hover:text-white text-2xl font-bold hover:bg-gray-700 rounded-full w-8 h-8 flex items-center justify-center transition-colors"
                >
                  ×
                </button>
              </div>
              
              <div className="space-y-6">
                {/* What is this app */}
                <div className="bg-gray-700 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-white mb-2">🚀 What is Incident Intelligence?</h3>
                  <p className="text-gray-300">
                    Incident Intelligence is a real-time incident reporting and management system that helps communities 
                    track and respond to various types of incidents like potholes, traffic issues, street light problems, 
                    and more. It combines interactive mapping, AI-powered analytics, and real-time notifications to 
                    provide comprehensive incident intelligence.
                  </p>
                </div>

                {/* Key Features */}
                <div className="bg-gray-700 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-white mb-3">✨ Key Features</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <h4 className="font-medium text-teal-300">🗺️ Interactive Map</h4>
                      <p className="text-sm text-gray-300">View incidents on an interactive map with multiple view modes</p>
                      
                      <h4 className="font-medium text-teal-300">📱 Real-time Reporting</h4>
                      <p className="text-sm text-gray-300">Report new incidents by clicking on the map</p>
                      
                      <h4 className="font-medium text-teal-300">🔔 Live Notifications</h4>
                      <p className="text-sm text-gray-300">Get real-time updates about new incidents and area-based notifications</p>
                      
                      <h4 className="font-medium text-teal-300">📍 Location-Based Alerts</h4>
                      <p className="text-sm text-gray-300">Set notification radius and get alerts for incidents near you</p>
                      
                      <h4 className="font-medium text-teal-300">📊 Data Analytics</h4>
                      <p className="text-sm text-gray-300">View charts and statistics about incident patterns</p>
                    </div>
                    <div className="space-y-2">
                      <h4 className="font-medium text-teal-300">🤖 AI Predictions</h4>
                      <p className="text-sm text-gray-300">AI-powered hotspot detection and incident predictions</p>
                      
                      <h4 className="font-medium text-teal-300">👮‍♂️ Admin Management</h4>
                      <p className="text-sm text-gray-300">Admin panel for managing incident status and priority</p>
                      
                      <h4 className="font-medium text-teal-300">📍 Location Tracking</h4>
                      <p className="text-sm text-gray-300">Track your location and nearby incidents</p>
                      
                      <h4 className="font-medium text-teal-300">🌐 WebSocket Updates</h4>
                      <p className="text-sm text-gray-300">Real-time data synchronization across all users</p>
                    </div>
                  </div>
                </div>

                {/* How to Use */}
                <div className="bg-gray-700 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-white mb-3">📖 How to Use</h3>
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-medium text-blue-300 mb-2">🎯 Viewing Incidents</h4>
                      <ul className="text-sm text-gray-300 space-y-1 ml-4">
                        <li>• <strong>Markers View:</strong> See incidents as colored dots (red=open, yellow=in progress, green=resolved)</li>
                        <li>• <strong>Icons View:</strong> View incidents with category-specific emojis</li>
                        <li>• <strong>Heatmap View:</strong> See incident density as a color-coded heatmap</li>
                        <li>• <strong>Predictions View:</strong> View AI-generated hotspots and predicted incident locations</li>
                      </ul>
                    </div>
                    
                    <div>
                      <h4 className="font-medium text-blue-300 mb-2">📝 Reporting Incidents</h4>
                      <ul className="text-sm text-gray-300 space-y-1 ml-4">
                        <li>• Click anywhere on the map to open the incident form</li>
                        <li>• Select the incident category (Pothole, Wildlife, Traffic, etc.)</li>
                        <li>• Set priority level (Low, Medium, High)</li>
                        <li>• Add a description and submit</li>
                      </ul>
                    </div>
                    
                    <div>
                      <h4 className="font-medium text-blue-300 mb-2">🔍 Filtering & Search</h4>
                      <ul className="text-sm text-gray-300 space-y-1 ml-4">
                        <li>• Use category, priority, and status filters to find specific incidents</li>
                        <li>• Clear all filters with the "Clear Filters" button</li>
                        <li>• Center the map on your location with "My Location" button</li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Admin Features */}
                <div className="bg-gray-700 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-white mb-3">🛠️ Admin Features</h3>
                  <div className="space-y-3">
                    <p className="text-gray-300">
                      <strong>Login:</strong> Use "admin" as username and "password" as password to access admin features.
                    </p>
                    <div className="space-y-2">
                      <h4 className="font-medium text-yellow-300">Admin Panel Capabilities:</h4>
                      <ul className="text-sm text-gray-300 space-y-1 ml-4">
                        <li>• View all incidents in a searchable list</li>
                        <li>• Update incident status (Open → In Progress → Resolved)</li>
                        <li>• Change incident priority levels</li>
                        <li>• Delete incidents</li>
                        <li>• Access detailed trend analysis and AI insights</li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Data Analytics */}
                <div className="bg-gray-700 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-white mb-3">📊 Data Analytics</h3>
                  <p className="text-gray-300 mb-3">
                    The Data Analytics tab provides comprehensive insights into incident patterns and trends:
                  </p>
                  <ul className="text-sm text-gray-300 space-y-1 ml-4">
                    <li>• <strong>Category Distribution:</strong> See which types of incidents are most common</li>
                    <li>• <strong>Priority Analysis:</strong> Understand the urgency distribution of incidents</li>
                    <li>• <strong>Status Overview:</strong> Track how many incidents are open, in progress, or resolved</li>
                    <li>• <strong>Time Series:</strong> View incident trends over time</li>
                    <li>• <strong>Response Times:</strong> Analyze how quickly incidents are being addressed</li>
                  </ul>
                </div>

                {/* AI & Predictions */}
                <div className="bg-gray-700 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-white mb-3">🤖 AI & Machine Learning</h3>
                  <p className="text-gray-300 mb-3">
                    Our AI system analyzes incident data to provide intelligent insights:
                  </p>
                  <ul className="text-sm text-gray-300 space-y-1 ml-4">
                    <li>• <strong>Hotspot Detection:</strong> Identifies areas with high incident concentration</li>
                    <li>• <strong>Risk Assessment:</strong> Calculates risk scores based on multiple factors</li>
                    <li>• <strong>Incident Prediction:</strong> Predicts where future incidents might occur</li>
                    <li>• <strong>Pattern Recognition:</strong> Analyzes temporal and spatial patterns</li>
                    <li>• <strong>Confidence Scoring:</strong> Provides reliability metrics for predictions</li>
                  </ul>
                </div>

                {/* Location-Based Notifications */}
                <div className="bg-gray-700 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-white mb-3">🔔 Location-Based Notifications</h3>
                  <p className="text-gray-300 mb-3">
                    Stay informed about incidents in your area with customizable notifications:
                  </p>
                  <ul className="text-sm text-gray-300 space-y-1 ml-4">
                    <li>• <strong>Enable Notifications:</strong> Click the "🔔 Notifications" button in the top navigation</li>
                    <li>• <strong>Set Your Radius:</strong> Choose notification radius from 1 to 25 miles</li>
                    <li>• <strong>Location Access:</strong> Grant location permission when prompted</li>
                    <li>• <strong>Real-Time Alerts:</strong> Get notified about new incidents within your radius</li>
                    <li>• <strong>Smart Filtering:</strong> Only receive notifications for incidents that matter to you</li>
                    <li>• <strong>Distance Information:</strong> See exactly how far incidents are from your location</li>
                  </ul>
                  <div className="mt-3 p-3 bg-purple-900/20 border border-purple-600 rounded-lg">
                    <p className="text-sm text-purple-300">
                      <strong>💡 Pro Tip:</strong> Set a smaller radius (1-5 miles) for immediate local alerts, or a larger radius (10-25 miles) for broader area awareness.
                    </p>
                  </div>
                </div>


              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;