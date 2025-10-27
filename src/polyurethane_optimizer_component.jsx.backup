import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Button } from './button';
import { Card, CardHeader, CardTitle, CardContent } from './card';
import { Input } from './input';
import { SliderInput } from './slider_input';
import { Alert, AlertTitle, AlertDescription } from './alert';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { Settings2, Thermometer, FileSpreadsheet, AlertTriangle, Download, Leaf, Scale, ChevronDown, ChevronRight, CheckCircle2, XCircle, Brain, TrendingUp, Target, Shield, Eye, EyeOff, Activity, Database, Save, HelpCircle, Info, Zap } from 'lucide-react';
import { DatabaseViewer } from './database_viewer';
import { getAllMaterialPresets } from './utils/database_loader';
import { saveProcessEntry, getTrainingStats } from './training_data_storage';
import { useDebounce } from './hooks/useDebounce';
import { CalculationResultsSkeleton, LoadingSpinner } from './components/SkeletonLoader';
import { validateInputs } from './validation';
import { UI_CONFIG, CONVERSIONS } from './constants';
import * as CalcHelpers from './utils/calculationHelpers';
import { generateWarnings } from './utils/warningGenerator';
import { generateMLInsights } from './utils/mlInsights';
import { QuickSetup } from './components/QuickSetup';
import { ProductionPlanner } from './components/ProductionPlanner';

// Italian Machine Specifications
const MACHINE_SPECS = {
  cannon_std_legacy: {
    name: "Cannon A-System STD Legacy",
    output: "90 kg/min",
    maxPressure: 6.0,
    tankCapacity: "330L",
    manufacturer: "Afros S.P.A., Italy"
  },
  cannon_a205: {
    name: "Cannon A-System A205",
    output: "10-50 kg/min",
    maxPressure: 8.0,
    tankCapacity: "200-500L",
    manufacturer: "Cannon Group, Italy"
  },
  cannon_a500: {
    name: "Cannon A-System A500",
    output: "50-200 kg/min",
    maxPressure: 8.0,
    tankCapacity: "500-1000L",
    manufacturer: "Cannon Group, Italy"
  },
  cannon_compact_ht: {
    name: "Cannon A-Compact HT",
    output: "20-100 kg/min",
    maxPressure: 8.0,
    tankCapacity: "250-500L",
    manufacturer: "Cannon Group, Italy"
  },
  ama_mix1: {
    name: "AMA Gusberti Mix 1",
    output: "30-80 kg/min",
    maxPressure: 8.0,
    tankCapacity: "200-400L",
    manufacturer: "AMA Gusberti SRL, Italy"
  },
  ama_mix2: {
    name: "AMA Gusberti Mix 2",
    output: "30-80 kg/min",
    maxPressure: 8.0,
    tankCapacity: "200-400L",
    manufacturer: "AMA Gusberti SRL, Italy"
  },
  saip_sd: {
    name: "SAIP SD Series",
    output: "7-300 kg/min",
    maxPressure: 8.0,
    tankCapacity: "100-500L",
    manufacturer: "SAIP, Italy"
  },
  isc_fillmix: {
    name: "ISC Italy FILLMIX",
    output: "18-18000 kg/min",
    maxPressure: 8.0,
    tankCapacity: "200-1000L",
    manufacturer: "ISC Italy, Italy"
  },
  isc_ultramix: {
    name: "ISC Italy Ultramix/P",
    output: "18-18000 kg/min",
    maxPressure: 8.0,
    tankCapacity: "200-1000L",
    manufacturer: "ISC Italy, Italy"
  }
};

// Material Presets
const MATERIAL_PRESETS = {
  ecofoam_standard: {
    name: "Ecofoam Standard",
    density: 1120,
    viscosity: 350,
    polyolSG: 1.12,
    isoSG: 1.23,
    weightRatio: [100, 110]
  },
  ecofoam_xhd: {
    name: "Ecofoam XHD RC",
    density: 1120,
    viscosity: 850,
    polyolSG: 1.12,
    isoSG: 1.23,
    weightRatio: [100, 110]
  },
  ecomate_spray_ec: {
    name: "Ecomate Spray EC",
    density: 1120,
    viscosity: 350,
    polyolSG: 1.12,
    isoSG: 1.23,
    weightRatio: [100, 110]
  }
};

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
      <Input {...props} className="pl-3 pr-12 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600 focus:border-blue-500 dark:focus:border-blue-400 transition-colors" />
      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-medium text-gray-600 dark:text-gray-300">
        {unit}
      </span>
    </div>
  </div>
);

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

