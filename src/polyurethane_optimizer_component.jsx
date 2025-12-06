/* eslint-disable @typescript-eslint/no-explicit-any, react/no-unescaped-entities */
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Button } from './button';
import { Card, CardHeader, CardTitle, CardContent } from './card';
import { SliderInput } from './slider_input';
import { Alert, AlertTitle, AlertDescription } from './alert';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as ChartTooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { Settings2, Thermometer, FileSpreadsheet, AlertTriangle, Download, Leaf, Scale, ChevronDown, ChevronRight, CheckCircle2, XCircle, Brain, TrendingUp, Target, Shield, Eye, EyeOff, Activity, Database, Save, HelpCircle, Info, Zap, Lightbulb, Calculator } from 'lucide-react';
import { RecipeManager } from './components/RecipeManager';
import { generateReport } from './utils/generateReport';
import { TelemetryCard } from './components/TelemetryCard';
import { IconTooltip } from './tooltip';
import { DatabaseViewer } from './database_viewer';
import { getAllMaterialPresets } from './utils/database_loader';
import { saveProcessEntry, getTrainingStats } from './training_data_storage';
import { useDebounce } from './hooks/useDebounce';
import { CalculationResultsSkeleton, LoadingSpinner } from './components/SkeletonLoader';
import { validateInputs, ValidationError } from './validation';
import { UI_CONFIG, CONVERSIONS } from './constants';
import * as CalcHelpers from './utils/calculationHelpers';
import { generateWarnings } from './utils/warningGenerator';
import { generateMLInsights } from './utils/mlInsights';
import { QuickSetup } from './components/QuickSetup';
import { ProductionPlanner } from './components/ProductionPlanner';
import { logError, logInfo, logDebug } from './utils/errorTracking';
import { measureAsync } from './utils/performance';
import { InputField, SelectField, ResultCard } from './components/shared';
import { MACHINE_SPECS } from './config/machineSpecs';
import { MATERIAL_PRESETS } from './config/materialPresets';
import { MoldVisualization3DLazy } from './components/MoldVisualization3DLazy';


