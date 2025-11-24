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
      textColor: 'text-emerald-400',
      borderColor: 'border-emerald-500/30',
    },
    warning: {
      textColor: 'text-amber-400',
      borderColor: 'border-amber-500/30',
    },
    danger: {
      textColor: 'text-rose-500',
      borderColor: 'border-rose-500/30',
    },
  };

  const style = statusStyles[status] || statusStyles.normal;

  return (
    <div className={`bg-slate-950/50 border-l-4 p-4 rounded-r ${style.borderColor}`}>
      <span className="text-slate-500 text-[10px] uppercase font-bold tracking-widest font-sans">
        {title}
      </span>
      <div className={`text-3xl font-mono font-bold mt-1 ${style.textColor}`}>
        {value}{' '}
        {unit && (
          <span className="text-sm opacity-50 ml-1 font-mono">{unit}</span>
        )}
      </div>
      {description && (
        <p className="text-xs text-slate-600 mt-2 font-sans">{description}</p>
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
