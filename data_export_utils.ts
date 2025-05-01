/**
 * Utilities for exporting calculation data and generating reports
 */

import { CalculationResults } from './calculatorTypes';

/**
 * Export calculation results to a CSV file
 * 
 * @param results - Calculation results
 * @param filename - Output filename
 */
export function exportToCsv(results: CalculationResults, filename: string = 'polyurethane_calculation_results.csv'): void {
  // Define the headers and rows for the CSV
  const headers = [
    'Parameter',
    'Value',
    'Unit'
  ];

  const rows = [
    ['Required Pressure', results.required_pressure.toString(), 'kPa'],
    ['Shear Rate', results.shear_rate.toString(), 's⁻¹'],
    ['Apparent Viscosity', results.apparent_viscosity.toString(), 'Pa·s'],
    ['Reynolds Number', results.reynolds_number.toString(), ''],
    ['Flow Regime', results.flow_regime, ''],
    ['Optimal Injection Time', results.optimal_injection_time.toString(), 's']
  ];

  // Add pressure profile data
  rows.push(['', '', '']);
  rows.push(['Pressure Profile', '', '']);
  rows.push(['Distance (mm)', 'Pressure (kPa)', '']);
  
  results.pressure_profile.forEach(point => {
    rows.push([point.distance.toString(), point.pressure.toString(), '']);
  });

  // Create CSV content
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.join(','))
  ].join('\n');

  // Create and download the file
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Generate a detailed report of calculation results
 * 
 * @param results - Calculation results
 * @returns Formatted report text
 */
export function generateReport(results: CalculationResults): string {
  const timestamp = new Date().toLocaleString();
  
  const warnings = results.warnings?.length 
    ? `\nWarnings:\n${results.warnings.map(w => `- ${w}`).join('\n')}`
    : '\nNo warnings - parameters are within optimal ranges.';
  
  return `Polyurethane Injection Analysis Report
Generated: ${timestamp}

Summary:
- Required Injection Pressure: ${results.required_pressure} kPa
- Optimal Injection Time: ${results.optimal_injection_time} s
- Flow Regime: ${results.flow_regime.charAt(0).toUpperCase() + results.flow_regime.slice(1)}
- Reynolds Number: ${results.reynolds_number}
- Apparent Viscosity: ${results.apparent_viscosity} Pa·s
- Shear Rate: ${results.shear_rate} s⁻¹
${warnings}

Flow Characteristics:
${results.flow_regime === 'laminar' 
  ? 'Laminar Flow - Flow is stable and predictable.'
  : 'Turbulent Flow - Flow may cause irregular cavity filling.'}

Pressure Profile:
${results.pressure_profile.map(point => 
  `Distance: ${point.distance.toFixed(1)} mm -> Pressure: ${point.pressure.toFixed(2)} kPa`
).join('\n')}

Notes:
- The pressure profile shows the pressure distribution along the pipe length.
- For ideal injection, maintain a steady injection rate to follow this pressure profile.
- If Reynolds number > 2300, consider reducing the flow rate to achieve laminar flow.
- For high viscosity materials, increased pressure or temperature may be required.

This report was generated using the Polyurethane Injection Optimizer tool.
Calculations are based on modified Hagen-Poiseuille equations for non-Newtonian fluids.`;
}

/**
 * Generate environmental impact report
 * 
 * @param environmentalImpact - Environmental impact data
 * @param agentType - Current blowing agent type
 * @param consumption - Annual consumption in kg
 * @returns Formatted report text
 */
export function generateEnvironmentalReport(
  environmentalImpact: any, 
  agentType: string, 
  consumption: number
): string {
  const timestamp = new Date().toLocaleString();
  
  const blowingAgentData = {
    "HFC": { gwp: 1430, odp: 0, lambda: 0.022 },
    "HCFC": { gwp: 725, odp: 0.07, lambda: 0.023 },
    "Pentane": { gwp: 5, odp: 0, lambda: 0.024 },
    "HFO": { gwp: 1, odp: 0, lambda: 0.022 },
    "Ecomate": { gwp: 0, odp: 0, lambda: 0.019 }
  };
  
  return `Environmental Impact Assessment Report
Generated: ${timestamp}

Baseline Data:
- Current Blowing Agent: ${agentType}
- Annual Consumption: ${consumption} kg
- Global Warming Potential (GWP): ${blowingAgentData[agentType].gwp}
- Ozone Depletion Potential (ODP): ${blowingAgentData[agentType].odp}
- Thermal Conductivity: ${blowingAgentData[agentType].lambda} W/m·K

Potential Impact of Switching to Ecomate:
- CO₂ Emissions Reduction: ${environmentalImpact.co2_reduction} tonnes/year
- Thermal Efficiency Improvement: ${environmentalImpact.thermal_improvement}%
- Cost Savings: €${environmentalImpact.cost_savings}/year
- ODP Reduction: ${environmentalImpact.odp_reduction.toFixed(4)} units

Key Environmental Benefits:
- Zero Global Warming Potential: Ecomate has no impact on climate change
- Zero Ozone Depletion: No contribution to stratospheric ozone depletion
- Superior Thermal Efficiency: Improved insulation performance by ${environmentalImpact.thermal_improvement}%
- Economic Advantage: Cost savings while improving environmental performance

Regulatory Compliance:
- Ecomate is compliant with the Montreal Protocol, Kyoto Protocol, and Paris Agreement
- EPA SNAP approved and VOC exempt
- Supports corporate sustainability initiatives and environmental reporting

This assessment was generated using the Polyurethane Injection Optimizer's
Environmental Impact Calculator.`;
}

