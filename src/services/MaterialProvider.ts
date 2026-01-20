/**
 * MaterialProvider - Abstraction layer for material data sources
 *
 * Allows decoupling of material data from application logic.
 * Can be swapped between CSV (current) and API (future) without changing code.
 */

export interface MaterialProperties {
  /** Material identifier */
  id: string
  /** Display name */
  name: string
  /** Viscosity in centiPoise (cP) at reference temperature */
  viscosity_cp: number
  /** Density in kg/m³ */
  density_kg_m3: number
  /** Flow behavior index (0-1, where 1 = Newtonian) */
  flow_index: number
  /** Activation energy in J/mol */
  activation_energy_j_mol: number
  /** Specific gravity of polyol component */
  polyol_sg: number
  /** Specific gravity of isocyanate component */
  iso_sg: number
  /** Weight mixing ratio [polyol, isocyanate] */
  weight_ratio: [number, number]
  /** Foam density after cure */
  final_density_kg_m3: number
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
 * Loads materials from CSV file (current implementation)
 */
export class CSVMaterialProvider implements IMaterialProvider {
  private materials: MaterialProperties[] = []
  private loaded = false

  constructor() {
    // Will be loaded on first use
  }

  private async ensureLoaded(): Promise<void> {
    if (this.loaded) {
      return
    }

    // Import the database loader
    const { getAllMaterialPresets } = await import('@/utils/database_loader')
    const presets = await getAllMaterialPresets()

    // Convert presets to MaterialProperties format
    // Note: Using defaults for properties not in CSV; these can be enhanced later
    this.materials = presets.map((preset: any) => ({
      id: preset.id,
      name: preset.name,
      viscosity_cp: preset.viscosity || 350,
      density_kg_m3: preset.density || 1120,
      flow_index: preset.flow_index || 0.85, // Default to typical value
      activation_energy_j_mol: preset.activation_energy_j_mol || 25000, // Default typical value
      polyol_sg: preset.polyolSG || 1.12,
      iso_sg: preset.isoSG || 1.23,
      weight_ratio: (preset.weightRatio || [100, 110]) as [number, number],
      final_density_kg_m3: preset.final_density_kg_m3 || 32
    }))

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
