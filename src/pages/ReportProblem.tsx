import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useIssueStore, IssueCategory } from '../store/issues';
import { supabase } from '../lib/supabase';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const ReportProblem: React.FC = () => {
  const navigate = useNavigate();

  // Form state
  const [selectedCategory, setSelectedCategory] = useState<IssueCategory | ''>(''); // Selected issue category
  const [description, setDescription] = useState(''); // Problem description
  const [image, setImage] = useState<File | null>(null); // Image file
  const [imagePreview, setImagePreview] = useState<string>(''); // Image preview URL
  const [uploading, setUploading] = useState(false); // Submission/loading state

  // Location/map state
  const [location, setLocation] = useState<{ lat: number, lng: number } | null>(null); // Coordinates selected on map
  const [mapInitialized, setMapInitialized] = useState(false); // Prevents re-initializing the map
  const fileInputRef = useRef<HTMLInputElement>(null); // Ref for hidden file input
  const mapRef = useRef<L.Map | null>(null); // Ref for Leaflet map
  const markerRef = useRef<L.Marker | null>(null); // Ref for Leaflet marker
  const { addIssue } = useIssueStore(); // Add issue function from store

  // List of categories for reporting
  const categories = [
    { id: 'traffic' as IssueCategory, label: 'Traffic and Transport', icon: '🚗' },
    { id: 'environment' as IssueCategory, label: 'Climate and Environment', icon: '🌱' },
    { id: 'economy' as IssueCategory, label: 'Local Economy', icon: '💼' },
    { id: 'living' as IssueCategory, label: 'Living Environment', icon: '🏘️' },
    { id: 'damage' as IssueCategory, label: 'Damage and Repair', icon: '🔧' },
    { id: 'heritage' as IssueCategory, label: 'Heritage', icon: '🏛️' }
  ];

  // Initialize Leaflet map and handle location picking
  useEffect(() => {
    if (!mapInitialized) {
      const map = L.map('map').setView([42.6629, 21.1655], 13); // Set default map center (Kosovo)

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(map);

      mapRef.current = map;
      setMapInitialized(true);

      // Add click event for selecting location
      map.on('click', (e) => {
        const { lat, lng } = e.latlng;
        setLocation({ lat, lng });

        // Place or move marker on the map
        if (markerRef.current) {
          markerRef.current.setLatLng([lat, lng]);
        } else {
          const marker = L.marker([lat, lng]).addTo(map);
          markerRef.current = marker;
        }
      });
    }

    // Cleanup map on unmount
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
      }
    };
  }, [mapInitialized]);

  // Handle file input and create preview
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

  // Upload image to Supabase storage and return public URL
  const uploadImage = async (file: File): Promise<string | undefined> => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `issue-images/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('issues')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('issues').getPublicUrl(filePath);
      return data.publicUrl;
    } catch (error) {
      console.error('Error uploading image:', error);
      return undefined;
    }
  };

  // Submit the report
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCategory || !location) return;
    setUploading(true);

    try {
      let imageUrl: string | undefined = undefined;
      if (image) {
        imageUrl = await uploadImage(image);
      }

      await addIssue({
        category: selectedCategory,
        description,
        latitude: location.lat,
        longitude: location.lng,
        status: 'open',
        image_url: imageUrl
      });

      navigate('/');
    } catch (error) {
      console.error('Failed to create issue:', error);
    } finally {
      setUploading(false);
    }
  };

  // Remove selected image
  const handleRemoveImage = () => {
    setImage(null);
    setImagePreview('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="fixed inset-0 bg-white z-50">
      <div className="max-w-2xl mx-auto p-4">
        {/* Header */}
        <div className="flex justify-between items-center mb-6 border-b pb-4">
          <h1 className="text-xl font-semibold">Report Problem</h1>
          <button
            onClick={() => navigate('/')}
            className="text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Map */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Problem Location <span className="text-red-500">*</span>
            </label>
            <div id="map" className="h-64 w-full rounded-lg border border-gray-300"></div>
            {!location ? (
              <p className="mt-1 text-sm text-red-500">
                Please click on the map to select the problem location
              </p>
            ) : (
              <p className="mt-1 text-sm text-green-600">
                Location selected: {location.lat.toFixed(6)}, {location.lng.toFixed(6)}
              </p>
            )}
          </div>

          {/* Categories */}
          <div className="grid grid-cols-2 gap-4">
            {categories.map((category) => (
              <button
                key={category.id}
                type="button"
                onClick={() => setSelectedCategory(category.id)}
                className={`p-4 rounded-lg border text-left flex items-center gap-3 transition-all ${
                  selectedCategory === category.id
                    ? 'border-green-500 bg-green-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <span className="text-2xl">{category.icon}</span>
                <span className="text-sm font-medium">{category.label}</span>
              </button>
            ))}
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description <span className="text-red-500">*</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full h-32 p-3 border rounded-lg resize-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
              placeholder="Describe the problem here..."
              required
            />
          </div>

          {/* Image Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Add Photo (Optional)
            </label>
            {imagePreview ? (
              <div className="relative">
                <img
                  src={imagePreview}
                  alt="Preview"
                  className="w-full h-48 object-cover rounded-lg"
                />
                <button
                  type="button"
                  onClick={handleRemoveImage}
                  className="absolute top-2 right-2 bg-white rounded-full p-1 shadow-lg"
                >
                  ✕
                </button>
              </div>
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-gray-400"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                />
                <div className="text-gray-600">
                  Click to add a photo
                </div>
              </div>
            )}
          </div>

          {/* Submit/Cancel Buttons */}
          <div className="flex justify-end gap-4 pt-4 border-t">
            <button
              type="button"
              onClick={() => navigate('/')}
              className="px-6 py-2 text-gray-600 hover:text-gray-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!selectedCategory || !description || !location || uploading}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              {uploading ? 'Submitting...' : 'Submit Report'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ReportProblem;
