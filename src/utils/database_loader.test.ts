/**
 * Material database loader tests.
 *
 * TypeScript's remaining job is to parse the CSV and expose the material list the
 * dropdown shows. These pin down that a malformed row is refused rather than silently
 * shifting every column after it, and that a material added to the CSV appears in the UI
 * with no code change.
 *
 * The derived physics is Python's responsibility and is tested in
 * src/core/data/test_material_database.py.
 */

import { describe, it, expect } from 'vitest'
import { parseCSV, getAllMaterialPresets } from '@/utils/database_loader'
import { readFileSync } from 'node:fs'

const CSV_PATH = 'src/data/polyurethane_foam_database.csv'
const csvText = () => readFileSync(CSV_PATH, 'utf8')
const header = () => csvText().trim().split('\n')[0]

describe('CSV integrity', () => {
  it('rejects a row with the wrong field count, naming the product', () => {
    // Derived from the file, not hardcoded — adding a column should not break this test
    const columns = header().split(',').length
    const broken = `${header()}\nnew_key,Broken Product,too,few,fields`
    expect(() => parseCSV(broken)).toThrow(
      new RegExp(`Broken Product.*5 fields.*header has ${columns}`, 's')
    )
  })

  it('rejects a row with no Material_Key', () => {
    const columns = header().split(',').length
    const row = ['', 'Nameless Product', ...Array(columns - 2).fill('')].join(',')
    expect(() => parseCSV(`${header()}\n${row}`)).toThrow(/Nameless Product.*Material_Key/s)
  })

  it('keeps quoted commas inside a single field', () => {
    const products = parseCSV(csvText())
    const hd12 = products.find(p => p.Material_Key === 'genfoam_hd12')!
    expect(hd12.Notes).toContain('High and low pressure machines,')
  })
})

describe('the material list shown in the UI', () => {
  it('offers every material in the CSV, in file order', async () => {
    const presets = await getAllMaterialPresets()
    expect(presets).toEqual([
      { id: 'genfoam_hd12', name: 'Genfoam HD12' },
      { id: 'genfoam_hd20', name: 'Genfoam HD20' },
      { id: 'ecomate_spray', name: 'Ecomate Spray EC' },
      { id: 'ecofoam_xhd_rc', name: 'Ecofoam XHD RC' },
    ])
  })

  it('picks up a material appended to the CSV with no code change', () => {
    const original = csvText().trim()
    const columns = original.split('\n')[0].split(',')
    const row = [...original.split('\n')[1].split(',')]
    row[columns.indexOf('Material_Key')] = 'test_new_polyol'
    row[columns.indexOf('Product_Name')] = 'Test New Polyol'

    const parsed = parseCSV(`${original}\n${row.join(',')}`)
    const added = parsed.find(p => p.Material_Key === 'test_new_polyol')

    expect(added).toBeDefined()
    expect(added!.Product_Name).toBe('Test New Polyol')
  })
})
