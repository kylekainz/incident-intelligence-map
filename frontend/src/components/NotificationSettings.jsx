import React, { useState, useEffect } from 'react';

const NotificationSettings = ({ isVisible, onClose, notifications }) => {
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [radiusMiles, setRadiusMiles] = useState(3);
  const [userLocation, setUserLocation] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  // Get existing user location from the map if available
  useEffect(() => {
    // Check if we already have location from the map
    if (window.userLocation) {
      setUserLocation(window.userLocation);
    }
    
    // Also check if notifications were previously enabled
    const savedEnabled = localStorage.getItem('notificationsEnabled');
    if (savedEnabled === 'true' && window.userLocation) {
      setNotificationsEnabled(true);
    }
  }, []);

  useEffect(() => {
    // Load saved settings from localStorage
    const savedEnabled = localStorage.getItem('notificationsEnabled');
    const savedRadius = localStorage.getItem('notificationRadiusMiles');
    
    if (savedEnabled !== null) {
      setNotificationsEnabled(savedEnabled === 'true');
    }
    if (savedRadius !== null) {
      setRadiusMiles(parseInt(savedRadius));
    }
  }, []);

  const handleEnableNotifications = async () => {
    // Check if we have location from the map
    if (!userLocation && window.userLocation) {
      setUserLocation(window.userLocation);
    }
    
    if (!userLocation) {
      // Try to get location if we don't have it
      setIsLoading(true);
      try {
        const position = await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
          });
        });

        const { latitude, longitude } = position.coords;
        const newLocation = { lat: latitude, lng: longitude };
        setUserLocation(newLocation);
        
        // Enable notifications
        setNotificationsEnabled(true);
        localStorage.setItem('notificationsEnabled', 'true');
        localStorage.setItem('notificationRadiusMiles', radiusMiles.toString());
        
        // Send location to backend for notifications
        if (window.wsRef && window.wsRef.current && window.wsRef.current.readyState === WebSocket.OPEN) {
          const radiusMeters = Math.round(radiusMiles * 1609.34); // Convert miles to meters
          window.wsRef.current.send(JSON.stringify({
            type: 'register_user',
            data: {
              user_id: `user_${Date.now()}`,
              latitude: latitude,
              longitude: longitude,
              notification_radius: radiusMeters
            }
          }));
        } else {
          console.log('WebSocket not connected, waiting for connection...');
        }
      } catch (error) {
        console.error('Failed to get location:', error);
        alert('Please enable location access to receive notifications');
      } finally {
        setIsLoading(false);
      }
    } else {
      // Already have location, just enable
      setNotificationsEnabled(true);
      localStorage.setItem('notificationsEnabled', 'true');
      localStorage.setItem('notificationRadiusMiles', radiusMiles.toString());
      
      // Update radius on backend
      if (window.wsRef && window.wsRef.current && window.wsRef.current.readyState === WebSocket.OPEN) {
        const radiusMeters = Math.round(radiusMiles * 1609.34);
        window.wsRef.current.send(JSON.stringify({
          type: 'update_location',
          data: {
            user_id: `user_${Date.now()}`,
            latitude: userLocation.lat,
            longitude: userLocation.lng,
            notification_radius: radiusMeters
          }
        }));
      } else {
        console.log('WebSocket not connected, waiting for connection...');
      }
    }
  };

  const handleDisableNotifications = () => {
    setNotificationsEnabled(false);
    localStorage.setItem('notificationsEnabled', 'false');
    setUserLocation(null);
  };

  const handleRadiusChange = (newRadius) => {
    setRadiusMiles(newRadius);
    localStorage.setItem('notificationRadiusMiles', newRadius.toString());
    
    // Update radius on backend if notifications are enabled
    if (notificationsEnabled && userLocation && window.wsRef && window.wsRef.current && window.wsRef.current.readyState === WebSocket.OPEN) {
      const radiusMeters = Math.round(newRadius * 1609.34);
      window.wsRef.current.send(JSON.stringify({
        type: 'update_location',
        data: {
          user_id: `user_${Date.now()}`,
          latitude: userLocation.lat,
          longitude: userLocation.lng,
          notification_radius: radiusMeters
        }
      }));
    } else if (notificationsEnabled && userLocation) {
      console.log('WebSocket not connected, waiting for connection...');
    }
  };

  if (!isVisible) return null;

  return (
    <div className="fixed left-0 top-0 h-full w-80 bg-gray-800 border-r border-gray-700 shadow-2xl z-50 overflow-y-auto">
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-white">🔔 Notification Settings</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-2xl font-bold hover:bg-gray-700 rounded-full w-8 h-8 flex items-center justify-center transition-colors"
          >
            ×
          </button>
        </div>

        <div className="space-y-6">
          {/* Enable/Disable Toggle */}
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium text-white">Enable Notifications</h3>
              <p className="text-sm text-gray-300">Get notified about incidents near your location</p>
            </div>
            <button
              onClick={notificationsEnabled ? handleDisableNotifications : handleEnableNotifications}
              disabled={isLoading}
              className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                notificationsEnabled
                  ? 'bg-red-600 text-white hover:bg-red-700'
                  : 'bg-teal-600 text-white hover:bg-teal-700'
              } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {isLoading ? 'Loading...' : notificationsEnabled ? 'Disable' : 'Enable'}
            </button>
          </div>

          {/* Radius Setting */}
          <div>
            <label className="block text-sm font-medium text-white mb-2">
              Notification Radius: {radiusMiles} mile{radiusMiles !== 1 ? 's' : ''}
            </label>
            <input
              type="range"
              min="1"
              max="25"
              value={radiusMiles}
              onChange={(e) => handleRadiusChange(parseInt(e.target.value))}
              className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
              disabled={!notificationsEnabled}
            />
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>1 mile</span>
              <span>25 miles</span>
            </div>
          </div>

          {/* Status Display */}
          {notificationsEnabled && userLocation && (
            <div className="bg-green-900/20 border border-green-600 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-green-400">✅</span>
                <span className="text-green-400 font-medium">Notifications Active</span>
              </div>
              <p className="text-sm text-green-300">
                You'll be notified about incidents within {radiusMiles} mile{radiusMiles !== 1 ? 's' : ''} of your location
              </p>
              <p className="text-xs text-green-400 mt-2">
                Location: {userLocation.lat.toFixed(4)}, {userLocation.lng.toFixed(4)}
              </p>
            </div>
          )}

          {notificationsEnabled && !userLocation && (
            <div className="bg-yellow-900/20 border border-yellow-600 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-yellow-400">⚠️</span>
                <span className="text-yellow-400 font-medium">Location Required</span>
              </div>
              <p className="text-sm text-yellow-300">
                Please enable location access to receive notifications
              </p>
            </div>
          )}

          {/* Notifications Display */}
          <div className="bg-gray-700 rounded-lg p-4">
            <h4 className="font-medium text-white mb-3">Recent Notifications</h4>
            {notifications && notifications.length > 0 ? (
              <div className="space-y-3 max-h-80 overflow-y-auto">
                {notifications.map((notification, index) => (
                  <div
                    key={index}
                    className={`p-3 rounded-lg border ${
                      notification.type === 'area' 
                        ? 'border-purple-600 bg-purple-900/20' 
                        : notification.type === 'info'
                        ? 'border-blue-600 bg-blue-900/20'
                        : 'border-gray-600 bg-gray-900/20'
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <span className="text-lg">
                        {notification.type === 'area' ? '📍' : 
                         notification.type === 'info' ? 'ℹ️' : '📢'}
                      </span>
                      <div className="flex-1 min-w-0">
                        <h5 className="font-medium text-white text-sm">
                          {notification.title}
                        </h5>
                        <p className="text-gray-300 text-xs mt-1">
                          {notification.message}
                        </p>
                        {notification.incident && notification.incident.description && (
                          <p className="text-gray-300 text-xs mt-2 italic">
                            {notification.incident.description}
                          </p>
                        )}
                        {notification.details && (
                          <div className="mt-2 text-xs text-gray-400">
                            {notification.details.category && (
                              <span className="inline-block bg-gray-600 px-2 py-1 rounded mr-2">
                                {notification.details.category}
                              </span>
                            )}
                            {notification.details.priority && (
                              <span className="inline-block bg-gray-600 px-2 py-1 rounded mr-2">
                                {notification.details.priority}
                              </span>
                            )}
                            {notification.details.distance && (
                              <span className="inline-block bg-purple-600 px-2 py-1 rounded">
                                {notification.details.distance}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-400 text-sm text-center py-4">
                No notifications yet. Enable notifications to get started!
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotificationSettings;