const ResultCard = ({ title, value, unit, icon: Icon, status, helpText }) => {
  const statusColors = {
    success: 'border-green-500 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20',
    warning: 'border-yellow-500 bg-gradient-to-br from-yellow-50 to-amber-50 dark:from-yellow-900/20 dark:to-amber-900/20',
    error: 'border-red-500 bg-gradient-to-br from-red-50 to-rose-50 dark:from-red-900/20 dark:to-rose-900/20',
    default: 'border-blue-500 bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20'
  };

  const iconColors = {
    success: 'text-green-600 dark:text-green-400',
    warning: 'text-yellow-600 dark:text-yellow-400',
    error: 'text-red-600 dark:text-red-400',
    default: 'text-blue-600 dark:text-blue-400'
  };

  return (
    <div className={`p-4 rounded-lg shadow-md hover:shadow-lg border-l-4 ${statusColors[status] || statusColors.default} transition-all duration-200 transform hover:scale-105 animate-slideIn`}>
      <h3 className="text-sm flex items-center font-medium text-gray-700 dark:text-gray-300">
        {Icon && <Icon className={`w-4 h-4 mr-2 ${iconColors[status] || iconColors.default}`} />}
        {title}
      </h3>
      <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">
        {value} <span className="text-sm font-normal text-gray-600 dark:text-gray-400">{unit}</span>
      </p>
      {helpText && (
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 italic">{helpText}</p>
      )}
    </div>
  );
};

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
  const debouncedInputs = useDebounce(inputs, 500);
  const debouncedMoldDimensions = useDebounce(moldDimensions, 300);

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
      'exceeds machine capacity': '❌ Your machine can\'t handle this! You need more pressure than your machine can provide.',
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
    console.log('✅ Quick Setup configuration applied:', config);

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

      // === STEP 7: Pressure Drop (Hagen-Poiseuille for Power Law Fluids) ===
      const { pressureDrop, pressureDropBar, totalPressureBar } = CalcHelpers.calculatePressureDrop(
        apparentViscosity,
        length,
        flowRateM3s,
        radius,
        powerLawIndex,
        safetyFactor
      );

      // === STEP 8: Injection Times ===
      const { pipeVolume, pipeFillingTime, moldFillingTime, injectionTime } = CalcHelpers.calculateInjectionTimes(
        radius,
        length,
        flowRateM3s,
        moldVolume
      );

      // === STEP 9: Machine Compatibility ===
      const machine = MACHINE_SPECS[selectedMachine];
      const compatible = CalcHelpers.checkMachineCompatibility(totalPressureBar, machine);

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
        pressureDropBar: parseFloat(pressureDropBar.toFixed(3)),
        pressureDropKpa: parseFloat((pressureDropBar * CONVERSIONS.BAR_TO_KPA).toFixed(2)),

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

        saveProcessEntry(trainingEntry);
        console.log('✅ Process data saved for ML training');
      } catch (saveError) {
        console.error('Failed to save training data:', saveError);
        // Don't fail the whole calculation if saving fails
      }

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [inputs, selectedMachine, selectedMaterial, moldVolume]);

  // Auto-calculate on debounced input change
  // This prevents excessive re-calculations while user is typing
  useEffect(() => {
    calculateResults();
  }, [debouncedInputs, selectedMachine, selectedMaterial, calculateResults]);

  return (
    <div className="w-full max-w-7xl mx-auto p-4 sm:p-6 space-y-4 sm:space-y-6 animate-fadeIn">
      {/* Header Section with Title and Actions */}
      <div className="flex justify-between items-center gap-4 flex-wrap bg-gradient-to-r from-blue-600 to-indigo-700 text-white p-6 rounded-xl shadow-xl">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold mb-1">PU Injection Optimizer</h1>
          <p className="text-blue-100 text-sm">Calculate optimal pressure & predict part quality</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {/* Quick Setup Button */}
          <button
            onClick={() => setShowQuickSetup(!showQuickSetup)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg shadow-md hover:shadow-lg transform hover:scale-105 transition-all duration-200 font-semibold text-sm ${
              showQuickSetup
                ? 'bg-green-500 hover:bg-green-600 text-white'
                : 'bg-white hover:bg-gray-50 text-blue-700'
            }`}
          >
            <Zap className="w-4 h-4" />
            <span>{showQuickSetup ? 'Hide' : 'Quick Setup'}</span>
          </button>

          {/* View Mode Toggle */}
          <button
            onClick={() => setViewMode(viewMode === 'simple' ? 'advanced' : 'simple')}
            className="flex items-center gap-2 px-4 py-2.5 bg-white bg-opacity-20 hover:bg-opacity-30 text-white rounded-lg shadow-md hover:shadow-lg transform hover:scale-105 transition-all duration-200 font-semibold text-sm backdrop-blur-sm"
          >
            {viewMode === 'simple' ? (
              <>
                <Eye className="w-4 h-4" />
                <span>Advanced</span>
              </>
            ) : (
              <>
                <EyeOff className="w-4 h-4" />
                <span>Simple</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Beta Disclaimer */}
      <Alert className="bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800 shadow-sm">
        <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-500" />
        <AlertTitle className="text-yellow-900 dark:text-yellow-200 font-semibold">BETA VERSION - DISCLAIMER</AlertTitle>
        <AlertDescription className="text-yellow-800 dark:text-yellow-300 text-sm">
          This application is in beta testing and may provide incorrect results. We accept no responsibility for production losses or damages.
          Always conduct thorough testing before implementing in production environments.
        </AlertDescription>
      </Alert>

      {/* Quick Setup Component */}
      {showQuickSetup && (
        <QuickSetup
          onApplyConfiguration={handleApplyQuickSetup}
          isOpen={showQuickSetup}
          onClose={() => setShowQuickSetup(false)}
        />
      )}

      {/* Production Planner Component */}
      {selectedMoldFromDatabase && (
        <ProductionPlanner
          selectedMold={selectedMoldFromDatabase}
          isVisible={true}
        />
      )}

      {/* How to Use Guide - Collapsible */}
      <Card className="bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-blue-900/30 dark:via-indigo-900/30 dark:to-purple-900/30 border-2 border-blue-300 dark:border-blue-700 shadow-lg">
        <CardHeader>
          <button
            onClick={() => setShowHelpGuide(!showHelpGuide)}
            className="w-full flex items-center justify-between text-left group"
          >
            <CardTitle className="flex items-center gap-3 text-xl text-gray-900 dark:text-gray-50">
              <HelpCircle className="w-7 h-7 text-blue-600 group-hover:animate-pulse" />
              {viewMode === 'simple' ? 'What Does This Tool Do? (Click to expand)' : 'Technical Overview (Click to expand)'}
            </CardTitle>
            {showHelpGuide ? (
              <ChevronDown className="w-6 h-6 text-blue-600 transition-transform" />
            ) : (
              <ChevronRight className="w-6 h-6 text-blue-600 transition-transform" />
            )}
          </button>
        </CardHeader>
        {showHelpGuide && viewMode === 'simple' && (
          <CardContent className="space-y-4 animate-slideIn">
            <div className="bg-white dark:bg-gray-800 p-5 rounded-xl border-2 border-blue-200 dark:border-blue-600 shadow-md">
              <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-4">
                This tool answers 3 critical questions:
              </h3>
              <div className="space-y-3">
                <div className="flex gap-3 p-4 bg-green-50 dark:bg-green-900/30 rounded-lg border border-green-300 dark:border-green-700">
                  <CheckCircle2 className="w-7 h-7 text-green-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-green-900 dark:text-green-100 text-base">
                      1. Can my machine handle this job?
                    </p>
                    <p className="text-sm text-green-800 dark:text-green-200 mt-1">
                      We check if your machine is powerful enough to push foam through your tubes and into the mold.
                      If your machine isn't strong enough, you'll get incomplete parts or the machine will struggle.
                    </p>
                  </div>
                </div>

                <div className="flex gap-3 p-4 bg-blue-50 dark:bg-blue-900/30 rounded-lg border border-blue-300 dark:border-blue-700">
                  <Info className="w-7 h-7 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-blue-900 dark:text-blue-100 text-base">
                      2. What pressure do I need?
                    </p>
                    <p className="text-sm text-blue-800 dark:text-blue-200 mt-1">
                      We calculate exactly how much pressure (in bar) you need to push foam smoothly through your setup.
                      Too little pressure = incomplete parts. Too much = wasted energy and potential damage.
                    </p>
                  </div>
                </div>

                <div className="flex gap-3 p-4 bg-purple-50 dark:bg-purple-900/30 rounded-lg border border-purple-300 dark:border-purple-700">
                  <AlertTriangle className="w-7 h-7 text-purple-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-purple-900 dark:text-purple-100 text-base">
                      3. Will I get good quality parts?
                    </p>
                    <p className="text-sm text-purple-800 dark:text-purple-200 mt-1">
                      We predict if your settings will make quality parts or if you'll have defects like bubbles,
                      weak spots, voids, or incomplete filling. We also suggest how to fix problems!
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/30 dark:to-orange-900/30 p-4 rounded-lg border-l-4 border-yellow-500">
              <p className="text-sm text-yellow-900 dark:text-yellow-100 font-semibold">
                ⚡ <strong>Quick Tip:</strong> Use the sliders to quickly try different settings, then fine-tune the exact numbers in the boxes.
                The tool updates your results instantly as you change settings!
              </p>
            </div>

            <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/30 dark:to-emerald-900/30 p-4 rounded-lg border-l-4 border-green-500">
              <p className="text-sm text-green-900 dark:text-green-100">
                <strong>New to foam injection?</strong> Don't worry! Every setting has a plain-English explanation.
                Just look for the blue boxes under each slider. We'll explain what it does and how it affects your parts.
              </p>
            </div>
          </CardContent>
        )}
        {showHelpGuide && viewMode === 'advanced' && (
          <CardContent className="space-y-3 text-sm sm:text-base text-blue-900 dark:text-blue-100 animate-slideIn">
            <p><strong>Advanced Fluid Dynamics Calculator</strong> for polyurethane injection molding optimization using Power Law and Arrhenius equations.</p>
            <div className="space-y-2">
              <p className="font-semibold text-blue-950 dark:text-blue-50">Features:</p>
              <ul className="list-disc list-inside space-y-1 ml-2 text-blue-800 dark:text-blue-200">
                <li>Modified Hagen-Poiseuille equation with Power Law correction for non-Newtonian fluids</li>
                <li>Temperature-dependent viscosity using Arrhenius model</li>
                <li>Reynolds number analysis for flow regime determination</li>
                <li>Machine compatibility verification against Italian manufacturer specifications</li>
                <li>ML-based quality prediction and defect risk assessment</li>
              </ul>
            </div>
            <p className="text-xs sm:text-sm pt-2 border-t border-blue-300 dark:border-blue-600 text-blue-700 dark:text-blue-300">
              <strong>Training Data:</strong> Results are automatically saved to improve ML models. {getTrainingStats().totalEntries} calculations stored.
            </p>
          </CardContent>
        )}
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Input Section */}
        <div className="space-y-4 sm:space-y-6">
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

              <SelectField
                label="Material System (Quick Presets)"
                icon={Leaf}
                value={selectedMaterial}
                onChange={(e) => setSelectedMaterial(e.target.value)}
              >
                {Object.entries(MATERIAL_PRESETS).map(([key, preset]) => (
                  <option key={key} value={key}>{preset.name}</option>
                ))}
              </SelectField>

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
                      💡 <strong>What this is:</strong> This database contains real polyurethane products from manufacturers.
                      Select a material and we'll automatically fill in the correct density, viscosity, and mix ratios for you!
                    </p>
                  </div>
                )}
                <DatabaseViewer onSelectProduct={handleSelectFromDatabase} />
              </CardContent>
            )}
          </Card>

          <Card className="shadow-md hover:shadow-lg transition-all duration-200 border-l-4 border-l-purple-500 bg-gradient-to-br from-white via-purple-50 to-pink-50 dark:from-gray-800 dark:via-purple-900/20 dark:to-pink-900/20">
            <CardHeader className="bg-gradient-to-r from-gray-50 to-purple-50 dark:from-gray-800 dark:to-purple-900/20">
              <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-gray-50">
                <div className="flex items-center justify-center w-7 h-7 rounded-full bg-purple-600 text-white text-sm font-bold mr-1">2</div>
                <Thermometer className="w-5 h-5 text-purple-600" />
                Process Parameters
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6 pt-4">
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
                simpleExplanation="This is how long the tube is that carries foam from your machine to where it's being injected. Longer tubes need more pressure to push the foam through. Think of it like a garden hose - the longer the hose, the harder it is to push water through."
                helpText="Length of injection pipe from machine to mold (minimum 50mm)"
              />

              <SliderInput
                label="Pipe Diameter"
                value={inputs.pipeDiameter}
                onChange={(val) => setInputs(prev => ({ ...prev, pipeDiameter: val }))}
                min={4}
                max={50}
                step={0.5}
                unit="mm"
                icon={Settings2}
                showSimpleMode={viewMode === 'simple'}
                simpleExplanation="This is how wide the inside of your tube is. Wider tubes make it easier for foam to flow through - like drinking through a thick straw vs a coffee stirrer. Wider = less pressure needed!"
                helpText="Internal diameter of injection pipe"
              />

              <SliderInput
                label="Temperature"
                value={inputs.temperature}
                onChange={(val) => setInputs(prev => ({ ...prev, temperature: val }))}
                min={5}
                max={50}
                step={1}
                unit="°C"
                icon={Thermometer}
                showSimpleMode={viewMode === 'simple'}
                simpleExplanation="How warm your foam materials are. Warmer = runnier and easier to push (like honey gets runny when warm). But too hot or too cold causes problems! Most materials work best around 20-30°C."
                helpText="Process temperature - affects material viscosity (5-50°C)"
              />

              <SliderInput
                label="Flow Rate"
                value={inputs.flowRate}
                onChange={(val) => setInputs(prev => ({ ...prev, flowRate: val }))}
                min={0.1}
                max={50}
                step={0.1}
                unit="L/min"
                icon={Activity}
                showSimpleMode={viewMode === 'simple'}
                simpleExplanation="How fast you're trying to push foam through the tubes (liters per minute). Faster = more pressure needed. Go too fast and you'll get bubbles, weak spots, and bad parts. Slow and steady wins!"
                helpText="Volumetric flow rate - how fast material is injected"
              />

              <SliderInput
                label="Density"
                value={inputs.density}
                onChange={(val) => setInputs(prev => ({ ...prev, density: val }))}
                min={500}
                max={2000}
                step={10}
                unit="kg/m³"
                icon={Scale}
                showSimpleMode={viewMode === 'simple'}
                simpleExplanation="How heavy/thick your foam is (weight per cubic meter). Heavier/denser foam is harder to push through tubes. Light spray foam might be 30-50 kg/m³, while dense structural foam can be 200+ kg/m³."
                helpText="Material density at process temperature"
              />

              <SliderInput
                label="Viscosity"
                value={inputs.viscosity}
                onChange={(val) => setInputs(prev => ({ ...prev, viscosity: val }))}
                min={100}
                max={2000}
                step={10}
                unit="cP"
                icon={FileSpreadsheet}
                showSimpleMode={viewMode === 'simple'}
                simpleExplanation="How thick and sticky your foam is - like comparing water (thin) to honey (thick). Higher numbers = thicker/stickier = more pressure needed. This is measured in centiPoise (cP). Water is 1 cP, motor oil is ~100 cP."
                helpText="Viscosity at 25°C in centiPoise - resistance to flow"
              />
            </CardContent>
          </Card>

          {/* Mold Dimensions */}
          <Card className="shadow-md hover:shadow-lg transition-all duration-200 border-l-4 border-l-indigo-500">
            <CardHeader className="bg-gradient-to-r from-gray-50 to-indigo-50 dark:from-gray-800 dark:to-indigo-900/20">
              <button
                type="button"
                className="w-full flex items-center justify-between text-left"
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

          {/* Mix Ratio Calculator */}
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
                    onChange={(e) => setMixInputs(prev => ({ ...prev, polyolSG: Number(e.target.value) }))}
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
                    onChange={(e) => setMixInputs(prev => ({ ...prev, isoSG: Number(e.target.value) }))}
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
                  onChange={(e) => setMixInputs(prev => ({ ...prev, partVolume: Number(e.target.value) }))}
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
        </div>

        {/* Results Section */}
        <div className="space-y-6">
          {/* Results Header */}
          <div className="bg-gradient-to-r from-emerald-500 to-green-600 text-white p-4 rounded-xl shadow-lg flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-white text-emerald-600 text-lg font-bold">
              ✓
            </div>
            <div>
              <h2 className="text-xl font-bold">Results & Analysis</h2>
              <p className="text-emerald-100 text-sm">Real-time calculations based on your parameters</p>
            </div>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {results && (
            <>
              {/* Machine Compatibility */}
              <Card className="shadow-lg border-2 border-gray-200 dark:border-gray-700 animate-slideIn">
                <CardContent className="pt-6">
                  <div className={`flex flex-col sm:flex-row items-center justify-between p-5 rounded-lg shadow-md ${results.compatible ? 'bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-2 border-green-500' : 'bg-gradient-to-r from-red-50 to-rose-50 dark:from-red-900/20 dark:to-rose-900/20 border-2 border-red-500'}`}>
                    <div className="flex items-center gap-3 mb-3 sm:mb-0">
                      {results.compatible ? (
                        <CheckCircle2 className="w-8 h-8 text-green-600 animate-pulse" />
                      ) : (
                        <XCircle className="w-8 h-8 text-red-600 animate-pulse" />
                      )}
                      <div>
                        <p className={`font-bold text-lg ${results.compatible ? 'text-green-950 dark:text-green-50' : 'text-red-950 dark:text-red-50'}`}>
                          {results.compatible ? '✓ Machine Compatible' : '✗ Not Compatible'}
                        </p>
                        <p className={`text-sm ${results.compatible ? 'text-green-800 dark:text-green-200' : 'text-red-800 dark:text-red-200'}`}>
                          {results.machine.name}
                        </p>
                      </div>
                    </div>
                    <div className="text-center sm:text-right">
                      <p className="text-3xl font-bold text-gray-900 dark:text-white">
                        {results.optimalPressureBar} <span className="text-lg">bar</span>
                      </p>
                      <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">
                        Max: {results.machine.maxPressure} bar
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Equations Information Card - Only in Advanced View */}
              {viewMode === 'advanced' && (
                <Card className="border-2 border-indigo-200 dark:border-indigo-800 shadow-lg animate-slideIn">
                  <CardHeader className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20">
                    <CardTitle className="flex items-center gap-2 text-indigo-900 dark:text-indigo-50">
                      <FileSpreadsheet className="w-5 h-5 text-indigo-600" />
                      Fluid Dynamics Model
                      <span className="ml-2 px-2 py-0.5 text-xs bg-indigo-600 text-white rounded-full">Scientific</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 pt-4">
                    <div className="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-lg border border-indigo-200 dark:border-indigo-700">
                      <h4 className="font-semibold text-indigo-950 dark:text-indigo-50 mb-2 flex items-center gap-2">
                        <span className="text-lg">📐</span> Hagen-Poiseuille Equation (Power Law)
                      </h4>
                      <div className="text-sm text-indigo-900 dark:text-indigo-100 space-y-1 font-mono bg-white dark:bg-gray-800 p-3 rounded shadow-sm">
                        <p>ΔP = (8 × μ × L × Q) / (π × r⁴) × [(3n+1)/(4n)]</p>
                        <p className="text-xs text-indigo-700 dark:text-indigo-300 mt-2">
                          Modified for non-Newtonian fluids with Power Law correction
                        </p>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="bg-purple-50 dark:bg-purple-900/20 p-3 rounded-lg border border-purple-200 dark:border-purple-700">
                        <h4 className="font-semibold text-purple-950 dark:text-purple-50 mb-1 text-sm flex items-center gap-1">
                          <span>🌡️</span> Arrhenius Equation
                        </h4>
                        <p className="text-xs font-mono text-purple-900 dark:text-purple-100">
                          μ(T) = μ₀ × exp[Ea/R × (1/T - 1/T₀)]
                        </p>
                      </div>
                      <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg border border-blue-200 dark:border-blue-700">
                        <h4 className="font-semibold text-blue-950 dark:text-blue-50 mb-1 text-sm flex items-center gap-1">
                          <span>💧</span> Power Law Model
                        </h4>
                        <p className="text-xs font-mono text-blue-900 dark:text-blue-100">
                          μ = K × γ̇⁽ⁿ⁻¹⁾
                        </p>
                      </div>
                    </div>
                    <div className="text-xs text-gray-700 dark:text-gray-300 italic pt-2 border-t border-indigo-200 dark:border-indigo-700">
                      <p>✓ Temperature-dependent viscosity correction</p>
                      <p>✓ Shear-thinning behavior for polyurethane systems</p>
                      <p>✓ Reynolds number analysis for flow regime determination</p>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Primary Results */}
              <Card className="shadow-lg border-l-4 border-l-blue-500 animate-slideIn">
                <CardHeader className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white">
                  <CardTitle className="flex items-center gap-2 text-xl">
                    <TrendingUp className="w-6 h-6" />
                    📊 Key Process Metrics
                  </CardTitle>
                  <p className="text-blue-100 text-sm mt-1">These values determine if your setup will work</p>
                </CardHeader>
                <CardContent className="space-y-4 pt-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <ResultCard
                      title="Injection Pressure"
                      value={results.optimalPressureBar}
                      unit="bar"
                      icon={Settings2}
                      status={results.compatible ? 'success' : 'error'}
                      helpText="Total pressure required at injection point (includes pipe pressure drop + safety factor)"
                    />
                    <ResultCard
                      title="Pressure Drop"
                      value={results.pressureDropKpa}
                      unit="kPa"
                      icon={Settings2}
                      status="default"
                      helpText="Pressure loss due to friction as material flows through the injection pipe"
                    />
                    <ResultCard
                      title="Flow Regime"
                      value={results.flowRegime}
                      unit=""
                      icon={FileSpreadsheet}
                      status={results.flowRegime === 'Laminar' ? 'success' : 'warning'}
                      helpText={`${results.flowRegime === 'Laminar' ? 'Smooth, layered flow (ideal for consistent mixing)' : 'Chaotic, turbulent flow (may cause mixing issues)'}`}
                    />
                    <ResultCard
                      title="Reynolds Number"
                      value={results.reynoldsNumber}
                      unit=""
                      icon={FileSpreadsheet}
                      status={results.reynoldsNumber < 2300 ? 'success' : 'warning'}
                      helpText="Dimensionless number indicating flow type (< 2300 = laminar, > 2300 = turbulent)"
                    />
                    <ResultCard
                      title="Flow Velocity"
                      value={results.velocity}
                      unit="m/s"
                      icon={Settings2}
                      status="default"
                      helpText="Average speed of material flowing through the injection pipe"
                    />
                    <ResultCard
                      title="Injection Time"
                      value={results.injectionTime}
                      unit="s"
                      icon={FileSpreadsheet}
                      status="default"
                      helpText={`Total time to fill pipe${results.moldVolume > 0 ? ' and mold cavity' : ''} at current flow rate`}
                    />
                  </div>

                  <div className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 p-5 rounded-lg text-sm space-y-3 border-2 border-blue-300 dark:border-blue-600 shadow-md">
                    <h4 className="font-bold text-blue-950 dark:text-blue-50 mb-3 flex items-center gap-2 text-base">
                      <Activity className="w-5 h-5" />
                      Detailed Flow Analysis
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-sm border border-blue-200 dark:border-blue-700">
                        <p className="text-xs font-medium text-gray-600 dark:text-gray-300">Shear Rate</p>
                        <p className="text-xl font-bold text-blue-700 dark:text-blue-300 mt-1">{results.shearRate} <span className="text-sm font-normal">s⁻¹</span></p>
                      </div>
                      <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-sm border border-blue-200 dark:border-blue-700">
                        <p className="text-xs font-medium text-gray-600 dark:text-gray-300">Apparent Viscosity</p>
                        <p className="text-xl font-bold text-blue-700 dark:text-blue-300 mt-1">{results.apparentViscosity} <span className="text-sm font-normal">Pa·s</span></p>
                      </div>
                      <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-sm border border-blue-200 dark:border-blue-700">
                        <p className="text-xs font-medium text-gray-600 dark:text-gray-300">Pipe Volume</p>
                        <p className="text-xl font-bold text-blue-700 dark:text-blue-300 mt-1">{results.pipeVolume} <span className="text-sm font-normal">L</span></p>
                      </div>
                      <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-sm border border-blue-200 dark:border-blue-700">
                        <p className="text-xs font-medium text-gray-600 dark:text-gray-300">Temperature</p>
                        <p className="text-xl font-bold text-blue-700 dark:text-blue-300 mt-1">{inputs.temperature} <span className="text-sm font-normal">°C</span></p>
                      </div>
                    </div>
                  </div>

                  {/* Mold Filling Information */}
                  {results.moldVolume > 0 && (
                    <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 p-4 rounded-lg text-sm space-y-2 border border-purple-200 dark:border-purple-700">
                      <h4 className="font-semibold text-purple-900 dark:text-purple-100 mb-2 flex items-center gap-2">
                        <Scale className="w-4 h-4" />
                        Mold Filling Analysis
                      </h4>
                      <div className="grid grid-cols-3 gap-2">
                        <div className="bg-white dark:bg-gray-800 p-2 rounded">
                          <p className="text-xs text-gray-500 dark:text-gray-400">Mold Volume</p>
                          <p className="text-lg font-bold text-purple-600 dark:text-purple-400">{results.moldVolume.toFixed(3)} <span className="text-xs font-normal">L</span></p>
                          <p className="text-xs text-gray-400 italic capitalize">{results.moldShape} shape</p>
                        </div>
                        <div className="bg-white dark:bg-gray-800 p-2 rounded">
                          <p className="text-xs text-gray-500 dark:text-gray-400">Mold Fill Time</p>
                          <p className="text-lg font-bold text-purple-600 dark:text-purple-400">{results.moldFillingTime.toFixed(2)} <span className="text-xs font-normal">s</span></p>
                          <p className="text-xs text-gray-400 italic">Cavity filling</p>
                        </div>
                        <div className="bg-white dark:bg-gray-800 p-2 rounded">
                          <p className="text-xs text-gray-500 dark:text-gray-400">Pipe Fill Time</p>
                          <p className="text-lg font-bold text-purple-600 dark:text-purple-400">{results.pipeFillingTime.toFixed(2)} <span className="text-xs font-normal">s</span></p>
                          <p className="text-xs text-gray-400 italic">Pipe transit</p>
                        </div>
                      </div>
                      <p className="text-xs text-purple-600 dark:text-purple-400 pt-2 border-t border-purple-200 dark:border-purple-700">
                        Total injection time = Pipe fill time ({results.pipeFillingTime.toFixed(2)}s) + Mold fill time ({results.moldFillingTime.toFixed(2)}s) = {results.injectionTime.toFixed(2)}s
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Warnings and Recommendations */}
              {(results.warnings.length > 0 || results.recommendations.length > 0) && (
                <Card className="shadow-lg border-l-4 border-l-yellow-500 animate-slideIn">
                  <CardHeader className="bg-gradient-to-r from-yellow-50 to-amber-50 dark:from-yellow-900/20 dark:to-amber-900/20">
                    <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-gray-50">
                      <AlertTriangle className="w-5 h-5 text-yellow-600 animate-pulse" />
                      Warnings & Recommendations
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 pt-4">
                    {viewMode === 'simple' && results.warnings.length > 0 && (
                      <div className="bg-red-50 dark:bg-red-900/30 border-l-4 border-red-500 p-3 rounded-r-lg mb-4">
                        <p className="text-sm text-red-900 dark:text-red-100 font-semibold">
                          ⚠️ <strong>Problems Found:</strong> These warnings mean your current settings will cause defects or won't work at all. Read carefully!
                        </p>
                      </div>
                    )}
                    {results.warnings.map((warning, idx) => (
                      <Alert key={idx} className="bg-yellow-50 dark:bg-yellow-900/20 border-yellow-300 dark:border-yellow-600 shadow-sm">
                        <AlertTriangle className="h-4 w-4 text-yellow-700 dark:text-yellow-400" />
                        <AlertDescription className="text-yellow-900 dark:text-yellow-100 text-sm font-medium leading-relaxed">
                          {simplifyWarning(warning)}
                        </AlertDescription>
                      </Alert>
                    ))}
                    {results.recommendations.length > 0 && (
                      <>
                        {viewMode === 'simple' && (
                          <div className="bg-green-50 dark:bg-green-900/30 border-l-4 border-green-500 p-3 rounded-r-lg mt-4">
                            <p className="text-sm text-green-900 dark:text-green-100 font-semibold">
                              💡 <strong>How to Fix:</strong> Follow these solutions to fix the problems and get perfect parts.
                            </p>
                          </div>
                        )}
                        {results.recommendations.map((rec, idx) => (
                          <div key={idx} className="flex items-start gap-3 text-sm bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-700 shadow-sm">
                            <span className="text-blue-600 dark:text-blue-400 font-bold text-lg">→</span>
                            <span className="text-blue-900 dark:text-blue-100 font-medium leading-relaxed">{simplifyRecommendation(rec)}</span>
                          </div>
                        ))}
                      </>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Pressure vs Length Chart */}
              {pressureVsLength.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Pressure Requirements vs Pipe Length</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={pressureVsLength}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis
                            dataKey="length"
                            label={{ value: 'Pipe Length (mm)', position: 'insideBottom', offset: -5 }}
                          />
                          <YAxis
                            label={{ value: 'Pressure (bar)', angle: -90, position: 'insideLeft' }}
                          />
                          <Tooltip />
                          <Legend />
                          <Line
                            type="monotone"
                            dataKey="pressure"
                            stroke="#2563eb"
                            strokeWidth={2}
                            name="Required Pressure"
                            dot={{ fill: '#2563eb' }}
                          />
                          <Line
                            type="monotone"
                            dataKey="machineLimit"
                            stroke="#dc2626"
                            strokeWidth={2}
                            strokeDasharray="5 5"
                            name="Machine Limit"
                            dot={false}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* ML Insights Section */}
              {results.mlInsights && results.mlInsights.trained && (
                <Card className="border-2 border-purple-200 dark:border-purple-800">
                  <CardHeader className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20">
                    <CardTitle className="flex items-center gap-2">
                      <Brain className="w-6 h-6 text-purple-600" />
                      AI Process Optimization Insights
                      <span className="ml-2 px-2 py-0.5 text-xs bg-purple-600 text-white rounded-full">ML-Powered</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4 pt-4">

                    {/* Optimal Parameters Prediction */}
                    {results.mlInsights.optimal_parameters && (
                      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                        <h3 className="flex items-center gap-2 font-semibold text-blue-900 dark:text-blue-100 mb-3">
                          <Target className="w-5 h-5" />
                          Recommended Optimal Parameters
                        </h3>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="bg-white dark:bg-gray-800 rounded p-3">
                            <p className="text-sm text-gray-600 dark:text-gray-400">Optimal Temperature</p>
                            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                              {results.mlInsights.optimal_parameters.optimal_temperature}°C
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                              Current: {inputs.temperature}°C
                            </p>
                          </div>
                          <div className="bg-white dark:bg-gray-800 rounded p-3">
                            <p className="text-sm text-gray-600 dark:text-gray-400">Optimal Flow Rate</p>
                            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                              {results.mlInsights.optimal_parameters.optimal_flow_rate} L/min
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                              Current: {inputs.flowRate} L/min
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Quality Prediction */}
                    {results.mlInsights.quality_prediction && (
                      <div className={`rounded-lg p-4 ${
                        results.mlInsights.quality_prediction.is_good_part
                          ? 'bg-green-50 dark:bg-green-900/20'
                          : 'bg-orange-50 dark:bg-orange-900/20'
                      }`}>
                        <h3 className="flex items-center gap-2 font-semibold mb-3">
                          <TrendingUp className={`w-5 h-5 ${
                            results.mlInsights.quality_prediction.is_good_part
                              ? 'text-green-600'
                              : 'text-orange-600'
                          }`} />
                          <span className={
                            results.mlInsights.quality_prediction.is_good_part
                              ? 'text-green-900 dark:text-green-100'
                              : 'text-orange-900 dark:text-orange-100'
                          }>
                            Process Quality Prediction
                          </span>
                        </h3>
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-lg font-semibold">
                              {results.mlInsights.quality_prediction.is_good_part ? (
                                <span className="text-green-700 dark:text-green-300">
                                  ✓ High Quality Part Expected
                                </span>
                              ) : (
                                <span className="text-orange-700 dark:text-orange-300">
                                  ⚠ Quality Issues Likely
                                </span>
                              )}
                            </p>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                              Success Probability: {results.mlInsights.quality_prediction.good_probability}%
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-3xl font-bold text-gray-800 dark:text-white">
                              {results.mlInsights.quality_prediction.confidence}%
                            </p>
                            <p className="text-xs text-gray-500">Confidence</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Defect Risk Assessment */}
                    {results.mlInsights.defect_risks && (
                      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                        <h3 className="flex items-center gap-2 font-semibold text-gray-900 dark:text-white mb-3">
                          <Shield className="w-5 h-5 text-gray-600" />
                          Defect Risk Assessment
                        </h3>
                        <div className="space-y-2">
                          {[
                            {
                              key: 'void_risk',
                              label: 'Void Formation',
                              icon: '○',
                              description: 'Air bubbles or gas pockets trapped in the foam (caused by turbulent flow, fast filling, or air entrapment)'
                            },
                            {
                              key: 'short_shot_risk',
                              label: 'Short Shot',
                              icon: '◐',
                              description: 'Incomplete mold filling (caused by insufficient pressure, slow flow, or premature gelation)'
                            },
                            {
                              key: 'flash_risk',
                              label: 'Flash/Overflow',
                              icon: '◆',
                              description: 'Excess material leaking from mold (caused by excessive pressure or poor mold clamping)'
                            },
                            {
                              key: 'surface_defect_risk',
                              label: 'Surface Defects',
                              icon: '▪',
                              description: 'Poor surface finish or skin quality (caused by wrong temperature, high shear, or turbulent flow)'
                            }
                          ].map(({key, label, icon, description}) => {
                            const risk = results.mlInsights.defect_risks[key];
                            const riskLevel = risk < 20 ? 'low' : risk < 40 ? 'medium' : 'high';
                            const colors = {
                              low: 'bg-green-200 dark:bg-green-700',
                              medium: 'bg-yellow-200 dark:bg-yellow-700',
                              high: 'bg-red-200 dark:bg-red-700'
                            };
                            return (
                              <div key={key} className="space-y-1">
                                <div className="flex items-center gap-2" title={description}>
                                  <span className="text-sm w-32">{icon} {label}</span>
                                  <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-4 overflow-hidden">
                                    <div
                                      className={`h-full ${colors[riskLevel]} transition-all duration-300`}
                                      style={{ width: `${risk}%` }}
                                    />
                                  </div>
                                  <span className={`text-sm font-semibold w-12 text-right ${
                                    riskLevel === 'low' ? 'text-green-600 dark:text-green-400' :
                                    riskLevel === 'medium' ? 'text-yellow-600 dark:text-yellow-400' :
                                    'text-red-600 dark:text-red-400'
                                  }`}>
                                    {risk}%
                                  </span>
                                </div>
                                <p className="text-xs text-gray-500 dark:text-gray-400 italic ml-2">{description}</p>
                              </div>
                            );
                          })}
                          <div className="mt-3 pt-3 border-t border-gray-300 dark:border-gray-600">
                            <div className="flex justify-between items-center">
                              <span className="font-semibold text-gray-900 dark:text-white">Overall Defect Risk</span>
                              <span className={`text-lg font-bold ${
                                results.mlInsights.defect_risks.overall_risk < 20 ? 'text-green-600 dark:text-green-400' :
                                results.mlInsights.defect_risks.overall_risk < 40 ? 'text-yellow-600 dark:text-yellow-400' :
                                'text-red-600 dark:text-red-400'
                              }`}>
                                {results.mlInsights.defect_risks.overall_risk}%
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* ML Model Info */}
                    <div className="text-xs text-gray-500 dark:text-gray-400 italic text-center pt-2 border-t border-gray-200 dark:border-gray-700">
                      Predictions powered by Random Forest & Gradient Boosting models trained on 1000+ process scenarios
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}

          {loading && (
            <Card className="shadow-lg">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3 mb-6">
                  <LoadingSpinner size="md" />
                  <p className="text-gray-700 dark:text-gray-300 font-medium">
                    Calculating optimal parameters...
                  </p>
                </div>
                <CalculationResultsSkeleton />
              </CardContent>
            </Card>
          )}

          {!results && !loading && (
            <Card className="shadow-lg border-2 border-dashed border-gray-300 dark:border-gray-600">
              <CardContent className="pt-6">
                <div className="text-center py-16 space-y-4">
                  <Settings2 className="w-16 h-16 mx-auto text-gray-400 dark:text-gray-500 animate-pulse" />
                  <div>
                    <p className="text-lg font-semibold text-gray-700 dark:text-gray-300">Ready to Calculate</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">Adjust parameters to see optimization results</p>
                  </div>
                  <div className="flex justify-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                    <span className="px-3 py-1 bg-gray-100 dark:bg-gray-800 rounded-full">Real-time calculations</span>
                    <span className="px-3 py-1 bg-gray-100 dark:bg-gray-800 rounded-full">Auto-update</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default PolyurethaneOptimizer;
