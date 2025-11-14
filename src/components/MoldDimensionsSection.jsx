/* eslint-disable react/prop-types */
import React, { useEffect, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../card';
import { Scale, FileSpreadsheet, ChevronDown, ChevronRight } from 'lucide-react';
import { InputField, SelectField } from './shared';
import { useDebounce } from '../../hooks/useDebounce';

/**
 * MoldDimensionsSection Component
 * Handles mold shape selection and dimension inputs
 *
 * @param {Object} props
 * @param {boolean} props.moldDimensionsExpanded - Whether section is expanded
 * @param {Function} props.setMoldDimensionsExpanded - Handler to toggle expansion
 * @param {string} props.moldShape - Current mold shape
 * @param {Function} props.setMoldShape - Handler to update mold shape
 * @param {Object} props.moldDimensions - Mold dimension values
 * @param {Function} props.setMoldDimensions - Handler to update mold dimensions
 * @param {number} props.moldVolume - Calculated mold volume
 * @param {Function} props.setMoldVolume - Handler to set mold volume
 */
export const MoldDimensionsSection = React.memo(function MoldDimensionsSection({
  moldDimensionsExpanded,
  setMoldDimensionsExpanded,
  moldShape,
  setMoldShape,
  moldDimensions,
  setMoldDimensions,
  moldVolume,
  setMoldVolume
}) {
  // Debounce dimensions to prevent excessive calculations while typing
  const debouncedDimensions = useDebounce(moldDimensions, 300);

  // Calculate mold volume whenever debounced dimensions change
  useEffect(() => {
    let volume = 0;

    if (moldShape === 'rectangular') {
      const { length, width, height } = debouncedDimensions;
      if (length > 0 && width > 0 && height > 0) {
        volume = (length * width * height) / 1000000; // Convert mm³ to L
      }
    } else if (moldShape === 'cylinder') {
      const { diameter, cylinderHeight, wallThickness } = debouncedDimensions;
      if (diameter > 0 && cylinderHeight > 0 && wallThickness > 0) {
        const outerRadius = diameter / 2;
        const innerRadius = outerRadius - wallThickness;
        const outerVolume = Math.PI * Math.pow(outerRadius, 2) * cylinderHeight;
        const innerVolume = Math.PI * Math.pow(innerRadius, 2) * cylinderHeight;
        volume = (outerVolume - innerVolume) / 1000000; // Shell volume in L
      }
    } else if (moldShape === 'sphere') {
      const { sphereDiameter, wallThickness } = debouncedDimensions;
      if (sphereDiameter > 0 && wallThickness > 0) {
        const outerRadius = sphereDiameter / 2;
        const innerRadius = outerRadius - wallThickness;
        const outerVolume = (4 / 3) * Math.PI * Math.pow(outerRadius, 3);
        const innerVolume = (4 / 3) * Math.PI * Math.pow(innerRadius, 3);
        volume = (outerVolume - innerVolume) / 1000000; // Shell volume in L
      }
    }

    setMoldVolume(volume);
  }, [moldShape, debouncedDimensions, setMoldVolume]);

  return (
    <Card className="border-l-4 border-l-indigo-600">
      <CardHeader>
        <button
          type="button"
          className="w-full flex items-center justify-between text-left group"
          onClick={() => setMoldDimensionsExpanded(!moldDimensionsExpanded)}
        >
          <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-gray-50">
            <div className="flex items-center justify-center w-7 h-7 rounded-full bg-indigo-600 text-white text-sm font-bold mr-1">3</div>
            <Scale className="w-5 h-5 text-indigo-600" />
            Mold Dimensions (Optional)
          </CardTitle>
          {moldDimensionsExpanded ? <ChevronDown className="w-5 h-5 text-indigo-600" /> : <ChevronRight className="w-5 h-5 text-indigo-600" />}
        </button>
      </CardHeader>
      {moldDimensionsExpanded && (
        <CardContent className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Define your mold cavity dimensions to calculate accurate injection time and material requirements.
          </p>

          <SelectField
            label="Mold Shape"
            icon={Scale}
            value={moldShape}
            onChange={(e) => setMoldShape(e.target.value)}
          >
            <option value="rectangular">Rectangular (Panels, Boxes)</option>
            <option value="cylinder">Cylindrical (Boilers, Tanks)</option>
            <option value="sphere">Spherical (Tanks, Vessels)</option>
          </SelectField>

          {moldShape === 'rectangular' && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <InputField
                  label="Length"
                  unit="mm"
                  icon={FileSpreadsheet}
                  type="number"
                  min="10"
                  step="10"
                  value={moldDimensions.length}
                  onChange={(e) => {
                    const value = e.target.value === '' ? 0 : Number(e.target.value);
                    setMoldDimensions(prev => ({ ...prev, length: value }));
                  }}
                  helpText="Mold cavity length"
                  placeholder="1000"
                />
                <InputField
                  label="Width"
                  unit="mm"
                  icon={FileSpreadsheet}
                  type="number"
                  min="10"
                  step="10"
                  value={moldDimensions.width}
                  onChange={(e) => {
                    const value = e.target.value === '' ? 0 : Number(e.target.value);
                    setMoldDimensions(prev => ({ ...prev, width: value }));
                  }}
                  helpText="Mold cavity width"
                  placeholder="500"
                />
                <InputField
                  label="Height/Thickness"
                  unit="mm"
                  icon={FileSpreadsheet}
                  type="number"
                  min="1"
                  step="1"
                  value={moldDimensions.height}
                  onChange={(e) => {
                    const value = e.target.value === '' ? 0 : Number(e.target.value);
                    setMoldDimensions(prev => ({ ...prev, height: value }));
                  }}
                  helpText="Panel thickness"
                  placeholder="50"
                />
              </div>
            </div>
          )}

          {moldShape === 'cylinder' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <InputField
                  label="Outer Diameter"
                  unit="mm"
                  icon={FileSpreadsheet}
                  type="number"
                  min="10"
                  step="10"
                  value={moldDimensions.diameter}
                  onChange={(e) => {
                    const value = e.target.value === '' ? 0 : Number(e.target.value);
                    setMoldDimensions(prev => ({ ...prev, diameter: value }));
                  }}
                  helpText="Outer diameter of cylinder"
                  placeholder="500"
                />
                <InputField
                  label="Height"
                  unit="mm"
                  icon={FileSpreadsheet}
                  type="number"
                  min="10"
                  step="10"
                  value={moldDimensions.cylinderHeight}
                  onChange={(e) => {
                    const value = e.target.value === '' ? 0 : Number(e.target.value);
                    setMoldDimensions(prev => ({ ...prev, cylinderHeight: value }));
                  }}
                  helpText="Cylinder height"
                  placeholder="1000"
                />
                <InputField
                  label="Wall Thickness"
                  unit="mm"
                  icon={FileSpreadsheet}
                  type="number"
                  min="1"
                  step="1"
                  value={moldDimensions.wallThickness}
                  onChange={(e) => {
                    const value = e.target.value === '' ? 0 : Number(e.target.value);
                    setMoldDimensions(prev => ({ ...prev, wallThickness: value }));
                  }}
                  helpText="Foam layer thickness"
                  placeholder="50"
                />
              </div>
            </div>
          )}

          {moldShape === 'sphere' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <InputField
                  label="Outer Diameter"
                  unit="mm"
                  icon={FileSpreadsheet}
                  type="number"
                  min="10"
                  step="10"
                  value={moldDimensions.sphereDiameter}
                  onChange={(e) => {
                    const value = e.target.value === '' ? 0 : Number(e.target.value);
                    setMoldDimensions(prev => ({ ...prev, sphereDiameter: value }));
                  }}
                  helpText="Outer diameter of sphere"
                  placeholder="500"
                />
                <InputField
                  label="Wall Thickness"
                  unit="mm"
                  icon={FileSpreadsheet}
                  type="number"
                  min="1"
                  step="1"
                  value={moldDimensions.wallThickness}
                  onChange={(e) => {
                    const value = e.target.value === '' ? 0 : Number(e.target.value);
                    setMoldDimensions(prev => ({ ...prev, wallThickness: value }));
                  }}
                  helpText="Foam layer thickness"
                  placeholder="50"
                />
              </div>
            </div>
          )}

          {moldVolume > 0 && (
            <div className="p-4 rounded-lg space-y-2 text-sm" style={{ backgroundColor: 'rgba(0, 217, 255, 0.1)', border: '1px solid rgba(0, 217, 255, 0.2)' }}>
              <h4 className="font-semibold" style={{ color: '#00D9FF' }}>Calculated Mold Volume:</h4>
              <p style={{ color: '#E0E2E9' }}>
                Cavity volume: <span className="font-semibold">{moldVolume.toFixed(3)} L</span>
              </p>
              <p className="text-xs italic" style={{ color: '#A8ABB3' }}>
                This volume will be used to calculate accurate injection time and material requirements
              </p>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
});

export default MoldDimensionsSection;
