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
    <label className="flex items-center text-sm font-medium" style={{ color: '#E0E2E9' }}>
      {Icon && <Icon className="w-4 h-4 mr-2" style={{ color: '#00D9FF' }} />}
      {label}
    </label>
    {helpText && (
      <p className="text-xs -mt-1 mb-1" style={{ color: '#A8ABB3' }}>{helpText}</p>
    )}
    <div className="relative">
      <input
        {...props}
        className="w-full px-3 py-2 pr-12 rounded-md shadow-sm focus:outline-none focus:ring-2 transition-all"
        style={{
          backgroundColor: '#1A1F2E',
          border: '1px solid rgba(0, 217, 255, 0.2)',
          color: '#E0E2E9'
        }}
      />
      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-medium" style={{ color: '#A8ABB3' }}>
        {unit}
      </span>
    </div>
  </div>
));

InputField.displayName = 'InputField';
