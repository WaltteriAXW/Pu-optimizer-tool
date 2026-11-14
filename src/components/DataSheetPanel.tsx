import { useId, useRef, useState } from 'react'
import { FilePdf, XCircle } from '@phosphor-icons/react'
import { useCalculator } from '../context/CalculatorContext'
import { readDataSheetPdf, ScannedPdfError, SCAN_MESSAGE } from '@/services/dataSheetReader'
import type { DataSheetReading, DataSheetViscosity } from '@/calculator_types'

/**
 * "Fill from a data sheet (PDF)": reads the sheet in the browser, shows every value it found
 * with the exact line it came from and "Not found" for the rest, and fills the form only when
 * the user presses "Use these values". Nothing calculates by itself.
 */
export function DataSheetPanel({ onUse }: { onUse: (reading: DataSheetReading) => void }) {
  const { readDataSheet, isReady } = useCalculator()
  const fileRef = useRef<HTMLInputElement>(null)
  const [state, setState] = useState<
    | { status: 'idle' }
    | { status: 'reading'; fileName: string }
    | { status: 'error'; message: string }
    | { status: 'review'; fileName: string; reading: DataSheetReading }
  >({ status: 'idle' })
  const titleId = useId()

  const pick = async (file: File | undefined) => {
    if (!file) return
    setState({ status: 'reading', fileName: file.name })
    try {
      const rows = await readDataSheetPdf(file)
      const reading = await readDataSheet(rows)
      setState({ status: 'review', fileName: file.name, reading })
    } catch (e) {
      setState({
        status: 'error',
        message:
          e instanceof ScannedPdfError
            ? SCAN_MESSAGE
            : "The tool couldn't read this PDF. Enter the values by hand.",
      })
    } finally {
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  return (
    <div className="space-y-3">
      <input
        ref={fileRef}
        type="file"
        accept="application/pdf,.pdf"
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        data-testid="data-sheet-file"
        onChange={(e) => pick(e.target.files?.[0])}
      />
      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        disabled={!isReady || state.status === 'reading'}
        className="button-secondary inline-flex min-h-[44px] w-full items-center justify-center gap-2"
      >
        <FilePdf aria-hidden="true" className="h-5 w-5" />
        {state.status === 'reading' ? 'Reading the data sheet…' : 'Fill from a data sheet (PDF)'}
      </button>

      {state.status === 'error' && (
        <div role="alert" className="flex items-start gap-1.5 text-sm font-medium text-danger">
          <XCircle aria-hidden="true" className="mt-0.5 h-4 w-4 flex-shrink-0" />
          {state.message}
        </div>
      )}

      {state.status === 'review' && (
        <section
          aria-labelledby={titleId}
          data-testid="data-sheet-review"
          className="space-y-3 rounded-field border border-line-strong bg-surface p-3"
        >
          <h4 id={titleId} className="text-sm font-semibold text-ink">
            Found in {state.fileName}
          </h4>
          <p className="text-sm text-ink-2">
            Check each value against the line it came from. Nothing is filled in until you press
            "Use these values", and you can still edit them after.
          </p>
          <FoundList reading={state.reading} />
          <CombinedList reading={state.reading} />
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                onUse(state.reading)
                setState({ status: 'idle' })
              }}
              className="button-primary min-h-[44px]"
            >
              Use these values
            </button>
            <button
              type="button"
              onClick={() => setState({ status: 'idle' })}
              className="button-plain min-h-[44px]"
            >
              Cancel
            </button>
          </div>
        </section>
      )}
    </div>
  )
}

const formatNumber = (value: number, digits = 1) =>
  value.toLocaleString('en-GB', { maximumFractionDigits: digits })

function viscosityText(reading: DataSheetViscosity) {
  const at = typeof reading.temp_c === 'number' ? ` at ${formatNumber(reading.temp_c)} °C` : ', temperature not stated'
  const written = reading.display.includes('–') || reading.display.includes('±')
    ? ` (sheet: ${reading.display}, using ${formatNumber(reading.value_cp)})`
    : ''
  return `${formatNumber(reading.value_cp)} cP${at}${written}`
}

