import type { ProcessParameters, CalculationResults } from '../calculator_types'

/**
 * Persistent record of every calculation, and of how the resulting part came out.
 *
 * This exists to accumulate the one thing the physics cannot supply: what actually happened.
 * A model trained on data generated from these equations can only reproduce them — the value
 * is in learning where they mislead, and that needs real shots with real outcomes.
 *
 * The app is a static site with no backend, so records live in this browser. `exportRecords`
 * and `importRecords` are what pool them across machines and people.
 *
 * The module this replaces (`training_data_storage.ts`) described an interface that no longer
 * existed — mould shapes, injection point counts, a `materialPreset` — and was imported by
 * nothing, so nothing had ever been saved.
 */

const STORAGE_KEY = 'pu_optimizer_shot_records'

/** Oldest records are dropped past this. localStorage is a few megabytes in most browsers. */
export const MAX_RECORDS = 2000

/** Current shape of a stored record, so an older export can be recognised on import. */
export const RECORD_SCHEMA_VERSION = 1

/**
 * How the part came out.
 *
 * `unrecorded` is the honest default and by far the most common state: a run is saved the
 * moment it is calculated, long before anyone can see the part. Only records carrying one of
 * the other values are training data.
 */
export type ShotOutcome =
  | 'unrecorded'
  | 'good'
  | 'voids'
  | 'short_shot'
  | 'scorch'
  | 'surface_defect'
  | 'other'

export const SHOT_OUTCOME_LABEL: Record<ShotOutcome, string> = {
  unrecorded: 'Not yet recorded',
  good: 'Good part',
  voids: 'Voids',
  short_shot: 'Short shot',
  scorch: 'Scorch / burn',
  surface_defect: 'Surface defect',
  other: 'Other problem',
}

export interface ShotRecord {
  id: string
  /** ISO 8601. A Date does not survive JSON, and these are compared across machines. */
  timestamp: string
  schema_version: number
  parameters: ProcessParameters
  results: CalculationResults
  outcome: ShotOutcome
  notes: string
}

/** A stored record is only training data once someone has said how the part came out. */
export const isLabelled = (record: ShotRecord): boolean =>
  record.outcome !== 'unrecorded'

function read(): ShotRecord[] {
  // Every accessor is guarded: private windows, cleared site data and browsers configured to
  // block storage all throw rather than returning empty, and none of them should take the
  // calculator down with them.
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as ShotRecord[]) : []
  } catch {
    return []
  }
}

function write(records: ShotRecord[]): boolean {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records.slice(0, MAX_RECORDS)))
    return true
  } catch {
    // Quota exceeded, or storage unavailable. The calculation itself still stands.
    return false
  }
}

/** Every stored record, newest first. */
export function getRecords(): ShotRecord[] {
  return read()
}

/** Records carrying an operator's verdict — the only ones a model can learn from. */
export function getLabelledRecords(): ShotRecord[] {
  return read().filter(isLabelled)
}

export function saveRecord(
  parameters: ProcessParameters,
  results: CalculationResults
): ShotRecord {
  const record: ShotRecord = {
    id:
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    timestamp: new Date().toISOString(),
    schema_version: RECORD_SCHEMA_VERSION,
    parameters,
    results,
    outcome: 'unrecorded',
    notes: '',
  }

  write([record, ...read()])
  return record
}

/** Record what the part did. This is the field the whole exercise depends on. */
export function setOutcome(id: string, outcome: ShotOutcome, notes = ''): boolean {
  const records = read()
  const index = records.findIndex(r => r.id === id)
  if (index === -1) return false

  records[index] = { ...records[index], outcome, notes }
  return write(records)
}

export function deleteRecord(id: string): boolean {
  return write(read().filter(r => r.id !== id))
}

export function clearRecords(): boolean {
  try {
    localStorage.removeItem(STORAGE_KEY)
    return true
  } catch {
    return false
  }
}

export interface ShotRecordExport {
  schema_version: number
  exported_at: string
  record_count: number
  records: ShotRecord[]
}

export function exportRecords(): ShotRecordExport {
  const records = read()
  return {
    schema_version: RECORD_SCHEMA_VERSION,
    exported_at: new Date().toISOString(),
    record_count: records.length,
    records,
  }
}

export interface ImportSummary {
  added: number
  duplicates: number
  rejected: number
}

/**
 * Merge a file exported from another browser.
 *
 * De-duplicated by id, so importing the same file twice is harmless — which matters, because
 * pooling by passing files around means the same records will be seen more than once. An
 * incoming record that already exists locally keeps the LOCAL copy: outcomes are recorded by
 * whoever saw the part, and an older export should not overwrite a verdict added since.
 */
export function importRecords(payload: unknown): ImportSummary {
  const summary: ImportSummary = { added: 0, duplicates: 0, rejected: 0 }

  const incoming = extractRecords(payload)
  if (incoming.length === 0) return summary

  const existing = read()
  const known = new Set(existing.map(r => r.id))
  const accepted: ShotRecord[] = []

  for (const candidate of incoming) {
    if (!isPlausibleRecord(candidate)) {
      summary.rejected++
      continue
    }
    if (known.has(candidate.id)) {
      summary.duplicates++
      continue
    }
    known.add(candidate.id)
    accepted.push(candidate)
    summary.added++
  }

  if (accepted.length > 0) {
    const merged = [...existing, ...accepted].sort((a, b) =>
      b.timestamp.localeCompare(a.timestamp)
    )
    write(merged)
  }

  return summary
}

function extractRecords(payload: unknown): unknown[] {
  if (Array.isArray(payload)) return payload
  if (payload && typeof payload === 'object' && 'records' in payload) {
    const records = (payload as { records: unknown }).records
    if (Array.isArray(records)) return records
  }
  return []
}

/**
 * Enough of a check to keep a wrong file from poisoning the dataset.
 *
 * Deliberately shallow: it confirms the record is shaped like one of ours rather than
 * validating the physics inside it, because a record exported by an older version of the app
 * is still worth keeping.
 */
function isPlausibleRecord(value: unknown): value is ShotRecord {
  if (!value || typeof value !== 'object') return false
  const record = value as Partial<ShotRecord>
  return (
    typeof record.id === 'string' &&
    record.id.length > 0 &&
    typeof record.timestamp === 'string' &&
    typeof record.outcome === 'string' &&
    record.outcome in SHOT_OUTCOME_LABEL &&
    !!record.parameters &&
    typeof record.parameters === 'object' &&
    !!record.results &&
    typeof record.results === 'object'
  )
}
