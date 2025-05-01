import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { Settings2, Thermometer, FileSpreadsheet, AlertTriangle, Download, Leaf, Scale } from 'lucide-react';

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

// Constants for blowing agent data
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
  
  // State for environmental impact
  const [environmentalImpact, setEnvironmentalImpact] = useState(null);
  const [alternativeAgent, setAlternativeAgent] = useState('HFC');
  const [annualConsumption, setAnnualConsumption] = useState(5000);
  
  // State for production logs
  const [productionLogs, setProductionLogs] = useState([]);

  // Simulate Python environment initialization
  useEffect(() => {
    const timer = setTimeout(() => {
      setPyodideReady(true);
    }, 2000);
    
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
    
    return () => clearTimeout(timer);
  }, []);

  // Calculate results using fluid dynamics equations
  const calculateResults = async () => {
    if (!pyodideReady) {
      setError('Python environment is not ready yet. Please wait a moment and try again.');
      return;
    }
    
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
      
      // Simulate calculation delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Convert units
      const radius = inputs.pipeThickness / 2000; // mm to m
      const length = inputs.pipeLength / 1000; // mm to m
      
      // Material properties
      const activationEnergy = 50000; // J/mol
      const gasConstant = 8.314; // J/(mol·K)
      const powerLawIndex = 0.85; // Dimensionless
      
      // Calculate temperature factor (Arrhenius equation)
      const tempK = inputs.temperature + 273.15; // Convert to Kelvin
      const refTempK = 25 + 273.15; // 25°C reference in Kelvin
      const tempFactor = Math.exp((activationEnergy / gasConstant) * (1/tempK - 1/refTempK));
      
      // Calculate shear rate
      const shearRate = (4 * inputs.flowRate) / (Math.PI * Math.pow(radius, 3));
      
      // Calculate apparent viscosity with Power Law model
      const viscosityPas = (inputs.viscosity * 0.001) * tempFactor * Math.pow(shearRate, powerLawIndex - 1);
      
      // Calculate Reynolds number
      const velocity = inputs.flowRate / (Math.PI * Math.pow(radius, 2));
      const densityKgM3 = inputs.density * 1000; // g/cm³ to kg/m³
      const reynolds = (2 * radius * velocity * densityKgM3) / viscosityPas;
      
      // Calculate pressure drop using modified Hagen-Poiseuille for Power Law fluid
      const n = powerLawIndex;
      const pressureDrop = ((8 * viscosityPas * length * inputs.flowRate) / 
                        (Math.PI * Math.pow(radius, 4))) * ((3*n + 1)/(4*n));
      
      // Generate pressure profile
      const numPoints = 20;
      const pressureProfile = Array.from({length: numPoints}, (_, i) => {
        const distance = (i * inputs.pipeLength) / (numPoints - 1); // in mm
        const pressure = (pressureDrop/1000) * (1 - distance/inputs.pipeLength); // in kPa
        return { 
          distance: parseFloat(distance.toFixed(1)), 
          pressure: parseFloat(pressure.toFixed(2)) 
        };
      });
      
      // Calculate optimal injection time
      const pipeVolume = Math.PI * Math.pow(radius, 2) * length; // m³
      const injectionTime = pipeVolume / inputs.flowRate; // seconds
      
      // Generate warnings
      const warnings = [];
      if (reynolds > 2300) warnings.push("Flow is turbulent - consider reducing flow rate");
      if (shearRate > 1000) warnings.push("High shear rate may affect material properties");
      if (viscosityPas > 1.0) warnings.push("High viscosity may require increased pressure");
      
      const calculationResults = {
        required_pressure: parseFloat((pressureDrop/1000).toFixed(2)), // Convert to kPa
        shear_rate: parseFloat(shearRate.toFixed(2)),
        apparent_viscosity: parseFloat(viscosityPas.toFixed(4)),
        reynolds_number: parseFloat(reynolds.toFixed(2)),
        optimal_injection_time: parseFloat(injectionTime.toFixed(2)),
        pressure_profile: pressureProfile,
        flow_regime: reynolds < 2300 ? 'laminar' : 'turbulent',
        warnings
      };
      
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
      const currentAgent = BLOWING_AGENT_DATA[alternativeAgent];
      const ecomate = BLOWING_AGENT_DATA.Ecomate;
      
      const co2Reduction = (currentAgent.gwp * annualConsumption) / 1000; // tons
      const thermalImprovement = ((currentAgent.lambda - ecomate.lambda) / currentAgent.lambda) * 100; // percentage
      const costSavings = (currentAgent.cost - ecomate.cost) * annualConsumption; // currency
      
      setEnvironmentalImpact({
        co2_reduction: parseFloat(co2Reduction.toFixed(2)),
        thermal_improvement: parseFloat(thermalImprovement.toFixed(2)),
        cost_savings: parseFloat(costSavings.toFixed(2)),
        odp_reduction: currentAgent.odp * annualConsumption
      });
      
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
    
    const agentData = {
      'HFC': { gwp: 1430, lambda: 0.022 },
      'HCFC': { gwp: 725, lambda: 0.023 },
      'Pentane': { gwp: 5, lambda: 0.024 },
      'HFO': { gwp: 1, lambda: 0.022 }
    };
    
    return [
      {
        name: 'Global Warming Potential',
        Ecomate: 0,
        [alternativeAgent]: agentData[alternativeAgent].gwp
      },
      {
        name: 'Thermal Conductivity (W/m·K)',
        Ecomate: 0.019,
        [alternativeAgent]: agentData[alternativeAgent].lambda
      },
      {
        name: 'Ozone Depletion',
        Ecomate: 0,
        [alternativeAgent]: environmentalImpact.odp_reduction
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

  return (
    <div className="w-full max-w-7xl mx-auto p-6 space-y-6">
      <Card className="border-t-4 border-t-blue-500">
        <CardHeader>
          <CardTitle className="text-2xl flex items-center gap-2">
            <Settings2 className="w-6 h-6" />
            Polyurethane Injection Optimizer
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Input Panel */}
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <InputField
                  label="Pipe Length"
                  unit="mm"
                  icon={Settings2}
                  type="number"
                  min="50"
                  value={inputs.pipeLength}
                  onChange={(e) => handleInputChange('pipeLength', Math.max(50, Number(e.target.value)))}
                />
                
                <InputField
                  label="Pipe Thickness"
                  unit="mm"
                  icon={Settings2}
                  type="number"
                  min="0.1"
                  step="0.1"
                  value={inputs.pipeThickness}
                  onChange={(e) => handleInputChange('pipeThickness', Math.max(0.1, Number(e.target.value)))}
                />

                <InputField
                  label="Temperature"
                  unit="°C"
                  icon={Thermometer}
                  type="number"
                  min="5"
                  max="40"
                  value={inputs.temperature}
                  onChange={(e) => handleInputChange('temperature', Number(e.target.value))}
                />

                <InputField
                  label="Flow Rate"
                  unit="L/s"
                  icon={FileSpreadsheet}
                  type="number"
                  min="0.0001"
                  step="0.0001"
                  value={inputs.flowRate}
                  onChange={(e) => handleInputChange('flowRate', Math.max(0.0001, Number(e.target.value)))}
                />

                <InputField
                  label="Initial Viscosity"
                  unit="cP"
                  icon={FileSpreadsheet}
                  type="number"
                  min="1"
                  value={inputs.viscosity}
                  onChange={(e) => handleInputChange('viscosity', Math.max(1, Number(e.target.value)))}
                />

                <InputField
                  label="Density"
                  unit="g/cm³"
                  icon={Scale}
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
                    icon={Leaf}
                    type="number"
                    min="1"
                    value={annualConsumption}
                    onChange={(e) => setAnnualConsumption(Math.max(1, Number(e.target.value)))}
                  />
                </div>
              </div>

              {!pyodideReady && !error && (
                <Alert className="bg-blue-50 dark:bg-blue-900/20 border-blue-200">
                  <div className="flex items-center">
                    <div className="animate-spin mr-2 h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                    <AlertDescription className="text-blue-800 dark:text-blue-200">
                      Initializing calculation environment...
                    </AlertDescription>
                  </div>
                </Alert>
              )}

              {error && (
                <Alert variant={error.includes('successfully') ? 'default' : 'destructive'}>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>{error.includes('successfully') ? 'Success' : 'Error'}</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              
              <div className="flex space-x-4">
                <Button 
                  className="flex-1 h-12 text-lg"
                  onClick={calculateResults}
                  disabled={loading || !pyodideReady}
                >
                  {loading ? (
                    <span className="flex items-center justify-center">
                      <svg className="animate-spin h-5 w-5 mr-3" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Optimizing...
                    </span>
                  ) : 'Calculate Optimal Parameters'}
                </Button>
                
                <Button 
                  variant="outline" 
                  onClick={saveAsDefaults}
                  disabled={loading}
                  className="h-12"
                >
                  Save as Default
                </Button>
                
                {results && (
                  <Button 
                    variant="outline"
                    onClick={exportResults}
                    className="h-12"
                  >
                    <Download className="w-5 h-5 mr-2" />
                    Export
                  </Button>
                )}
              </div>
            </div>

            {/* Results Panel */}
            {results && (
              <div className="space-y-6">
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
                
                <div className="grid grid-cols-2 gap-4">
                  <ResultCard
                    title="Required Injection Pressure"
                    value={results.required_pressure}
                    unit="kPa"
                    icon={Settings2}
                  />
                  <ResultCard
                    title="Optimal Injection Time"
                    value={results.optimal_injection_time}
                    unit="s"
                    icon={FileSpreadsheet}
                  />
                  <ResultCard
                    title="Apparent Viscosity"
                    value={results.apparent_viscosity}
                    unit="Pa·s"
                    icon={FileSpreadsheet}
                  />
                  <ResultCard
                    title="Reynolds Number"
                    value={results.reynolds_number}
                    unit=""
                    icon={FileSpreadsheet}
                  />
                </div>

                {results.warnings.length > 0 && (
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
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

                {environmentalImpact && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">Environmental Impact</h3>
                    <div className="grid grid-cols-3 gap-4">
                      <ResultCard
                        title="CO₂ Reduction"
                        value={environmentalImpact.co2_reduction}
                        unit="tonnes/year"
                        icon={Leaf}
                      />
                      <ResultCard
                        title="Thermal Efficiency"
                        value={`+${environmentalImpact.thermal_improvement}`}
                        unit="%"
                        icon={Thermometer}
                      />
                      <ResultCard
                        title="Cost Savings"
                        value={environmentalImpact.cost_savings}
                        unit="€"
                        icon={Download}
                      />
                    </div>

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
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Recent Production Logs */}
      {productionLogs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileSpreadsheet className="w-6 h-6" />
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
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default PolyurethaneOptimizer;
