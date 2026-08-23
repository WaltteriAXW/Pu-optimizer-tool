/**
 * MaterialProvider - the list of materials the UI offers
 *
 * This supplies the material dropdown. It deliberately carries no physical properties:
 * those are derived on the Python side, in src/core/data/material_database.py, from the
 * same CSV this reads. Keeping the mixing formulas in one language means the two halves
 * of the application cannot drift apart.
 *
 * The provider used to expose getById, getByName, listIds and listNames across an
 * interface with a second, unreachable API-backed implementation — six methods and a
 * factory for the one method the application calls. The app is a static site with no
 * backend to fetch materials from, so the abstraction described a flexibility it did not
 * have. What remains is what the dropdown needs.
 */

export interface MaterialProperties {
  /** Material identifier — the Material_Key column, and what the calculation is keyed on */
  id: string
  /** Display name */
  name: string
}

/**
 * Loads the material list from the bundled database CSV.
 *
 * The CSV is parsed once and held; the dropdown asks for the list on every mount.
 */
export class CSVMaterialProvider {
  private materials: MaterialProperties[] = []
  private loaded = false

  async getAll(): Promise<MaterialProperties[]> {
    if (!this.loaded) {
      const { getAllMaterialPresets } = await import('@/utils/database_loader')
      this.materials = await getAllMaterialPresets()
      this.loaded = true
    }
    return this.materials
  }
}

/**
 * Singleton instance for application-wide use, so the CSV is parsed once per session
 * rather than once per component that asks for the list.
 */
let defaultProvider: CSVMaterialProvider | null = null

export function getDefaultMaterialProvider(): CSVMaterialProvider {
  if (!defaultProvider) {
    defaultProvider = new CSVMaterialProvider()
  }
  return defaultProvider
}
