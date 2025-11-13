import React from 'react';

/**
 * Shared select field component with icon
 * @param {Object} props
 * @param {string} props.label - Label text for the select
 * @param {React.Component} props.icon - Lucide icon component
 * @param {React.ReactNode} props.children - Option elements
 * @param {Object} props....rest - All other select props (value, onChange, etc.)
 */
export const SelectField = React.memo(({ label, icon: Icon, children, ...props }) => (
  <div className="space-y-2 group">
    <label className="flex items-center text-sm font-medium text-gray-800 dark:text-gray-200">
      {Icon && <Icon className="w-4 h-4 mr-2 text-blue-600 dark:text-blue-400" />}
      {label}
    </label>
    <select
      {...props}
      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white transition-all hover:border-blue-400 dark:hover:border-blue-500"
    >
      {children}
    </select>
  </div>
));

SelectField.displayName = 'SelectField';
