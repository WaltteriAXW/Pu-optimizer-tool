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
    <Card className="shadow-md hover:shadow-lg transition-all duration-200 border-l-4 border-l-green-500">
      <CardHeader className="bg-gradient-to-r from-gray-50 to-green-50 dark:from-gray-800 dark:to-green-900/20">
        <button
          type="button"
          className="w-full flex items-center justify-between text-left group"
          onClick={() => setMixRatioExpanded(!mixRatioExpanded)}
        >
          <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-gray-50">
            <Leaf className="w-5 h-5 text-green-600 group-hover:animate-pulse" />
            Advanced Mix Ratio Calculator
          </CardTitle>
          {mixRatioExpanded ?
            <ChevronDown className="w-5 h-5 text-green-600 transition-transform" /> :
            <ChevronRight className="w-5 h-5 text-green-600 transition-transform" />
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
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 p-4 rounded-lg space-y-3 text-sm border border-green-200 dark:border-green-700 shadow-sm">
              <h4 className="font-bold text-green-950 dark:text-green-50 text-base flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
                Component Requirements:
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-white/70 dark:bg-gray-800/70 p-3 rounded">
                  <p className="text-xs text-gray-600 dark:text-gray-400">Polyol</p>
                  <p className="text-green-800 dark:text-green-200 font-bold">
                    {mixResults.polyolKg} kg
                  </p>
                  <p className="text-xs text-green-700 dark:text-green-300">
                    ({mixResults.polyolL} L)
                  </p>
                </div>
                <div className="bg-white/70 dark:bg-gray-800/70 p-3 rounded">
                  <p className="text-xs text-gray-600 dark:text-gray-400">Isocyanate</p>
                  <p className="text-green-800 dark:text-green-200 font-bold">
                    {mixResults.isoKg} kg
                  </p>
                  <p className="text-xs text-green-700 dark:text-green-300">
                    ({mixResults.isoL} L)
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 border-t border-green-300 dark:border-green-600">
                <div className="text-center">
                  <p className="text-xs text-gray-600 dark:text-gray-400">Total Weight</p>
                  <p className="text-green-900 dark:text-green-100 font-semibold">{mixResults.totalWeight} kg</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-gray-600 dark:text-gray-400">Density</p>
                  <p className="text-green-900 dark:text-green-100 font-semibold">{mixResults.density} kg/m³</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-gray-600 dark:text-gray-400">Ratio</p>
                  <p className="text-green-900 dark:text-green-100 font-semibold">{mixResults.weightRatio}</p>
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
