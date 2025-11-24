import jsPDF from 'jspdf';

interface InputData {
  pipeLength: number;
  pipeDiameter: number;
  temperature: number;
  flowRate: number;
  viscosity: number;
  density: number;
  specificGravity?: number;
  selectedMachine?: string;
  selectedMaterial?: string;
}

interface ResultData {
  optimalPressureBar?: number;
  pressureDropBar?: number;
  reynoldsNumber?: number;
  flowRegime?: string;
  velocity?: number;
  shearRate?: number;
  injectionTime?: number;
  moldVolume?: number;
  moldShape?: string;
  compatible?: boolean;
  machine?: {
    name?: string;
    manufacturer?: string;
    maxPressure?: number;
  };
}

/**
 * Generates a professional PDF report for PU injection molding optimization
 * @param inputs - Input parameters used for calculation
 * @param results - Calculated optimization results
 */
export const generateReport = (inputs: InputData, results: ResultData): void => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();

  // -- HEADER --
  doc.setFillColor(15, 23, 42); // Slate-900 color (Header bar)
  doc.rect(0, 0, pageWidth, 40, 'F');

  doc.setTextColor(6, 182, 212); // Cyan-400 (Accent)
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text("PU-OPTIMIZER REPORT", 20, 20);

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.setFont('courier', 'normal');
  const reportId = crypto.randomUUID().slice(0, 8).toUpperCase();
  doc.text(`ID: ${reportId}`, 20, 30);
  doc.text(`DATE: ${new Date().toLocaleString()}`, pageWidth - 80, 20);
  doc.text(`TIME: ${new Date().toLocaleTimeString()}`, pageWidth - 80, 27);

  // -- SECTION: INPUT PARAMETERS --
  let yPos = 60;
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text("MACHINE SETTINGS", 20, 50);
  doc.setLineWidth(0.5);
  doc.line(20, 52, pageWidth - 20, 52);

  doc.setFont('courier', 'normal');
  doc.setFontSize(11);

  // Machine and Material Info
  if (inputs.selectedMachine) {
    doc.text(`MACHINE:`, 20, yPos);
    doc.text(`${inputs.selectedMachine}`, 100, yPos);
    yPos += 8;
  }

  if (inputs.selectedMaterial) {
    doc.text(`MATERIAL:`, 20, yPos);
    doc.text(`${inputs.selectedMaterial}`, 100, yPos);
    yPos += 8;
  }

  yPos += 5;

  // Process Parameters
  doc.text(`PIPE LENGTH:`, 20, yPos);
  doc.text(`${inputs.pipeLength} mm`, 100, yPos);
  yPos += 8;

  doc.text(`PIPE DIAMETER:`, 20, yPos);
  doc.text(`${inputs.pipeDiameter} mm`, 100, yPos);
  yPos += 8;

  doc.text(`TEMPERATURE:`, 20, yPos);
  doc.text(`${inputs.temperature} °C`, 100, yPos);
  yPos += 8;

  doc.text(`FLOW RATE:`, 20, yPos);
  doc.text(`${inputs.flowRate} L/min`, 100, yPos);
  yPos += 8;

  doc.text(`VISCOSITY:`, 20, yPos);
  doc.text(`${inputs.viscosity} cP`, 100, yPos);
  yPos += 8;

  doc.text(`DENSITY:`, 20, yPos);
  doc.text(`${inputs.density} kg/m³`, 100, yPos);
  yPos += 8;

  // -- SECTION: OPTIMIZATION RESULTS --
  yPos += 20;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text("OPTIMIZATION OUTPUT", 20, yPos);
  doc.line(20, yPos + 2, pageWidth - 20, yPos + 2);

  yPos += 10;

  // Compatibility Status
  if (results.compatible !== undefined) {
    const statusColor = results.compatible ? [52, 211, 153] : [244, 63, 94]; // emerald or rose
    doc.setFillColor(statusColor[0], statusColor[1], statusColor[2], 0.1);
    doc.rect(20, yPos - 5, pageWidth - 40, 12, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(statusColor[0], statusColor[1], statusColor[2]);
    const status = results.compatible ? '✓ MACHINE COMPATIBLE' : '✗ MACHINE NOT COMPATIBLE';
    doc.text(status, 30, yPos + 2);
    yPos += 18;
  }

  // Results box
  doc.setFillColor(240, 253, 250); // Light Cyan background
  doc.rect(20, yPos - 5, pageWidth - 40, 70, 'F');
  doc.setDrawColor(6, 182, 212);
  doc.setLineWidth(1);
  doc.rect(20, yPos - 5, pageWidth - 40, 70);

  doc.setFont('courier', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(0, 0, 0);

  if (results && results.optimalPressureBar !== undefined) {
    doc.text(`REQUIRED PRESSURE:`, 30, yPos);
    doc.setTextColor(6, 182, 212);
    doc.text(`${results.optimalPressureBar.toFixed(2)} bar`, 110, yPos);
    doc.setTextColor(0, 0, 0);
    yPos += 10;

    if (results.pressureDropBar !== undefined) {
      doc.text(`PRESSURE DROP:`, 30, yPos);
      doc.text(`${results.pressureDropBar.toFixed(2)} bar`, 110, yPos);
      yPos += 10;
    }

    if (results.flowRegime) {
      doc.text(`FLOW REGIME:`, 30, yPos);
      doc.text(`${results.flowRegime}`, 110, yPos);
      yPos += 10;
    }

    if (results.reynoldsNumber !== undefined) {
      doc.text(`REYNOLDS NUMBER:`, 30, yPos);
      doc.text(`${results.reynoldsNumber.toFixed(1)}`, 110, yPos);
      yPos += 10;
    }

    if (results.velocity !== undefined) {
      doc.text(`FLOW VELOCITY:`, 30, yPos);
      doc.text(`${results.velocity.toFixed(3)} m/s`, 110, yPos);
      yPos += 10;
    }

    if (results.injectionTime !== undefined) {
      doc.text(`INJECTION TIME:`, 30, yPos);
      doc.text(`${results.injectionTime.toFixed(2)} s`, 110, yPos);
      yPos += 10;
    }
  } else {
    doc.text("NO OPTIMIZATION DATA AVAILABLE", 30, yPos);
    yPos += 10;
  }

  // Machine Info
  if (results.machine) {
    yPos += 15;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text("MACHINE SPECIFICATIONS", 20, yPos);
    yPos += 8;

    doc.setFont('courier', 'normal');
    doc.setFontSize(10);

    if (results.machine.name) {
      doc.text(`Name: ${results.machine.name}`, 30, yPos);
      yPos += 7;
    }

    if (results.machine.manufacturer) {
      doc.text(`Manufacturer: ${results.machine.manufacturer}`, 30, yPos);
      yPos += 7;
    }

    if (results.machine.maxPressure) {
      doc.text(`Max Pressure: ${results.machine.maxPressure} bar`, 30, yPos);
      yPos += 7;
    }
  }

  // Mold Information
  if (results.moldVolume && results.moldVolume > 0) {
    yPos += 10;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text("MOLD INFORMATION", 20, yPos);
    yPos += 8;

    doc.setFont('courier', 'normal');
    doc.setFontSize(10);

    doc.text(`Mold Volume: ${results.moldVolume.toFixed(3)} L`, 30, yPos);
    yPos += 7;

    if (results.moldShape) {
      doc.text(`Mold Shape: ${results.moldShape}`, 30, yPos);
      yPos += 7;
    }
  }

  // -- FOOTER: SIGNATURE --
  const bottomY = 250;
  doc.setDrawColor(100, 100, 100);
  doc.line(20, bottomY, 100, bottomY); // Line for Operator
  doc.line(120, bottomY, pageWidth - 20, bottomY); // Line for QA

  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.text("OPERATOR SIGNATURE", 20, bottomY + 5);
  doc.text("QA APPROVAL / DATE", 120, bottomY + 5);

  // Disclaimer
  doc.setFontSize(7);
  doc.setTextColor(150, 150, 150);
  doc.text("This report is computer-generated and provided for reference only.", 20, 280);
  doc.text("PU-Optimizer Tool - Professional Edition", 20, 285);

  // Save File
  const fileName = `PU_Report_${new Date().toISOString().split('T')[0]}_${reportId}.pdf`;
  doc.save(fileName);
};
