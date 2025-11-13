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
    success: 'modal-success border-l-4 border-l-accent-green',
    warning: 'modal-warning border-l-4 border-l-accent-orange',
    error: 'modal-error border-l-4 border-l-accent-red',
    default: 'bg-neutral-medium border-l-4 border-l-accent-cyan'
  };

  const iconColors = {
    success: 'text-accent-green',
    warning: 'text-accent-orange',
    error: 'text-accent-red',
    default: 'text-accent-cyan'
  };

  return (
    <div className={`p-4 rounded-lg transition-all duration-200 ${statusClasses[status] || statusClasses.default}`}>
      <h3 className="text-sm flex items-center font-semibold" style={{ color: '#E0E2E9' }}>
        {Icon && <Icon className={`w-4 h-4 mr-2 ${iconColors[status] || iconColors.default}`} />}
        {title}
      </h3>
      <p className="mt-2 text-2xl font-bold" style={{ color: '#E0E2E9' }}>
        {value} <span className="text-sm font-normal" style={{ color: '#A8ABB3' }}>{unit}</span>
      </p>
      {helpText && (
        <p className="mt-2 text-xs" style={{ color: '#A8ABB3' }}>{helpText}</p>
      )}
    </div>
  );
});

ResultCard.displayName = 'ResultCard';
