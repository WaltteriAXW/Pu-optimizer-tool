/**
 * Material database loader tests.
 *
 * These pin down the two properties the database depends on: a malformed row is refused
 * rather than silently shifting every column after it, and a material can be added by
 * appending a row with no code change.
 */

import { describe, it, expect } from 'vitest'
import { parseCSV, getAllMaterialPresets, deriveMaterialPhysics } from '@/utils/database_loader'
import { readFileSync } from 'node:fs'

const CSV_PATH = 'src/data/polyurethane_foam_database.csv'

describe('CSV integrity', () => {
  it('rejects a row with the wrong field count, naming the product', () => {
    const good = readFileSync(CSV_PATH, 'utf8')
    const header = good.split('\n')[0]
    const broken = `${header}\nnew_key,Broken Product,too,few,fields`
    expect(() => parseCSV(broken)).toThrow(/Broken Product.*5 fields.*header has 62/s)
  })

  it('rejects a row with no Material_Key', () => {
    const header = readFileSync(CSV_PATH, 'utf8').split('\n')[0]
    const cols = header.split(',').length
    const row = ['', 'Nameless Product', ...Array(cols - 2).fill('')].join(',')
    expect(() => parseCSV(`${header}\n${row}`)).toThrow(/Nameless Product.*Material_Key/s)
  })
})

describe('adding a polyol requires only a CSV row', () => {
  it('picks up an appended row with sane derived physics', async () => {
    const original = readFileSync(CSV_PATH, 'utf8')
    const header = original.trim().split('\n')[0].split(',')

    // Build a new material by copying the Genfoam HD12 row and changing only the
    // fields a real new product would differ in.
    const hd12 = original.trim().split('\n')[1].split(',')
    const row = [...hd12]
    row[header.indexOf('Material_Key')] = 'test_new_polyol'
    row[header.indexOf('Product_Name')] = 'Test New Polyol'
    row[header.indexOf('Polyol_Viscosity_cP')] = '600'
    row[header.indexOf('Isocyanate_Viscosity_cP')] = '150'
    row[header.indexOf('Flow_Index')] = '0.9'
    row[header.indexOf('Activation_Energy_J_mol')] = '27000'

    const parsed = parseCSV(`${original.trim()}\n${row.join(',')}`)
    const added = parsed.find(p => p.Material_Key === 'test_new_polyol')!
    expect(added).toBeDefined()

    const physics = deriveMaterialPhysics(added)
    expect(physics.density_kg_m3).toBeGreaterThan(900)
    expect(physics.density_kg_m3).toBeLessThan(1300)
    // Blended viscosity must lie between the two component viscosities
    expect(physics.viscosity_cp).toBeGreaterThan(150)
    expect(physics.viscosity_cp).toBeLessThan(600)
    expect(physics.flow_index).toBe(0.9)
    expect(physics.activation_energy_j_mol).toBe(27000)
  })

  it('exposes every shipped material through the provider path', async () => {
    const presets = await getAllMaterialPresets()
    expect(presets.map(p => p.id)).toEqual([
      'genfoam_hd12', 'genfoam_hd20', 'ecomate_spray', 'ecofoam_xhd_rc',
    ])
    for (const p of presets) {
      expect(p.density_kg_m3).toBeGreaterThan(900)
      expect(p.density_kg_m3).toBeLessThan(1300)
      expect(p.viscosity_cp).toBeGreaterThan(0)
      expect(p.flow_index).toBeGreaterThan(0)
      expect(p.flow_index).toBeLessThanOrEqual(1)
    }
  })
})
