import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from './card';
import { Input } from './input';
import { Button } from './button';
import { Alert, AlertTitle, AlertDescription } from './alert';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { initializePyodide, calculateParameters, calculateEnvironmentalImpact } from '../pyodide_loader';

// Import icons or use fallbacks if Lucide React is not available
let Icons;
try {
  // Try to import from lucide-react
  const LucideIcons = require('lucide-react');
  Icons = {
    Settings2: LucideIcons.Settings2,
    Thermometer: LucideIcons.Thermometer,
    FileSpreadsheet: LucideIcons.FileSpreadsheet,
    AlertTriangle: LucideIcons.AlertTriangle,
    Download: LucideIcons.Download,
    Leaf: LucideIcons.Leaf,
    Scale: LucideIcons.Scale,
  };
} catch (e) {
  // Fallback SVG icons
  Icons = {
    Settings2: (props) => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M20 7h-9"></path><path d="M14 17H5"></path><circle cx="17" cy="17" r="3"></circle><circle cx="7" cy="7" r="3"></circle></svg>,
    Thermometer: (props) => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M14 4v10.54a4 4 0 1 1-4 0V4a2 2 0 0 1 4 0Z"></path></svg>,
    FileSpreadsheet: (props) => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path><polyline points="14 2 14 8 20 8"></polyline><path d="M8 13h2"></path><path d="M8 17h2"></path><path d="M14 13h2"></path><path d="M14 17h2"></path></svg>,
    AlertTriangle: (props) => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"></path><path d="M12 9v4"></path><path d="M12 17h.01"></path></svg>,
    Download: (props) => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" x2="12" y1="15" y2="3"></line></svg>,
    Leaf: (props) => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.5 10-10 10Z"></path><path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"></path></svg>,
    Scale: (props) => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"></path><path d="m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"></path><path d="M7 21h10"></path><path d="M12 3v18"></path><path d="M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2"></path></svg>,
  };
}

// Input field component with unit display
const InputField = ({ label, unit, icon: Icon, ...props }) => (
  <div className="space-y-2">
    <label className="flex items-center text-sm font-medium text-gray-700 dark:text-gray-300">
      <Icon className="w-4 h-4 mr-2" />
      {label}
    </label>
    <div className="relative">
      <Input {...props} className="pl-3 pr-12" />
      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">
        {unit}
      </span>
    </div>
  </div>
);

// Result card component for displaying calculation results
const ResultCard = ({ title, value, unit, icon: Icon }) => (
  <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
    <h3 className="text-sm flex items-center font-medium text-gray-500 dark:text-gray-400">
      {Icon && <Icon className="w-4 h-4 mr-2" />}
      {title}
    </h3>
    <p className="mt-1 text-2xl font-semibold text-gray-900 dark:text-white">
      {value} <span className="text-sm font-normal text-gray-500">{unit}</span>
    </p>
  </div>
);

// Blowing agent data for environmental calculations
const BLOWING_AGENT_DATA = {
  HFC: { gwp: 1430, odp: 0, lambda: 0.022, cost: 4.50 },
  HCFC: { gwp: 725, odp: 0.07, lambda: 0.023, cost: 4.20 },
  Pentane: { gwp: 5, odp: 0, lambda: 0.024, cost: 3.80 },
  HFO: { gwp: 1, odp: 0, lambda: 0.022, cost: 5.20 },
  Ecomate: { gwp: 0, odp: 0, lambda: 0.019, cost: 3.95 }
};

