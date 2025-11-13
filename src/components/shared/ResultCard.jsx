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
  const statusColors = {
    success: 'border-green-500 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20',
    warning: 'border-yellow-500 bg-gradient-to-br from-yellow-50 to-amber-50 dark:from-yellow-900/20 dark:to-amber-900/20',
    error: 'border-red-500 bg-gradient-to-br from-red-50 to-rose-50 dark:from-red-900/20 dark:to-rose-900/20',
    default: 'border-blue-500 bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20'
  };

  const iconColors = {
    success: 'text-green-600 dark:text-green-400',
    warning: 'text-yellow-600 dark:text-yellow-400',
    error: 'text-red-600 dark:text-red-400',
    default: 'text-blue-600 dark:text-blue-400'
  };

  return (
    <div className={`p-4 rounded-lg shadow-md hover:shadow-lg border-l-4 ${statusColors[status] || statusColors.default} transition-all duration-200 transform hover:scale-105 animate-slideIn`}>
      <h3 className="text-sm flex items-center font-medium text-gray-700 dark:text-gray-300">
        {Icon && <Icon className={`w-4 h-4 mr-2 ${iconColors[status] || iconColors.default}`} />}
        {title}
      </h3>
      <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">
        {value} <span className="text-sm font-normal text-gray-600 dark:text-gray-400">{unit}</span>
      </p>
      {helpText && (
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 italic">{helpText}</p>
      )}
    </div>
  );
});

ResultCard.displayName = 'ResultCard';
