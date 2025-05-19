// export default MonsterIcon; 
import React, { useState } from 'react';
import { IssueCategory, categoryMonsters } from '../store/issues';

// Props for the MonsterIcon component
interface MonsterIconProps {
  category: IssueCategory;           // The issue category to determine the icon
  size?: 'small' | 'medium' | 'large'; // Optional size prop with a default
  className?: string;                // Optional extra class names
}

const MonsterIcon: React.FC<MonsterIconProps> = ({ 
  category, 
  size = 'medium',      // Default size is 'medium'
  className = ''        // Default to no extra classes
}) => {
  const [imageError, setImageError] = useState(false); // Track if image fails to load

  // Get the image source based on the category
  const monsterSrc = categoryMonsters[category];

  // Define Tailwind classes for each size variant
  const sizeClasses = {
    small: 'w-8 h-8',
    medium: 'w-12 h-12',
    large: 'w-20 h-20'
  };

  // If image fails to load, set error flag to true
  const handleImageError = () => {
    setImageError(true);
  };

  return (
    <div className={`relative ${className}`}>
      {imageError ? (
        // Show emoji fallback if image fails to load
        <div className={`${sizeClasses[size]} flex items-center justify-center bg-gray-100 rounded-full`}>
          {getCategoryEmoji(category)}
        </div>
      ) : (
        // Render the category monster image
        <img 
          src={monsterSrc} 
          alt={`${category} monster`}
          className={`${sizeClasses[size]} object-contain`}
          onError={handleImageError} // Handle broken image URLs
        />
      )}
    </div>
  );
};

// Return a fallback emoji for each issue category
const getCategoryEmoji = (category: IssueCategory): string => {
  const emojis: Record<IssueCategory, string> = {
    traffic: '🚗',
    environment: '🌱',
    economy: '💼',
    living: '🏘️',
    damage: '🔧',
    heritage: '🏛️'
  };
  return emojis[category];
};

export default MonsterIcon;
