/* eslint-disable react/prop-types */
import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../card';
import { Settings2, Thermometer, FileSpreadsheet, Leaf, Database, ChevronDown, ChevronRight, Lightbulb } from 'lucide-react';
import { IconTooltip } from '../tooltip';
import { SliderInput } from '../slider_input';
import { DatabaseViewer } from '../database_viewer';
import { getAllMaterialPresets } from '../utils/database_loader';
import { InputField, SelectField } from './shared';

/**
 * FormInputsSection Component
 * Handles machine selection, material selection, and process parameters input
 *
 * @param {Object} props
 * @param {Object} props.MACHINE_SPECS - Machine specifications object
 * @param {Object} props.MATERIAL_PRESETS - Material presets object
 * @param {string} props.selectedMachine - Currently selected machine ID
 * @param {Function} props.setSelectedMachine - Handler to update selected machine
 * @param {string} props.selectedMaterial - Currently selected material ID
 * @param {Function} props.setSelectedMaterial - Handler to update selected material
 * @param {string} props.selectedMaterialName - Name of selected material from database
 * @param {boolean} props.showDatabase - Whether database viewer is shown
 * @param {Function} props.setShowDatabase - Handler to toggle database viewer
 * @param {Function} props.handleSelectFromDatabase - Handler for database material selection
 * @param {Object} props.inputs - Form input values
 * @param {Function} props.setInputs - Handler to update form inputs
 * @param {string} props.viewMode - Current view mode ('simple' or 'advanced')
 */
