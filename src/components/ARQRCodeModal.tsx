// export default ARQRCodeModal; 
import React, { useState } from 'react';
import { Issue } from '../store/issues';
import MonsterIcon from './MonsterIcon';

// Props for the AR QR Code Modal
interface ARQRCodeModalProps {
  isOpen: boolean;        // Controls whether the modal is visible
  onClose: () => void;    // Function to call when modal is closed
  issue: Issue | null;    // The issue data used to determine which QR code to show
  issueIndex: number;     // Index used to pick different QR code images
}

// Modal component to display a QR code for viewing a monster in AR
const ARQRCodeModal: React.FC<ARQRCodeModalProps> = ({ isOpen, onClose, issue, issueIndex }) => {
  const [imageError, setImageError] = useState(false); // Tracks whether the QR code image failed to load

  // Don't render the modal if it's not open or issue data is missing
  if (!isOpen || !issue) return null;

  // Returns the appropriate QR code image path based on the issue index
  const getQRCodeImage = (index: number) => {
    if (index === 1) return '/Eggmonster.png';
    if (index === 2) return '/KosovARi.png';
    return '/Monster1.png';
  };

  // Called when the QR code image fails to load
  const handleImageError = () => {
    console.error('Failed to load QR code image');
    setImageError(true);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      {/* Modal container */}
      <div className="bg-white rounded-lg shadow-xl w-full max-w-sm p-6">
        {/* Modal header */}
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            {/* Icon for the issue category */}
            <MonsterIcon category={issue.category} size="small" className="mr-2" />
            View Monster in AR
          </h3>
          {/* Close button */}
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        </div>

        {/* QR code display and fallback error message */}
        <div className="flex flex-col items-center gap-4">
          <div className="bg-gray-50 p-4 rounded-lg">
            {imageError ? (
              // Show error if image loading fails
              <div className="w-48 h-48 flex items-center justify-center text-red-500 text-center p-4 border-2 border-red-200 rounded">
                QR Code not found. Please check if {issueIndex === 1 ? 'Eggmonster.png' : issueIndex === 2 ? 'KosovARi.png' : 'Monster1.png'} exists in the public folder.
              </div>
            ) : (
              // Show the QR code image
              <img
                src={getQRCodeImage(issueIndex)}
                alt={`${issue.category} Monster AR QR Code`}
                className="w-48 h-48 object-contain"
                onError={handleImageError}
              />
            )}
          </div>

          {/* Monster label and instructions */}
          <div className="space-y-2 text-center">
            <div className="flex items-center justify-center">
              <MonsterIcon category={issue.category} size="medium" />
              <p className="text-sm font-medium text-gray-900 ml-2">
                {/* Capitalize the category name */}
                {issue.category.charAt(0).toUpperCase() + issue.category.slice(1)} Monster
              </p>
            </div>
            <p className="text-sm text-gray-600">
              Scan this QR code with your phone's camera to view the monster in AR
            </p>
          </div>
        </div>

        {/* Close button footer */}
        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default ARQRCodeModal;