const PolyurethaneOptimizer = () => {
  // State for form inputs
  const [inputs, setInputs] = useState({
    pipeLength: 100,
    pipeThickness: 20,
    temperature: 25,
    flowRate: 0.001,
    viscosity: 350,
    density: 1.12
  });

  // State for calculation results
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [pyodideReady, setPyodideReady] = useState(false);
  const [pyodideError, setPyodideError] = useState(false);
  
  // State for environmental impact
  const [environmentalImpact, setEnvironmentalImpact] = useState(null);
  const [alternativeAgent, setAlternativeAgent] = useState('HFC');
  const [annualConsumption, setAnnualConsumption] = useState(5000);
  
  // State for production logs
  const [productionLogs, setProductionLogs] = useState([]);

  // Initialize Pyodide when component mounts
  useEffect(() => {
    const initPyodide = async () => {
      try {
        console.log('Initializing Pyodide...');
        await initializePyodide();
        console.log('Pyodide initialization successful');
        setPyodideReady(true);
      } catch (err) {
        console.error('Failed to initialize Pyodide:', err);
        setPyodideError(true);
        // Set ready anyway so the UI doesn't get stuck
        setPyodideReady(true);
        setError('Warning: Python calculation engine could not be initialized. Using simplified calculations instead.');
      }
    };
    
    initPyodide();
    
    // Load saved logs from localStorage
    const savedLogs = localStorage.getItem('productionLogs');
    if (savedLogs) {
      try {
        setProductionLogs(JSON.parse(savedLogs));
      } catch (e) {
        console.error('Error loading saved logs:', e);
      }
    }
    
    // Load saved default parameters
    const savedDefaults = localStorage.getItem('defaultParameters');
    if (savedDefaults) {
      try {
        const defaults = JSON.parse(savedDefaults);
        setInputs(prev => ({
          ...prev,
          ...defaults
        }));
      } catch (e) {
        console.error('Error loading default parameters:', e);
      }
    }
  }, []);

  // Calculate results using fluid dynamics equations
  const calculateResults = async () => {
    setLoading(true);
    setError(null);

    try {
      // Validate inputs
      if (inputs.pipeLength < 50) {
        throw new Error("Pipe length must be at least 50mm");
      }
      if (inputs.pipeThickness <= 0) {
        throw new Error("Pipe thickness must be positive");
      }
      if (inputs.temperature < 5 || inputs.temperature > 40) {
        throw new Error("Temperature must be between 5°C and 40°C");
      }
      
      // Calculate parameters using Python
      const calculationResults = await calculateParameters(inputs);
      
      setResults(calculationResults);

      // Log the calculation to production logs
      const logEntry = {
        timestamp: new Date().toISOString(),
        pipeLength: inputs.pipeLength,
        pipeThickness: inputs.pipeThickness,
        temperature: inputs.temperature,
        pressure: calculationResults.required_pressure,
        viscosity: calculationResults.apparent_viscosity,
        shearRate: calculationResults.shear_rate,
        reynoldsNumber: calculationResults.reynolds_number
      };
      
      const updatedLogs = [...productionLogs, logEntry];
      setProductionLogs(updatedLogs);
      localStorage.setItem('productionLogs', JSON.stringify(updatedLogs));

      // Calculate environmental impact
      const envImpact = await calculateEnvironmentalImpact(alternativeAgent, annualConsumption);
      setEnvironmentalImpact(envImpact);
      
    } catch (err) {
      console.error('Calculation error:', err);
      setError(err.message || 'Error performing calculations');
    } finally {
      setLoading(false);
    }
  };
  
  // Handle input changes
  const handleInputChange = (field, value) => {
    setInputs(prev => ({
      ...prev,
      [field]: value
    }));
  };
  
  // Format pressure profile data for chart
  const getPressureProfileData = () => {
    if (!results) return [];
    return results.pressure_profile;
  };

  // Generate environmental comparison data
  const getEnvironmentalComparisonData = () => {
    if (!environmentalImpact) return [];
    
    const currentAgent = BLOWING_AGENT_DATA[alternativeAgent] || BLOWING_AGENT_DATA.HFC;
    
    return [
      {
        name: 'Global Warming Potential',
        Ecomate: 0,
        [alternativeAgent]: currentAgent.gwp
      },
      {
        name: 'Thermal Conductivity (W/m·K)',
        Ecomate: 0.019,
        [alternativeAgent]: currentAgent.lambda
      },
      {
        name: 'Ozone Depletion',
        Ecomate: 0,
        [alternativeAgent]: currentAgent.odp
      }
    ];
  };

  // Export calculation results as CSV
  const exportResults = () => {
    if (!results) return;
    
    const headers = ['Parameter', 'Value', 'Unit'];
    const data = [
      ['Required Pressure', results.required_pressure, 'kPa'],
      ['Apparent Viscosity', results.apparent_viscosity, 'Pa·s'],
      ['Shear Rate', results.shear_rate, 's⁻¹'],
      ['Reynolds Number', results.reynolds_number, ''],
      ['Flow Regime', results.flow_regime, ''],
      ['Optimal Injection Time', results.optimal_injection_time, 's'],
      ['Pipe Length', inputs.pipeLength, 'mm'],
      ['Pipe Thickness', inputs.pipeThickness, 'mm'],
      ['Temperature', inputs.temperature, '°C'],
      ['Flow Rate', inputs.flowRate, 'm³/s'],
      ['Material Viscosity', inputs.viscosity, 'cP'],
      ['Material Density', inputs.density, 'g/cm³']
    ];
    
    const csvContent = [
      headers.join(','),
      ...data.map(row => row.join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'polyurethane_calculation_results.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  // Save current parameters as default
  const saveAsDefaults = () => {
    localStorage.setItem('defaultParameters', JSON.stringify({
      pipeLength: inputs.pipeLength,
      pipeThickness: inputs.pipeThickness,
      temperature: inputs.temperature,
      flowRate: inputs.flowRate,
      viscosity: inputs.viscosity,
      density: inputs.density
    }));
    
    // Display temporary notification
    setError('Default parameters saved successfully!');
    setTimeout(() => setError(null), 3000);
  };

  // Demo mode warning when Pyodide failed to initialize
  const demoModeWarning = pyodideError && (
    <Alert className="my-4 bg-yellow-50 border-yellow-200 text-yellow-800">
      <Icons.AlertTriangle className="h-4 w-4" />
      <AlertTitle>Running in Demo Mode</AlertTitle>
      <AlertDescription>
        The Python calculation engine couldn't be initialized. 
        Using simplified calculations for demonstration purposes.
      </AlertDescription>
    </Alert>
  );

  return (
    <div className="w-full max-w-7xl mx-auto p-6 space-y-6">
      {demoModeWarning}
      
      <Card className="border-t-4 border-t-blue-500">
        <CardHeader>
          <CardTitle className="text-2xl flex items-center gap-2">
            <Icons.Settings2 className="w-6 h-6" />
            Polyurethane Injection Optimizer
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Input Panel */}
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                )}
                  </div>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Production Logs Section */}
      {productionLogs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Icons.FileSpreadsheet className="w-6 h-6" />
              Recent Production Logs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-800">
                    <th className="p-2 text-left">Timestamp</th>
                    <th className="p-2 text-left">Pipe Length</th>
                    <th className="p-2 text-left">Temperature</th>
                    <th className="p-2 text-left">Pressure</th>
                    <th className="p-2 text-left">Viscosity</th>
                    <th className="p-2 text-left">Reynolds</th>
                  </tr>
                </thead>
                <tbody>
                  {productionLogs.slice(-5).map((log, index) => (
                    <tr key={index} className="border-t">
                      <td className="p-2">{new Date(log.timestamp).toLocaleString()}</td>
                      <td className="p-2">{log.pipeLength} mm</td>
                      <td className="p-2">{log.temperature} °C</td>
                      <td className="p-2">{log.pressure} kPa</td>
                      <td className="p-2">{log.viscosity} Pa·s</td>
                      <td className="p-2">{log.reynoldsNumber}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-4 flex justify-end">
              <Button 
                variant="outline" 
                onClick={() => {
                  if (window.confirm('Clear all production logs?')) {
                    setProductionLogs([]);
                    localStorage.removeItem('productionLogs');
                  }
                }}
              >
                Clear Logs
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default PolyurethaneOptimizer;<InputField
                  label="Pipe Length"
                  unit="mm"
                  icon={Icons.Settings2}
                  type="number"
                  min="50"
                  value={inputs.pipeLength}
                  onChange={(e) => handleInputChange('pipeLength', Math.max(50, Number(e.target.value)))}
                />
                
                <InputField
                  label="Pipe Thickness"
                  unit="mm"
                  icon={Icons.Settings2}
                  type="number"
                  min="0.1"
                  step="0.1"
                  value={inputs.pipeThickness}
                  onChange={(e) => handleInputChange('pipeThickness', Math.max(0.1, Number(e.target.value)))}
                />

                <InputField
                  label="Temperature"
                  unit="°C"
                  icon={Icons.Thermometer}
                  type="number"
                  min="5"
                  max="40"
                  value={inputs.temperature}
                  onChange={(e) => handleInputChange('temperature', Number(e.target.value))}
                />

                <InputField
                  label="Flow Rate"
                  unit="L/s"
                  icon={Icons.FileSpreadsheet}
                  type="number"
                  min="0.0001"
                  step="0.0001"
                  value={inputs.flowRate}
                  onChange={(e) => handleInputChange('flowRate', Math.max(0.0001, Number(e.target.value)))}
                />

                <InputField
                  label="Initial Viscosity"
                  unit="cP"
                  icon={Icons.FileSpreadsheet}
                  type="number"
                  min="1"
                  value={inputs.viscosity}
                  onChange={(e) => handleInputChange('viscosity', Math.max(1, Number(e.target.value)))}
                />

                <InputField
                  label="Density"
                  unit="g/cm³"
                  icon={Icons.Scale}
                  type="number"
                  min="0.1"
                  step="0.01"
                  value={inputs.density}
                  onChange={(e) => handleInputChange('density', Math.max(0.1, Number(e.target.value)))}
                />
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-medium">Environmental Impact</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Current Blowing Agent</label>
                    <select 
                      className="w-full rounded-md border border-gray-300 p-2"
                      value={alternativeAgent}
                      onChange={(e) => setAlternativeAgent(e.target.value)}
                    >
                      <option value="HFC">HFC</option>
                      <option value="HCFC">HCFC</option>
                      <option value="Pentane">Pentane</option>
                      <option value="HFO">HFO</option>
                    </select>
                  </div>
                  
                  <InputField
                    label="Annual Consumption"
                    unit="kg"
                    icon={Icons.Leaf}
                    type="number"
                    min="1"
                    value={annualConsumption}
                    onChange={(e) => setAnnualConsumption(Math.max(1, Number(e.target.value)))}
                  />
                </div>
              </div>

              {error && (
                <Alert variant={error.includes('success') ? 'default' : 'destructive'}>
                  <Icons.AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Notice</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              
              <div className="flex flex-wrap gap-4">
                <Button 
                  className="flex-1 h-12 text-lg"
                  onClick={calculateResults}
                  disabled={loading}
                >
                  {loading ? (
                    <span className="flex items-center justify-center">
                      <svg className="animate-spin h-5 w-5 mr-3" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Calculating...
                    </span>
                  ) : 'Calculate Parameters'}
                </Button>
                
                <Button 
                  variant="outline"
                  onClick={saveAsDefaults}
                  className="h-12"
                >
                  Save as Defaults
                </Button>
                
                {results && (
                  <Button 
                    variant="outline"
                    onClick={exportResults}
                    className="h-12"
                  >
                    <Icons.Download className="w-5 h-5 mr-2" />
                    Export Results
                  </Button>
                )}
              </div>
            </div>

            {/* Results Panel */}
            {results && (
              <div className="space-y-6">
                {/* Pressure Profile Chart */}
                <div className="h-72 bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4">
                  <ResponsiveContainer>
                    <LineChart
                      data={getPressureProfileData()}
                      margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="distance"
                        label={{ value: 'Distance (mm)', position: 'bottom' }}
                      />
                      <YAxis 
                        label={{ 
                          value: 'Pressure (kPa)', 
                          angle: -90, 
                          position: 'left' 
                        }}
                      />
                      <Tooltip 
                        contentStyle={{
                          backgroundColor: 'rgba(255, 255, 255, 0.95)',
                          border: 'none',
                          borderRadius: '8px',
                          boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                        }}
                      />
                      <Legend />
                      <Line 
                        type="monotone" 
                        dataKey="pressure" 
                        name="Pressure"
                        stroke="#6366f1"
                        strokeWidth={2}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                
                {/* Result Cards */}
                <div className="grid grid-cols-2 gap-4">
                  <ResultCard
                    title="Required Injection Pressure"
                    value={results.required_pressure}
                    unit="kPa"
                    icon={Icons.Settings2}
                  />
                  <ResultCard
                    title="Optimal Injection Time"
                    value={results.optimal_injection_time}
                    unit="s"
                    icon={Icons.FileSpreadsheet}
                  />
                  <ResultCard
                    title="Apparent Viscosity"
                    value={results.apparent_viscosity}
                    unit="Pa·s"
                    icon={Icons.FileSpreadsheet}
                  />
                  <ResultCard
                    title="Reynolds Number"
                    value={results.reynolds_number}
                    unit=""
                    icon={Icons.FileSpreadsheet}
                  />
                </div>

                {/* Warnings */}
                {results.warnings && results.warnings.length > 0 && (
                  <Alert>
                    <Icons.AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Process Warnings</AlertTitle>
                    <AlertDescription>
                      <ul className="mt-2 list-disc pl-5 space-y-1">
                        {results.warnings.map((warning, index) => (
                          <li key={index}>{warning}</li>
                        ))}
                      </ul>
                    </AlertDescription>
                  </Alert>
                )}

                {/* Environmental Impact Section */}
                {environmentalImpact && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">Environmental Impact</h3>
                    <div className="grid grid-cols-3 gap-4">
                      <ResultCard
                        title="CO₂ Reduction"
                        value={environmentalImpact.co2_reduction}
                        unit="tonnes/year"
                        icon={Icons.Leaf}
                      />
                      <ResultCard
                        title="Thermal Efficiency"
                        value={`+${environmentalImpact.thermal_improvement}`}
                        unit="%"
                        icon={Icons.Thermometer}
                      />
                      <ResultCard
                        title="Cost Savings"
                        value={environmentalImpact.cost_savings}
                        unit="€/year"
                        icon={Icons.Download}
                      />
                    </div>

                    {/* Environmental Comparison Chart */}
                    <div className="h-64 bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4">
                      <ResponsiveContainer>
                        <BarChart
                          data={getEnvironmentalComparisonData()}
                          margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          <Bar dataKey="Ecomate" fill="#22c55e" />
                          <Bar dataKey={alternativeAgent} fill="#6366f1" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