export const FormInputsSection = React.memo(function FormInputsSection({
  MACHINE_SPECS,
  _MATERIAL_PRESETS,
  selectedMachine,
  setSelectedMachine,
  _selectedMaterial,
  _setSelectedMaterial,
  selectedMaterialName,
  showDatabase,
  setShowDatabase,
  handleSelectFromDatabase,
  inputs,
  setInputs,
  viewMode
}) {
  return (
    <>
      {/* Machine and Material Selection */}
      <Card className="border-l-4 border-l-blue-600">
        <CardHeader>
          <CardTitle className="flex items-center gap-3 text-gray-900 dark:text-gray-50">
            <div className="flex items-center justify-center w-8 h-8 rounded bg-blue-600 text-white text-sm font-bold">1</div>
            <Settings2 className="w-5 h-5 text-blue-600" />
            Machine Selection
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 pt-4">
          <SelectField
            label="Injection Molding Machine"
            icon={Settings2}
            value={selectedMachine}
            onChange={(e) => setSelectedMachine(e.target.value)}
          >
            {Object.entries(MACHINE_SPECS).map(([key, spec]) => (
              <option key={key} value={key}>{spec.name}</option>
            ))}
          </SelectField>

          {MACHINE_SPECS[selectedMachine] && (
            <div className="bg-blue-50 dark:bg-gray-700 p-4 rounded-md text-sm border border-blue-200 dark:border-blue-800">
              <p className="font-bold text-gray-900 dark:text-gray-100 text-base">
                {MACHINE_SPECS[selectedMachine].name}
              </p>
              <p className="text-gray-700 dark:text-gray-300 mt-1 text-sm">
                {MACHINE_SPECS[selectedMachine].manufacturer}
              </p>
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="bg-gray-100 dark:bg-gray-600 p-2 rounded border border-gray-300 dark:border-gray-500">
                  <p className="text-gray-700 dark:text-gray-300 text-xs font-semibold">Max Output</p>
                  <p className="font-bold text-gray-900 dark:text-gray-100 mt-1">{MACHINE_SPECS[selectedMachine].output}</p>
                </div>
                <div className="bg-gray-100 dark:bg-gray-600 p-2 rounded border border-gray-300 dark:border-gray-500">
                  <p className="text-gray-700 dark:text-gray-300 text-xs font-semibold">Max Pressure</p>
                  <p className="font-bold text-gray-900 dark:text-gray-100 mt-1">{MACHINE_SPECS[selectedMachine].maxPressure} bar</p>
                </div>
                <div className="bg-gray-100 dark:bg-gray-600 p-2 rounded border border-gray-300 dark:border-gray-500">
                  <p className="text-gray-700 dark:text-gray-300 text-xs font-semibold">Tank</p>
                  <p className="font-bold text-gray-900 dark:text-gray-100 mt-1">{MACHINE_SPECS[selectedMachine].tankCapacity}</p>
                </div>
              </div>
            </div>
          )}

          {selectedMaterialName && (
            <div className="bg-green-50 dark:bg-gray-700 p-3 rounded-md border-l-4 border-l-green-600">
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                ✓ Material: {selectedMaterialName}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Material Database Browser */}
      <Card className="border-l-4 border-l-green-600">
        <CardHeader>
          <button
            type="button"
            className="w-full flex items-center justify-between text-left hover:opacity-80 transition-opacity duration-150"
            onClick={() => setShowDatabase(!showDatabase)}
          >
            <CardTitle className="flex items-center gap-3 text-gray-900 dark:text-gray-50">
              <Database className="w-5 h-5 text-green-600" />
              Material Database
              <span className="text-xs px-2 py-1 rounded font-normal" style={{ backgroundColor: 'rgba(0, 217, 255, 0.15)', color: '#E0E2E9' }}>
                {getAllMaterialPresets().length} products
              </span>
            </CardTitle>
            {showDatabase ?
              <ChevronDown className="w-5 h-5 text-gray-600 dark:text-gray-400 transition-transform" /> :
              <ChevronRight className="w-5 h-5 text-gray-600 dark:text-gray-400 transition-transform" />
            }
          </button>
        </CardHeader>
        {showDatabase && (
          <CardContent className="pt-4">
            <DatabaseViewer onSelectProduct={handleSelectFromDatabase} />
          </CardContent>
        )}
      </Card>

      {/* Process Parameters Input */}
      <Card className="border-l-4 border-l-purple-600">
        <CardHeader>
          <CardTitle className="flex items-center gap-3 text-gray-900 dark:text-gray-50">
            <div className="flex items-center justify-center w-8 h-8 rounded bg-purple-600 text-white text-sm font-bold">2</div>
            <Thermometer className="w-5 h-5 text-purple-600" />
            Process Parameters
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6 pt-4">
          {/* Pipe Length */}
          <SliderInput
            label="Pipe Length"
            min={50}
            max={10000}
            step={50}
            unit="mm"
            value={inputs.pipeLength}
            onChange={(value) => setInputs(prev => ({ ...prev, pipeLength: value }))}
            icon={FileSpreadsheet}
            helpText={viewMode === 'simple' ?
              'Distance the foam travels from machine to mold. Longer pipes = more pressure needed.' :
              'Total piping distance from mixing head to mold cavity entry point'}
          />

          {/* Pipe Diameter */}
          <SliderInput
            label="Pipe Inner Diameter"
            min={1}
            max={50}
            step={0.5}
            unit="mm"
            value={inputs.pipeDiameter}
            onChange={(value) => setInputs(prev => ({ ...prev, pipeDiameter: value }))}
            icon={FileSpreadsheet}
            helpText={viewMode === 'simple' ?
              'Tube width. Wider tubes = easier flow = less pressure needed.' :
              'Internal diameter of delivery tubing (affects flow resistance)'}
          />

          {/* Temperature */}
          <SliderInput
            label="Material Temperature"
            min={5}
            max={50}
            step={1}
            unit="°C"
            value={inputs.temperature}
            onChange={(value) => setInputs(prev => ({ ...prev, temperature: value }))}
            icon={Thermometer}
            helpText={viewMode === 'simple' ?
              'Foam temperature. Warmer = thinner and flows easier. Colder = thicker and needs more pressure.' :
              'Process temperature (affects viscosity via Arrhenius equation)'}
          />

          {/* Flow Rate */}
          <SliderInput
            label="Flow Rate"
            min={0.1}
            max={200}
            step={0.5}
            unit="L/min"
            value={inputs.flowRate}
            onChange={(value) => setInputs(prev => ({ ...prev, flowRate: value }))}
            icon={FileSpreadsheet}
            helpText={viewMode === 'simple' ?
              "How fast you're pushing foam. Faster = more pressure needed, but quicker production." :
              'Volumetric flow rate (affects shear rate and Reynolds number)'}
          />

          {/* Advanced parameters in advanced mode */}
          {viewMode === 'advanced' && (
            <>
              <InputField
                label="Material Viscosity"
                unit="cP"
                icon={FileSpreadsheet}
                type="number"
                min="50"
                max="10000"
                step="10"
                value={inputs.viscosity}
                onChange={(e) => {
                  const value = e.target.value === '' ? '' : Number(e.target.value);
                  setInputs(prev => ({ ...prev, viscosity: value }));
                }}
                helpText="Dynamic viscosity at reference temperature (25°C)"
              />

              <InputField
                label="Material Density"
                unit="kg/m³"
                icon={FileSpreadsheet}
                type="number"
                min="900"
                max="1500"
                step="10"
                value={inputs.density}
                onChange={(e) => {
                  const value = e.target.value === '' ? '' : Number(e.target.value);
                  setInputs(prev => ({ ...prev, density: value }));
                }}
                helpText="Material density for flow calculations"
              />
            </>
          )}
        </CardContent>
      </Card>
    </>
  );
});

export default FormInputsSection;
