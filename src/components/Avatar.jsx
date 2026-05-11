import React, { useState } from 'react';
import { motion } from 'framer-motion';

/**
 * Reusable Avatar component for MisCom with robust error handling.
 * Falls back to a person icon if the image fails to load.
 */
const Avatar = ({ 
  src, 
  alt = 'User', 
  size = 'md', 
  className = '', 
  fallbackIcon = 'person',
  showStatus = false,
  online = false,
  border = false,
  onClick
}) => {
  const [error, setError] = useState(!src);

  // Size mapping
  const sizeClasses = {
    xs: 'w-6 h-6',
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-14 h-14',
    xl: 'w-24 h-24',
  };

  const iconSizes = {
    xs: 'text-[12px]',
    sm: 'text-[16px]',
    md: 'text-xl',
    lg: 'text-2xl',
    xl: 'text-4xl',
  };

  const containerSize = sizeClasses[size] || size;
  const iconSize = iconSizes[size] || 'text-xl';

  return (
    <div 
      className={`relative shrink-0 ${containerSize} ${className} ${onClick ? 'cursor-pointer' : ''}`}
      onClick={onClick}
    >
      <div className={`
        w-full h-full rounded-full overflow-hidden flex items-center justify-center
        ${border ? 'border-2 border-primary-container p-0.5' : ''}
        ${error ? 'bg-surface-variant' : 'bg-surface-container-low'}
      `}>
        {!error && src ? (
          <img 
            src={src} 
            alt={alt} 
            onError={() => setError(true)}
            className="w-full h-full rounded-full object-cover" 
          />
        ) : (
          <span 
            className={`material-symbols-outlined text-secondary ${iconSize}`} 
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            {fallbackIcon}
          </span>
        )}
      </div>

      {showStatus && (
        <div className={`
          absolute bottom-0 right-0 rounded-full border-2 border-surface
          ${size === 'xl' ? 'w-5 h-5' : size === 'lg' ? 'w-3.5 h-3.5' : 'w-3 h-3'}
          ${online ? 'bg-tertiary-container' : 'bg-surface-variant'}
        `} />
      )}
    </div>
  );
};

export default Avatar;
