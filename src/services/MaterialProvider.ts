/**
 * MaterialProvider - the list of materials the UI offers
 *
 * This supplies the material dropdown. It deliberately carries no physical properties:
 * those are derived on the Python side, in src/core/data/material_database.py, from the
 * same CSV this reads. Keeping the mixing formulas in one language means the two halves
 * of the application cannot drift apart.
 */

export interface MaterialProperties {
  /** Material identifier — the Material_Key column, and what the calculation is keyed on */
  id: string
  /** Display name */
  name: string
}

/**
 * Interface for material providers
 * Implementations can load from CSV, API, database, etc.
 */
export interface IMaterialProvider {
  /**
   * Get all available materials
   */
  getAll(): Promise<MaterialProperties[]>

  /**
   * Get a specific material by ID
   * @param id Material identifier
   */
  getById(id: string): Promise<MaterialProperties | undefined>

  /**
   * Get a material by name
   * @param name Display name
   */
  getByName(name: string): Promise<MaterialProperties | undefined>

  /**
   * List all available material IDs
   */
  listIds(): Promise<string[]>

  /**
   * List all available material names
   */
  listNames(): Promise<string[]>
}

/**
 * CSV-based material provider
 * Loads materials from the bundled material database
 */
export class CSVMaterialProvider implements IMaterialProvider {
  private materials: MaterialProperties[] = []
  private loaded = false

  private async ensureLoaded(): Promise<void> {
    if (this.loaded) {
      return
    }

    const { getAllMaterialPresets } = await import('@/utils/database_loader')
    this.materials = await getAllMaterialPresets()
    this.loaded = true
  }

  async getAll(): Promise<MaterialProperties[]> {
    await this.ensureLoaded()
    return this.materials
  }

  async getById(id: string): Promise<MaterialProperties | undefined> {
    await this.ensureLoaded()
    return this.materials.find(m => m.id === id)
  }

  async getByName(name: string): Promise<MaterialProperties | undefined> {
    await this.ensureLoaded()
    return this.materials.find(m => m.name.toLowerCase() === name.toLowerCase())
  }

  async listIds(): Promise<string[]> {
    await this.ensureLoaded()
    return this.materials.map(m => m.id)
  }

  async listNames(): Promise<string[]> {
    await this.ensureLoaded()
    return this.materials.map(m => m.name)
  }
}

/**
 * API-based material provider (future implementation)
 * Will load materials from a remote API endpoint
 */
export class APIMaterialProvider implements IMaterialProvider {
  private apiUrl: string
  private materials: MaterialProperties[] = []
  private loaded = false

  constructor(apiUrl: string = '/api/materials') {
    this.apiUrl = apiUrl
  }

  private async ensureLoaded(): Promise<void> {
    if (this.loaded) {
      return
    }

    try {
      const response = await fetch(this.apiUrl)
      if (!response.ok) {
        throw new Error(`API returned ${response.status}`)
      }
      this.materials = await response.json()
      this.loaded = true
    } catch (error) {
      console.error('Failed to load materials from API:', error)
      throw error
    }
  }

  async getAll(): Promise<MaterialProperties[]> {
    await this.ensureLoaded()
    return this.materials
  }

  async getById(id: string): Promise<MaterialProperties | undefined> {
    await this.ensureLoaded()
    return this.materials.find(m => m.id === id)
  }

  async getByName(name: string): Promise<MaterialProperties | undefined> {
    await this.ensureLoaded()
    return this.materials.find(m => m.name.toLowerCase() === name.toLowerCase())
  }

  async listIds(): Promise<string[]> {
    await this.ensureLoaded()
    return this.materials.map(m => m.id)
  }

  async listNames(): Promise<string[]> {
    await this.ensureLoaded()
    return this.materials.map(m => m.name)
  }
}

/**
 * Factory function to create a material provider
 * @param type 'csv' for CSV provider, 'api' for API provider
 * @param apiUrl Optional API URL if using API provider
 */
export function createMaterialProvider(
  type: 'csv' | 'api' = 'csv',
  apiUrl?: string
): IMaterialProvider {
  if (type === 'api') {
    return new APIMaterialProvider(apiUrl)
  }
  return new CSVMaterialProvider()
}

/**
 * Singleton instance for application-wide use
 */
let defaultProvider: IMaterialProvider | null = null

export function getDefaultMaterialProvider(): IMaterialProvider {
  if (!defaultProvider) {
    defaultProvider = createMaterialProvider('csv')
  }
  return defaultProvider
}

export function setDefaultMaterialProvider(provider: IMaterialProvider): void {
  defaultProvider = provider
}
