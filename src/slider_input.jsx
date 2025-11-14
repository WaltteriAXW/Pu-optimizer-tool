/* eslint-disable react/prop-types */
import React from 'react';
import { IconTooltip } from './tooltip';
import { Lightbulb } from 'lucide-react';

/**
 * SliderInput - Combined slider and number input for better UX
 * Allows both quick adjustments with slider and precise fine-tuning with number input
 */
export const SliderInput = ({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
  unit = '',
  icon: Icon,
  helpText,
  simpleExplanation,
  showSimpleMode = false,
  className = ''
}) => {
  const handleSliderChange = (e) => {
    onChange(Number(e.target.value));
  };

  const handleInputChange = (e) => {
    const newValue = Number(e.target.value);
    if (!isNaN(newValue)) {
      onChange(newValue);
    }
  };

  // Calculate percentage for gradient fill
  const percentage = ((value - min) / (max - min)) * 100;

  return (
    <div className={`space-y-2 ${className}`}>
      {/* Label with Icon and Tooltip */}
      <div className="flex items-center">
        <label className="flex items-center text-sm font-semibold text-gray-900 dark:text-gray-100">
          {Icon && <Icon className="w-4 h-4 mr-2 text-blue-600 dark:text-blue-400" />}
          {label}
        </label>
        {(simpleExplanation || helpText) && (
          <IconTooltip
            content={simpleExplanation || helpText}
            icon={Lightbulb}
            iconClassName="w-4 h-4 text-blue-600 dark:text-blue-400"
          />
        )}
      </div>

      {/* Slider and Input Container */}
      <div className="flex items-center gap-3">
        {/* Slider */}
        <div className="flex-1 relative">
          <input
            type="range"
            min={min}
            max={max}
            step={step}
            value={value}
            onChange={handleSliderChange}
            className="w-full h-3 rounded-lg appearance-none cursor-pointer slider-thumb"
            style={{
              background: `linear-gradient(to right,
                #3b82f6 0%,
                #3b82f6 ${percentage}%,
                #e5e7eb ${percentage}%,
                #e5e7eb 100%)`
            }}
          />
          {/* Min/Max Labels */}
          <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400 mt-1">
            <span>{min}{unit}</span>
            <span>{max}{unit}</span>
          </div>
        </div>

        {/* Number Input */}
        <div className="relative w-28">
          <input
            type="number"
            min={min}
            max={max}
            step={step}
            value={value}
            onChange={handleInputChange}
            className="w-full px-3 py-2 pr-12 text-center font-semibold text-gray-900 dark:text-white bg-white dark:bg-gray-800 border-2 border-blue-300 dark:border-blue-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-medium text-gray-700 dark:text-gray-300 pointer-events-none">
            {unit}
          </span>
        </div>
      </div>
    </div>
  );
};

// Add custom CSS for slider thumb
const sliderStyles = document.createElement('style');
sliderStyles.innerHTML = `
  .slider-thumb::-webkit-slider-thumb {
    appearance: none;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: linear-gradient(135deg, #3b82f6, #1d4ed8);
    cursor: pointer;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
    transition: transform 0.2s, box-shadow 0.2s;
  }

  .slider-thumb::-webkit-slider-thumb:hover {
    transform: scale(1.2);
    box-shadow: 0 4px 8px rgba(59, 130, 246, 0.4);
  }

  .slider-thumb::-moz-range-thumb {
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: linear-gradient(135deg, #3b82f6, #1d4ed8);
    cursor: pointer;
    border: none;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
    transition: transform 0.2s, box-shadow 0.2s;
  }

  .slider-thumb::-moz-range-thumb:hover {
    transform: scale(1.2);
    box-shadow: 0 4px 8px rgba(59, 130, 246, 0.4);
  }

  .slider-thumb::-webkit-slider-runnable-track {
    height: 12px;
    border-radius: 6px;
  }

  .slider-thumb::-moz-range-track {
    height: 12px;
    border-radius: 6px;
  }
`;

if (typeof document !== 'undefined') {
  document.head.appendChild(sliderStyles);
}
