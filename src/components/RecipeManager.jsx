import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { useRecipeStore } from '../store/useRecipeStore';
import { FolderOpen, Save, Trash2 } from 'lucide-react';

/**
 * Recipe Manager Component
 * Allows users to save, load, and delete parameter configurations (recipes)
 * Uses Zustand with persistence to store recipes in localStorage
 */
export const RecipeManager = ({ currentInputs, onLoad }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [newRecipeName, setNewRecipeName] = useState('');
  const { savedRecipes, saveRecipe, deleteRecipe, loadRecipe } = useRecipeStore();

  const handleSave = () => {
    if (!newRecipeName.trim()) {
      alert('Please enter a recipe name');
      return;
    }
    saveRecipe(newRecipeName, currentInputs);
    setNewRecipeName('');
    alert(`Recipe "${newRecipeName}" saved successfully!`);
  };

  const handleLoad = (id) => {
    const recipe = loadRecipe(id);
    if (recipe) {
      onLoad(recipe.data);
      setIsOpen(false);
      alert(`Recipe "${recipe.name}" loaded successfully!`);
    }
  };

  const handleDelete = (id, name) => {
    if (window.confirm(`Are you sure you want to delete recipe "${name}"?`)) {
      deleteRecipe(id);
    }
  };

  return (
    <div className="relative">
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded text-cyan-400 text-xs font-mono transition-colors"
      >
        <FolderOpen size={14} />
        RECIPES
      </button>

      {/* The Modal / Dropdown */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 z-40"
            onClick={() => setIsOpen(false)}
          />

          {/* Modal Content */}
          <div className="absolute top-10 right-0 w-80 bg-slate-900 border border-slate-700 rounded-lg shadow-2xl z-50 p-4 animate-slideIn">
            <h3 className="text-slate-50 text-xs font-bold uppercase tracking-wider mb-4 border-b border-slate-800 pb-2 font-sans">
              Recipe Management
            </h3>

            {/* Save New Section */}
            <div className="flex gap-2 mb-6">
              <input
                type="text"
                placeholder="Recipe Name..."
                value={newRecipeName}
                onChange={(e) => setNewRecipeName(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') handleSave();
                }}
                className="flex-1 bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-slate-300 focus:border-cyan-500 outline-none font-sans"
              />
              <button
                onClick={handleSave}
                className="bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-500 p-1.5 rounded border border-cyan-500/30 transition-colors"
                title="Save current configuration"
              >
                <Save size={14} />
              </button>
            </div>

            {/* List Section */}
            <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar">
              {savedRecipes.length === 0 && (
                <div className="text-slate-600 text-xs text-center italic py-2 font-sans">
                  No saved recipes
                </div>
              )}

              {savedRecipes.map((recipe) => (
                <div
                  key={recipe.id}
                  className="group flex items-center justify-between bg-slate-950 p-2 rounded border border-slate-800 hover:border-slate-600 transition-colors"
                >
                  <div
                    onClick={() => handleLoad(recipe.id)}
                    className="cursor-pointer flex-1"
                  >
                    <div className="text-slate-300 text-xs font-bold font-sans">
                      {recipe.name}
                    </div>
                    <div className="text-slate-600 text-[10px] font-mono">
                      {new Date(recipe.timestamp).toLocaleDateString()} {new Date(recipe.timestamp).toLocaleTimeString()}
                    </div>
                  </div>

                  <button
                    onClick={() => handleDelete(recipe.id, recipe.name)}
                    className="text-slate-600 hover:text-rose-500 transition-colors p-1"
                    title="Delete recipe"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>

            {/* Close Button */}
            <button
              onClick={() => setIsOpen(false)}
              className="mt-4 w-full text-center text-xs text-slate-500 hover:text-slate-300 transition-colors font-sans"
            >
              Close
            </button>
          </div>
        </>
      )}
    </div>
  );
};

RecipeManager.propTypes = {
  currentInputs: PropTypes.object.isRequired,
  onLoad: PropTypes.func.isRequired,
};
