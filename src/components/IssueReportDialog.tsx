// Import necessary React hooks and external dependencies
import React, { useState, useRef } from 'react';
import { useIssueStore } from '../store/issues';
import { supabase } from '../lib/supabase';

// Define props interface for the component
interface IssueReportDialogProps {
  onClose: () => void;
  position?: [number, number];
}

const IssueReportDialog: React.FC<IssueReportDialogProps> = ({ onClose, position }) => {
  // State management for form fields and UI
  const [selectedCategory, setSelectedCategory] = useState<string>(''); // Selected issue category
  const [description, setDescription] = useState(''); // Issue description text
  const [image, setImage] = useState<File | null>(null); // Selected image file
  const [imagePreview, setImagePreview] = useState<string>(''); // URL for image preview
  const [uploading, setUploading] = useState(false); // Loading state during submission
  const fileInputRef = useRef<HTMLInputElement>(null); // Reference to file input element
  const { addIssue } = useIssueStore(); // Zustand store method for adding issues

  // Available issue categories with icons and labels
  const categories = [
    { id: 'traffic', label: 'Traffic and Transport', icon: '🚗' },
    { id: 'environment', label: 'Climate and Environment', icon: '🌱' },
    { id: 'economy', label: 'Local Economy', icon: '💼' },
    { id: 'living', label: 'Living Environment', icon: '🏘️' },
    { id: 'damage', label: 'Damage and Repair', icon: '🔧' },
    { id: 'heritage', label: 'Heritage', icon: '🏛️' }
  ];

  // Handle image file selection and preview generation
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

  // Upload image to Supabase storage with validation and processing
  const uploadImage = async (file: File): Promise<string | undefined> => {
    try {
      // File validation checks
      if (file.size > 5 * 1024 * 1024) {
        throw new Error('File size too large. Please upload an image smaller than 5MB.');
      }
      if (!file.type.startsWith('image/')) {
        throw new Error('Please upload an image file.');
      }

      // Image processing and upload
      const resizedImage = await resizeImage(file);
      const fileName = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}.jpg`;
      const filePath = `issue-images/${fileName}`;

      // Supabase storage upload
      const { error: uploadError } = await supabase.storage
        .from('issues')
        .upload(filePath, resizedImage, {
          contentType: 'image/jpeg',
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      // Retrieve public URL for uploaded image
      const { data: { publicUrl } } = supabase.storage
        .from('issues')
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (error) {
      console.error('Error uploading image:', error);
      throw error;
    }
  };

  // Resize image to maintain reasonable dimensions and file size
  const resizeImage = async (file: File): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          // Set maximum dimensions
          const MAX_WIDTH = 1200;
          const MAX_HEIGHT = 1200;
          let [width, height] = [img.width, img.height];

          // Calculate new dimensions maintaining aspect ratio
          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;

          // Draw and compress image
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);

          // Convert to JPEG with 85% quality
          canvas.toBlob(
            (blob) => blob ? resolve(blob) : reject('Conversion failed'),
            'image/jpeg',
            0.85
          );
        };
      };
      reader.onerror = (error) => reject(error);
    });
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!position || !selectedCategory || !description) return;

    setUploading(true);
    let imageUrl: string | undefined = undefined;

    try {
      // Upload image if present
      if (image) {
        imageUrl = await uploadImage(image);
      }

      // Add issue to global store
      await addIssue({
        category: selectedCategory as any,
        description,
        latitude: position[0],
        longitude: position[1],
        status: 'open',
        image_url: imageUrl
      });

      // Reset form and close dialog
      onClose();
      setSelectedCategory('');
      setDescription('');
      setImage(null);
      setImagePreview('');
    } catch (error) {
      console.error('Failed to create issue:', error);
      alert('Failed to submit issue. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  // Remove selected image and reset preview
  const handleRemoveImage = () => {
    setImage(null);
    setImagePreview('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Render dialog UI
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        <div className="p-6">
          {/* Dialog header */}
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-semibold">Report Problem</h2>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
              ✕
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            {/* Category selection grid */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
              <div className="grid grid-cols-2 gap-4">
                {categories.map((category) => (
                  <button
                    key={category.id}
                    type="button"
                    onClick={() => setSelectedCategory(category.id)}
                    className={`p-4 rounded-lg border-2 flex items-center gap-2 ${
                      selectedCategory === category.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <span className="text-2xl">{category.icon}</span>
                    <span className="text-sm font-medium">{category.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Description textarea */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
              <textarea
                placeholder="Describe the issue here..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full h-32 p-3 border rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>

            {/* Image upload section */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">Upload Image</label>
              <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-lg">
                <div className="space-y-1 text-center">
                  {imagePreview ? (
                    // Image preview with remove button
                    <div className="relative">
                      <img src={imagePreview} alt="Preview" className="max-h-48 mx-auto rounded" />
                      <button
                        type="button"
                        onClick={handleRemoveImage}
                        className="absolute top-0 right-0 bg-red-500 text-white rounded-full p-1 transform translate-x-1/2 -translate-y-1/2"
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    // Upload prompt
                    <>
                      <svg className="mx-auto h-12 w-12 text-gray-400" /* ... */ />
                      <div className="flex text-sm text-gray-600">
                        <label className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500">
                          <span>Upload a file</span>
                          <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handleImageChange}
                            className="sr-only"
                          />
                        </label>
                        <p className="pl-1">or drag and drop</p>
                      </div>
                      <p className="text-xs text-gray-500">PNG, JPG, GIF up to 10MB</p>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Form actions */}
            <div className="flex justify-end gap-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!selectedCategory || !description || uploading}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                {uploading ? 'Submitting...' : 'Submit Report'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default IssueReportDialog;