/**
 * Export production logs to CSV
 * 
 * @param logs - Production log entries
 * @param filename - Output filename
 */
export function exportProductionLogs(logs: any[], filename: string = 'production_logs.csv'): void {
  if (logs.length === 0) return;
  
  const headers = [
    'Timestamp',
    'Pipe Length (mm)',
    'Pipe Thickness (mm)',
    'Temperature (°C)',
    'Pressure (kPa)',
    'Viscosity (Pa·s)',
    'Shear Rate (s⁻¹)',
    'Reynolds Number'
  ];

  const rows = logs.map(log => [
    new Date(log.timestamp).toLocaleString(),
    log.pipeLength,
    log.pipeThickness || 'N/A',
    log.temperature,
    log.pressure,
    log.viscosity,
    log.shearRate || 'N/A',
    log.reynoldsNumber
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.join(','))
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Generate a production analysis report
 * 
 * @param logs - Production log entries
 * @returns Formatted report text
 */
export function generateProductionReport(logs: any[]): string {
  if (logs.length === 0) return 'No production data available.';
  
  const timestamp = new Date().toLocaleString();
  
  // Calculate statistics
  const avgPressure = logs.reduce((sum, log) => sum + log.pressure, 0) / logs.length;
  const avgTemperature = logs.reduce((sum, log) => sum + log.temperature, 0) / logs.length;
  const avgViscosity = logs.reduce((sum, log) => sum + log.viscosity, 0) / logs.length;
  const avgReynolds = logs.reduce((sum, log) => sum + log.reynoldsNumber, 0) / logs.length;
  
  // Sort logs by timestamp (newest first) for display
  const sortedLogs = [...logs].sort((a, b) => 
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
  
  // Limit to 10 most recent logs for the report
  const recentLogs = sortedLogs.slice(0, 10);
  
  return `Production Analysis Report
Generated: ${timestamp}

Summary Statistics:
- Total Records: ${logs.length}
- Average Pressure: ${avgPressure.toFixed(2)} kPa
- Average Temperature: ${avgTemperature.toFixed(2)} °C
- Average Viscosity: ${avgViscosity.toFixed(4)} Pa·s
- Average Reynolds Number: ${avgReynolds.toFixed(2)}
- Flow Regime Analysis: ${avgReynolds < 2300 ? 'Mostly Laminar' : 'Mostly Turbulent'}

Recent Production Records:
${recentLogs.map((log, index) => `
Record #${index + 1} (${new Date(log.timestamp).toLocaleString()})
- Pipe Length: ${log.pipeLength} mm
${log.pipeThickness ? `- Pipe Thickness: ${log.pipeThickness} mm` : ''}
- Temperature: ${log.temperature} °C
- Pressure: ${log.pressure.toFixed(2)} kPa
- Viscosity: ${log.viscosity.toFixed(4)} Pa·s
- Reynolds Number: ${log.reynoldsNumber.toFixed(2)}
- Flow Regime: ${log.reynoldsNumber < 2300 ? 'Laminar' : 'Turbulent'}
-------------------`).join('\n')}

Process Recommendations:
${avgReynolds > 2300 ? 
  '- Consider reducing flow rate to achieve laminar flow for more consistent results' : 
  '- Current flow parameters are within optimal range for laminar flow'}
${avgViscosity > 1.0 ? 
  '- High average viscosity detected - consider increasing temperature or pressure' : 
  '- Material viscosity is within optimal processing range'}

This report was generated using the Polyurethane Injection Optimizer's Production Log tool.`;
}
