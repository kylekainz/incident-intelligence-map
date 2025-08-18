import { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { Marker, useMap } from 'react-leaflet';
import L from 'leaflet';

export default function UserLocationMarker({ onLocationUpdate }) {
  const [userLocation, setUserLocation] = useState(null);
  const [accuracy, setAccuracy] = useState(null);
  const [isTracking, setIsTracking] = useState(false);
  const [error, setError] = useState(null);
  const map = useMap();
  const watchIdRef = useRef(null);
  const hasCenteredRef = useRef(false);

  // Memoize the icon creation to prevent unnecessary re-renders
  const userLocationIcon = useMemo(() => {
    return L.divIcon({
      className: 'user-location-marker',
      html: `
        <div style="
          position: relative;
          width: 20px; 
          height: 20px; 
          background-color: #3b82f6; 
          border: 3px solid white; 
          border-radius: 50%; 
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: bold;
          font-size: 12px;
        ">📍</div>
        ${accuracy ? `
          <div style="
            position: absolute;
            top: -${accuracy}px;
            left: -${accuracy}px;
            width: ${accuracy * 2}px;
            height: ${accuracy * 2}px;
            border: 2px solid #3b82f6;
            border-radius: 50%;
            opacity: 0.3;
            pointer-events: none;
          "></div>
        ` : ''}
      `,
      iconSize: [20, 20],
      iconAnchor: [10, 10]
    });
  }, [accuracy]);

  // Memoize the location update callback
  const handleLocationUpdate = useCallback((newLocation, newAccuracy) => {
    if (onLocationUpdate) {
      onLocationUpdate(newLocation, newAccuracy);
    }
  }, [onLocationUpdate]);

  // Get initial location and start tracking
  useEffect(() => {
    const startLocationTracking = () => {
      if (!navigator.geolocation) {
        setError('Geolocation is not supported by this browser');
        return;
      }

      const successCallback = (position) => {
        const { latitude, longitude } = position.coords;
        const newLocation = { lat: latitude, lng: longitude };
        
        setUserLocation(newLocation);
        setAccuracy(position.coords.accuracy);
        setIsTracking(true);
        setError(null);

        // Make location globally available for notification settings
        window.userLocation = newLocation;

        // Center map on user location only once
        if (!hasCenteredRef.current) {
          map.setView([latitude, longitude], 15);
          hasCenteredRef.current = true;
          console.log('Map centered on user location:', latitude, longitude);
        }

        // Notify parent component
        handleLocationUpdate(newLocation, position.coords.accuracy);
      };

      const errorCallback = (error) => {
        console.error('Geolocation error:', error);
        setError(`Location error: ${error.message}`);
        setIsTracking(false);
      };

      const options = {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 30000 // 30 seconds
      };

      // Get initial position
      navigator.geolocation.getCurrentPosition(successCallback, errorCallback, options);

      // Start watching for position changes
      watchIdRef.current = navigator.geolocation.watchPosition(
        successCallback,
        errorCallback,
        options
      );
    };

    startLocationTracking();

    // Cleanup function
    return () => {
      if (watchIdRef.current) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, [map, handleLocationUpdate]);

  // Don't render marker if no location
  if (!userLocation) {
    return null;
  }

  return (
    <Marker
      key="user-location-marker"
      position={[userLocation.lat, userLocation.lng]}
      icon={userLocationIcon}
    />
  );
}