/** Each value as found, the exact line it came from, or "Not found" */
function FoundList({ reading }: { reading: DataSheetReading }) {
  const { found } = reading
  const rows: Array<{ label: string; values: Array<{ text: string; line: string }> }> = [
    {
      label: 'Product name',
      values: found.product_name ? [{ text: found.product_name.value, line: found.product_name.line }] : [],
    },
    {
      label: 'Polyol viscosity',
      values: (found.polyol_viscosity ?? []).map((r) => ({ text: viscosityText(r), line: r.line })),
    },
    {
      label: 'Isocyanate viscosity',
      values: (found.iso_viscosity ?? []).map((r) => ({ text: viscosityText(r), line: r.line })),
    },
    {
      label: 'Polyol specific gravity',
      values: found.polyol_specific_gravity
        ? [{
            text: `${found.polyol_specific_gravity.value}${found.polyol_specific_gravity.from_density ? ` (from a density of ${found.polyol_specific_gravity.display})` : ''}`,
            line: found.polyol_specific_gravity.line,
          }]
        : [],
    },
    {
      label: 'Isocyanate specific gravity',
      values: found.iso_specific_gravity
        ? [{
            text: `${found.iso_specific_gravity.value}${found.iso_specific_gravity.from_density ? ` (from a density of ${found.iso_specific_gravity.display})` : ''}`,
            line: found.iso_specific_gravity.line,
          }]
        : [],
    },
    {
      label: 'Mix ratio',
      values: (found.mix_ratio ?? []).map((r) => ({
        text: `${formatNumber(r.polyol, 2)} polyol : ${formatNumber(r.iso, 2)} isocyanate${r.basis ? ` by ${r.basis}` : ', basis not stated'}`,
        line: r.line,
      })),
    },
  ]

  return (
    <dl className="divide-y divide-line" data-testid="data-sheet-found">
      {rows.map(({ label, values }) => (
        <div key={label} className="py-2">
          <dt className="text-sm font-semibold text-ink">{label}</dt>
          {values.length === 0 ? (
            <dd className="text-sm text-danger">Not found</dd>
          ) : (
            values.map((value, i) => (
              <dd key={i} className="mt-0.5">
                <span className="text-sm text-ink">{value.text}</span>
                <span className="mt-0.5 block break-words rounded-field bg-canvas px-2 py-1 font-mono text-xs text-ink-2">
                  {value.line}
                </span>
              </dd>
            ))
          )}
        </div>
      ))}
    </dl>
  )
}

/** What the form would get, combined exactly as the catalogue combines its two components */
function CombinedList({ reading }: { reading: DataSheetReading }) {
  const c = reading.combined
  const items: Array<[string, string]> = [
    [
      'Viscosity (mixed)',
      typeof c.viscosity_cp === 'number'
        ? `${formatNumber(c.viscosity_cp)} cP${typeof c.reference_temp_c === 'number' ? ` at ${formatNumber(c.reference_temp_c)} °C` : ''}`
        : 'Not found',
    ],
    ['Density (mixed)', typeof c.density_kg_m3 === 'number' ? `${formatNumber(c.density_kg_m3)} kg/m³` : 'Not found'],
    ['Flow index', `${c.flow_index} (Typical value)`],
    [
      'Activation energy',
      c.activation_energy_source === 'data_sheet'
        ? `${formatNumber(c.activation_energy_j_mol, 0)} J/mol (Calculated from the data sheet)`
        : `${formatNumber(c.activation_energy_j_mol, 0)} J/mol (Typical value)`,
    ],
  ]
  return (
    <div className="space-y-1" data-testid="data-sheet-combined">
      <h5 className="text-sm font-semibold text-ink">The form will get</h5>
      <dl className="space-y-1">
        {items.map(([label, value]) => (
          <div key={label} className="flex justify-between gap-3 text-sm">
            <dt className="text-ink-2">{label}</dt>
            <dd className={`text-right font-medium ${value === 'Not found' ? 'text-danger' : 'text-ink'}`}>{value}</dd>
          </div>
        ))}
      </dl>
      {c.notes.length > 0 && (
        <ul className="list-disc space-y-0.5 pl-5 text-sm text-ink-2">
          {c.notes.map((note) => <li key={note}>{note}</li>)}
        </ul>
      )}
    </div>
  )
}