const PolyurethaneOptimizer = () => {
  // State for view mode (simple vs advanced)
  const [viewMode, setViewMode] = useState('simple'); // 'simple' or 'advanced'

  // State for Quick Setup from database
  const [showQuickSetup, setShowQuickSetup] = useState(false);
  const [selectedMoldFromDatabase, setSelectedMoldFromDatabase] = useState(null);

  // State for database viewer
  const [showDatabase, setShowDatabase] = useState(false);
  const [selectedMaterialName, setSelectedMaterialName] = useState('');

  // State for collapsible help section
  const [showHelpGuide, setShowHelpGuide] = useState(false);

  // State for machine and material selection
  const [selectedMachine, setSelectedMachine] = useState('cannon_std_legacy');
  const [selectedMaterial, setSelectedMaterial] = useState('ecofoam_standard');

  // State for form inputs
  const [inputs, setInputs] = useState({
    pipeLength: 500,
    pipeDiameter: 12,
    temperature: 25,
    flowRate: 5, // L/min
    viscosity: 350,
    density: 1120,
    specificGravity: 1.12
  });

  // State for mix ratio calculator
  const [mixRatioExpanded, setMixRatioExpanded] = useState(false);
  const [mixInputs, setMixInputs] = useState({
    polyolSG: 1.12,
    isoSG: 1.23,
    partVolume: 1.0
  });
  const [mixResults, setMixResults] = useState(null);

  // State for mold dimensions
  const [moldDimensionsExpanded, setMoldDimensionsExpanded] = useState(true);
  const [moldShape, setMoldShape] = useState('rectangular');
  const [moldDimensions, setMoldDimensions] = useState({
    // Rectangular
    length: 1000, // mm
    width: 500,   // mm
    height: 50,   // mm
    // Cylinder
    diameter: 500, // mm
    cylinderHeight: 1000, // mm
    // Sphere
    sphereDiameter: 500, // mm
    wallThickness: 50 // mm for all shapes
  });
  const [moldVolume, setMoldVolume] = useState(0);

  // State for calculation results
  const [results, setResults] = useState(null);
  const [pressureVsLength, setPressureVsLength] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  // Debounce inputs to prevent excessive calculations on every keystroke
  const debouncedInputs = useDebounce(inputs, UI_CONFIG.INPUT_DEBOUNCE_DELAY);
  const debouncedMoldDimensions = useDebounce(moldDimensions, UI_CONFIG.MOLD_DEBOUNCE_DELAY);

  // Memoize mold volume calculation to avoid recalculating on every render
  const calculatedMoldVolume = useMemo(() => {
    const { length, width, height, diameter, cylinderHeight, sphereDiameter, wallThickness } = debouncedMoldDimensions;

    switch (moldShape) {
    case 'rectangular': {
      // Volume of rectangular cavity = L × W × H (in liters)
      // 1 liter = 1,000,000 mm³
      const volumeMm3 = length * width * height;
      return volumeMm3 / 1000000; // Convert mm³ to liters
    }
    case 'cylinder': {
      // Volume of cylinder = π × r² × h
      const radius = diameter / 2;
      const volumeMm3 = Math.PI * radius * radius * cylinderHeight;
      return volumeMm3 / 1000000; // Convert mm³ to liters
    }
    case 'sphere': {
      // Volume of sphere = 4/3 × π × r³
      const radius = sphereDiameter / 2;
      const volumeMm3 = (4 / 3) * Math.PI * Math.pow(radius, 3);
      return volumeMm3 / 1000000; // Convert mm³ to liters
    }
    default:
      return 0;
    }
  }, [moldShape, debouncedMoldDimensions]);

  // Update moldVolume state when calculated value changes
  useEffect(() => {
    setMoldVolume(calculatedMoldVolume);
  }, [calculatedMoldVolume]);

  // Update inputs when material preset changes
  useEffect(() => {
    if (selectedMaterial && MATERIAL_PRESETS[selectedMaterial]) {
      const preset = MATERIAL_PRESETS[selectedMaterial];
      setInputs(prev => ({
        ...prev,
        density: preset.density,
        viscosity: preset.viscosity,
        specificGravity: preset.density / 1000
      }));
      setMixInputs(prev => ({
        ...prev,
        polyolSG: preset.polyolSG,
        isoSG: preset.isoSG
      }));
    }
  }, [selectedMaterial]);

  // Calculate mix ratio (memoized to prevent unnecessary recalculations)
  const calculateMixRatio = useCallback(() => {
    const preset = MATERIAL_PRESETS[selectedMaterial];
    if (!preset) return;

    const [polyolParts, isoParts] = preset.weightRatio;
    const { polyolSG, isoSG, partVolume } = mixInputs;

    const polyolDensity = polyolSG * 1000;
    const isoDensity = isoSG * 1000;

    const polyolVolumeFrac = (polyolParts / polyolDensity) /
      ((polyolParts / polyolDensity) + (isoParts / isoDensity));
    const isoVolumeFrac = 1 - polyolVolumeFrac;

    const polyolVolume = partVolume * polyolVolumeFrac;
    const isoVolume = partVolume * isoVolumeFrac;

    const polyolWeight = polyolVolume * polyolDensity / 1000;
    const isoWeight = isoVolume * isoDensity / 1000;
    const totalWeight = polyolWeight + isoWeight;

    const theoreticalDensity = totalWeight / partVolume * 1000;

    setMixResults({
      polyolKg: polyolWeight.toFixed(3),
      polyolL: polyolVolume.toFixed(3),
      isoKg: isoWeight.toFixed(3),
      isoL: isoVolume.toFixed(3),
      totalWeight: totalWeight.toFixed(3),
      density: theoreticalDensity.toFixed(0),
      weightRatio: `${polyolParts}:${isoParts}`
    });
  }, [selectedMaterial, mixInputs]);

  useEffect(() => {
    if (mixRatioExpanded) {
      calculateMixRatio();
    }
  }, [mixRatioExpanded, mixInputs, selectedMaterial]);

  // Handle material selection from database
  const handleSelectFromDatabase = (preset, product) => {
    setInputs(prev => ({
      ...prev,
      density: preset.density,
      viscosity: preset.viscosity,
      specificGravity: preset.density / 1000
    }));
    setMixInputs(prev => ({
      ...prev,
      polyolSG: preset.polyolSG,
      isoSG: preset.isoSG
    }));
    setSelectedMaterialName(preset.name);
    setShowDatabase(false);
  };

  // Simplify warnings for non-technical users
  const simplifyWarning = (warning) => {
    if (viewMode === 'advanced') return warning;

    const translations = {
      'Flow is turbulent': '⚠️ You\'re injecting TOO FAST! This causes bubbles, weak spots, and defects in your parts. The foam is tumbling and mixing with air instead of flowing smoothly.',
      'High shear rate': '⚠️ Material is being stressed and stretched too much during injection - this can damage the foam structure and make weak parts.',
      'Required pressure': '❌ YOUR MACHINE IS TOO WEAK! It cannot produce enough pressure for this job. Your parts will be incomplete.',
      'Very high flow velocity': '⚠️ Injection speed is way too high - will cause turbulence (chaotic mixing) and quality problems.',
      'exceeds machine capacity': '❌ Your machine can\'t handle this! You need more pressure than your machine can provide.'
    };

    for (const [key, simple] of Object.entries(translations)) {
      if (warning.includes(key)) {
        return simple;
      }
    }
    return warning;
  };

  // Simplify recommendations for non-technical users
  const simplifyRecommendation = (rec) => {
    if (viewMode === 'advanced') return rec;

    if (rec.includes('Reduce flow rate') || rec.includes('laminar flow')) {
      return '💡 SOLUTION: Slow down! Reduce your injection speed to get smoother, bubble-free flow. Try cutting your speed in half and test again.';
    }
    if (rec.includes('increase pipe diameter') || rec.includes('increasing pipe diameter')) {
      return '💡 SOLUTION: You have 2 options - Either use wider tubes (easier for foam to flow) OR slow down your injection speed.';
    }
    if (rec.includes('higher capacity machine') || rec.includes('select a higher')) {
      return '💡 SOLUTIONS: Three ways to fix this - 1) Slow down injection speed, 2) Use wider pipes, OR 3) Get a more powerful machine with higher pressure.';
    }
    return rec;
  };

  // Handler for applying Quick Setup configuration
  const handleApplyQuickSetup = (config) => {
    // Apply pipe configuration
    if (config.pipeDiameter !== undefined && config.pipeLength !== undefined) {
      setInputs(prev => ({
        ...prev,
        pipeDiameter: config.pipeDiameter,
        pipeLength: config.pipeLength
      }));
    }

    // Apply mold configuration
    if (config.moldVolume !== undefined) {
      setMoldVolume(config.moldVolume);
    }

    if (config.moldShape !== undefined) {
      setMoldShape(config.moldShape);
    }

    if (config.moldDimensions !== undefined) {
      setMoldDimensions(prev => ({
        ...prev,
        ...config.moldDimensions
      }));
    }

    // Save the selected mold object for production planning
    if (config.selectedMold !== undefined) {
      setSelectedMoldFromDatabase(config.selectedMold);
    }

    // Show success message
    logInfo('Quick Setup configuration applied', {
      component: 'PolyurethaneOptimizer',
      action: 'applyQuickSetup',
      config
    });

    // Close Quick Setup
    setShowQuickSetup(false);
  };

  // Enhanced calculation function (memoized to prevent unnecessary recreations)
  // REFACTORED: Extracted complex calculations into testable utility functions
  const calculateResults = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Validate inputs using validation module
      const validation = validateInputs(inputs);
      if (!validation.valid) {
        throw new Error(validation.error);
      }

      // Simulate calculation delay for UX
      await new Promise(resolve => setTimeout(resolve, UI_CONFIG.CALCULATION_SIMULATED_DELAY));

      // === STEP 1: Unit Conversions ===
      const { radius, length, flowRateM3s, area } = CalcHelpers.convertUnits(inputs);

      // === STEP 2: Material Properties ===
      const { activationEnergy, powerLawIndex, safetyFactor } = CalcHelpers.getMaterialProperties(selectedMaterial);

      // === STEP 3: Temperature Correction (Arrhenius) ===
      const tempFactor = CalcHelpers.calculateTemperatureFactor(inputs.temperature, activationEnergy);

      // === STEP 4: Shear Rate ===
      const shearRate = CalcHelpers.calculateShearRate(flowRateM3s, radius);

      // === STEP 5: Apparent Viscosity (Power Law Model) ===
      const baseViscosity = inputs.viscosity * CONVERSIONS.CP_TO_PA_S;
      const { correctedViscosity, apparentViscosity } = CalcHelpers.calculateApparentViscosity(
        baseViscosity,
        tempFactor,
        shearRate,
        powerLawIndex
      );

      // === STEP 6: Flow Characteristics ===
      const { velocity, reynolds, flowRegime } = CalcHelpers.calculateFlowCharacteristics(
        flowRateM3s,
        area,
        inputs.density,
        inputs.pipeDiameter,
        correctedViscosity
      );

      // === STEP 7: Load Machine Specifications ===
      const machine = MACHINE_SPECS[selectedMachine];

      // === STEP 8: Pressure Drop (Hagen-Poiseuille + Process Loss + Min Operating Pressure) ===
      const {
        pressureDrop,
        pipeLossBar,
        processLossBar,
        minOperatingPressureBar,
        requiredPumpSettingBar,
        pressureDropBar,
        totalPressureBar
      } = CalcHelpers.calculatePressureDrop(
        apparentViscosity,
        length,
        flowRateM3s,
        radius,
        powerLawIndex,
        safetyFactor,
        machine
      );

      // === STEP 9: Injection Times ===
      const { pipeVolume, pipeFillingTime, moldFillingTime, injectionTime } = CalcHelpers.calculateInjectionTimes(
        radius,
        length,
        flowRateM3s,
        moldVolume
      );

      // === STEP 10: Machine Compatibility ===
      const compatibilityResult = CalcHelpers.checkMachineCompatibility(totalPressureBar, machine);
      const compatible = compatibilityResult.compatible;

      // === STEP 10: Generate Warnings and Recommendations ===
      const flowRateKgMin = inputs.flowRate * inputs.density / 1000;
      const { warnings, recommendations } = generateWarnings({
        reynolds,
        shearRate,
        velocity,
        temperature: inputs.temperature,
        totalPressureBar,
        moldFillingTime,
        moldVolume,
        flowRateKgMin,
        compatible,
        compatibilityResult,
        machine,
        correctedViscosity,
        density: inputs.density,
        diameter: inputs.pipeDiameter,
        area,
        machineSpecs: MACHINE_SPECS
      });

      // === STEP 11: Generate Pressure Profile ===
      const pressureData = CalcHelpers.generatePressureProfile(
        apparentViscosity,
        flowRateM3s,
        radius,
        powerLawIndex,
        safetyFactor,
        machine.maxPressure
      );

      // === STEP 12: Generate ML Insights ===
      const mlInsights = generateMLInsights({
        selectedMaterial,
        radius,
        reynolds,
        shearRate,
        temperature: inputs.temperature,
        moldFillingTime,
        pressureDropBar,
        totalPressureBar,
        velocity,
        compatible,
        machine
      });

      // === STEP 13: Assemble Results ===
      setResults({
        // Primary pressure results
        optimalPressureBar: parseFloat(totalPressureBar.toFixed(3)),
        requiredPumpSettingBar: parseFloat(requiredPumpSettingBar.toFixed(3)),
        pressureDropBar: parseFloat(pressureDropBar.toFixed(3)),
        pressureDropKpa: parseFloat((pressureDropBar * CONVERSIONS.BAR_TO_KPA).toFixed(2)),

        // Pressure breakdown components
        pipeLossBar: parseFloat(pipeLossBar.toFixed(3)),
        processLossBar: parseFloat(processLossBar.toFixed(3)),
        minOperatingPressureBar: parseFloat(minOperatingPressureBar.toFixed(3)),

        // Flow characteristics
        reynoldsNumber: parseFloat(reynolds.toFixed(1)),
        flowRegime,
        velocity: parseFloat(velocity.toFixed(3)),
        shearRate: parseFloat(shearRate.toFixed(1)),
        apparentViscosity: parseFloat(apparentViscosity.toFixed(6)),

        // Injection parameters
        injectionTime: parseFloat(injectionTime.toFixed(3)),
        pipeVolume: parseFloat(pipeVolume.toFixed(4)),
        moldVolume: parseFloat(moldVolume.toFixed(4)),
        moldShape,
        pipeFillingTime: parseFloat(pipeFillingTime.toFixed(3)),
        moldFillingTime: parseFloat(moldFillingTime.toFixed(3)),

        // Compatibility and recommendations
        compatible,
        warnings,
        recommendations,
        machine,

        // ML Insights
        mlInsights
      });

      setPressureVsLength(pressureData);

      // === AUTO-SAVE TO TRAINING DATABASE FOR ML ===
      // Save process data for continuous learning and model improvement
      try {
        const trainingEntry = {
          pipeLength: inputs.pipeLength,
          pipeDiameter: inputs.pipeDiameter,
          temperature: inputs.temperature,
          flowRate: inputs.flowRate,
          viscosity: inputs.viscosity,
          density: inputs.density,
          moldShape: 'custom',
          moldDimensions: {},
          injectionType: 'single_point',
          machineType: selectedMachine,
          materialPreset: selectedMaterial,
          optimalPressure: totalPressureBar,
          reynoldsNumber: reynolds,
          injectionTime: injectionTime,
          moldVolume: pipeVolume * 1000,
          partQuality: null, // User can provide feedback later
          defectsObserved: [],
          notes: ''
        };

        const savedEntry = saveProcessEntry(trainingEntry);
        logInfo('Process data saved for ML training', {
          component: 'PolyurethaneOptimizer',
          entryId: savedEntry?.id
        });
      } catch (saveError) {
        logError(saveError, {
          component: 'PolyurethaneOptimizer',
          action: 'saveTrainingData',
          context: 'Non-critical: calculation succeeded but training data not saved'
        });
        // Don't fail the whole calculation if saving fails
      }

    } catch (err) {
      // Log error with context
      logError(err, {
        component: 'PolyurethaneOptimizer',
        action: 'calculateResults',
        inputs
      });

      // Set user-friendly error message
      if (err instanceof ValidationError) {
        setError(err.message);
      } else {
        setError(err.message || 'An unexpected error occurred during calculation. Please check your inputs and try again.');
      }
    } finally {
      setLoading(false);
    }
  }, [inputs, selectedMachine, selectedMaterial, moldVolume]);

  // Auto-calculate removed - user now clicks Calculate button manually

  return (
    <div className="min-h-screen w-full bg-gray-50 text-gray-900 flex flex-col">

      {/* Header with Actions */}
      <header className="h-14 border-b border-gray-200 bg-white flex items-center px-2 sm:px-4 justify-between shrink-0 shadow-sm">
        <div className="flex items-center gap-2">
          <h1 className="font-semibold text-sm text-gray-900">Parameters & Controls</h1>
        </div>
        <div className="flex gap-2">
            {/* Recipe Manager */}
            <RecipeManager
              currentInputs={{
                ...inputs,
                selectedMachine,
                selectedMaterial,
                moldShape,
                moldDimensions,
                moldVolume
              }}
              onLoad={(savedData) => {
                setInputs({
                  pipeLength: savedData.pipeLength,
                  pipeDiameter: savedData.pipeDiameter,
                  temperature: savedData.temperature,
                  flowRate: savedData.flowRate,
                  viscosity: savedData.viscosity,
                  density: savedData.density,
                  specificGravity: savedData.specificGravity
                });
                if (savedData.selectedMachine) setSelectedMachine(savedData.selectedMachine);
                if (savedData.selectedMaterial) setSelectedMaterial(savedData.selectedMaterial);
                if (savedData.moldShape) setMoldShape(savedData.moldShape);
                if (savedData.moldDimensions) setMoldDimensions(savedData.moldDimensions);
                if (savedData.moldVolume) setMoldVolume(savedData.moldVolume);
              }}
            />

          {/* PDF Export Button */}
          <button
            onClick={() => generateReport({...inputs, selectedMachine, selectedMaterial}, results)}
            className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={!results}
            title="Export PDF Report"
          >
            <Download size={14} />
            <span className="hidden md:inline">Export</span>
          </button>

          {/* View Mode Toggle */}
          <button
            onClick={() => setViewMode(viewMode === 'simple' ? 'advanced' : 'simple')}
            className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded text-xs transition-colors border border-gray-300"
            title={viewMode === 'simple' ? 'Switch to Advanced Mode' : 'Switch to Simple Mode'}
          >
            {viewMode === 'simple' ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            <span className="hidden md:inline">{viewMode === 'simple' ? 'Advanced' : 'Simple'}</span>
          </button>
        </div>
      </header>

      {/* Main Responsive Layout */}
      <main className="flex-1 p-4 overflow-y-auto">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-4">

        {/* LEFT COLUMN: Parameters (3/12 on desktop, order-1 on mobile) */}
        <aside className="lg:col-span-3 order-1 lg:order-1 bg-white rounded border border-gray-200 shadow-sm flex flex-col">
          <div className="p-3 border-b border-gray-200 text-sm font-semibold text-gray-700 shrink-0">
            Parameters
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-4">

            {/* Machine Selection */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-900">Machine</label>
              <select
                value={selectedMachine}
                onChange={(e) => setSelectedMachine(e.target.value)}
                className="w-full bg-white border border-gray-300 rounded h-10 px-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-sm"
              >
                {Object.entries(MACHINE_SPECS).map(([key, spec]) => (
                  <option key={key} value={key}>{spec.name}</option>
                ))}
              </select>
            </div>

            {/* Material Selection */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-900">Material</label>
              <select
                value={selectedMaterial}
                onChange={(e) => setSelectedMaterial(e.target.value)}
                className="w-full bg-white border border-gray-300 rounded h-10 px-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-sm"
              >
                {Object.entries(MATERIAL_PRESETS).map(([key, preset]) => (
                  <option key={key} value={key}>{preset.name}</option>
                ))}
              </select>
            </div>

            {/* Process Parameters */}
            <div className="space-y-4 pt-4 border-t border-gray-200">
              <h3 className="text-sm font-semibold text-gray-900">Process Settings</h3>

              <SliderInput
                label="Pipe Length"
                value={inputs.pipeLength}
                onChange={(val) => setInputs(prev => ({ ...prev, pipeLength: val }))}
                min={50}
                max={2000}
                step={10}
                unit="mm"
                icon={Settings2}
                showSimpleMode={viewMode === 'simple'}
                simpleExplanation="Distance from machine to mold"
                helpText="Length of injection pipe from machine to mold"
              />

              <SliderInput
                label="Pipe Diameter"
                value={inputs.pipeDiameter}
                onChange={(val) => setInputs(prev => ({ ...prev, pipeDiameter: val }))}
                min={6}
                max={25}
                step={0.5}
                unit="mm"
                icon={Settings2}
                showSimpleMode={viewMode === 'simple'}
                simpleExplanation="Width of the injection tube"
                helpText="Internal diameter (LP: 10-16mm, HP: 4-8mm)"
              />

              <SliderInput
                label="Temperature"
                value={inputs.temperature}
                onChange={(val) => setInputs(prev => ({ ...prev, temperature: val }))}
                min={15}
                max={35}
                step={1}
                unit="°C"
                icon={Thermometer}
                showSimpleMode={viewMode === 'simple'}
                simpleExplanation="Material temperature"
                helpText="Material temperature (optimal: 18-25°C)"
              />

              <SliderInput
                label="Flow Rate"
                value={inputs.flowRate}
                onChange={(val) => setInputs(prev => ({ ...prev, flowRate: val }))}
                min={0.5}
                max={100}
                step={0.5}
                unit="L/min"
                icon={Activity}
                showSimpleMode={viewMode === 'simple'}
                simpleExplanation="Injection speed"
                helpText="Volumetric flow rate"
              />

              <SliderInput
                label="Density"
                value={inputs.density}
                onChange={(val) => setInputs(prev => ({ ...prev, density: val }))}
                min={1000}
                max={1300}
                step={10}
                unit="kg/m³"
                icon={Scale}
                showSimpleMode={viewMode === 'simple'}
                simpleExplanation="Material weight"
                helpText="Liquid component density (typically 1050-1200)"
              />

              <SliderInput
                label="Viscosity"
                value={inputs.viscosity}
                onChange={(val) => setInputs(prev => ({ ...prev, viscosity: val }))}
                min={200}
                max={1500}
                step={10}
                unit="cP"
                icon={FileSpreadsheet}
                showSimpleMode={viewMode === 'simple'}
                simpleExplanation="Material thickness"
                helpText="Viscosity at 25°C (Ecomate: 280-850 cP)"
              />
            </div>

            {/* Calculate Button */}
            <div className="pt-4 border-t border-gray-200">
              <button
                onClick={calculateResults}
                disabled={loading}
                className="w-full h-12 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400
                           text-white font-semibold rounded-lg transition-colors
                           flex items-center justify-center gap-2 shadow-sm"
              >
                {loading ? (
                  <>
                    <LoadingSpinner size="sm" />
                    <span>Calculating...</span>
                  </>
                ) : (
                  <>
                    <Calculator className="w-5 h-5" />
                    <span>Calculate</span>
                  </>
                )}
              </button>
            </div>

          </div>
        </aside>

        {/* CENTER COLUMN: 3D Visualizer (6/12 on desktop, order-3 on mobile) */}
        <section className="lg:col-span-6 order-3 lg:order-2 bg-white rounded border border-gray-200 shadow-sm relative overflow-hidden flex flex-col">
          <div className="p-3 border-b border-gray-200 text-sm font-semibold text-gray-700">
            3D Visualization
          </div>
          <div className="flex-1 relative w-full h-[300px] sm:h-[400px] lg:h-[500px]">
            <MoldVisualization3DLazy
              moldShape={moldShape}
              moldDimensions={moldDimensions}
              pipeLength={inputs.pipeLength}
              pipeDiameter={inputs.pipeDiameter}
              showPipe={true}
              showLabels={true}
              showFlow={results && results.compatible}
              flowData={results ? {
                flowRate: inputs.flowRate,
                viscosity: results.apparentViscosity || inputs.viscosity * 0.001,
                reynoldsNumber: results.reynoldsNumber || 1000,
                pressure: results.optimalPressureBar || 0,
                velocity: results.velocity || 0,
                shearRate: results.shearRate || 0,
                temperature: inputs.temperature,
                density: inputs.density
              } : {}}
              height={500}
            />
          </div>
        </section>

        {/* RIGHT COLUMN: Results (3/12 on desktop, order-2 on mobile) */}
        <aside className="lg:col-span-3 order-2 lg:order-3 bg-white rounded border border-gray-200 shadow-sm flex flex-col">
          <div className="p-3 border-b border-gray-200 text-sm font-semibold text-gray-700 shrink-0">
            Results
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-4">

            {loading && (
              <div className="flex flex-col items-center justify-center py-8 space-y-4">
                <LoadingSpinner size="lg" />
                <p className="text-gray-600 text-sm">Calculating...</p>
              </div>
            )}

            {error && (
              <Alert variant="destructive" className="bg-red-50 border-red-200">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                <AlertTitle className="text-red-800">Error</AlertTitle>
                <AlertDescription className="text-red-700">{error}</AlertDescription>
              </Alert>
            )}

            {results && (
              <>
                {/* Machine Compatibility Status */}
                <div className={`p-4 rounded-lg border-2 ${results.compatible ? 'bg-green-50 border-green-500' : 'bg-red-50 border-red-500'}`}>
                  <div className="flex items-center gap-2 mb-2">
                    {results.compatible ? (
                      <CheckCircle2 className="w-5 h-5 text-green-600" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-600" />
                    )}
                    <span className={`text-xs font-semibold ${results.compatible ? 'text-green-700' : 'text-red-700'}`}>
                      {results.compatible ? 'Compatible' : 'Not Compatible'}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600">{results.machine.name}</p>
                </div>

                {/* Key Telemetry Cards */}
                <TelemetryCard
                  title="Required Pressure"
                  value={results.optimalPressureBar.toFixed(2)}
                  unit="bar"
                  status={results.compatible ? 'normal' : 'danger'}
                  description={`Max: ${results.machine.maxPressure} bar`}
                />

                <TelemetryCard
                  title="Pressure Drop"
                  value={results.pressureDropBar.toFixed(2)}
                  unit="bar"
                  status="normal"
                />

                <TelemetryCard
                  title="Flow Regime"
                  value={results.flowRegime}
                  unit=""
                  status={results.flowRegime === 'Laminar' ? 'normal' : 'warning'}
                />

                <TelemetryCard
                  title="Reynolds Number"
                  value={results.reynoldsNumber.toFixed(0)}
                  unit=""
                  status={results.reynoldsNumber < 2300 ? 'normal' : 'warning'}
                />

                <TelemetryCard
                  title="Flow Velocity"
                  value={results.velocity.toFixed(3)}
                  unit="m/s"
                  status="normal"
                />

                <TelemetryCard
                  title="Injection Time"
                  value={results.injectionTime.toFixed(2)}
                  unit="s"
                  status="normal"
                />

                {/* Warnings */}
                {results.warnings && results.warnings.length > 0 && (
                  <div className="space-y-2 pt-4 border-t border-gray-200">
                    <h4 className="text-sm text-yellow-700 font-semibold flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4" />
                      Warnings
                    </h4>
                    {results.warnings.map((warning, idx) => (
                      <div key={idx} className="bg-yellow-50 border border-yellow-200 rounded p-3">
                        <p className="text-sm text-yellow-800">{simplifyWarning(warning)}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Recommendations */}
                {results.recommendations && results.recommendations.length > 0 && (
                  <div className="space-y-2 pt-4 border-t border-gray-200">
                    <h4 className="text-sm text-blue-700 font-semibold flex items-center gap-2">
                      <Lightbulb className="w-4 h-4" />
                      Recommendations
                    </h4>
                    {results.recommendations.map((rec, idx) => (
                      <div key={idx} className="bg-blue-50 border border-blue-200 rounded p-3">
                        <p className="text-sm text-blue-800">{simplifyRecommendation(rec)}</p>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {!results && !loading && !error && (
              <div className="flex flex-col items-center justify-center py-12 text-center space-y-3">
                <Settings2 className="w-12 h-12 text-gray-300" />
                <p className="text-gray-600 font-medium">Ready to Calculate</p>
                <p className="text-sm text-gray-400">Adjust parameters and click Calculate to see results</p>
              </div>
            )}

          </div>
        </aside>

        </div>
      </main>

      {/* Modals and Overlays */}
      {showQuickSetup && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-auto border border-slate-700">
            <QuickSetup
              onApplyConfiguration={handleApplyQuickSetup}
              isOpen={showQuickSetup}
              onClose={() => setShowQuickSetup(false)}
            />
          </div>
        </div>
      )}

      {selectedMoldFromDatabase && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-auto border border-slate-700">
            <ProductionPlanner
              selectedMold={selectedMoldFromDatabase}
              isVisible={true}
            />
          </div>
        </div>
      )}

    </div>
  );
};

export default PolyurethaneOptimizer;
