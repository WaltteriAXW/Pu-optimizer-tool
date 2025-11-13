import React, { useState } from 'react';
import { Info } from 'lucide-react';

/**
 * Tooltip component that displays helpful information on hover or click
 * Works on both desktop (hover) and mobile (click/tap)
 */
export const Tooltip = ({
  children,
  content,
  icon: Icon = Info,
  iconClassName = "w-4 h-4 text-blue-600 dark:text-blue-400",
  position = "top",
  className = ""
}) => {
  const [isVisible, setIsVisible] = useState(false);

  const positionClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2'
  };

  const arrowClasses = {
    top: 'top-full left-1/2 -translate-x-1/2 border-t-gray-900 dark:border-t-gray-100',
    bottom: 'bottom-full left-1/2 -translate-x-1/2 border-b-gray-900 dark:border-b-gray-100',
    left: 'left-full top-1/2 -translate-y-1/2 border-l-gray-900 dark:border-l-gray-100',
    right: 'right-full top-1/2 -translate-y-1/2 border-r-gray-900 dark:border-r-gray-100'
  };

  return (
    <div className={`relative inline-flex items-center ${className}`}>
      {children}
      <button
        type="button"
        className="ml-1 inline-flex items-center justify-center cursor-help focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-full p-0.5 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsVisible(!isVisible);
        }}
        onBlur={() => setIsVisible(false)}
        aria-label="More information"
      >
        <Icon className={iconClassName} />
      </button>

      {isVisible && (
        <div
          className={`absolute z-50 ${positionClasses[position]} w-64 pointer-events-none`}
          role="tooltip"
        >
          <div className="bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-sm rounded-lg shadow-lg p-3 border border-gray-700 dark:border-gray-300">
            {content}
          </div>
          <div
            className={`absolute ${arrowClasses[position]} w-0 h-0 border-4 border-transparent`}
          />
        </div>
      )}
    </div>
  );
};

/**
 * IconTooltip - Just an icon with tooltip, no children
 */
export const IconTooltip = ({ content, icon: Icon = Info, iconClassName, position, className }) => {
  const [isVisible, setIsVisible] = useState(false);

  const positionClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2'
  };

  const arrowClasses = {
    top: 'top-full left-1/2 -translate-x-1/2 border-t-gray-900 dark:border-t-gray-100',
    bottom: 'bottom-full left-1/2 -translate-x-1/2 border-b-gray-900 dark:border-b-gray-100',
    left: 'left-full top-1/2 -translate-y-1/2 border-l-gray-900 dark:border-l-gray-100',
    right: 'right-full top-1/2 -translate-y-1/2 border-r-gray-900 dark:border-r-gray-100'
  };

  return (
    <div className={`relative inline-flex ${className || ''}`}>
      <button
        type="button"
        className="inline-flex items-center justify-center cursor-help focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-full p-1 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsVisible(!isVisible);
        }}
        onBlur={() => setIsVisible(false)}
        aria-label="More information"
      >
        <Icon className={iconClassName || "w-4 h-4 text-blue-600 dark:text-blue-400"} />
      </button>

      {isVisible && (
        <div
          className={`absolute z-50 ${positionClasses[position || 'top']} w-64 pointer-events-none`}
          role="tooltip"
        >
          <div className="bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-sm rounded-lg shadow-lg p-3 border border-gray-700 dark:border-gray-300">
            {content}
          </div>
          <div
            className={`absolute ${arrowClasses[position || 'top']} w-0 h-0 border-4 border-transparent`}
          />
        </div>
      )}
    </div>
  );
};
