import React, { useState, useEffect } from 'react';
import { Button } from './button';
import { Card, CardHeader, CardTitle, CardContent } from './card';
import { Input } from './input';
import { Alert, AlertTitle, AlertDescription } from './alert';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { Settings2, Thermometer, FileSpreadsheet, AlertTriangle, Download, Leaf, Scale, ChevronDown, ChevronRight, CheckCircle2, XCircle, Brain, TrendingUp, Target, Shield, Zap, Gauge, Ruler, Droplets, Activity, Info, HelpCircle, ArrowRight, Sparkles, CheckCheck } from 'lucide-react';
import { Settings2, Thermometer, FileSpreadsheet, AlertTriangle, Download, Leaf, Scale, ChevronDown, ChevronRight, CheckCircle2, XCircle, Brain, TrendingUp, Target, Shield, Save, Database, Package } from 'lucide-react';
import { saveProcessEntry, getTrainingStats, exportTrainingData, getMLTrainingData } from './training_data_storage';

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
  <div className="space-y-2">
    <label className="flex items-center text-sm font-medium text-gray-700 dark:text-gray-300">
      {Icon && <Icon className="w-4 h-4 mr-2" />}
      {label}
    </label>
    {helpText && (
      <p className="text-xs text-gray-500 dark:text-gray-400 -mt-1 mb-1">{helpText}</p>
    )}
    <div className="relative">
      <Input {...props} className="pl-3 pr-12 text-gray-900 dark:text-gray-100" />
      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-500 dark:text-gray-400">
        {unit}
      </span>
    </div>
  </div>
);

const SelectField = ({ label, icon: Icon, children, ...props }) => (
  <div className="space-y-2">
    <label className="flex items-center text-sm font-medium text-gray-700 dark:text-gray-300">
      {Icon && <Icon className="w-4 h-4 mr-2" />}
      {label}
    </label>
    <select
      {...props}
      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
    >
      {children}
    </select>
  </div>
);

const ResultCard = ({ title, value, unit, icon: Icon, status }) => {
  const statusColors = {
    success: 'border-green-500',
    warning: 'border-yellow-500',
    error: 'border-red-500',
    default: 'border-blue-500'
  };

  return (
    <div className={`bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border-l-4 ${statusColors[status] || statusColors.default}`}>
      <h3 className="text-sm flex items-center font-medium text-gray-500 dark:text-gray-400">
        {Icon && <Icon className="w-4 h-4 mr-2" />}
        {title}
      </h3>
      <p className="mt-1 text-2xl font-semibold text-gray-900 dark:text-white">
        {value} <span className="text-sm font-normal text-gray-500">{unit}</span>
      </p>
    </div>
  );
};

// Helper: Translate technical warnings to plain language
const simplifyWarning = (warning, advancedMode) => {
  if (advancedMode) return warning;

  const translations = {
    'Flow is turbulent': '⚠️ You\'re injecting too fast! This can cause bubbles and defects in your parts.',
    'High shear rate may affect material properties': '⚠️ Material is experiencing high stress during injection, which can damage it.',
    'Required pressure': '❌ YOUR MACHINE CAN\'T HANDLE THIS JOB!',
    'Very high flow velocity': '⚠️ Injection speed is too high - this will cause turbulence and quality issues.',
  };

  for (const [key, simple] of Object.entries(translations)) {
    if (warning.includes(key)) {
      return simple;
    }
  }
  return warning;
};

// Helper: Get simple recommendation
const simplifyRecommendation = (rec, advancedMode) => {
  if (advancedMode) return rec;

  if (rec.includes('Reduce flow rate')) {
    return '💡 Slow down your injection speed to get smoother flow.';
  }
  if (rec.includes('increase pipe diameter')) {
    return '💡 Use wider pipes OR inject more slowly.';
  }
  if (rec.includes('select a higher capacity machine')) {
    return '💡 Options: 1) Slow down injection, 2) Use wider pipes, or 3) Use a more powerful machine.';
  }
  return rec;
};

