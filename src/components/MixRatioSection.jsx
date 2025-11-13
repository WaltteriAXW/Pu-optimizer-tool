import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../card';
import { Leaf, FileSpreadsheet, Scale, CheckCircle2, ChevronDown, ChevronRight } from 'lucide-react';
import { InputField } from './shared';

/**
 * MixRatioSection Component
 * Advanced mix ratio calculator for polyol and isocyanate
 *
 * @param {Object} props
 * @param {boolean} props.mixRatioExpanded - Whether section is expanded
 * @param {Function} props.setMixRatioExpanded - Handler to toggle expansion
 * @param {Object} props.mixInputs - Mix ratio input values
 * @param {Function} props.setMixInputs - Handler to update mix inputs
 * @param {Object} props.mixResults - Calculated mix ratio results
 */
export const MixRatioSection = React.memo(function MixRatioSection({
  mixRatioExpanded,
  setMixRatioExpanded,
  mixInputs,
  setMixInputs,
  mixResults
}) {
  return (
    <Card className="border-l-4 border-l-green-600">
      <CardHeader>
        <button
          type="button"
          className="w-full flex items-center justify-between text-left hover:opacity-80 transition-opacity duration-150"
          onClick={() => setMixRatioExpanded(!mixRatioExpanded)}
        >
          <CardTitle className="flex items-center gap-3 text-gray-900 dark:text-gray-50">
            <Leaf className="w-5 h-5 text-green-600" />
            Advanced Mix Ratio Calculator
          </CardTitle>
          {mixRatioExpanded ?
            <ChevronDown className="w-5 h-5 text-gray-600 dark:text-gray-400 transition-transform" /> :
            <ChevronRight className="w-5 h-5 text-gray-600 dark:text-gray-400 transition-transform" />
          }
        </button>
      </CardHeader>
      {mixRatioExpanded && (
        <CardContent className="space-y-4 pt-4 animate-slideIn">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <InputField
              label="Polyol SG"
              unit=""
              icon={FileSpreadsheet}
              type="number"
              step="0.01"
              value={mixInputs.polyolSG}
              onChange={(e) => {
                const value = e.target.value === '' ? '' : Number(e.target.value);
                setMixInputs(prev => ({ ...prev, polyolSG: value }));
              }}
              helpText="Specific gravity of polyol component"
              placeholder="1.12"
            />

            <InputField
              label="Isocyanate SG"
              unit=""
              icon={FileSpreadsheet}
              type="number"
              step="0.01"
              value={mixInputs.isoSG}
              onChange={(e) => {
                const value = e.target.value === '' ? '' : Number(e.target.value);
                setMixInputs(prev => ({ ...prev, isoSG: value }));
              }}
              helpText="Specific gravity of isocyanate"
              placeholder="1.23"
            />
          </div>

          <InputField
            label="Part Volume"
            unit="L"
            icon={Scale}
            type="number"
            step="0.1"
            value={mixInputs.partVolume}
            onChange={(e) => {
              const value = e.target.value === '' ? '' : Number(e.target.value);
              setMixInputs(prev => ({ ...prev, partVolume: value }));
            }}
            helpText="Total volume of part to be filled"
            placeholder="1.0"
          />

          {mixResults && (
            <div className="bg-green-50 dark:bg-gray-700 p-4 rounded-md space-y-3 text-sm border border-green-200 dark:border-green-800">
              <h4 className="font-bold text-gray-900 dark:text-gray-100 text-base flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
                Component Requirements:
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-gray-100 dark:bg-gray-600 p-3 rounded border border-gray-300 dark:border-gray-500">
                  <p className="text-xs text-gray-700 dark:text-gray-300 font-semibold">Polyol</p>
                  <p className="text-gray-900 dark:text-gray-100 font-bold mt-1">
                    {mixResults.polyolKg} kg
                  </p>
                  <p className="text-xs text-green-700 dark:text-green-300">
                    ({mixResults.polyolL} L)
                  </p>
                </div>
                <div className="bg-gray-100 dark:bg-gray-600 p-3 rounded border border-gray-300 dark:border-gray-500">
                  <p className="text-xs text-gray-700 dark:text-gray-300 font-semibold">Isocyanate</p>
                  <p className="text-gray-900 dark:text-gray-100 font-bold mt-1">
                    {mixResults.isoKg} kg
                  </p>
                  <p className="text-xs text-green-700 dark:text-green-300">
                    ({mixResults.isoL} L)
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-3 border-t border-green-200 dark:border-green-800">
                <div className="text-center">
                  <p className="text-xs text-gray-700 dark:text-gray-300 font-semibold">Total Weight</p>
                  <p className="text-gray-900 dark:text-gray-100 font-bold mt-1">{mixResults.totalWeight} kg</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-gray-700 dark:text-gray-300 font-semibold">Density</p>
                  <p className="text-gray-900 dark:text-gray-100 font-bold mt-1">{mixResults.density} kg/m³</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-gray-700 dark:text-gray-300 font-semibold">Ratio</p>
                  <p className="text-gray-900 dark:text-gray-100 font-bold mt-1">{mixResults.weightRatio}</p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
});

export default MixRatioSection;
