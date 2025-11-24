import React from 'react';
import PropTypes from 'prop-types';

/**
 * Industrial-styled input component for the Mission Control design system
 * Features:
 * - Dark slate background with prominent unit label
 * - Monospace font for numeric input
 * - Cyan accent color on focus
 * - Fixed unit badge on the right
 */
export const IndustrialInput = ({ label, unit, value, onChange, type = 'number', ...props }) => {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs text-slate-400 uppercase font-semibold tracking-wider font-sans">
        {label}
      </label>
      <div className="relative flex items-center">
        <input
          type={type}
          value={value}
          onChange={onChange}
          className="w-full bg-slate-950 border border-slate-700 rounded h-10 px-3 pr-12 font-mono text-cyan-400 focus:outline-none focus:border-cyan-500 transition-colors shadow-inner"
          {...props}
        />
        {unit && (
          <span className="absolute right-3 text-xs text-slate-500 font-mono pointer-events-none">
            {unit}
          </span>
        )}
      </div>
    </div>
  );
};

IndustrialInput.propTypes = {
  label: PropTypes.string.isRequired,
  unit: PropTypes.string,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  onChange: PropTypes.func.isRequired,
  type: PropTypes.string,
};

IndustrialInput.defaultProps = {
  type: 'number',
  unit: '',
};
