import React from 'react';

/**
 * Shared result card component with icon and status-based styling
 * @param {Object} props
 * @param {string} props.title - Card title
 * @param {string|number} props.value - Value to display
 * @param {string} props.unit - Unit of measurement
 * @param {React.Component} props.icon - Lucide icon component
 * @param {string} props.status - Status for styling: 'success', 'warning', 'error', 'default'
 * @param {string} props.helpText - Optional help text to display below value
 */
export const ResultCard = React.memo(({ title, value, unit, icon: Icon, status, helpText }) => {
  const statusClasses = {
    success: 'bg-green-50 dark:bg-gray-700 border-l-4 border-l-green-600',
    warning: 'bg-amber-50 dark:bg-gray-700 border-l-4 border-l-amber-600',
    error: 'bg-red-50 dark:bg-gray-700 border-l-4 border-l-red-600',
    default: 'bg-blue-50 dark:bg-gray-700 border-l-4 border-l-blue-600'
  };

  const iconColors = {
    success: 'text-green-600 dark:text-green-400',
    warning: 'text-amber-600 dark:text-amber-400',
    error: 'text-red-600 dark:text-red-400',
    default: 'text-blue-600 dark:text-blue-400'
  };

  return (
    <div className={`p-4 rounded-md transition-colors duration-150 ${statusClasses[status] || statusClasses.default}`}>
      <h3 className="text-sm flex items-center font-semibold text-gray-700 dark:text-gray-300">
        {Icon && <Icon className={`w-4 h-4 mr-2 ${iconColors[status] || iconColors.default}`} />}
        {title}
      </h3>
      <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-gray-100">
        {value} <span className="text-sm font-normal text-gray-600 dark:text-gray-400">{unit}</span>
      </p>
      {helpText && (
        <p className="mt-2 text-xs text-gray-600 dark:text-gray-400">{helpText}</p>
      )}
    </div>
  );
});

ResultCard.displayName = 'ResultCard';
