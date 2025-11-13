import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../card';
import { Settings2, Thermometer, FileSpreadsheet, Leaf, Database, ChevronDown, ChevronRight } from 'lucide-react';
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
  MATERIAL_PRESETS,
  selectedMachine,
  setSelectedMachine,
  selectedMaterial,
  setSelectedMaterial,
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
      <Card className="shadow-md hover:shadow-lg transition-all duration-200 border-l-4 border-l-blue-500">
        <CardHeader className="bg-gradient-to-r from-gray-50 to-blue-50 dark:from-gray-800 dark:to-blue-900/20">
          <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-gray-50">
            <div className="flex items-center justify-center w-7 h-7 rounded-full bg-blue-600 text-white text-sm font-bold mr-1">1</div>
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
            <div className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/30 dark:to-cyan-900/30 p-4 rounded-lg text-sm border border-blue-200 dark:border-blue-700 transform transition-all duration-200 hover:scale-[1.02]">
              <p className="font-bold text-blue-950 dark:text-blue-50 text-base">
                {MACHINE_SPECS[selectedMachine].name}
              </p>
              <p className="text-blue-800 dark:text-blue-200 mt-1">
                {MACHINE_SPECS[selectedMachine].manufacturer}
              </p>
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                <div className="bg-white/70 dark:bg-gray-800/70 p-2 rounded">
                  <p className="text-gray-600 dark:text-gray-400">Max Output</p>
                  <p className="font-semibold text-blue-700 dark:text-blue-300">{MACHINE_SPECS[selectedMachine].output}</p>
                </div>
                <div className="bg-white/70 dark:bg-gray-800/70 p-2 rounded">
                  <p className="text-gray-600 dark:text-gray-400">Max Pressure</p>
                  <p className="font-semibold text-blue-700 dark:text-blue-300">{MACHINE_SPECS[selectedMachine].maxPressure} bar</p>
                </div>
                <div className="bg-white/70 dark:bg-gray-800/70 p-2 rounded">
                  <p className="text-gray-600 dark:text-gray-400">Tank</p>
                  <p className="font-semibold text-blue-700 dark:text-blue-300">{MACHINE_SPECS[selectedMachine].tankCapacity}</p>
                </div>
              </div>
            </div>
          )}

          {selectedMaterialName && (
            <div className="bg-green-50 dark:bg-green-900/30 p-3 rounded-lg border border-green-300 dark:border-green-700">
              <p className="text-sm font-semibold text-green-900 dark:text-green-100">
                ✅ Using: {selectedMaterialName}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Material Database Browser */}
      <Card className="shadow-md hover:shadow-lg transition-all duration-300 border-l-4 border-l-green-500 bg-gradient-to-br from-white via-green-50 to-emerald-50 dark:from-gray-800 dark:via-green-900/20 dark:to-emerald-900/20">
        <CardHeader className="bg-gradient-to-r from-gray-50 to-green-50 dark:from-gray-800 dark:to-green-900/20">
          <button
            type="button"
            className="w-full flex items-center justify-between text-left group"
            onClick={() => setShowDatabase(!showDatabase)}
          >
            <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-gray-50">
              <Database className="w-5 h-5 text-green-600 group-hover:animate-pulse" />
              Material Database Browser
              <span className="text-xs bg-green-100 dark:bg-green-900 px-2 py-1 rounded-full text-green-800 dark:text-green-200 font-normal">
                {getAllMaterialPresets().length} Real Products
              </span>
            </CardTitle>
            {showDatabase ?
              <ChevronDown className="w-5 h-5 text-green-600 transition-transform" /> :
              <ChevronRight className="w-5 h-5 text-green-600 transition-transform" />
            }
          </button>
        </CardHeader>
        {showDatabase && (
          <CardContent className="pt-4 animate-slideIn">
            {viewMode === 'simple' && (
              <div className="bg-blue-50 dark:bg-blue-900/30 border-l-4 border-blue-500 p-3 rounded-r-lg mb-4">
                <p className="text-sm text-blue-900 dark:text-blue-100">
                  💡 <strong>Select Your Material:</strong> Browse real polyurethane products from manufacturers below.
                  Click any product to see details, then use it in your calculations. All material properties (density, viscosity, mix ratios) are filled automatically!
                </p>
              </div>
            )}
            <DatabaseViewer onSelectProduct={handleSelectFromDatabase} />
          </CardContent>
        )}
      </Card>

      {/* Process Parameters Input */}
      <Card className="shadow-md hover:shadow-lg transition-all duration-200 border-l-4 border-l-purple-500 bg-gradient-to-br from-white via-purple-50 to-pink-50 dark:from-gray-800 dark:via-purple-900/20 dark:to-pink-900/20">
        <CardHeader className="bg-gradient-to-r from-gray-50 to-purple-50 dark:from-gray-800 dark:to-purple-900/20">
          <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-gray-50">
            <div className="flex items-center justify-center w-7 h-7 rounded-full bg-purple-600 text-white text-sm font-bold mr-1">2</div>
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
              "Distance the foam travels from machine to mold. Longer pipes = more pressure needed." :
              "Total piping distance from mixing head to mold cavity entry point"}
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
              "Tube width. Wider tubes = easier flow = less pressure needed." :
              "Internal diameter of delivery tubing (affects flow resistance)"}
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
              "Foam temperature. Warmer = thinner and flows easier. Colder = thicker and needs more pressure." :
              "Process temperature (affects viscosity via Arrhenius equation)"}
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
              "Volumetric flow rate (affects shear rate and Reynolds number)"}
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
                onChange={(e) => setInputs(prev => ({ ...prev, viscosity: Number(e.target.value) }))}
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
                onChange={(e) => setInputs(prev => ({ ...prev, density: Number(e.target.value) }))}
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
