/**
 * Quick Setup Component
 *
 * Streamlined interface for quickly configuring calculations using database presets.
 * Allows users to select standard pipes and molds, with auto-suggestions.
 */

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../card';
import { Button } from '../button';
import { Zap, Settings2, Square, Lightbulb, ArrowRight } from 'lucide-react';
import { PipeSelector } from './PipeSelector';
import { MoldSelector } from './MoldSelector';
import {
  loadPipeDatabase,
  loadMoldDatabase,
  suggestPipeForMold,
  getRecommendedMolds,
  calculateMaterialRequirements
} from '../utils/dimensionsDatabaseLoader';

/**
 * Quick Setup Component
 *
 * @param {Object} props
 * @param {Function} props.onApplyConfiguration - Callback with selected configuration
 * @param {boolean} props.isOpen - Whether quick setup is visible
 * @param {Function} props.onClose - Callback to close quick setup
 */
export function QuickSetup({ onApplyConfiguration, isOpen = true, onClose }) {
  const [pipeDatabase, setPipeDatabase] = useState([]);
  const [moldDatabase, setMoldDatabase] = useState([]);
  const [selectedPipe, setSelectedPipe] = useState(null);
  const [selectedMold, setSelectedMold] = useState(null);
  const [showPipeSelector, setShowPipeSelector] = useState(false);
  const [showMoldSelector, setShowMoldSelector] = useState(false);
  const [loading, setLoading] = useState(true);
  const [recommendedMolds, setRecommendedMolds] = useState([]);

  // Load databases on mount
  useEffect(() => {
    async function loadDatabases() {
      setLoading(true);
      try {
        const [pipes, molds] = await Promise.all([
          loadPipeDatabase(),
          loadMoldDatabase()
        ]);
        setPipeDatabase(pipes);
        setMoldDatabase(molds);
        setRecommendedMolds(getRecommendedMolds(molds, 6));
      } catch (error) {
        console.error('Failed to load databases:', error);
      } finally {
        setLoading(false);
      }
    }
    loadDatabases();
  }, []);

  // Auto-suggest pipe when mold is selected
  useEffect(() => {
    if (selectedMold && pipeDatabase.length > 0 && !selectedPipe) {
      const suggestedPipe = suggestPipeForMold(pipeDatabase, selectedMold);
      if (suggestedPipe) {
        setSelectedPipe(suggestedPipe);
      }
    }
  }, [selectedMold, pipeDatabase, selectedPipe]);

  const handleSelectMold = (mold) => {
    setSelectedMold(mold);
    setShowMoldSelector(false);
    // Clear pipe selection to trigger auto-suggestion
    setSelectedPipe(null);
  };

  const handleApply = () => {
    if (!selectedPipe && !selectedMold) return;

    const config = {};

    // Apply pipe configuration
    if (selectedPipe) {
      config.pipeDiameter = selectedPipe.inner_diameter_mm;
      config.pipeLength = selectedPipe.length_mm;
    }

    // Apply mold configuration
    if (selectedMold) {
      config.moldVolume = selectedMold.volume_liters;
      config.moldShape = selectedMold.shape.toLowerCase();

      // Save the full mold object for production planning
      config.selectedMold = selectedMold;

      // Set mold dimensions
      if (selectedMold.shape === 'Rectangular') {
        config.moldDimensions = {
          length: selectedMold.length_mm,
          width: selectedMold.width_mm,
          height: selectedMold.height_thickness_mm
        };
      } else if (selectedMold.shape === 'Cylindrical') {
        config.moldDimensions = {
          diameter: selectedMold.diameter_mm,
          height: selectedMold.height_thickness_mm,
          wallThickness: selectedMold.wall_thickness_mm
        };
      } else if (selectedMold.shape === 'Spherical') {
        config.moldDimensions = {
          diameter: selectedMold.diameter_mm,
          wallThickness: selectedMold.wall_thickness_mm
        };
      }

      // Material requirements
      config.materialInfo = calculateMaterialRequirements(selectedMold, 1);
    }

    onApplyConfiguration(config);
    if (onClose) onClose();
  };

  if (!isOpen) return null;

  if (loading) {
    return (
      <Card className="mb-6">
        <CardContent className="p-8 text-center">
          <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-3"></div>
          <p className="text-gray-600">Loading databases...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="mb-6 border-2 border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-blue-600" />
            Quick Setup from Database
            <span className="text-sm text-gray-500 font-normal">
              Select standard configurations
            </span>
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Step 1: Select Mold */}
          <div className="bg-white p-4 rounded-lg border">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold flex items-center gap-2">
                <span className="bg-blue-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-sm">1</span>
                Select Mold
              </h3>
              {selectedMold && (
                <button
                  onClick={() => setSelectedMold(null)}
                  className="text-sm text-red-600 hover:underline"
                >
                  Clear
                </button>
              )}
            </div>

            {selectedMold ? (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded mb-3">
                <div className="font-medium">{selectedMold.type}</div>
                <div className="text-sm text-gray-600">
                  {selectedMold.shape} • {selectedMold.volume_liters.toFixed(2)}L
                </div>
                <div className="text-xs text-gray-500 mt-1">{selectedMold.application.split(',')[0]}</div>
              </div>
            ) : (
              <>
                {/* Recommended Molds */}
                <div className="mb-3">
                  <div className="text-sm text-gray-600 mb-2 flex items-center gap-1">
                    <Lightbulb className="h-4 w-4" />
                    Popular Configurations:
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {recommendedMolds.map(mold => (
                      <button
                        key={mold.mold_id}
                        onClick={() => handleSelectMold(mold)}
                        className="p-2 border rounded text-left hover:bg-blue-50 hover:border-blue-300 transition-colors text-sm"
                      >
                        <div className="font-medium truncate">{mold.type}</div>
                        <div className="text-xs text-gray-500">{mold.volume_liters.toFixed(1)}L</div>
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}

            <Button
              onClick={() => setShowMoldSelector(true)}
              className="w-full"
              variant="outline"
            >
              <Square className="h-4 w-4 mr-2" />
              {selectedMold ? 'Change Mold' : 'Browse All Molds'}
              <span className="ml-2 text-xs text-gray-500">({moldDatabase.length} options)</span>
            </Button>
          </div>

          {/* Step 2: Select/Review Pipe */}
          <div className="bg-white p-4 rounded-lg border">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold flex items-center gap-2">
                <span className="bg-blue-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-sm">2</span>
                Select Pipe
                {selectedMold && !selectedPipe && (
                  <span className="text-xs text-blue-600 font-normal">(Auto-suggesting...)</span>
                )}
              </h3>
              {selectedPipe && (
                <button
                  onClick={() => setSelectedPipe(null)}
                  className="text-sm text-red-600 hover:underline"
                >
                  Clear
                </button>
              )}
            </div>

            {selectedPipe ? (
              <div className="p-3 bg-green-50 border border-green-200 rounded mb-3">
                <div className="flex items-center gap-2">
                  {selectedMold && !showPipeSelector && (
                    <span className="text-xs bg-green-600 text-white px-2 py-0.5 rounded">
                      Auto-suggested
                    </span>
                  )}
                  <div className="font-medium">
                    {selectedPipe.inner_diameter_mm}mm × {selectedPipe.length_mm}mm
                  </div>
                </div>
                <div className="text-sm text-gray-600 mt-1">
                  Volume: {selectedPipe.volume_liters.toFixed(4)}L •
                  Max Pressure: {selectedPipe.recommended_max_pressure_bar} bar
                </div>
              </div>
            ) : (
              <div className="p-3 bg-gray-50 border border-gray-200 rounded mb-3 text-sm text-gray-600">
                {selectedMold
                  ? 'Optimal pipe will be auto-suggested based on your mold selection'
                  : 'Select a mold first, or browse pipes manually'
                }
              </div>
            )}

            <Button
              onClick={() => setShowPipeSelector(true)}
              className="w-full"
              variant="outline"
            >
              <Settings2 className="h-4 w-4 mr-2" />
              {selectedPipe ? 'Change Pipe' : 'Browse All Pipes'}
              <span className="ml-2 text-xs text-gray-500">({pipeDatabase.length} options)</span>
            </Button>
          </div>

          {/* Material Preview */}
          {selectedMold && (
            <div className="bg-white p-4 rounded-lg border border-green-200">
              <h3 className="font-semibold mb-2 text-sm">Material Requirements (per part):</h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-gray-600">Foam Volume:</span>
                  <span className="font-medium ml-2">{selectedMold.volume_liters.toFixed(2)}L</span>
                </div>
                <div>
                  <span className="text-gray-600">Cycle Time:</span>
                  <span className="font-medium ml-2">{Math.round(selectedMold.cycle_time_estimate_s)}s</span>
                </div>
                <div>
                  <span className="text-gray-600">Injection Points:</span>
                  <span className="font-medium ml-2">{selectedMold.injection_points}</span>
                </div>
                <div>
                  <span className="text-gray-600">Material:</span>
                  <span className="font-medium ml-2 text-xs">{selectedMold.typical_material.split(',')[0]}</span>
                </div>
              </div>
            </div>
          )}

          {/* Apply Button */}
          <div className="flex gap-2">
            <Button
              onClick={handleApply}
              disabled={!selectedPipe && !selectedMold}
              className="flex-1"
            >
              Apply Configuration
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
            {onClose && (
              <Button
                onClick={onClose}
                variant="outline"
              >
                Cancel
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Selectors (Modals) */}
      <PipeSelector
        pipeDatabase={pipeDatabase}
        onSelectPipe={setSelectedPipe}
        selectedPipe={selectedPipe}
        isOpen={showPipeSelector}
        onClose={() => setShowPipeSelector(false)}
      />

      <MoldSelector
        moldDatabase={moldDatabase}
        onSelectMold={handleSelectMold}
        selectedMold={selectedMold}
        isOpen={showMoldSelector}
        onClose={() => setShowMoldSelector(false)}
      />
    </>
  );
}

export default QuickSetup;
