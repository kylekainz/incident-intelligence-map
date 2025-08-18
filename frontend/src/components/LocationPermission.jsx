import { useState, useEffect } from 'react';

export default function LocationPermission({ onPermissionGranted }) {
  const [permissionStatus, setPermissionStatus] = useState('prompt');
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Check if geolocation is supported
    if (!navigator.geolocation) {
      setPermissionStatus('unsupported');
      return;
    }

    // Check current permission status
    if (navigator.permissions) {
      navigator.permissions.query({ name: 'geolocation' }).then((result) => {
        setPermissionStatus(result.state);
        if (result.state === 'granted') {
          setIsVisible(false);
          if (onPermissionGranted) onPermissionGranted();
        } else if (result.state === 'denied') {
          setIsVisible(true);
        } else {
          setIsVisible(true);
        }
      });
    } else {
      // Fallback for browsers that don't support permissions API
      setIsVisible(true);
    }
  }, [onPermissionGranted]);

  const requestLocationPermission = () => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setPermissionStatus('granted');
        setIsVisible(false);
        if (onPermissionGranted) onPermissionGranted();
      },
      (error) => {
        console.error('Location permission denied:', error);
        setPermissionStatus('denied');
        setIsVisible(true);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0  // ✅ FIXED: Always get fresh location, never use cached
      }
    );
  };

  if (!isVisible) return null;

  return (
    <div className="fixed top-4 left-4 z-[1000] bg-yellow-50 border border-yellow-200 rounded-lg p-4 shadow-lg max-w-sm">
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <span className="text-yellow-600 text-lg">📍</span>
        </div>
        <div className="ml-3 flex-1">
          <h3 className="text-sm font-medium text-yellow-800">
            Location Access Required
          </h3>
          <p className="text-sm text-yellow-700 mt-1">
            To show your location on the map and center it around your area, we need access to your location.
          </p>
          <div className="mt-3 flex space-x-2">
            <button
              onClick={requestLocationPermission}
              className="px-3 py-1 bg-yellow-600 text-white text-xs rounded hover:bg-yellow-700"
            >
              Allow Location
            </button>
            <button
              onClick={() => setIsVisible(false)}
              className="px-3 py-1 bg-gray-300 text-gray-700 text-xs rounded hover:bg-gray-400"
            >
              Dismiss
            </button>
          </div>
          {permissionStatus === 'denied' && (
            <p className="text-xs text-yellow-600 mt-2">
              Location access was denied. You can enable it in your browser settings.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
