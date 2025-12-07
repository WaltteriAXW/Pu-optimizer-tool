import React from 'react';
import { Thermometer, Clock, Droplets, Leaf, FlaskConical } from 'lucide-react';
import PropTypes from 'prop-types';

/**
 * MaterialInfoCard - Displays selected material properties from TDS
 */
export const MaterialInfoCard = ({ material }) => {
  if (!material) return null;

  const isEcomate = material.category === 'ecomate';

  return (
    <div className="p-4 bg-white border border-gray-200 rounded-lg shadow-sm">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <h4 className="font-bold text-gray-900">{material.name}</h4>
          <p className="text-sm text-gray-600">{material.description}</p>
        </div>
        {isEcomate && (
          <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded">
            Zero GWP
          </span>
        )}
      </div>

      {/* Properties Grid */}
      <div className="grid grid-cols-2 gap-3 text-sm">
        {/* Viscosity */}
        <div className="flex items-center gap-2">
          <Droplets className="w-4 h-4 text-blue-500" />
          <div>
            <div className="text-gray-600 text-xs font-medium">Polyol Viscosity</div>
            <div className="font-semibold text-gray-900">{material.polyol.viscosity} cP</div>
          </div>
        </div>

        {/* Temperature */}
        <div className="flex items-center gap-2">
          <Thermometer className="w-4 h-4 text-red-500" />
          <div>
            <div className="text-gray-600 text-xs font-medium">Process Temp</div>
            <div className="font-semibold text-gray-900">
              {material.processing.chemicalTemp.min}-{material.processing.chemicalTemp.max}°C
            </div>
          </div>
        </div>

        {/* Cream Time */}
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-orange-500" />
          <div>
            <div className="text-gray-600 text-xs font-medium">Cream Time</div>
            <div className="font-semibold text-gray-900">
              {material.reaction.creamTime.min}-{material.reaction.creamTime.max}s
            </div>
          </div>
        </div>

        {/* Gel Time */}
        {material.reaction.gelTime && (
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-purple-500" />
            <div>
              <div className="text-gray-600 text-xs font-medium">Gel Time</div>
              <div className="font-semibold text-gray-900">
                {material.reaction.gelTime.min}-{material.reaction.gelTime.max}s
              </div>
            </div>
          </div>
        )}

        {/* Foam Density */}
        <div className="flex items-center gap-2">
          <FlaskConical className="w-4 h-4 text-cyan-500" />
          <div>
            <div className="text-gray-600 text-xs font-medium">Foam Density</div>
            <div className="font-semibold text-gray-900">
              {material.foam.freeRiseDensity.min}-{material.foam.freeRiseDensity.max} kg/m³
            </div>
          </div>
        </div>

        {/* Mix Ratio */}
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 flex items-center justify-center text-gray-600 text-xs font-bold">
            ⚖
          </div>
          <div>
            <div className="text-gray-600 text-xs font-medium">Mix Ratio (wt)</div>
            <div className="font-semibold text-gray-900">
              {material.mixRatio.polyol}:{material.mixRatio.isocyanate}
            </div>
          </div>
        </div>
      </div>

      {/* Environmental Badge */}
      {isEcomate && (
        <div className="mt-3 pt-3 border-t border-gray-100 flex items-center gap-2">
          <Leaf className="w-4 h-4 text-green-600" />
          <span className="text-xs text-green-700">
            ecomate® blowing agent — Zero GWP, Zero ODP, PFAS-free
          </span>
        </div>
      )}
    </div>
  );
};

MaterialInfoCard.propTypes = {
  material: PropTypes.object
};

export default MaterialInfoCard;
