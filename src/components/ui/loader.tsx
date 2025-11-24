import React from 'react';

interface LoaderProps {
  size?: number;
  color?: string;
  showText?: boolean;
  text?: string;
  className?: string;
}

export const Loader: React.FC<LoaderProps> = ({ 
  size = 64, 
  color = '#3b82f6', 
  showText = true, 
  text = 'Loading...',
  className = ''
}) => {
  return (
    <div className={`flex items-center justify-center min-h-screen bg-gray-50 ${className}`}>
      <div 
        className="animate-spin"
        style={{ 
          width: size, 
          height: size,
          animationDuration: '2s'
        }}
      >
        <svg 
          viewBox="0 0 100 100" 
          width={size} 
          height={size}
          className="drop-shadow-sm"
        >
          {/* Top triangle */}
          <path 
            d="M50 10 L35 35 L65 35 Z" 
            fill={color}
            className="animate-pulse"
            style={{ animationDelay: '0s' }}
          />
          
          {/* Top-right triangle */}
          <path 
            d="M90 50 L65 35 L65 65 Z" 
            fill={color}
            className="animate-pulse"
            style={{ animationDelay: '0.25s' }}
          />
          
          {/* Bottom-right triangle */}
          <path 
            d="M50 90 L65 65 L35 65 Z" 
            fill={color}
            className="animate-pulse"
            style={{ animationDelay: '0.5s' }}
          />
          
          {/* Bottom-left triangle */}
          <path 
            d="M10 50 L35 65 L35 35 Z" 
            fill={color}
            className="animate-pulse"
            style={{ animationDelay: '0.75s' }}
          />
          
          {/* Center top-left triangle */}
          <path 
            d="M35 35 L50 50 L35 50 Z" 
            fill={color}
            className="animate-pulse"
            style={{ animationDelay: '1s' }}
          />
          
          {/* Center top-right triangle */}
          <path 
            d="M65 35 L65 50 L50 50 Z" 
            fill={color}
            className="animate-pulse"
            style={{ animationDelay: '1.25s' }}
          />
          
          {/* Center bottom-left triangle */}
          <path 
            d="M35 65 L35 50 L50 50 Z" 
            fill={color}
            className="animate-pulse"
            style={{ animationDelay: '1.5s' }}
          />
          
          {/* Center bottom-right triangle */}
          <path 
            d="M65 65 L50 50 L65 50 Z" 
            fill={color}
            className="animate-pulse"
            style={{ animationDelay: '1.75s' }}
          />
        </svg>
      </div>
      
      {/* Optional loading text */}
      {showText && (
        <div className="absolute mt-32 text-gray-600 text-sm font-medium tracking-wide">
          {text}
        </div>
      )}
    </div>
  );
};

// Inline loader for smaller components
export const InlineLoader: React.FC<Omit<LoaderProps, 'showText' | 'className'>> = ({ 
  size = 32, 
  color = '#3b82f6',
  text = 'Loading...'
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-4">
      <div 
        className="animate-spin"
        style={{ 
          width: size, 
          height: size,
          animationDuration: '2s'
        }}
      >
        <svg 
          viewBox="0 0 100 100" 
          width={size} 
          height={size}
          className="drop-shadow-sm"
        >
          {/* Top triangle */}
          <path 
            d="M50 10 L35 35 L65 35 Z" 
            fill={color}
            className="animate-pulse"
            style={{ animationDelay: '0s' }}
          />
          
          {/* Top-right triangle */}
          <path 
            d="M90 50 L65 35 L65 65 Z" 
            fill={color}
            className="animate-pulse"
            style={{ animationDelay: '0.25s' }}
          />
          
          {/* Bottom-right triangle */}
          <path 
            d="M50 90 L65 65 L35 65 Z" 
            fill={color}
            className="animate-pulse"
            style={{ animationDelay: '0.5s' }}
          />
          
          {/* Bottom-left triangle */}
          <path 
            d="M10 50 L35 65 L35 35 Z" 
            fill={color}
            className="animate-pulse"
            style={{ animationDelay: '0.75s' }}
          />
          
          {/* Center top-left triangle */}
          <path 
            d="M35 35 L50 50 L35 50 Z" 
            fill={color}
            className="animate-pulse"
            style={{ animationDelay: '1s' }}
          />
          
          {/* Center top-right triangle */}
          <path 
            d="M65 35 L65 50 L50 50 Z" 
            fill={color}
            className="animate-pulse"
            style={{ animationDelay: '1.25s' }}
          />
          
          {/* Center bottom-left triangle */}
          <path 
            d="M35 65 L35 50 L50 50 Z" 
            fill={color}
            className="animate-pulse"
            style={{ animationDelay: '1.5s' }}
          />
          
          {/* Center bottom-right triangle */}
          <path 
            d="M65 65 L50 50 L65 50 Z" 
            fill={color}
            className="animate-pulse"
            style={{ animationDelay: '1.75s' }}
          />
        </svg>
      </div>
      
      <div className="mt-2 text-gray-600 text-xs font-medium tracking-wide">
        {text}
      </div>
    </div>
  );
};

// Button loader for loading states in buttons
export const ButtonLoader: React.FC<{ size?: number; color?: string }> = ({ 
  size = 16, 
  color = '#ffffff' 
}) => {
  return (
    <div 
      className="animate-spin"
      style={{ 
        width: size, 
        height: size,
        animationDuration: '2s'
      }}
    >
      <svg 
        viewBox="0 0 100 100" 
        width={size} 
        height={size}
        className="drop-shadow-sm"
      >
        {/* Top triangle */}
        <path 
          d="M50 10 L35 35 L65 35 Z" 
          fill={color}
          className="animate-pulse"
          style={{ animationDelay: '0s' }}
        />
        
        {/* Top-right triangle */}
        <path 
          d="M90 50 L65 35 L65 65 Z" 
          fill={color}
          className="animate-pulse"
          style={{ animationDelay: '0.25s' }}
        />
        
        {/* Bottom-right triangle */}
        <path 
          d="M50 90 L65 65 L35 65 Z" 
          fill={color}
          className="animate-pulse"
          style={{ animationDelay: '0.5s' }}
        />
        
        {/* Bottom-left triangle */}
        <path 
          d="M10 50 L35 65 L35 35 Z" 
          fill={color}
          className="animate-pulse"
          style={{ animationDelay: '0.75s' }}
        />
        
        {/* Center top-left triangle */}
        <path 
          d="M35 35 L50 50 L35 50 Z" 
          fill={color}
          className="animate-pulse"
          style={{ animationDelay: '1s' }}
        />
        
        {/* Center top-right triangle */}
        <path 
          d="M65 35 L65 50 L50 50 Z" 
          fill={color}
          className="animate-pulse"
          style={{ animationDelay: '1.25s' }}
        />
        
        {/* Center bottom-left triangle */}
        <path 
          d="M35 65 L35 50 L50 50 Z" 
          fill={color}
          className="animate-pulse"
          style={{ animationDelay: '1.5s' }}
        />
        
        {/* Center bottom-right triangle */}
        <path 
          d="M65 65 L50 50 L65 50 Z" 
          fill={color}
          className="animate-pulse"
          style={{ animationDelay: '1.75s' }}
        />
      </svg>
    </div>
  );
}; 