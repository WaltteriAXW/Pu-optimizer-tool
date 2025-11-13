import React from 'react';

/**
 * Shared input field component with icon and unit display
 * @param {Object} props
 * @param {string} props.label - Label text for the input
 * @param {string} props.unit - Unit to display (e.g., "mm", "bar", "kg/min")
 * @param {React.Component} props.icon - Lucide icon component
 * @param {string} props.helpText - Optional help text to display below label
 * @param {Object} props....rest - All other input props (value, onChange, type, etc.)
 */
export const InputField = React.memo(({ label, unit, icon: Icon, helpText, ...props }) => (
  <div className="space-y-2 group">
    <label className="flex items-center text-sm font-medium text-gray-800 dark:text-gray-200">
      {Icon && <Icon className="w-4 h-4 mr-2 text-blue-600 dark:text-blue-400" />}
      {label}
    </label>
    {helpText && (
      <p className="text-xs text-gray-600 dark:text-gray-300 -mt-1 mb-1">{helpText}</p>
    )}
    <div className="relative">
      <input
        {...props}
        className="w-full px-3 py-2 pr-12 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white transition-all"
      />
      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-medium text-gray-600 dark:text-gray-300">
        {unit}
      </span>
    </div>
  </div>
));

InputField.displayName = 'InputField';
