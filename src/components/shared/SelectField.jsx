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
    <label className="flex items-center text-sm font-medium" style={{ color: '#E0E2E9' }}>
      {Icon && <Icon className="w-4 h-4 mr-2" style={{ color: '#00D9FF' }} />}
      {label}
    </label>
    <select
      {...props}
      className="w-full px-3 py-2 rounded-md shadow-sm focus:outline-none focus:ring-2 transition-all"
      style={{
        backgroundColor: '#1A1F2E',
        border: '1px solid rgba(0, 217, 255, 0.2)',
        color: '#E0E2E9'
      }}
    >
      {children}
    </select>
  </div>
));

SelectField.displayName = 'SelectField';
