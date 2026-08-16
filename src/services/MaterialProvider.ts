/**
 * MaterialProvider - Abstraction layer for material data sources
 *
 * Allows decoupling of material data from application logic.
 * Can be swapped between CSV (current) and API (future) without changing code.
 */

export interface MaterialEnvironmentalProfile {
  /** Blowing agent as stated on the technical data sheet */
  blowing_agent: string
  /** GWP in kg CO₂-eq per kg, or null when the data sheet states no figure */
  gwp_per_kg: number | null
  /** True when the data sheet declares neither GWP nor ODP */
  is_eco_friendly: boolean
  /** True when the data sheet declares the product PFAS-free */
  pfas_free: boolean
}

export interface MaterialProperties {
  /** Material identifier */
  id: string
  /** Display name */
  name: string
  /** Mixed liquid viscosity in centiPoise (cP) at the reference temperature */
  viscosity_cp: number
  /** Mixed liquid density before foaming, in kg/m³ */
  density_kg_m3: number
  /** Temperature the component viscosities were measured at (°C) */
  reference_temp_c: number
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
  /** Density of the cured foam — not the liquid being pumped */
  final_density_kg_m3: number
  /** Environmental characteristics from the data sheet */
  environmental: MaterialEnvironmentalProfile
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

    // Every value comes from the CSV. A material missing a required property throws in
    // the loader rather than being filled in with a plausible-looking default — a guessed
    // viscosity is indistinguishable from a measured one once it reaches the physics.
    this.materials = presets.map(preset => ({
      id: preset.id,
      name: preset.name,
      viscosity_cp: preset.viscosity_cp,
      density_kg_m3: preset.density_kg_m3,
      reference_temp_c: preset.reference_temp_c,
      flow_index: preset.flow_index,
      activation_energy_j_mol: preset.activation_energy_j_mol,
      polyol_sg: preset.polyol_sg,
      iso_sg: preset.iso_sg,
      weight_ratio: preset.weight_ratio,
      final_density_kg_m3: preset.final_density_kg_m3,
      environmental: preset.environmental,
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
