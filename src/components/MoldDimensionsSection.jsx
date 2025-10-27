import React, { useEffect, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../card';
import { Scale, FileSpreadsheet, ChevronDown, ChevronRight } from 'lucide-react';

/**
 * Input field component with icon and unit display
 */
const InputField = ({ label, unit, icon: Icon, helpText, ...props }) => (
  <div className="space-y-2 group">
    <label className="flex items-center text-sm font-medium text-gray-800 dark:text-gray-200">
      {Icon && <Icon className="w-4 h-4 mr-2 text-blue-600 dark:text-blue-400" />}
      {label}
    </label>
    {helpText && (
      <p className="text-xs text-gray-600 dark:text-gray-300 -mt-1 mb-1">{helpText}</p>
    )}
    <div className="relative">
      <input
        {...props}
        className="w-full px-3 py-2 pr-12 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white transition-all"
      />
      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-medium text-gray-600 dark:text-gray-300">
        {unit}
      </span>
    </div>
  </div>
);

/**
 * Select field component with icon
 */
const SelectField = ({ label, icon: Icon, children, ...props }) => (
  <div className="space-y-2 group">
    <label className="flex items-center text-sm font-medium text-gray-800 dark:text-gray-200">
      {Icon && <Icon className="w-4 h-4 mr-2 text-blue-600 dark:text-blue-400" />}
      {label}
    </label>
    <select
      {...props}
      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white transition-all hover:border-blue-400 dark:hover:border-blue-500"
    >
      {children}
    </select>
  </div>
);

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
export function MoldDimensionsSection({
  moldDimensionsExpanded,
  setMoldDimensionsExpanded,
  moldShape,
  setMoldShape,
  moldDimensions,
  setMoldDimensions,
  moldVolume,
  setMoldVolume
}) {
  // Calculate mold volume whenever dimensions change
  useEffect(() => {
    let volume = 0;

    if (moldShape === 'rectangular') {
      const { length, width, height } = moldDimensions;
      if (length > 0 && width > 0 && height > 0) {
        volume = (length * width * height) / 1000000; // Convert mm³ to L
      }
    } else if (moldShape === 'cylinder') {
      const { diameter, cylinderHeight, wallThickness } = moldDimensions;
      if (diameter > 0 && cylinderHeight > 0 && wallThickness > 0) {
        const outerRadius = diameter / 2;
        const innerRadius = outerRadius - wallThickness;
        const outerVolume = Math.PI * Math.pow(outerRadius, 2) * cylinderHeight;
        const innerVolume = Math.PI * Math.pow(innerRadius, 2) * cylinderHeight;
        volume = (outerVolume - innerVolume) / 1000000; // Shell volume in L
      }
    } else if (moldShape === 'sphere') {
      const { sphereDiameter, wallThickness } = moldDimensions;
      if (sphereDiameter > 0 && wallThickness > 0) {
        const outerRadius = sphereDiameter / 2;
        const innerRadius = outerRadius - wallThickness;
        const outerVolume = (4 / 3) * Math.PI * Math.pow(outerRadius, 3);
        const innerVolume = (4 / 3) * Math.PI * Math.pow(innerRadius, 3);
        volume = (outerVolume - innerVolume) / 1000000; // Shell volume in L
      }
    }

    setMoldVolume(volume);
  }, [moldShape, moldDimensions, setMoldVolume]);

  return (
    <Card className="shadow-md hover:shadow-lg transition-all duration-200 border-l-4 border-l-indigo-500">
      <CardHeader className="bg-gradient-to-r from-gray-50 to-indigo-50 dark:from-gray-800 dark:to-indigo-900/20">
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
                  onChange={(e) => setMoldDimensions(prev => ({ ...prev, length: Number(e.target.value) }))}
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
                  onChange={(e) => setMoldDimensions(prev => ({ ...prev, width: Number(e.target.value) }))}
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
                  onChange={(e) => setMoldDimensions(prev => ({ ...prev, height: Number(e.target.value) }))}
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
                  onChange={(e) => setMoldDimensions(prev => ({ ...prev, diameter: Number(e.target.value) }))}
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
                  onChange={(e) => setMoldDimensions(prev => ({ ...prev, cylinderHeight: Number(e.target.value) }))}
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
                  onChange={(e) => setMoldDimensions(prev => ({ ...prev, wallThickness: Number(e.target.value) }))}
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
                  onChange={(e) => setMoldDimensions(prev => ({ ...prev, sphereDiameter: Number(e.target.value) }))}
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
                  onChange={(e) => setMoldDimensions(prev => ({ ...prev, wallThickness: Number(e.target.value) }))}
                  helpText="Foam layer thickness"
                  placeholder="50"
                />
              </div>
            </div>
          )}

          {moldVolume > 0 && (
            <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg space-y-2 text-sm">
              <h4 className="font-semibold text-purple-900 dark:text-purple-100">Calculated Mold Volume:</h4>
              <p className="text-purple-800 dark:text-purple-200">
                Cavity volume: <span className="font-semibold">{moldVolume.toFixed(3)} L</span>
              </p>
              <p className="text-xs text-purple-600 dark:text-purple-400 italic">
                This volume will be used to calculate accurate injection time and material requirements
              </p>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}

export default MoldDimensionsSection;
