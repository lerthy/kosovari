import React, { useState, useEffect } from 'react';
import { getCurrentLocation, formatCoordinates, isGeolocationAvailable } from '../lib/services/location';
import { toast } from 'react-hot-toast';

interface LocationDisplayProps {
  onLocationUpdate?: (position: GeolocationPosition) => void;
}

const LocationDisplay: React.FC<LocationDisplayProps> = ({ onLocationUpdate }) => {
  const [location, setLocation] = useState<GeolocationPosition | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [permissionState, setPermissionState] = useState<PermissionState | null>(null);

  // Check permission status
  const checkPermission = async () => {
    console.log('Checking location permission...');
    if (!isGeolocationAvailable()) {
      const errorMsg = 'Geolocation is not supported by your browser';
      console.error(errorMsg);
      setError(errorMsg);
      return;
    }

    try {
      const permission = await navigator.permissions.query({ name: 'geolocation' });
      console.log('Permission state:', permission.state);
      setPermissionState(permission.state);

      // Listen for permission changes
      permission.addEventListener('change', () => {
        console.log('Permission state changed to:', permission.state);
        setPermissionState(permission.state);
        if (permission.state === 'granted') {
          updateLocation();
        }
      });

      // If permission is already granted, get location immediately
      if (permission.state === 'granted') {
        updateLocation();
      }
    } catch (err) {
      console.error('Error checking permission:', err);
      // If we can't check permission, try to get location directly
      updateLocation();
    }
  };

  const updateLocation = async () => {
    console.log('Updating location...');
    try {
      setLoading(true);
      setError(null);
      const position = await getCurrentLocation();
      console.log('Location updated:', position);
      setLocation(position);
      onLocationUpdate?.(position);
      toast.success('Location updated successfully');
    } catch (err: any) {
      console.error('Error getting location:', err);
      if (err.code === 1) { // PERMISSION_DENIED
        setError('Location permission denied. Please enable location access in your browser settings.');
        setPermissionState('denied');
      } else {
        setError(err.message || 'Failed to get location');
      }
      toast.error(err.message || 'Failed to get location');
    } finally {
      setLoading(false);
    }
  };

  const requestLocation = () => {
    console.log('Location request initiated by user');
    updateLocation();
  };

  // Navigate to the current location
  const navigateToLocation = () => {
    if (!location) {
      toast.error('Location not available');
      return;
    }

    const { latitude, longitude } = location.coords;
    // Try to open in Google Maps app on mobile devices first
    if (/iPhone|iPad|iPod|Android/i.test(navigator.userAgent)) {
      window.open(`geo:${latitude},${longitude}?q=${latitude},${longitude}(Your Location)`);
    }
    // Fallback to Google Maps website
    window.open(
      `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`,
      '_blank'
    );
  };

  // Check permission when component mounts
  useEffect(() => {
    checkPermission();
  }, []);

  const renderPermissionPrompt = () => {
    if (permissionState === 'prompt' || !permissionState) {
      return (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
          <p className="text-yellow-700 mb-3">
            This app needs your location to accurately report issues. Please allow location access when prompted.
          </p>
          <button
            onClick={requestLocation}
            className="px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600"
          >
            Allow Location Access
          </button>
        </div>
      );
    }
    return null;
  };

  const renderLocationDenied = () => {
    if (permissionState === 'denied') {
      return (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-700 mb-2">Location access is currently blocked.</p>
          <p className="text-red-600 text-sm">
            To enable location access:
            <ol className="list-decimal ml-5 mt-2">
              <li>Click the lock/info icon in your browser's address bar</li>
              <li>Find the location permission setting</li>
              <li>Change it to "Allow"</li>
              <li>Refresh the page</li>
            </ol>
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Your Location</h3>
        <div className="flex space-x-2">
          {(permissionState === 'granted' || !permissionState) && (
            <>
              <button
                onClick={requestLocation}
                disabled={loading}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
              >
                {loading ? 'Getting Location...' : location ? 'Update Location' : 'Get Location'}
              </button>
              {location && (
                <button
                  onClick={navigateToLocation}
                  className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 flex items-center"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                  </svg>
                  Navigate
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {renderPermissionPrompt()}
      {renderLocationDenied()}

      {error ? (
        <div className="text-red-500 mb-2">{error}</div>
      ) : location && (permissionState === 'granted' || !permissionState) ? (
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <span className="font-medium">Coordinates:</span>
            <span>
              {formatCoordinates(
                location.coords.latitude,
                location.coords.longitude
              )}
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="font-medium">Accuracy:</span>
            <span>{Math.round(location.coords.accuracy)} meters</span>
          </div>
          {location.coords.altitude !== null && (
            <div className="flex items-center space-x-2">
              <span className="font-medium">Altitude:</span>
              <span>
                {Math.round(location.coords.altitude)} meters
                {location.coords.altitudeAccuracy !== null &&
                  ` (±${Math.round(location.coords.altitudeAccuracy)}m)`}
              </span>
            </div>
          )}
          <div className="text-sm text-gray-500">
            Last updated: {new Date(location.timestamp).toLocaleString()}
          </div>
          <div className="mt-4 text-sm text-gray-600">
            <p>Click the "Navigate" button to get directions to this location.</p>
          </div>
        </div>
      ) : (
        <div className="text-gray-500">
          {loading ? 'Getting your location...' : 'Click "Get Location" to start'}
        </div>
      )}
    </div>
  );
};

export default LocationDisplay; 
