import React from 'react';
import PropTypes from 'prop-types';

/**
 * Telemetry Card component for displaying live output data
 * Features:
 * - Digital gauge-style display
 * - Status-based color coding (normal, warning, danger)
 * - Monospace font for numbers
 * - Colored left border indicator
 */
export const TelemetryCard = ({ title, value, unit, status = 'normal', description }) => {
  const statusStyles = {
    normal: {
      textColor: 'text-green-600',
      borderColor: 'border-green-500',
      bgColor: 'bg-white',
    },
    warning: {
      textColor: 'text-yellow-600',
      borderColor: 'border-yellow-500',
      bgColor: 'bg-white',
    },
    danger: {
      textColor: 'text-red-600',
      borderColor: 'border-red-500',
      bgColor: 'bg-white',
    },
  };

  const style = statusStyles[status] || statusStyles.normal;

  return (
    <div className={`${style.bgColor} border-l-4 ${style.borderColor} p-4 rounded-r shadow-sm`}>
      <span className="text-gray-600 text-xs uppercase font-semibold">
        {title}
      </span>
      <div className={`text-3xl font-mono font-bold mt-1 ${style.textColor}`}>
        {value}{' '}
        {unit && (
          <span className="text-sm opacity-50 ml-1 font-mono">{unit}</span>
        )}
      </div>
      {description && (
        <p className="text-xs text-gray-500 mt-2">{description}</p>
      )}
    </div>
  );
};

TelemetryCard.propTypes = {
  title: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  unit: PropTypes.string,
  status: PropTypes.oneOf(['normal', 'warning', 'danger']),
  description: PropTypes.string,
};

TelemetryCard.defaultProps = {
  status: 'normal',
  unit: '',
  description: '',
};
