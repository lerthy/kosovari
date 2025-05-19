// Import necessary libraries and components
import React, { useEffect, useRef, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet'
import { Map } from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { MapController } from '../controllers/MapController'
import { useIssueStore, categoryLabels, IssueCategory } from '../store/issues'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../lib/services/auth'

// Props definition for MapView
interface MapViewProps {
  controller: MapController
}

// Component to handle map sizing after render
function MapInitializer() {
  const map = useMap()
  useEffect(() => {
    map.invalidateSize()
  }, [map])
  return null
}

// Handles map click events when reporting is enabled
interface MapEventsProps {
  onLocationSelect: (position: [number, number]) => void;
}

const MapEvents: React.FC<MapEventsProps> = ({ onLocationSelect }) => {
  const { isReportingMode } = useIssueStore();

  useMapEvents({
    click(e) {
      if (isReportingMode) {
        onLocationSelect([e.latlng.lat, e.latlng.lng]);
      }
    },
  });

  return null;
};

// Modal dialog for reporting an issue
interface ReportDialogProps {
  position: [number, number];
  onClose: () => void;
  onSubmit: (data: { category: string; description: string; image?: File }) => void;
}

const ReportDialog: React.FC<ReportDialogProps> = ({ position, onClose, onSubmit }) => {
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Handles previewing of uploaded image
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Categories for issues
  const categories = [
    { id: 'traffic', label: 'Traffic and Transport', icon: '🚗' },
    { id: 'environment', label: 'Climate and Environment', icon: '🌱' },
    { id: 'economy', label: 'Local Economy', icon: '💼' },
    { id: 'living', label: 'Living Environment', icon: '🏘️' },
    { id: 'damage', label: 'Damage and Repair', icon: '🔧' },
    { id: 'heritage', label: 'Heritage', icon: '🏛️' }
  ];

  // Handles form submission
  const handleSubmit = async () => {
    try {
      setError(null);
      setIsSubmitting(true);
      await onSubmit({ category, description, image: image || undefined });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to submit report. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // UI rendering
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-md w-full">
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-lg font-medium">Report Problem</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
        </div>

        {/* Form Body */}
        <div className="p-4 space-y-4">
          {/* Error Display */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 rounded-lg p-3 text-sm">
              {error}
            </div>
          )}

          {/* Category Buttons */}
          <div className="grid grid-cols-2 gap-3">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setCategory(cat.id)}
                className={`flex items-center space-x-2 p-3 rounded-lg border ${
                  category === cat.id ? 'border-green-500 bg-green-50' : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <span className="text-xl">{cat.icon}</span>
                <span className="text-sm">{cat.label}</span>
              </button>
            ))}
          </div>

          {/* Description Textarea */}
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full p-3 border border-gray-200 rounded-lg"
            rows={4}
            placeholder="Describe the problem here..."
          />

          {/* Image Upload */}
          <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" id="image-upload" />
          <label htmlFor="image-upload" className="block w-full">
            {imagePreview ? (
              <img src={imagePreview} alt="Preview" className="w-full h-48 object-cover rounded-lg" />
            ) : (
              <div className="w-full h-32 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center">
                <span className="text-gray-500">Click to add a photo</span>
              </div>
            )}
          </label>
        </div>

        {/* Footer Buttons */}
        <div className="flex justify-end gap-2 p-4 border-t">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800" disabled={isSubmitting}>Cancel</button>
          <button onClick={handleSubmit} className="px-4 py-2 text-sm text-white bg-green-600 rounded-md hover:bg-green-700 disabled:opacity-50" disabled={!category || !description || isSubmitting}>
            {isSubmitting ? 'Submitting...' : 'Submit Report'}
          </button>
        </div>
      </div>
    </div>
  );
};

// Main Map Component
export function MapView({ controller }: MapViewProps) {
  const center = controller.getCenter()
  const zoom = controller.getZoom()
  const { issues, loading, error, isReportingMode, fetchIssues, addIssue, setReportingMode } = useIssueStore()
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const mapRef = useRef<Map>(null)
  const [selectedPosition, setSelectedPosition] = useState<[number, number] | null>(null)
  const [showInstruction, setShowInstruction] = useState(false)

  // Resize map after mount
  useEffect(() => {
    if (mapRef.current) {
      mapRef.current.invalidateSize()
    }
  }, [])

  // Fetch issues on component mount
  useEffect(() => {
    fetchIssues();
  }, [fetchIssues]);

  // Handle reporting mode and auth redirect
  useEffect(() => {
    if (isReportingMode) {
      if (!user) {
        setReportingMode(false);
        navigate('/login');
        return;
      }
      setShowInstruction(true);
    } else {
      setShowInstruction(false);
    }
  }, [isReportingMode, user, navigate, setReportingMode]);

  // Set position on map click
  const handleLocationSelect = (position: [number, number]) => {
    if (isReportingMode && user) {
      setSelectedPosition(position);
      setReportingMode(false);
      setShowInstruction(false);
    }
  }

  const handleCloseDialog = () => {
    setSelectedPosition(null);
    setReportingMode(false);
    setShowInstruction(false);
  }

  // Handles submission of the report
  const handleSubmitReport = async (data: { category: string; description: string; image?: File }) => {
    if (selectedPosition) {
      try {
        let imageUrl: string | undefined = undefined;

        // Upload image to Supabase storage
        if (data.image) {
          const fileExt = data.image.name.split('.').pop();
          const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
          const filePath = `issue-images/${fileName}`;

          const { error: uploadError } = await supabase.storage.from('issues').upload(filePath, data.image);
          if (uploadError) throw uploadError;

          const { data: { publicUrl } } = supabase.storage.from('issues').getPublicUrl(filePath);
          imageUrl = publicUrl;
        }

        // Add issue to store
        await addIssue({
          category: data.category as IssueCategory,
          description: data.description,
          latitude: selectedPosition[0],
          longitude: selectedPosition[1],
          status: 'open',
          image_url: imageUrl
        });

        setSelectedPosition(null);
        await fetchIssues();
      } catch (error: any) {
        console.error('Error submitting report:', error);
        throw new Error(error.message || 'Failed to submit report');
      }
    }
  };

  // Loading and error UI
  if (loading && issues.length === 0) {
    return <div className="h-full w-full flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div></div>
  }

  if (error) {
    return <div className="h-full w-full flex items-center justify-center"><div className="text-red-500">{error}</div></div>
  }

  return (
    <div className="h-full w-full relative">
      {/* Main map rendering */}
      <MapContainer ref={mapRef} center={center} zoom={zoom} style={{ height: '100%', width: '100%' }} className="z-0">
        <MapInitializer />
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; OpenStreetMap contributors' />
        
        {/* Render each issue as a marker */}
        {issues.map((issue) => (
          <Marker
            key={issue.id}
            position={[issue.latitude, issue.longitude]}
            icon={controller.getMarkerIcon(issue.category)}
          >
            <Popup>
              <div className="p-2">
                <h3 className="font-bold">{issue.category}</h3>
                <p className="text-sm text-gray-600">{issue.description}</p>
                <div className="flex items-center justify-between mt-2">
                  <span className={`inline-block px-2 py-1 rounded-full text-xs ${controller.getStatusClass(issue.status)}`}>
                    {issue.status}
                  </span>
                  <span className="text-xs text-gray-500">{new Date(issue.created_at).toLocaleString()}</span>
                </div>
                {issue.image_url && (
                  <img src={typeof issue.image_url === 'string' ? issue.image_url : undefined} alt="Issue" className="mt-2 w-full h-32 object-cover rounded-lg" />
                )}
              </div>
            </Popup>
          </Marker>
        ))}

        {/* Handles map click interaction */}
        <MapEvents onLocationSelect={handleLocationSelect} />
      </MapContainer>

      {/* Display instruction text when reporting */}
      {showInstruction && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-white px-4 py-2 rounded-lg shadow-lg z-[1000]">
          Click on the map to select the problem location
        </div>
      )}

      {/* Dialog for submitting new issue */}
      {selectedPosition && (
        <ReportDialog
          position={selectedPosition}
          onClose={handleCloseDialog}
          onSubmit={handleSubmitReport}
        />
      )}

      {/* Spinner while loading existing issues */}
      {loading && issues.length > 0 && (
        <div className="absolute bottom-4 right-4 bg-white px-3 py-2 rounded-lg shadow-lg z-[1000]">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
        </div>
      )}
    </div>
  )
}
