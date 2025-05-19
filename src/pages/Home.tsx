// Import necessary React hooks and routing utilities
import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
// Import application components and modules
import { MapView } from '../views/MapView'
import { MapController } from '../controllers/MapController'
import { useIssueStore } from '../store/issues'
import { getCurrentLocation, formatCoordinates } from '../lib/services/location'
import { toast } from 'react-hot-toast'
import { useAuthStore } from '../lib/services/auth'

export function Home() {
  // Get URL search parameters for map positioning
  const [searchParams] = useSearchParams()
  const lat = searchParams.get('lat')
  const lng = searchParams.get('lng')
  const [location, setLocation] = useState<GeolocationPosition | null>(null)
  const [loading, setLoading] = useState(false)

  // Initialize map controller instance
  const controller = new MapController()
  // Access issue store's fetch method
  const fetchIssues = useIssueStore(state => state.fetchIssues)
  const user = useAuthStore(state => state.user)

  const requestLocation = async () => {
    try {
      setLoading(true)
      const position = await getCurrentLocation()
      setLocation(position)
      controller.setCenter([position.coords.latitude, position.coords.longitude])
      controller.setZoom(16)
    } catch (err: any) {
      console.error('Error getting location:', err)
      toast.error('Please allow location access to see your coordinates')
    } finally {
      setLoading(false)
    }
  }

  // Request location when component mounts
  useEffect(() => {
    requestLocation()
  }, [])

  // Fetch issues on component mount
  useEffect(() => {
    fetchIssues()
  }, [fetchIssues])

  // Handle map positioning when URL coordinates change
  useEffect(() => {
    if (lat && lng) {
      // Convert string parameters to numbers
      const latitude = parseFloat(lat)
      const longitude = parseFloat(lng)
      
      // Validate and update map position if coordinates are valid
      if (!isNaN(latitude) && !isNaN(longitude)) {
        controller.setCenter([latitude, longitude])
        controller.setZoom(16)  // Set close zoom level for precise location
      }
    }
  }, [lat, lng])  // Dependency array triggers effect on coordinate changes

  // Main component render
  return (
    <div className="h-full w-full relative">
      {/* Render map component with controller instance */}
      <MapView controller={controller} />

      {/* Info Section: KosovAR Explanation */}
      {user === null && (
        <div className="absolute top-8 right-8 z-20 w-96 max-w-full bg-gradient-to-br from-emerald-100 via-white to-emerald-50 border-4 border-emerald-300 rounded-3xl shadow-2xl p-8 flex flex-col items-center gap-4 animate-fade-in">
          {/* Monster image for visual appeal */}
          <img
            src="/assets/monsters/monster-damage.png"
            alt="KosovAR Monster"
            className="w-20 h-20 drop-shadow-lg mb-2 animate-bounce-slow"
          />
          <h2 className="text-2xl font-extrabold text-emerald-700 mb-2 text-center tracking-tight">What is KosovAR?</h2>
          <p className="text-gray-700 text-base leading-relaxed text-center">
            KosovAR is a platform designed to help you express your issues and stay informed about the challenges facing Kosovo. The monsters on the map represent different issues, and you can view them in Augmented Reality (AR) simply by scanning the QR code associated with each issue.
          </p>
          {/* QR code visual */}
          <div className="flex flex-col items-center mt-2">
            <span className="text-emerald-600 font-semibold text-sm mb-1">Scan a QR code to view in AR:</span>
            <img
              src="KosovARi.png"
              alt="Sample AR QR Code"
              className="w-24 h-24 rounded-xl border-2 border-emerald-300 shadow-md hover:scale-105 transition-transform duration-200"
            />
          </div>
        </div>
      )}

      {/* Minimal Location Display */}
      <div className="absolute bottom-4 left-4 z-10 bg-white bg-opacity-90 rounded-lg shadow-md p-3 text-sm">
        {loading ? (
          <span className="text-gray-600">Getting location...</span>
        ) : location ? (
          <div className="flex items-center space-x-2">
            <span className="font-medium">Your location:</span>
            <span>
              {formatCoordinates(
                location.coords.latitude,
                location.coords.longitude
              )}
            </span>
            <button
              onClick={requestLocation}
              className="ml-2 text-blue-500 hover:text-blue-600"
              title="Update location"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        ) : (
          <button
            onClick={requestLocation}
            className="text-blue-500 hover:text-blue-600 flex items-center"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
            </svg>
            Allow location access
          </button>
        )}
      </div>
    </div>
  )
}