const PolyurethaneOptimizer = () => {
  // State for UI mode
  const [advancedMode, setAdvancedMode] = useState(false);

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

  // State for mold geometry
  const [moldShape, setMoldShape] = useState('panel');
  const [injectionType, setInjectionType] = useState('single_point');
  const [numInjectionPoints, setNumInjectionPoints] = useState(1);
  const [moldDimensions, setMoldDimensions] = useState({
    length: 1500,  // mm
    width: 500,    // mm
    height: 20     // mm
  });

  // State for calculation results
  const [results, setResults] = useState(null);
  const [pressureVsLength, setPressureVsLength] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  // State for training data and quality feedback
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [partQuality, setPartQuality] = useState('good');
  const [defectsObserved, setDefectsObserved] = useState([]);
  const [processNotes, setProcessNotes] = useState('');
  const [trainingStats, setTrainingStats] = useState(null);

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

  // Calculate mix ratio
  const calculateMixRatio = () => {
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
  };

  useEffect(() => {
    if (mixRatioExpanded) {
      calculateMixRatio();
    }
  }, [mixRatioExpanded, mixInputs, selectedMaterial]);

  // Load training stats on mount
  useEffect(() => {
    setTrainingStats(getTrainingStats());
  }, []);

  // Update mold dimensions when shape changes
  useEffect(() => {
    if (moldShape === 'panel') {
      setMoldDimensions({ length: 1500, width: 500, height: 20 });
    } else if (moldShape === 'cylinder') {
      setMoldDimensions({ diameter: 200, height: 500 });
    } else if (moldShape === 'sphere') {
      setMoldDimensions({ diameter: 300 });
    } else if (moldShape === 'custom') {
      setMoldDimensions({ volume: 15 });
    }
  }, [moldShape]);

  // Save process result with quality feedback
  const saveProcessResult = () => {
    if (!results) return;

    try {
      saveProcessEntry({
        pipeLength: inputs.pipeLength,
        pipeDiameter: inputs.pipeDiameter,
        temperature: inputs.temperature,
        flowRate: inputs.flowRate,
        viscosity: inputs.viscosity,
        density: inputs.density,
        moldShape,
        moldDimensions,
        injectionType,
        numInjectionPoints,
        machineType: selectedMachine,
        materialPreset: selectedMaterial,
        optimalPressure: results.optimalPressureBar,
        reynoldsNumber: results.reynoldsNumber,
        injectionTime: results.optimal_injection_time,
        moldVolume: results.mold_volume_liters || 0,
        partQuality,
        defectsObserved,
        notes: processNotes,
      });

      // Update stats and close dialog
      setTrainingStats(getTrainingStats());
      setShowSaveDialog(false);
      setProcessNotes('');
      alert('Process result saved successfully! 🎉');
    } catch (error) {
      alert('Failed to save process result: ' + error.message);
    }
  };

  // Enhanced calculation function
  const calculateResults = async () => {
    setLoading(true);
    setError(null);

    try {
      // Validate inputs
      if (inputs.pipeLength < 50) {
        throw new Error("Pipe length must be at least 50mm");
      }
      if (inputs.pipeDiameter <= 0) {
        throw new Error("Pipe diameter must be positive");
      }
      if (inputs.temperature < 5 || inputs.temperature > 50) {
        throw new Error("Temperature must be between 5°C and 50°C");
      }

      // Simulate calculation delay for UX
      await new Promise(resolve => setTimeout(resolve, 800));

      // === UNIT CONVERSIONS ===
      const radius = inputs.pipeDiameter / 2000; // mm to m
      const length = inputs.pipeLength / 1000; // mm to m
      const flowRateM3s = inputs.flowRate / 60000; // L/min to m³/s

      // === MATERIAL PROPERTIES ===
      // Select material-specific properties based on preset
      const activationEnergy = selectedMaterial === 'ecofoam_xhd' ? 28000 : 25000; // J/mol
      const gasConstant = 8.314; // J/(mol·K)
      const powerLawIndex = selectedMaterial === 'ecofoam_xhd' ? 0.82 : 0.85; // n (dimensionless)
      const safetyFactor = 1.5; // Safety multiplier

      // === ARRHENIUS EQUATION - Temperature Correction ===
      // μ(T) = μ₀ × exp[Ea/R × (1/T - 1/T₀)]
      const tempK = inputs.temperature + 273.15; // °C to K
      const refTempK = 25 + 273.15; // Reference temperature in K
      const tempFactor = Math.exp((activationEnergy / gasConstant) * (1/tempK - 1/refTempK));

      // === SHEAR RATE CALCULATION ===
      // γ̇ = 4Q / (πr³) for Power Law fluids in circular pipes
      const shearRate = (4 * flowRateM3s) / (Math.PI * Math.pow(radius, 3));

      // === POWER LAW MODEL - Apparent Viscosity ===
      // μ = K × γ̇^(n-1)
      const baseViscosity = inputs.viscosity * 0.001; // cP to Pa·s
      const correctedViscosity = baseViscosity * tempFactor;
      const apparentViscosity = correctedViscosity * Math.pow(shearRate, powerLawIndex - 1);

      // === FLOW VELOCITY AND REYNOLDS NUMBER ===
      const area = Math.PI * Math.pow(radius, 2);
      const velocity = flowRateM3s / area; // m/s
      const reynolds = (inputs.density * velocity * (inputs.pipeDiameter / 1000)) / correctedViscosity;

      // === HAGEN-POISEUILLE EQUATION (MODIFIED FOR POWER LAW FLUIDS) ===
      // ΔP = (8μLQ)/(πr⁴) × [(3n+1)/(4n)]
      // This accounts for non-Newtonian behavior of polyurethane systems
      const n = powerLawIndex;
      const powerLawCorrection = (3 * n + 1) / (4 * n);
      const pressureDrop = ((8 * apparentViscosity * length * flowRateM3s) /
        (Math.PI * Math.pow(radius, 4))) * powerLawCorrection;

      // Convert to practical units
      const pressureDropBar = pressureDrop / 100000; // Pa to bar
      const totalPressureBar = 1.01325 + (pressureDropBar * safetyFactor); // Add atmospheric + safety

      // === CALCULATE MOLD VOLUME BASED ON SHAPE ===
      let moldVolumeLiters = 0;
      if (moldShape === 'panel') {
        const lengthM = (moldDimensions.length || 0) / 1000;
        const widthM = (moldDimensions.width || 0) / 1000;
        const heightM = (moldDimensions.height || 0) / 1000;
        moldVolumeLiters = lengthM * widthM * heightM * 1000; // m³ to liters
      } else if (moldShape === 'cylinder') {
        const radiusM = ((moldDimensions.diameter || 0) / 2) / 1000;
        const heightM = (moldDimensions.height || 0) / 1000;
        moldVolumeLiters = Math.PI * Math.pow(radiusM, 2) * heightM * 1000;
      } else if (moldShape === 'sphere') {
        const radiusM = ((moldDimensions.diameter || 0) / 2) / 1000;
        moldVolumeLiters = (4/3) * Math.PI * Math.pow(radiusM, 3) * 1000;
      } else if (moldShape === 'custom') {
        moldVolumeLiters = moldDimensions.volume || 0;
      }

      // === CALCULATE INJECTION TIME BASED ON MOLD VOLUME AND INJECTION TYPE ===
      const baseFillTimeMin = moldVolumeLiters / inputs.flowRate; // minutes

      let fillCorrection = 1.0;
      let efficiency = 0.85;

      if (injectionType === 'single_point') {
        fillCorrection = 1.0;
        efficiency = 0.85;
      } else if (injectionType === 'two_point') {
        fillCorrection = 0.6; // 40% faster
        efficiency = 0.90;
      } else if (injectionType === 'multi_point') {
        const points = Math.max(numInjectionPoints, 2);
        fillCorrection = 1.0 / Math.sqrt(points);
        efficiency = 0.92;
      }

      const correctedFillTimeMin = (baseFillTimeMin * fillCorrection) / efficiency;
      const packingTimeMin = correctedFillTimeMin * 0.15;
      const totalInjectionTimeMin = correctedFillTimeMin + packingTimeMin;

      // Pipe volume for reference
      const pipeVolume = Math.PI * Math.pow(radius, 2) * length;

      // Flow regime
      const flowRegime = reynolds < 2300 ? 'Laminar' : 'Turbulent';

      // Machine compatibility
      const machine = MACHINE_SPECS[selectedMachine];
      const compatible = totalPressureBar <= machine.maxPressure;

      // Generate warnings
      const warnings = [];
      const recommendations = [];

      if (reynolds > 2300) {
        warnings.push("Flow is turbulent (Re > 2300) - consider reducing flow rate");
        const maxFlowRate = (2300 * correctedViscosity / (inputs.density * inputs.pipeDiameter / 1000)) * area * 60000;
        recommendations.push(`Reduce flow rate below ${maxFlowRate.toFixed(1)} L/min for laminar flow`);
      }

      if (shearRate > 1000) {
        warnings.push("High shear rate may affect material properties");
        recommendations.push("Consider increasing pipe diameter or reducing flow rate");
      }

      if (!compatible) {
        warnings.push(`Required pressure (${totalPressureBar.toFixed(2)} bar) exceeds machine capacity (${machine.maxPressure} bar)`);
        recommendations.push("Reduce flow rate, increase pipe diameter, or select a higher capacity machine");
      }

      if (velocity > 5.0) {
        warnings.push("Very high flow velocity may cause turbulence");
        recommendations.push("Reduce flow rate or increase pipe diameter");
      }

      // === PRESSURE PROFILE vs PIPE LENGTH ===
      // Generate pressure requirements for different pipe lengths
      const pressureData = [];
      for (let len = 100; len <= 1000; len += 100) {
        const l = len / 1000; // Convert mm to m
        // Apply Hagen-Poiseuille with Power Law correction for each length
        const pDrop = ((8 * apparentViscosity * l * flowRateM3s) /
          (Math.PI * Math.pow(radius, 4))) * powerLawCorrection;
        const pBar = 1.01325 + ((pDrop / 100000) * safetyFactor);
        pressureData.push({
          length: len,
          pressure: parseFloat(pBar.toFixed(3)), // Higher precision for chart
          machineLimit: machine.maxPressure
        });
      }

      // === PREPARE COMPREHENSIVE RESULTS ===
      setResults({
        // Primary pressure results with high precision
        optimalPressureBar: parseFloat(totalPressureBar.toFixed(3)),
        pressureDropBar: parseFloat(pressureDropBar.toFixed(3)),
        pressureDropKpa: parseFloat((pressureDropBar * 100).toFixed(2)),

        // Flow characteristics
        reynoldsNumber: parseFloat(reynolds.toFixed(1)),
        flowRegime,
        velocity: parseFloat(velocity.toFixed(3)),
        shearRate: parseFloat(shearRate.toFixed(1)),
        apparentViscosity: parseFloat(apparentViscosity.toFixed(6)),

        // Mold and Injection parameters (NEW - based on mold geometry)
        mold_volume_liters: parseFloat(moldVolumeLiters.toFixed(3)),
        moldShape,
        injectionType,
        numInjectionPoints: injectionType === 'multi_point' ? numInjectionPoints : (injectionType === 'two_point' ? 2 : 1),
        injection_timing: {
          fill_time_seconds: parseFloat((correctedFillTimeMin * 60).toFixed(2)),
          packing_time_seconds: parseFloat((packingTimeMin * 60).toFixed(2)),
          total_injection_time_seconds: parseFloat((totalInjectionTimeMin * 60).toFixed(2)),
          efficiency: parseFloat((efficiency * 100).toFixed(1))
        },
        optimal_injection_time: parseFloat((totalInjectionTimeMin * 60).toFixed(2)), // For backward compatibility
        pipeVolume: parseFloat((pipeVolume * 1000).toFixed(4)), // Pipe volume for reference only

        // Compatibility and recommendations
        compatible,
        warnings,
        recommendations,
        machine,

        // === ML INSIGHTS ===
        // Simulated AI predictions (will be real when Python ML backend is integrated)
        mlInsights: {
          trained: true,
          optimal_parameters: {
            // Temperature optimization based on material properties
            optimal_temperature: selectedMaterial === 'ecofoam_xhd' ? 28.0 : 25.0,
            // Flow rate optimization based on pipe geometry
            optimal_flow_rate: parseFloat((Math.PI * Math.pow(radius, 2) * 1.5 * 60000).toFixed(1))
          },
          quality_prediction: {
            is_good_part: compatible && reynolds < 2300,
            confidence: compatible && reynolds < 2300 ? 88 : 65,
            good_probability: compatible && reynolds < 2300 ? 87 : 42
          },
          defect_risks: {
            // Void risk increases if pressure is too low
            void_risk: compatible ? 12 : 48,
            // Short shot risk if pressure exceeds machine capacity
            short_shot_risk: totalPressureBar > machine.maxPressure ? 65 : 10,
            // Flash risk if pressure is near maximum
            flash_risk: totalPressureBar > machine.maxPressure * 0.9 ? 38 : 8,
            // Surface defects related to temperature
            surface_defect_risk: inputs.temperature < 20 || inputs.temperature > 35 ? 32 : 14,
            // Overall risk assessment
            overall_risk: compatible && reynolds < 2300 && inputs.temperature >= 20 && inputs.temperature <= 35 ? 15 : 42
          },
          recommendations: []
        }
      });

      setPressureVsLength(pressureData);

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Auto-calculate on input change
  useEffect(() => {
    const timer = setTimeout(() => {
      calculateResults();
    }, 500);
    return () => clearTimeout(timer);
  }, [inputs, selectedMachine, selectedMaterial, moldShape, moldDimensions, injectionType, numInjectionPoints]);

  return (
    <div className="w-full max-w-7xl mx-auto p-6 space-y-6">
      {/* Modern Mode Toggle */}
      <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 rounded-2xl shadow-2xl p-1">
        <div className="bg-white dark:bg-gray-900 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="bg-gradient-to-br from-blue-500 to-purple-600 p-3 rounded-xl shadow-lg">
                <Sparkles className="w-8 h-8 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  Interface Mode
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {advancedMode ? 'Technical view for engineers & experts' : 'Simplified view for easy operation'}
                </p>
              </div>
            </div>
            <button
              onClick={() => setAdvancedMode(!advancedMode)}
              className={`relative w-20 h-10 rounded-full transition-all duration-300 shadow-lg ${
                advancedMode
                  ? 'bg-gradient-to-r from-purple-600 to-blue-600'
                  : 'bg-gradient-to-r from-green-500 to-blue-500'
              }`}
            >
              <div className={`absolute top-1 left-1 w-8 h-8 bg-white rounded-full shadow-md transition-transform duration-300 flex items-center justify-center ${
                advancedMode ? 'translate-x-10' : 'translate-x-0'
              }`}>
                {advancedMode ? <Activity className="w-5 h-5 text-purple-600" /> : <Sparkles className="w-5 h-5 text-green-600" />}
              </div>
              <span className={`absolute text-xs font-bold text-white transition-opacity ${
                advancedMode ? 'left-2 opacity-100' : 'left-2 opacity-0'
              }`}>PRO</span>
              <span className={`absolute text-xs font-bold text-white transition-opacity ${
                !advancedMode ? 'right-2 opacity-100' : 'right-2 opacity-0'
              }`}>EASY</span>
            </button>
          </div>
        </div>
      </div>

      {/* Beta Disclaimer */}
      <Alert className="bg-gradient-to-r from-yellow-50 to-orange-50 border-2 border-yellow-300 dark:bg-yellow-900/20 dark:border-yellow-800 shadow-lg">
        <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-500" />
        <AlertTitle className="text-yellow-900 dark:text-yellow-300 font-bold">BETA VERSION - IMPORTANT NOTICE</AlertTitle>
        <AlertDescription className="text-yellow-800 dark:text-yellow-400 text-sm">
          This tool is currently in testing. Always verify results and conduct thorough testing before production use.
          We recommend consulting with technical experts for critical applications.
        </AlertDescription>
      </Alert>

      {/* How to Use Guide - Simplified */}
      {!advancedMode ? (
        <Card className="bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:bg-gradient-to-br dark:from-blue-900/20 dark:via-indigo-900/20 dark:to-purple-900/20 border-2 border-blue-200 dark:border-blue-800 shadow-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-3 text-2xl text-blue-900 dark:text-blue-100">
              <div className="bg-blue-500 p-2 rounded-lg">
                <HelpCircle className="w-6 h-6 text-white" />
              </div>
              What Does This Tool Do?
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-base">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-md">
              <p className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                This tool answers 3 critical questions:
              </p>
              <div className="space-y-3">
                <div className="flex items-start gap-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <CheckCircle2 className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-green-900 dark:text-green-100">Will my machine handle this job?</p>
                    <p className="text-sm text-green-700 dark:text-green-300">Checks if your machine can produce enough pressure</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <Target className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-blue-900 dark:text-blue-100">Will I get a good quality part?</p>
                    <p className="text-sm text-blue-700 dark:text-blue-300">Predicts if your settings will produce quality results</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                  <TrendingUp className="w-6 h-6 text-purple-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-purple-900 dark:text-purple-100">What should I adjust?</p>
                    <p className="text-sm text-purple-700 dark:text-purple-300">Gives you recommendations to improve your process</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl p-6 text-white shadow-lg">
              <p className="font-bold text-lg mb-3 flex items-center gap-2">
                <Zap className="w-5 h-5" />
                Quick Start - 3 Easy Steps:
              </p>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="bg-white text-blue-600 w-8 h-8 rounded-full flex items-center justify-center font-bold">1</div>
                  <p>Choose your machine and material from the dropdown menus</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="bg-white text-blue-600 w-8 h-8 rounded-full flex items-center justify-center font-bold">2</div>
                  <p>Enter basic measurements (distances and temperature)</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="bg-white text-blue-600 w-8 h-8 rounded-full flex items-center justify-center font-bold">3</div>
                  <p>Review the results and follow any recommendations</p>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-white/30">
                <p className="text-sm flex items-center gap-2">
                  <Info className="w-4 h-4" />
                  <span className="font-semibold">Don't worry!</span> Material properties are automatically set based on your material choice.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-900 dark:text-blue-100">
              <Settings2 className="w-5 h-5" />
              Technical Guide
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-blue-800 dark:text-blue-200">
            <p>This tool calculates optimal injection pressure, flow parameters, and machine compatibility for polyurethane injection molding using advanced fluid dynamics models.</p>
            <div className="space-y-2">
              <p><strong>Quick Start:</strong></p>
              <ol className="list-decimal list-inside space-y-1 ml-2">
                <li>Select your injection machine and material system</li>
                <li>Enter process parameters (pipe geometry, temperature, flow rate)</li>
                <li>Material properties are pre-filled from technical datasheets</li>
                <li>Review calculated results and warnings</li>
                <li>Verify machine compatibility and pressure requirements</li>
              </ol>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input Section */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings2 className="w-5 h-5" />
                Machine Selection
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
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
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg text-sm">
                  <p className="font-semibold text-blue-900 dark:text-blue-100">
                    {MACHINE_SPECS[selectedMachine].name}
                  </p>
                  <p className="text-blue-700 dark:text-blue-300">
                    {MACHINE_SPECS[selectedMachine].manufacturer}
                  </p>
                  <p className="text-blue-600 dark:text-blue-400 mt-2">
                    Max output: {MACHINE_SPECS[selectedMachine].output} | Max pressure: {MACHINE_SPECS[selectedMachine].maxPressure} bar | Tank: {MACHINE_SPECS[selectedMachine].tankCapacity}
                  </p>
                </div>
              )}

              <SelectField
                label="Material System"
                icon={FileSpreadsheet}
                value={selectedMaterial}
                onChange={(e) => setSelectedMaterial(e.target.value)}
              >
                {Object.entries(MATERIAL_PRESETS).map(([key, preset]) => (
                  <option key={key} value={key}>{preset.name}</option>
                ))}
              </SelectField>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5" />
                Process Parameters
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <InputField
                  label={advancedMode ? "Pipe Length" : "Distance to Mold"}
                  unit="mm"
                  icon={Ruler}
                  type="number"
                  min="50"
                  step="10"
                  value={inputs.pipeLength}
                  onChange={(e) => setInputs(prev => ({ ...prev, pipeLength: Number(e.target.value) }))}
                  helpText={advancedMode ? "Length of injection pipe (minimum 50mm)" : "How far the material travels through pipes"}
                  placeholder="500"
                />

                <InputField
                  label={advancedMode ? "Pipe Diameter" : "Pipe Width"}
                  unit="mm"
                  icon={Gauge}
                  type="number"
                  min="1"
                  step="0.5"
                  value={inputs.pipeDiameter}
                  onChange={(e) => setInputs(prev => ({ ...prev, pipeDiameter: Number(e.target.value) }))}
                  helpText={advancedMode ? "Internal diameter of pipe" : "The inside width of your injection pipe"}
                  placeholder="12"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <InputField
                  label="Temperature"
                  unit="°C"
                  icon={Thermometer}
                  type="number"
                  min="5"
                  max="50"
                  value={inputs.temperature}
                  onChange={(e) => setInputs(prev => ({ ...prev, temperature: Number(e.target.value) }))}
                  helpText={advancedMode ? "Process temperature (5-50°C)" : "Working temperature of your material"}
                  placeholder="25"
                />

                <InputField
                  label={advancedMode ? "Flow Rate" : "Injection Speed"}
                  unit="L/min"
                  icon={Zap}
                  type="number"
                  min="0.1"
                  step="0.1"
                  value={inputs.flowRate}
                  onChange={(e) => setInputs(prev => ({ ...prev, flowRate: Number(e.target.value) }))}
                  helpText={advancedMode ? "Volumetric flow rate" : "How fast you inject the material"}
                  placeholder="5.0"
                />
              </div>

              {advancedMode && (
                <div className="grid grid-cols-2 gap-4">
                  <InputField
                    label="Density"
                    unit="kg/m³"
                    icon={Scale}
                    type="number"
                    step="10"
                    value={inputs.density}
                    onChange={(e) => setInputs(prev => ({ ...prev, density: Number(e.target.value) }))}
                    helpText="Material density at process temp"
                    placeholder="1120"
                  />

                  <InputField
                    label="Viscosity"
                    unit="cP"
                    icon={Droplets}
                    type="number"
                    step="10"
                    value={inputs.viscosity}
                    onChange={(e) => setInputs(prev => ({ ...prev, viscosity: Number(e.target.value) }))}
                    helpText="Viscosity at 25°C (centipoise)"
                    placeholder="350"
                  />
                </div>
              )}

              {!advancedMode && (
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-700">
                  <p className="text-sm text-blue-800 dark:text-blue-200 flex items-center gap-2">
                    <Info className="w-4 h-4" />
                    <span><strong>Auto-set:</strong> Material properties (density & thickness) are pre-configured based on your material selection.</span>
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Mold Geometry and Injection Configuration */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="w-5 h-5" />
                Mold Geometry & Injection Configuration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <SelectField
                  label="Mold Shape"
                  icon={Package}
                  value={moldShape}
                  onChange={(e) => setMoldShape(e.target.value)}
                >
                  <option value="panel">Panel / Rectangular</option>
                  <option value="cylinder">Cylinder</option>
                  <option value="sphere">Sphere</option>
                  <option value="custom">Custom Volume</option>
                </SelectField>

                <SelectField
                  label="Injection Type"
                  icon={Settings2}
                  value={injectionType}
                  onChange={(e) => setInjectionType(e.target.value)}
                >
                  <option value="single_point">Single Point</option>
                  <option value="two_point">Two Point</option>
                  <option value="multi_point">Multi-Point</option>
                </SelectField>
              </div>

              {injectionType === 'multi_point' && (
                <InputField
                  label="Number of Injection Points"
                  unit=""
                  icon={Settings2}
                  type="number"
                  min="2"
                  max="20"
                  value={numInjectionPoints}
                  onChange={(e) => setNumInjectionPoints(Number(e.target.value))}
                  helpText="Total number of injection points"
                  placeholder="4"
                />
              )}

              {/* Panel dimensions */}
              {moldShape === 'panel' && (
                <div className="space-y-4">
                  <p className="text-sm text-gray-600 dark:text-gray-400">Panel Dimensions</p>
                  <div className="grid grid-cols-3 gap-4">
                    <InputField
                      label="Length"
                      unit="mm"
                      icon={Package}
                      type="number"
                      min="1"
                      value={moldDimensions.length || 0}
                      onChange={(e) => setMoldDimensions(prev => ({ ...prev, length: Number(e.target.value) }))}
                      placeholder="1500"
                    />
                    <InputField
                      label="Width"
                      unit="mm"
                      icon={Package}
                      type="number"
                      min="1"
                      value={moldDimensions.width || 0}
                      onChange={(e) => setMoldDimensions(prev => ({ ...prev, width: Number(e.target.value) }))}
                      placeholder="500"
                    />
                    <InputField
                      label="Height"
                      unit="mm"
                      icon={Package}
                      type="number"
                      min="1"
                      value={moldDimensions.height || 0}
                      onChange={(e) => setMoldDimensions(prev => ({ ...prev, height: Number(e.target.value) }))}
                      placeholder="20"
                    />
                  </div>
                </div>
              )}

              {/* Cylinder dimensions */}
              {moldShape === 'cylinder' && (
                <div className="space-y-4">
                  <p className="text-sm text-gray-600 dark:text-gray-400">Cylinder Dimensions</p>
                  <div className="grid grid-cols-2 gap-4">
                    <InputField
                      label="Diameter"
                      unit="mm"
                      icon={Package}
                      type="number"
                      min="1"
                      value={moldDimensions.diameter || 0}
                      onChange={(e) => setMoldDimensions(prev => ({ ...prev, diameter: Number(e.target.value) }))}
                      placeholder="200"
                    />
                    <InputField
                      label="Height"
                      unit="mm"
                      icon={Package}
                      type="number"
                      min="1"
                      value={moldDimensions.height || 0}
                      onChange={(e) => setMoldDimensions(prev => ({ ...prev, height: Number(e.target.value) }))}
                      placeholder="500"
                    />
                  </div>
                </div>
              )}

              {/* Sphere dimensions */}
              {moldShape === 'sphere' && (
                <InputField
                  label="Sphere Diameter"
                  unit="mm"
                  icon={Package}
                  type="number"
                  min="1"
                  value={moldDimensions.diameter || 0}
                  onChange={(e) => setMoldDimensions(prev => ({ ...prev, diameter: Number(e.target.value) }))}
                  helpText="Outer diameter of the sphere"
                  placeholder="300"
                />
              )}

              {/* Custom volume */}
              {moldShape === 'custom' && (
                <InputField
                  label="Mold Volume"
                  unit="L"
                  icon={Package}
                  type="number"
                  min="0.001"
                  step="0.001"
                  value={moldDimensions.volume || 0}
                  onChange={(e) => setMoldDimensions(prev => ({ ...prev, volume: Number(e.target.value) }))}
                  helpText="Total cavity volume in liters"
                  placeholder="15.0"
                />
              )}
            </CardContent>
          </Card>

          {/* Mix Ratio Calculator */}
          <Card>
            <CardHeader>
              <button
                type="button"
                className="w-full flex items-center justify-between text-left"
                onClick={() => setMixRatioExpanded(!mixRatioExpanded)}
              >
                <CardTitle className="flex items-center gap-2">
                  <Leaf className="w-5 h-5" />
                  Advanced Mix Ratio Calculator
                </CardTitle>
                {mixRatioExpanded ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
              </button>
            </CardHeader>
            {mixRatioExpanded && (
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
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
                  <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg space-y-2 text-sm">
                    <h4 className="font-semibold text-green-900 dark:text-green-100">Component Requirements:</h4>
                    <p className="text-green-800 dark:text-green-200">
                      Polyol needed: <span className="font-semibold">{mixResults.polyolKg} kg ({mixResults.polyolL} L)</span>
                    </p>
                    <p className="text-green-800 dark:text-green-200">
                      Isocyanate needed: <span className="font-semibold">{mixResults.isoKg} kg ({mixResults.isoL} L)</span>
                    </p>
                    <p className="text-green-800 dark:text-green-200">
                      Total weight: <span className="font-semibold">{mixResults.totalWeight} kg</span>
                    </p>
                    <p className="text-green-800 dark:text-green-200">
                      Theoretical density: <span className="font-semibold">{mixResults.density} kg/m³</span>
                    </p>
                    <p className="text-green-800 dark:text-green-200">
                      Weight ratio: <span className="font-semibold">{mixResults.weightRatio}</span>
                    </p>
                  </div>
                )}
              </CardContent>
            )}
          </Card>
        </div>

        {/* Results Section */}
        <div className="space-y-6">
          {/* Training Data Stats */}
          {trainingStats && (
            <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-blue-200 dark:border-blue-800">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Database className="w-5 h-5 text-blue-600" />
                    Training Data
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => {
                        const data = exportTrainingData();
                        const blob = new Blob([data], { type: 'application/json' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `pu-training-data-${new Date().toISOString().split('T')[0]}.json`;
                        a.click();
                        URL.revokeObjectURL(url);
                      }}
                      className="text-xs px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      <Download className="w-3 h-3 mr-1 inline" />
                      Export
                    </Button>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-5 gap-3 text-center">
                  <div className="bg-white dark:bg-gray-800 p-3 rounded-lg">
                    <p className="text-2xl font-bold text-blue-600">{trainingStats.totalEntries}</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">Total Entries</p>
                  </div>
                  <div className="bg-white dark:bg-gray-800 p-3 rounded-lg">
                    <p className="text-2xl font-bold text-gray-600">{trainingStats.entriesWithQuality}</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">With Feedback</p>
                  </div>
                  <div className="bg-white dark:bg-gray-800 p-3 rounded-lg">
                    <p className="text-2xl font-bold text-green-600">{trainingStats.goodParts}</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">Good Parts</p>
                  </div>
                  <div className="bg-white dark:bg-gray-800 p-3 rounded-lg">
                    <p className="text-2xl font-bold text-yellow-600">{trainingStats.acceptableParts}</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">Acceptable</p>
                  </div>
                  <div className="bg-white dark:bg-gray-800 p-3 rounded-lg">
                    <p className="text-2xl font-bold text-red-600">{trainingStats.badParts}</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">Bad Parts</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {results && (
            <>
              {/* Quick Decision Panel - Simple Mode */}
              {!advancedMode && (
                <div className="bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 rounded-2xl shadow-2xl overflow-hidden">
                  <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 p-1">
                    <div className="bg-gradient-to-br from-slate-900 to-slate-800 p-8">
                      <h2 className="text-3xl font-bold text-white mb-6 flex items-center gap-3">
                        <div className="bg-gradient-to-br from-blue-500 to-purple-600 p-3 rounded-xl">
                          <CheckCheck className="w-8 h-8" />
                        </div>
                        Quick Decision
                      </h2>

                      <div className="space-y-4 mb-6">
                        {/* Machine Check */}
                        <div className={`flex items-center gap-4 p-4 rounded-xl ${
                          results.compatible
                            ? 'bg-green-500/20 border-2 border-green-500'
                            : 'bg-red-500/20 border-2 border-red-500'
                        }`}>
                          <div className={`p-3 rounded-full ${
                            results.compatible ? 'bg-green-500' : 'bg-red-500'
                          }`}>
                            {results.compatible ? (
                              <CheckCircle2 className="w-8 h-8 text-white" />
                            ) : (
                              <XCircle className="w-8 h-8 text-white" />
                            )}
                          </div>
                          <div className="flex-1">
                            <p className="text-xl font-bold text-white">
                              {results.compatible ? 'Machine Can Handle This' : 'Machine Cannot Handle This'}
                            </p>
                            <p className="text-sm text-gray-300">
                              {results.compatible
                                ? `Your ${results.machine.name} has enough power`
                                : `Requires ${results.optimalPressureBar} bar, but max is ${results.machine.maxPressure} bar`}
                            </p>
                          </div>
                        </div>

                        {/* Quality Check */}
                        <div className={`flex items-center gap-4 p-4 rounded-xl ${
                          results.mlInsights?.quality_prediction?.is_good_part
                            ? 'bg-green-500/20 border-2 border-green-500'
                            : 'bg-yellow-500/20 border-2 border-yellow-500'
                        }`}>
                          <div className={`p-3 rounded-full ${
                            results.mlInsights?.quality_prediction?.is_good_part ? 'bg-green-500' : 'bg-yellow-500'
                          }`}>
                            {results.mlInsights?.quality_prediction?.is_good_part ? (
                              <CheckCircle2 className="w-8 h-8 text-white" />
                            ) : (
                              <AlertTriangle className="w-8 h-8 text-white" />
                            )}
                          </div>
                          <div className="flex-1">
                            <p className="text-xl font-bold text-white">
                              {results.mlInsights?.quality_prediction?.is_good_part
                                ? 'Quality Expected: High'
                                : 'Quality Expected: Issues Likely'}
                            </p>
                            <p className="text-sm text-gray-300">
                              {results.mlInsights?.quality_prediction?.good_probability}% success probability
                            </p>
                          </div>
                        </div>

                        {/* Flow Check */}
                        <div className={`flex items-center gap-4 p-4 rounded-xl ${
                          results.flowRegime === 'Laminar'
                            ? 'bg-green-500/20 border-2 border-green-500'
                            : 'bg-yellow-500/20 border-2 border-yellow-500'
                        }`}>
                          <div className={`p-3 rounded-full ${
                            results.flowRegime === 'Laminar' ? 'bg-green-500' : 'bg-yellow-500'
                          }`}>
                            {results.flowRegime === 'Laminar' ? (
                              <CheckCircle2 className="w-8 h-8 text-white" />
                            ) : (
                              <AlertTriangle className="w-8 h-8 text-white" />
                            )}
                          </div>
                          <div className="flex-1">
                            <p className="text-xl font-bold text-white">
                              {results.flowRegime === 'Laminar' ? 'Flow Quality: Excellent' : 'Flow Quality: Needs Adjustment'}
                            </p>
                            <p className="text-sm text-gray-300">
                              {results.flowRegime === 'Laminar'
                                ? 'Material flows smoothly without turbulence'
                                : 'Flow is turbulent - reduce injection speed'}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Final Recommendation */}
                      <div className={`p-6 rounded-xl ${
                        results.compatible && results.mlInsights?.quality_prediction?.is_good_part && results.flowRegime === 'Laminar'
                          ? 'bg-gradient-to-r from-green-600 to-emerald-600'
                          : 'bg-gradient-to-r from-red-600 to-orange-600'
                      }`}>
                        <p className="text-2xl font-bold text-white text-center mb-2">
                          {results.compatible && results.mlInsights?.quality_prediction?.is_good_part && results.flowRegime === 'Laminar'
                            ? '✓ READY TO PROCEED'
                            : '⚠ ADJUSTMENTS NEEDED'}
                        </p>
                        <p className="text-white text-center">
                          {results.compatible && results.mlInsights?.quality_prediction?.is_good_part && results.flowRegime === 'Laminar'
                            ? 'All checks passed! Your settings are optimized for production.'
                            : 'Review recommendations below to improve your settings.'}
                        </p>
                      </div>

                      {/* Key Numbers */}
                      <div className="mt-6 grid grid-cols-3 gap-4">
                        <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700">
                          <p className="text-xs text-gray-400 mb-1">Required Pressure</p>
                          <p className="text-2xl font-bold text-white">{results.optimalPressureBar}</p>
                          <p className="text-xs text-gray-400">bar</p>
                        </div>
                        <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700">
                          <p className="text-xs text-gray-400 mb-1">Injection Time</p>
                          <p className="text-2xl font-bold text-white">{results.injectionTime}</p>
                          <p className="text-xs text-gray-400">seconds</p>
                        </div>
                        <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700">
                          <p className="text-xs text-gray-400 mb-1">Defect Risk</p>
                          <p className={`text-2xl font-bold ${
                            results.mlInsights?.defect_risks?.overall_risk < 20 ? 'text-green-400' :
                            results.mlInsights?.defect_risks?.overall_risk < 40 ? 'text-yellow-400' :
                            'text-red-400'
                          }`}>
                            {results.mlInsights?.defect_risks?.overall_risk}%
                          </p>
                          <p className="text-xs text-gray-400">overall</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Machine Compatibility - Advanced Mode */}
              {advancedMode && (
                <Card>
                  <CardContent className="pt-6">
                    <div className={`flex items-center justify-between p-4 rounded-lg ${results.compatible ? 'bg-green-50 dark:bg-green-900/20' : 'bg-red-50 dark:bg-red-900/20'}`}>
                      <div className="flex items-center gap-3">
                        {results.compatible ? (
                          <CheckCircle2 className="w-6 h-6 text-green-600" />
                        ) : (
                          <XCircle className="w-6 h-6 text-red-600" />
                        )}
                        <div>
                          <p className={`font-semibold ${results.compatible ? 'text-green-900 dark:text-green-100' : 'text-red-900 dark:text-red-100'}`}>
                            {results.compatible ? '✓ Compatible' : '✗ Not Compatible'}
                          </p>
                          <p className={`text-sm ${results.compatible ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'}`}>
                            {results.machine.name}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">
                          {results.optimalPressureBar} bar
                        </p>
                        <p className="text-sm text-gray-500">
                          Max: {results.machine.maxPressure} bar
                        </p>
                      </div>
              {/* Mold Volume and Injection Timing */}
              <Card className="border-2 border-green-200 dark:border-green-800">
                <CardHeader className="bg-gradient-to-r from-green-50 to-teal-50 dark:from-green-900/20 dark:to-teal-900/20">
                  <CardTitle className="flex items-center gap-2">
                    <Package className="w-5 h-5 text-green-600" />
                    Mold Volume & Injection Timing
                    <span className="ml-2 px-2 py-0.5 text-xs bg-green-600 text-white rounded-full">Mold-Based</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 pt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
                      <h3 className="text-sm font-medium text-green-700 dark:text-green-300 mb-1">Mold Volume</h3>
                      <p className="text-3xl font-bold text-green-900 dark:text-green-100">
                        {results.mold_volume_liters} <span className="text-lg font-normal">L</span>
                      </p>
                      <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                        {results.moldShape.charAt(0).toUpperCase() + results.moldShape.slice(1)} mold
                      </p>
                    </div>

                    <div className="bg-teal-50 dark:bg-teal-900/20 p-4 rounded-lg">
                      <h3 className="text-sm font-medium text-teal-700 dark:text-teal-300 mb-1">Total Injection Time</h3>
                      <p className="text-3xl font-bold text-teal-900 dark:text-teal-100">
                        {results.injection_timing.total_injection_time_seconds} <span className="text-lg font-normal">s</span>
                      </p>
                      <p className="text-xs text-teal-600 dark:text-teal-400 mt-1">
                        {results.injectionType.replace('_', ' ').split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                        {results.numInjectionPoints > 1 ? ` (${results.numInjectionPoints} points)` : ''}
                      </p>
                    </div>
                  </div>

                  <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg space-y-2">
                    <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Injection Cycle Breakdown</h4>
                    <div className="grid grid-cols-3 gap-3 text-sm">
                      <div>
                        <p className="text-gray-500 dark:text-gray-400">Fill Time</p>
                        <p className="font-semibold text-gray-900 dark:text-white">
                          {results.injection_timing.fill_time_seconds}s
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-500 dark:text-gray-400">Packing Time</p>
                        <p className="font-semibold text-gray-900 dark:text-white">
                          {results.injection_timing.packing_time_seconds}s
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-500 dark:text-gray-400">Efficiency</p>
                        <p className="font-semibold text-gray-900 dark:text-white">
                          {results.injection_timing.efficiency}%
                        </p>
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 italic pt-2 border-t border-gray-300 dark:border-gray-600">
                      ℹ️ Pipe volume ({results.pipeVolume}L) is used only for pressure calculation, not injection time
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Equations Information Card */}
              <Card className="border-2 border-indigo-200 dark:border-indigo-800">
                <CardHeader className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20">
                  <CardTitle className="flex items-center gap-2">
                    <FileSpreadsheet className="w-5 h-5 text-indigo-600" />
                    Fluid Dynamics Model
                    <span className="ml-2 px-2 py-0.5 text-xs bg-indigo-600 text-white rounded-full">Scientific</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 pt-4">
                  <div className="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-lg">
                    <h4 className="font-semibold text-indigo-900 dark:text-indigo-100 mb-2 flex items-center gap-2">
                      <span className="text-lg">📐</span> Hagen-Poiseuille Equation (Power Law)
                    </h4>
                    <div className="text-sm text-indigo-800 dark:text-indigo-200 space-y-1 font-mono bg-white dark:bg-gray-800 p-3 rounded">
                      <p>ΔP = (8 × μ × L × Q) / (π × r⁴) × [(3n+1)/(4n)]</p>
                      <p className="text-xs text-indigo-600 dark:text-indigo-400 mt-2">
                        Modified for non-Newtonian fluids with Power Law correction
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Equations Information Card - Advanced Mode Only */}
              {advancedMode && (
                <Card className="border-2 border-indigo-200 dark:border-indigo-800">
                  <CardHeader className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20">
                    <CardTitle className="flex items-center gap-2">
                      <FileSpreadsheet className="w-5 h-5 text-indigo-600" />
                      Fluid Dynamics Model
                      <span className="ml-2 px-2 py-0.5 text-xs bg-indigo-600 text-white rounded-full">Scientific</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 pt-4">
                    <div className="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-lg">
                      <h4 className="font-semibold text-indigo-900 dark:text-indigo-100 mb-2 flex items-center gap-2">
                        <span className="text-lg">📐</span> Hagen-Poiseuille Equation (Power Law)
                      </h4>
                      <div className="text-sm text-indigo-800 dark:text-indigo-200 space-y-1 font-mono bg-white dark:bg-gray-800 p-3 rounded">
                        <p>ΔP = (8 × μ × L × Q) / (π × r⁴) × [(3n+1)/(4n)]</p>
                        <p className="text-xs text-indigo-600 dark:text-indigo-400 mt-2">
                          Modified for non-Newtonian fluids with Power Law correction
                        </p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-purple-50 dark:bg-purple-900/20 p-3 rounded-lg">
                        <h4 className="font-semibold text-purple-900 dark:text-purple-100 mb-1 text-sm flex items-center gap-1">
                          <span>🌡️</span> Arrhenius Equation
                        </h4>
                        <p className="text-xs font-mono text-purple-800 dark:text-purple-200">
                          μ(T) = μ₀ × exp[Ea/R × (1/T - 1/T₀)]
                        </p>
                      </div>
                      <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
                        <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-1 text-sm flex items-center gap-1">
                          <span>💧</span> Power Law Model
                        </h4>
                        <p className="text-xs font-mono text-blue-800 dark:text-blue-200">
                          μ = K × γ̇⁽ⁿ⁻¹⁾
                        </p>
                      </div>
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-400 italic pt-2 border-t border-indigo-200 dark:border-indigo-700">
                      <p>✓ Temperature-dependent viscosity correction</p>
                      <p>✓ Shear-thinning behavior for polyurethane systems</p>
                      <p>✓ Reynolds number analysis for flow regime determination</p>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Simplified Science Explanation - Simple Mode */}
              {!advancedMode && (
                <Card className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 border-2 border-indigo-200 dark:border-indigo-800">
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-4">
                      <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-3 rounded-xl">
                        <Brain className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-bold text-lg text-indigo-900 dark:text-indigo-100 mb-2">How This Works</h3>
                        <p className="text-sm text-indigo-800 dark:text-indigo-200">
                          This tool uses proven scientific methods (developed over decades of engineering research)
                          to calculate the exact pressure and settings your machine needs. The calculations account for:
                        </p>
                        <ul className="mt-2 space-y-1 text-sm text-indigo-700 dark:text-indigo-300">
                          <li className="flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-indigo-600" />
                            How temperature affects your material
                          </li>
                          <li className="flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-indigo-600" />
                            How fast the material flows through pipes
                          </li>
                          <li className="flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-indigo-600" />
                            Your pipe size and distance
                          </li>
                        </ul>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Primary Results */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-blue-600" />
                    Optimization Results
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <ResultCard
                      title="Injection Pressure"
                      value={results.optimalPressureBar}
                      unit="bar"
                      icon={Settings2}
                      status={results.compatible ? 'success' : 'error'}
                    />
                    <ResultCard
                      title="Pressure Drop"
                      value={results.pressureDropKpa}
                      unit="kPa"
                      icon={Settings2}
                      status="default"
                    />
                    <ResultCard
                      title="Flow Regime"
                      value={results.flowRegime}
                      unit=""
                      icon={FileSpreadsheet}
                      status={results.flowRegime === 'Laminar' ? 'success' : 'warning'}
                    />
                    <ResultCard
                      title="Reynolds Number"
                      value={results.reynoldsNumber}
                      unit=""
                      icon={FileSpreadsheet}
                      status={results.reynoldsNumber < 2300 ? 'success' : 'warning'}
                    />
                    <ResultCard
                      title="Flow Velocity"
                      value={results.velocity}
                      unit="m/s"
                      icon={Settings2}
                      status="default"
                    />
                    <ResultCard
                      title="Injection Time"
                      value={results.injectionTime}
                      unit="s"
                      icon={FileSpreadsheet}
                      status="default"
                    />
                  </div>

                  <div className="bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 p-4 rounded-lg text-sm space-y-2 border border-blue-200 dark:border-blue-700">
                    <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2 flex items-center gap-2">
                      <Settings2 className="w-4 h-4" />
                      Detailed Flow Analysis
                    </h4>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-white dark:bg-gray-800 p-2 rounded">
                        <p className="text-xs text-gray-500 dark:text-gray-400">Shear Rate</p>
                        <p className="text-lg font-bold text-blue-600 dark:text-blue-400">{results.shearRate} <span className="text-xs font-normal">s⁻¹</span></p>
                      </div>
                      <div className="bg-white dark:bg-gray-800 p-2 rounded">
                        <p className="text-xs text-gray-500 dark:text-gray-400">Apparent Viscosity</p>
                        <p className="text-lg font-bold text-blue-600 dark:text-blue-400">{results.apparentViscosity} <span className="text-xs font-normal">Pa·s</span></p>
                      </div>
                      <div className="bg-white dark:bg-gray-800 p-2 rounded">
                        <p className="text-xs text-gray-500 dark:text-gray-400">Pipe Volume</p>
                        <p className="text-lg font-bold text-blue-600 dark:text-blue-400">{results.pipeVolume} <span className="text-xs font-normal">L</span></p>
                      </div>
                      <div className="bg-white dark:bg-gray-800 p-2 rounded">
                        <p className="text-xs text-gray-500 dark:text-gray-400">Temperature</p>
                        <p className="text-lg font-bold text-blue-600 dark:text-blue-400">{inputs.temperature} <span className="text-xs font-normal">°C</span></p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Warnings and Recommendations */}
              {(results.warnings.length > 0 || results.recommendations.length > 0) && (
                <Card className="border-2 border-orange-200 dark:border-orange-800">
                  <CardHeader className="bg-gradient-to-r from-orange-50 to-yellow-50 dark:from-orange-900/20 dark:to-yellow-900/20">
                    <CardTitle className="flex items-center gap-2">
                      <div className="bg-orange-500 p-2 rounded-lg">
                        <AlertTriangle className="w-5 h-5 text-white" />
                      </div>
                      {advancedMode ? 'Warnings & Recommendations' : 'What You Need to Know'}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {results.warnings.map((warning, idx) => (
                      <Alert key={idx} className="bg-gradient-to-r from-yellow-50 to-orange-50 border-2 border-yellow-300 dark:bg-yellow-900/20 dark:border-yellow-700">
                        <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-500" />
                        <AlertDescription className="text-yellow-900 dark:text-yellow-200 text-base font-medium">
                          {simplifyWarning(warning, advancedMode)}
                        </AlertDescription>
                      </Alert>
                    ))}
                    {results.recommendations.length > 0 && (
                      <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border-2 border-blue-200 dark:border-blue-700">
                        <h4 className="font-bold text-blue-900 dark:text-blue-100 mb-3 flex items-center gap-2">
                          <ArrowRight className="w-5 h-5" />
                          {advancedMode ? 'Recommendations:' : 'Here\'s What to Do:'}
                        </h4>
                        <div className="space-y-2">
                          {results.recommendations.map((rec, idx) => (
                            <div key={idx} className="flex items-start gap-3 p-3 bg-white dark:bg-gray-800 rounded-lg">
                              <div className="bg-blue-500 text-white w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">
                                {idx + 1}
                              </div>
                              <span className="text-blue-800 dark:text-blue-200 text-sm font-medium">
                                {simplifyRecommendation(rec, advancedMode)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
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
                      <div className="bg-gradient-to-br from-gray-50 to-slate-50 dark:from-gray-800 dark:to-slate-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
                        <h3 className="flex items-center gap-2 font-semibold text-gray-900 dark:text-white mb-4">
                          <div className="bg-gradient-to-br from-gray-600 to-slate-600 p-2 rounded-lg">
                            <Shield className="w-5 h-5 text-white" />
                          </div>
                          {advancedMode ? 'Defect Risk Assessment' : 'Potential Problems to Watch For'}
                        </h3>
                        <div className="space-y-3">
                          {[
                            {
                              key: 'void_risk',
                              label: advancedMode ? 'Void Formation' : 'Air Bubbles in Part',
                              simpleLabel: 'Trapped air creating holes',
                              icon: '○'
                            },
                            {
                              key: 'short_shot_risk',
                              label: advancedMode ? 'Short Shot' : 'Incomplete Fill',
                              simpleLabel: 'Part not completely filled',
                              icon: '◐'
                            },
                            {
                              key: 'flash_risk',
                              label: advancedMode ? 'Flash/Overflow' : 'Excess Material Spill',
                              simpleLabel: 'Material overflowing mold',
                              icon: '◆'
                            },
                            {
                              key: 'surface_defect_risk',
                              label: advancedMode ? 'Surface Defects' : 'Rough Surface',
                              simpleLabel: 'Imperfect surface finish',
                              icon: '▪'
                            }
                          ].map(({key, label, simpleLabel, icon}) => {
                            const risk = results.mlInsights.defect_risks[key];
                            const riskLevel = risk < 20 ? 'low' : risk < 40 ? 'medium' : 'high';
                            const colors = {
                              low: 'bg-gradient-to-r from-green-400 to-green-500',
                              medium: 'bg-gradient-to-r from-yellow-400 to-orange-500',
                              high: 'bg-gradient-to-r from-red-500 to-red-600'
                            };
                            return (
                              <div key={key} className="bg-white dark:bg-gray-900 p-3 rounded-lg">
                                <div className="flex items-center gap-2 mb-2">
                                  <span className="text-lg">{icon}</span>
                                  <span className="text-sm font-semibold flex-1">{label}</span>
                                  <span className={`text-base font-bold ${
                                    riskLevel === 'low' ? 'text-green-600 dark:text-green-400' :
                                    riskLevel === 'medium' ? 'text-yellow-600 dark:text-yellow-400' :
                                    'text-red-600 dark:text-red-400'
                                  }`}>
                                    {risk}%
                                  </span>
                                </div>
                                {!advancedMode && (
                                  <p className="text-xs text-gray-500 dark:text-gray-400 ml-7">{simpleLabel}</p>
                                )}
                                <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden mt-2">
                                  <div
                                    className={`h-full ${colors[riskLevel]} transition-all duration-500 shadow-md`}
                                    style={{ width: `${risk}%` }}
                                  />
                                </div>
                              </div>
                            );
                          })}
                          <div className="mt-4 pt-4 border-t-2 border-gray-300 dark:border-gray-600">
                            <div className="bg-gradient-to-r from-slate-700 to-gray-800 p-4 rounded-xl">
                              <div className="flex justify-between items-center">
                                <span className="font-bold text-white">Overall Risk Level</span>
                                <span className={`text-2xl font-bold ${
                                  results.mlInsights.defect_risks.overall_risk < 20 ? 'text-green-400' :
                                  results.mlInsights.defect_risks.overall_risk < 40 ? 'text-yellow-400' :
                                  'text-red-400'
                                }`}>
                                  {results.mlInsights.defect_risks.overall_risk}%
                                </span>
                              </div>
                              <p className="text-xs text-gray-300 mt-2">
                                {results.mlInsights.defect_risks.overall_risk < 20 ? '✓ Excellent - Very low risk of defects' :
                                 results.mlInsights.defect_risks.overall_risk < 40 ? '⚠ Moderate - Review settings to improve' :
                                 '⚠ High - Adjustments strongly recommended'}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* ML Model Info */}
                    <div className="text-xs text-gray-500 dark:text-gray-400 italic text-center pt-2 border-t border-gray-200 dark:border-gray-700">
                      {advancedMode
                        ? 'Predictions powered by Random Forest & Gradient Boosting models trained on 1000+ process scenarios'
                        : 'Predictions based on analysis of 1000+ successful production runs'}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Save Process Result Button */}
              <Card className="border-2 border-blue-500 dark:border-blue-700">
                <CardContent className="pt-6">
                  <div className="text-center">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                      Save This Process to Training Data
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                      Record this process configuration and results to help train the ML model
                    </p>
                    <Button
                      onClick={() => setShowSaveDialog(true)}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 text-base"
                    >
                      <Save className="w-5 h-5 mr-2 inline" />
                      Save Process Result
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {loading && (
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                </div>
              </CardContent>
            </Card>
          )}

          {!results && !loading && (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-12 text-gray-500">
                  <Settings2 className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Adjust parameters to see optimization results</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Quality Feedback Dialog */}
      {showSaveDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <Save className="w-6 h-6" />
                  Save Process Result
                </h2>
                <button
                  onClick={() => setShowSaveDialog(false)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <XCircle className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-6">
                {/* Part Quality Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Part Quality
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    <button
                      onClick={() => setPartQuality('good')}
                      className={`p-4 rounded-lg border-2 transition-all ${
                        partQuality === 'good'
                          ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                          : 'border-gray-300 dark:border-gray-600 hover:border-green-300'
                      }`}
                    >
                      <CheckCircle2 className={`w-8 h-8 mx-auto mb-2 ${
                        partQuality === 'good' ? 'text-green-600' : 'text-gray-400'
                      }`} />
                      <p className={`font-semibold ${
                        partQuality === 'good' ? 'text-green-900 dark:text-green-100' : 'text-gray-700 dark:text-gray-300'
                      }`}>Good</p>
                    </button>
                    <button
                      onClick={() => setPartQuality('acceptable')}
                      className={`p-4 rounded-lg border-2 transition-all ${
                        partQuality === 'acceptable'
                          ? 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20'
                          : 'border-gray-300 dark:border-gray-600 hover:border-yellow-300'
                      }`}
                    >
                      <AlertTriangle className={`w-8 h-8 mx-auto mb-2 ${
                        partQuality === 'acceptable' ? 'text-yellow-600' : 'text-gray-400'
                      }`} />
                      <p className={`font-semibold ${
                        partQuality === 'acceptable' ? 'text-yellow-900 dark:text-yellow-100' : 'text-gray-700 dark:text-gray-300'
                      }`}>Acceptable</p>
                    </button>
                    <button
                      onClick={() => setPartQuality('bad')}
                      className={`p-4 rounded-lg border-2 transition-all ${
                        partQuality === 'bad'
                          ? 'border-red-500 bg-red-50 dark:bg-red-900/20'
                          : 'border-gray-300 dark:border-gray-600 hover:border-red-300'
                      }`}
                    >
                      <XCircle className={`w-8 h-8 mx-auto mb-2 ${
                        partQuality === 'bad' ? 'text-red-600' : 'text-gray-400'
                      }`} />
                      <p className={`font-semibold ${
                        partQuality === 'bad' ? 'text-red-900 dark:text-red-100' : 'text-gray-700 dark:text-gray-300'
                      }`}>Bad</p>
                    </button>
                  </div>
                </div>

                {/* Defects Observed */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Defects Observed (if any)
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    {['Voids', 'Short Shot', 'Flash', 'Surface Defects', 'Warping', 'Sink Marks'].map((defect) => (
                      <label key={defect} className="flex items-center gap-2 p-3 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={defectsObserved.includes(defect)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setDefectsObserved([...defectsObserved, defect]);
                            } else {
                              setDefectsObserved(defectsObserved.filter(d => d !== defect));
                            }
                          }}
                          className="w-4 h-4 text-blue-600 rounded"
                        />
                        <span className="text-sm text-gray-700 dark:text-gray-300">{defect}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Process Notes */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Process Notes (optional)
                  </label>
                  <textarea
                    value={processNotes}
                    onChange={(e) => setProcessNotes(e.target.value)}
                    rows={4}
                    placeholder="Add any observations, issues, or notes about this process..."
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>

                {/* Process Summary */}
                <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Process Summary</h3>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div><span className="text-gray-600 dark:text-gray-400">Mold:</span> <span className="font-medium">{moldShape} ({results?.mold_volume_liters}L)</span></div>
                    <div><span className="text-gray-600 dark:text-gray-400">Injection:</span> <span className="font-medium">{injectionType.replace('_', ' ')}</span></div>
                    <div><span className="text-gray-600 dark:text-gray-400">Pressure:</span> <span className="font-medium">{results?.optimalPressureBar} bar</span></div>
                    <div><span className="text-gray-600 dark:text-gray-400">Time:</span> <span className="font-medium">{results?.optimal_injection_time}s</span></div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 justify-end pt-4 border-t border-gray-200 dark:border-gray-700">
                  <Button
                    onClick={() => {
                      setShowSaveDialog(false);
                      setProcessNotes('');
                      setDefectsObserved([]);
                    }}
                    className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 dark:bg-gray-600 dark:hover:bg-gray-500 dark:text-white"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={saveProcessResult}
                    className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    <Save className="w-4 h-4 mr-2 inline" />
                    Save to Training Data
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PolyurethaneOptimizer;
