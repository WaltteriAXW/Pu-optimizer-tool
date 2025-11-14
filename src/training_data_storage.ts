/**
 * Training Data Storage Utility
 * Handles persistence of process optimization training data
 */

export interface ProcessEntry {
  id: string;
  timestamp: number;

  // Input parameters
  pipeLength: number;
  pipeDiameter: number;
  temperature: number;
  flowRate: number;
  viscosity: number;
  density: number;

  // Mold parameters
  moldShape: 'panel' | 'cylinder' | 'sphere' | 'custom';
  moldDimensions: Record<string, number>;
  injectionType: 'single_point' | 'two_point' | 'multi_point';
  numInjectionPoints?: number;

  // Machine and material
  machineType: string;
  materialPreset: string;

  // Calculated results
  optimalPressure: number;
  reynoldsNumber: number;
  injectionTime: number;
  moldVolume: number;

  // Quality feedback (user input)
  partQuality: 'good' | 'bad' | 'acceptable' | null;
  defectsObserved: string[];
  notes: string;
}

const STORAGE_KEY = 'pu_optimizer_training_data';
const MAX_ENTRIES = 1000; // Limit to prevent excessive storage use

/**
 * Get all training data entries from localStorage
 */
export function getTrainingData(): ProcessEntry[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return [];
    return JSON.parse(data);
  } catch (error) {
    console.error('Error loading training data:', error);
    return [];
  }
}

/**
 * Save a new process entry
 */
export function saveProcessEntry(entry: Omit<ProcessEntry, 'id' | 'timestamp'>): ProcessEntry {
  const newEntry: ProcessEntry = {
    ...entry,
    id: generateId(),
    timestamp: Date.now()
  };

  const existingData = getTrainingData();
  const updatedData = [newEntry, ...existingData].slice(0, MAX_ENTRIES);

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedData));
    return newEntry;
  } catch (error) {
    console.error('Error saving training data:', error);
    throw new Error('Failed to save training data');
  }
}

/**
 * Update quality feedback for an existing entry
 */
export function updateEntryQuality(
  id: string,
  quality: 'good' | 'bad' | 'acceptable',
  defects: string[],
  notes: string
): boolean {
  const data = getTrainingData();
  const index = data.findIndex(entry => entry.id === id);

  if (index === -1) return false;

  data[index] = {
    ...data[index],
    partQuality: quality,
    defectsObserved: defects,
    notes
  };

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    return true;
  } catch (error) {
    console.error('Error updating entry:', error);
    return false;
  }
}

/**
 * Get statistics about training data
 */
export function getTrainingStats() {
  const data = getTrainingData();
  const withQuality = data.filter(e => e.partQuality !== null);

  return {
    totalEntries: data.length,
    entriesWithQuality: withQuality.length,
    goodParts: withQuality.filter(e => e.partQuality === 'good').length,
    badParts: withQuality.filter(e => e.partQuality === 'bad').length,
    acceptableParts: withQuality.filter(e => e.partQuality === 'acceptable').length
  };
}

/**
 * Export training data as JSON
 */
export function exportTrainingData(): string {
  const data = getTrainingData();
  return JSON.stringify(data, null, 2);
}

/**
 * Import training data from JSON
 */
export function importTrainingData(jsonString: string): boolean {
  try {
    const data = JSON.parse(jsonString);
    if (!Array.isArray(data)) {
      throw new Error('Invalid data format');
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(data.slice(0, MAX_ENTRIES)));
    return true;
  } catch (error) {
    console.error('Error importing training data:', error);
    return false;
  }
}

/**
 * Clear all training data
 */
export function clearTrainingData(): boolean {
  try {
    localStorage.removeItem(STORAGE_KEY);
    return true;
  } catch (error) {
    console.error('Error clearing training data:', error);
    return false;
  }
}

/**
 * Generate a unique ID for entries
 */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Get entries for ML training (only those with quality feedback)
 */
export function getMLTrainingData(): ProcessEntry[] {
  return getTrainingData().filter(entry => entry.partQuality !== null);
}
