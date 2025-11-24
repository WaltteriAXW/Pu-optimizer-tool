import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Define the shape of a single recipe
export interface Recipe {
  id: string;
  name: string;
  timestamp: number;
  data: {
    // Input parameters
    pipeLength: number;
    pipeDiameter: number;
    temperature: number;
    flowRate: number;
    viscosity: number;
    density: number;
    specificGravity: number;
    // Machine and material selection
    selectedMachine?: string;
    selectedMaterial?: string;
    // Mold dimensions (optional)
    moldShape?: string;
    moldDimensions?: {
      length?: number;
      width?: number;
      height?: number;
      diameter?: number;
      cylinderHeight?: number;
      sphereDiameter?: number;
      wallThickness?: number;
    };
    moldVolume?: number;
  };
}

interface RecipeState {
  savedRecipes: Recipe[];
  saveRecipe: (name: string, currentInputs: Recipe['data']) => void;
  deleteRecipe: (id: string) => void;
  loadRecipe: (id: string) => Recipe | undefined;
  getAllRecipes: () => Recipe[];
}

export const useRecipeStore = create<RecipeState>()(
  persist(
    (set, get) => ({
      savedRecipes: [],

      saveRecipe: (name, currentInputs) => {
        const newRecipe: Recipe = {
          id: crypto.randomUUID(),
          name: name,
          timestamp: Date.now(),
          data: currentInputs,
        };
        set((state) => ({
          savedRecipes: [newRecipe, ...state.savedRecipes],
        }));
      },

      deleteRecipe: (id) => {
        set((state) => ({
          savedRecipes: state.savedRecipes.filter((r) => r.id !== id),
        }));
      },

      loadRecipe: (id) => {
        return get().savedRecipes.find((r) => r.id === id);
      },

      getAllRecipes: () => {
        return get().savedRecipes;
      },
    }),
    {
      name: 'pu-optimizer-recipes', // The key in localStorage
    }
  )
);
