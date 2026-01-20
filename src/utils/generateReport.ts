import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import html2canvas from 'html2canvas'

interface InputData {
  pipeLength: number
  pipeDiameter: number
  temperature: number
  flowRate: number
  viscosity: number
  density: number
  specificGravity?: number
  selectedMachine?: string
  selectedMaterial?: string
}

interface ResultData {
  optimalPressureBar?: number
  pressureDropBar?: number
  reynoldsNumber?: number
  flowRegime?: string
  velocity?: number
  shearRate?: number
  injectionTime?: number
  moldVolume?: number
  moldShape?: string
  compatible?: boolean
  machine?: {
    name?: string
    manufacturer?: string
    maxPressure?: number
  }
}

/**
 * Generates a professional, multi-page PDF report for PU injection molding optimization
 * with embedded charts, data tables, and compliance features.
 *
 * @param inputs - Input parameters used for calculation
 * @param results - Calculated optimization results
 * @param chartElement - Optional React component element to capture as chart image
 */
export const generateReport = async (
  inputs: InputData,
  results: ResultData,
  chartElement?: HTMLElement
): Promise<void> => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  })

  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 15
  let yPos = margin

  // ============================================
  // PAGE 1: TITLE & EXECUTIVE SUMMARY
  // ============================================

  addHeader(doc, pageWidth)
  yPos = 50

  // Title
  doc.setFontSize(24)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(15, 23, 42)
  doc.text('PU-OPTIMIZER REPORT', margin, yPos)
  yPos += 15

  // Report metadata
  doc.setFontSize(10)
  doc.setFont('courier', 'normal')
  doc.setTextColor(100, 100, 100)
  const reportId = generateReportId()
  doc.text(`Report ID: ${reportId}`, margin, yPos)
  yPos += 6
  doc.text(`Generated: ${new Date().toLocaleString()}`, margin, yPos)
  yPos += 6
  doc.text(`Tool Version: v2.1.0-alpha`, margin, yPos)
  yPos += 15

  // Executive Summary Box
  doc.setFillColor(240, 253, 250)
  doc.setDrawColor(6, 182, 212)
  doc.setLineWidth(0.5)
  doc.rect(margin, yPos, pageWidth - 2 * margin, 45, 'F')
  doc.rect(margin, yPos, pageWidth - 2 * margin, 45)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.setTextColor(6, 182, 212)
  doc.text('EXECUTIVE SUMMARY', margin + 5, yPos + 7)

  doc.setFont('courier', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(0, 0, 0)

  const summaryText = [
    `Required Pressure: ${results.optimalPressureBar?.toFixed(2) || 'N/A'} bar`,
    `Flow Regime: ${results.flowRegime || 'N/A'}`,
    `Machine Compatibility: ${results.compatible ? '✓ Compatible' : '✗ Not Compatible'}`,
    `Flow Velocity: ${results.velocity?.toFixed(3) || 'N/A'} m/s`
  ]

  summaryText.forEach((text, idx) => {
    doc.text(text, margin + 5, yPos + 14 + idx * 6)
  })

  yPos += 55

  // Input Parameters Table
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(0, 0, 0)
  doc.text('INPUT PARAMETERS', margin, yPos)
  yPos += 8

  const inputTableData = [
    ['Parameter', 'Value', 'Unit'],
    ['Pipe Length', inputs.pipeLength.toFixed(1), 'mm'],
    ['Pipe Diameter', inputs.pipeDiameter.toFixed(1), 'mm'],
    ['Temperature', inputs.temperature.toFixed(1), '°C'],
    ['Flow Rate', inputs.flowRate.toFixed(2), 'L/min'],
    ['Viscosity', inputs.viscosity.toFixed(1), 'cP'],
    ['Density', inputs.density.toFixed(1), 'kg/m³'],
    ...(inputs.selectedMaterial ? [['Material', inputs.selectedMaterial, '']] : []),
    ...(inputs.selectedMachine ? [['Machine', inputs.selectedMachine, '']] : [])
  ]

  autoTable(doc, {
    head: [inputTableData[0]],
    body: inputTableData.slice(1),
    startY: yPos,
    margin: margin,
    theme: 'grid',
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 10
    },
    bodyStyles: {
      fontSize: 9,
      cellPadding: 3
    },
    alternateRowStyles: {
      fillColor: [245, 248, 250]
    }
  })

  yPos = (doc as any).lastAutoTable.finalY + 10

  // Add page break if needed
  if (yPos > pageHeight - 50) {
    doc.addPage()
    yPos = margin
    addHeader(doc, pageWidth)
    yPos += 10
  }

  // ============================================
  // CALCULATION RESULTS TABLE
  // ============================================

  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(0, 0, 0)
  doc.text('CALCULATION RESULTS', margin, yPos)
  yPos += 8

  const resultTableData = [
    ['Metric', 'Value', 'Unit'],
    ['Base Pressure Drop', results.pressureDropBar?.toFixed(2) || 'N/A', 'bar'],
    ['Optimal Pressure', results.optimalPressureBar?.toFixed(2) || 'N/A', 'bar'],
    ['Reynolds Number', results.reynoldsNumber?.toFixed(1) || 'N/A', '—'],
    ['Flow Velocity', results.velocity?.toFixed(4) || 'N/A', 'm/s'],
    ['Shear Rate', results.shearRate?.toFixed(1) || 'N/A', 's⁻¹'],
    ['Injection Time', results.injectionTime?.toFixed(2) || 'N/A', 's'],
    ['Flow Classification', results.flowRegime || 'N/A', '—']
  ]

  autoTable(doc, {
    head: [resultTableData[0]],
    body: resultTableData.slice(1),
    startY: yPos,
    margin: margin,
    theme: 'grid',
    headStyles: {
      fillColor: [6, 182, 212],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 10
    },
    bodyStyles: {
      fontSize: 9,
      cellPadding: 3
    },
    alternateRowStyles: {
      fillColor: [245, 248, 250]
    }
  })

  yPos = (doc as any).lastAutoTable.finalY + 10

  // ============================================
  // EMBEDDED CHART PAGE (if provided)
  // ============================================

  if (chartElement) {
    if (yPos > pageHeight - 100) {
      doc.addPage()
      yPos = margin
      addHeader(doc, pageWidth)
      yPos += 10
    }

    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(0, 0, 0)
    doc.text('PRESSURE PROFILE CHART', margin, yPos)
    yPos += 8

    try {
      const canvas = await html2canvas(chartElement, {
        scale: 2,
        backgroundColor: '#ffffff',
        useCORS: true,
        logging: false
      })

      const chartImage = canvas.toDataURL('image/png')
      const chartWidth = pageWidth - 2 * margin
      const chartHeight = (canvas.height / canvas.width) * chartWidth

      // Ensure chart fits on page
      if (yPos + chartHeight > pageHeight - margin) {
        doc.addPage()
        yPos = margin
        addHeader(doc, pageWidth)
        yPos += 10
      }

      doc.addImage(chartImage, 'PNG', margin, yPos, chartWidth, chartHeight)
      yPos += chartHeight + 10
    } catch (error) {
      console.error('Failed to capture chart:', error)
      doc.setTextColor(220, 38, 38)
      doc.text('Chart capture failed', margin, yPos)
      yPos += 10
    }
  }

  // ============================================
  // MACHINE COMPATIBILITY PAGE
  // ============================================

  if (yPos > pageHeight - 80) {
    doc.addPage()
    yPos = margin
    addHeader(doc, pageWidth)
    yPos += 10
  }

  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(0, 0, 0)
  doc.text('MACHINE COMPATIBILITY', margin, yPos)
  yPos += 8

  // Compatibility Status Badge
  const statusColor = results.compatible ? [34, 197, 94] : [239, 68, 68] // green or red
  doc.setFillColor(statusColor[0], statusColor[1], statusColor[2])
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.rect(margin, yPos, 60, 10, 'F')
  doc.text(results.compatible ? '✓ COMPATIBLE' : '✗ INCOMPATIBLE', margin + 3, yPos + 7)

  doc.setTextColor(0, 0, 0)
  doc.setFont('courier', 'normal')
  doc.setFontSize(10)
  yPos += 15

  if (results.machine) {
    const machineTableData = [
      ['Specification', 'Value'],
      ['Machine Name', results.machine.name || 'N/A'],
      ['Manufacturer', results.machine.manufacturer || 'N/A'],
      ['Max Pressure', `${results.machine.maxPressure || 'N/A'} bar`],
      ['Required Pressure', `${results.optimalPressureBar?.toFixed(2) || 'N/A'} bar`],
      ['Headroom', `${Math.max(0, (results.machine.maxPressure || 0) - (results.optimalPressureBar || 0)).toFixed(2)} bar`]
    ]

    autoTable(doc, {
      head: [machineTableData[0]],
      body: machineTableData.slice(1),
      startY: yPos,
      margin: margin,
      theme: 'grid',
      headStyles: {
        fillColor: [15, 23, 42],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 10
      },
      bodyStyles: {
        fontSize: 9,
        cellPadding: 3
      },
      alternateRowStyles: {
        fillColor: [245, 248, 250]
      }
    })

    yPos = (doc as any).lastAutoTable.finalY + 10
  }

  // ============================================
  // FOOTER PAGE (Signatures & Compliance)
  // ============================================

  if (yPos > pageHeight - 80) {
    doc.addPage()
  }

  const footerY = pageHeight - 60

  // Signature lines
  doc.setLineWidth(0.3)
  doc.setDrawColor(150, 150, 150)

  doc.line(margin, footerY, margin + 40, footerY)
  doc.line(pageWidth - margin - 40, footerY, pageWidth - margin, footerY)

  doc.setFontSize(8)
  doc.setTextColor(100, 100, 100)
  doc.text('Operator Signature', margin, footerY + 5)
  doc.text('QA Approval / Date', pageWidth - margin - 40, footerY + 5)

  // Disclaimer
  doc.setFontSize(7)
  doc.setTextColor(150, 150, 150)
  doc.text('This report is computer-generated and provided for reference only.', margin, pageHeight - 15)
  doc.text('Results are based on input parameters and material properties. Professional verification is recommended.', margin, pageHeight - 10)
  doc.text(`PU-Optimizer Tool v2.1.0 | Report ID: ${reportId}`, margin, pageHeight - 5)

  // ============================================
  // SAVE PDF
  // ============================================

  const fileName = `PU_Report_${reportId}_${new Date().toISOString().split('T')[0]}.pdf`
  doc.save(fileName)
}

/**
 * Add consistent header to each page
 */
function addHeader(doc: jsPDF, pageWidth: number): void {
  doc.setFillColor(15, 23, 42)
  doc.rect(0, 0, pageWidth, 12, 'F')

  doc.setTextColor(6, 182, 212)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.text('PU-OPTIMIZER | Professional Report', 5, 8)
}

/**
 * Generate a unique report ID
 */
function generateReportId(): string {
  const timestamp = Date.now().toString(36).toUpperCase()
  const random = Math.random().toString(36).substring(2, 5).toUpperCase()
  return `${timestamp}-${random}`
}

/**
 * Convenience export wrapper with improved types
 */
export const generateProfessionalReport = generateReport
