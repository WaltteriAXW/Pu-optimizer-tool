/**
 * Pipe Selector Component
 *
 * Interactive component for selecting standard pipes from the database.
 * Provides filtering by size class, length class, and pressure rating.
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../card';
import { Settings2, Activity, Gauge, Search, X } from 'lucide-react';
import {
  filterPipesBySize,
  filterPipesByLength,
  filterPipesByPressure,
  getAvailableDiameters
} from '../utils/dimensionsDatabaseLoader';

/**
 * Pipe Selector Component
 *
 * @param {Object} props
 * @param {Array} props.pipeDatabase - Array of pipe configurations
 * @param {Function} props.onSelectPipe - Callback when pipe is selected
 * @param {Object} props.selectedPipe - Currently selected pipe
 * @param {boolean} props.isOpen - Whether selector is open/visible
 * @param {Function} props.onClose - Callback to close selector
 */
export const PipeSelector = React.memo(function PipeSelector({
  pipeDatabase,
  onSelectPipe,
  selectedPipe = null,
  isOpen = false,
  onClose
}) {
  const [sizeFilter, setSizeFilter] = useState('all');
  const [lengthFilter, setLengthFilter] = useState('all');
  const [minPressure, setMinPressure] = useState(0);
  const [searchDiameter, setSearchDiameter] = useState('');
  const [selectedDiameter, setSelectedDiameter] = useState(null);

  // Apply filters
  const filteredPipes = useMemo(() => {
    let result = pipeDatabase;

    // Size filter
    if (sizeFilter !== 'all') {
      result = filterPipesBySize(result, sizeFilter);
    }

    // Length filter
    if (lengthFilter !== 'all') {
      result = filterPipesByLength(result, lengthFilter);
    }

    // Pressure filter
    if (minPressure > 0) {
      result = filterPipesByPressure(result, minPressure);
    }

    // Diameter filter
    if (selectedDiameter) {
      result = result.filter(p => p.inner_diameter_mm === selectedDiameter);
    }

    return result;
  }, [pipeDatabase, sizeFilter, lengthFilter, minPressure, selectedDiameter]);

  // Get unique diameters for dropdown
  const availableDiameters = useMemo(() => {
    return getAvailableDiameters(pipeDatabase);
  }, [pipeDatabase]);

  // Group pipes by diameter for better display
  const groupedPipes = useMemo(() => {
    const groups = {};
    filteredPipes.forEach(pipe => {
      const diameter = pipe.inner_diameter_mm;
      if (!groups[diameter]) {
        groups[diameter] = [];
      }
      groups[diameter].push(pipe);
    });
    return groups;
  }, [filteredPipes]);

  const handleSelectPipe = (pipe) => {
    onSelectPipe(pipe);
    if (onClose) onClose();
  };

  const clearFilters = () => {
    setSizeFilter('all');
    setLengthFilter('all');
    setMinPressure(0);
    setSelectedDiameter(null);
    setSearchDiameter('');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <CardHeader className="flex flex-row items-center justify-between border-b">
          <CardTitle className="flex items-center gap-2">
            <Settings2 className="h-5 w-5" />
            Select Standard Pipe
            <span className="text-sm text-gray-500 font-normal">
              ({filteredPipes.length} pipes available)
            </span>
          </CardTitle>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </CardHeader>

        <CardContent className="flex-1 overflow-auto">
          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4 p-4 bg-gray-50 rounded-lg">
            {/* Size Class Filter */}
            <div>
              <label className="block text-sm font-medium mb-1">
                <Settings2 className="h-4 w-4 inline mr-1" />
                Size Class
              </label>
              <select
                value={sizeFilter}
                onChange={(e) => setSizeFilter(e.target.value)}
                className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Sizes</option>
                <option value="Small">Small (4-9mm)</option>
                <option value="Medium">Medium (10-19mm)</option>
                <option value="Large">Large (20-34mm)</option>
                <option value="Extra Large">Extra Large (35-50mm)</option>
              </select>
            </div>

            {/* Length Class Filter */}
            <div>
              <label className="block text-sm font-medium mb-1">
                <Activity className="h-4 w-4 inline mr-1" />
                Length Class
              </label>
              <select
                value={lengthFilter}
                onChange={(e) => setLengthFilter(e.target.value)}
                className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Lengths</option>
                <option value="Short">Short (50-190mm)</option>
                <option value="Medium">Medium (200-490mm)</option>
                <option value="Long">Long (500-990mm)</option>
                <option value="Extra Long">Extra Long (1000-2000mm)</option>
              </select>
            </div>

            {/* Specific Diameter */}
            <div>
              <label className="block text-sm font-medium mb-1">
                <Search className="h-4 w-4 inline mr-1" />
                Diameter
              </label>
              <select
                value={selectedDiameter || ''}
                onChange={(e) => setSelectedDiameter(e.target.value ? parseInt(e.target.value) : null)}
                className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Diameters</option>
                {availableDiameters.map(d => (
                  <option key={d} value={d}>{d}mm</option>
                ))}
              </select>
            </div>

            {/* Pressure Rating */}
            <div>
              <label className="block text-sm font-medium mb-1">
                <Gauge className="h-4 w-4 inline mr-1" />
                Min Pressure
              </label>
              <select
                value={minPressure}
                onChange={(e) => setMinPressure(parseFloat(e.target.value))}
                className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
              >
                <option value="0">Any Pressure</option>
                <option value="6">≥ 6 bar</option>
                <option value="8">≥ 8 bar</option>
                <option value="10">≥ 10 bar</option>
                <option value="12">≥ 12 bar</option>
              </select>
            </div>
          </div>

          {/* Clear Filters Button */}
          {(sizeFilter !== 'all' || lengthFilter !== 'all' || minPressure > 0 || selectedDiameter) && (
            <button
              onClick={clearFilters}
              className="mb-4 px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded text-sm"
            >
              Clear All Filters
            </button>
          )}

          {/* Pipes List - Grouped by Diameter */}
          <div className="space-y-4">
            {Object.keys(groupedPipes).length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Search className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No pipes match your filters</p>
                <button
                  onClick={clearFilters}
                  className="mt-2 text-blue-600 hover:underline"
                >
                  Clear filters
                </button>
              </div>
            ) : (
              Object.entries(groupedPipes)
                .sort(([a], [b]) => parseInt(a) - parseInt(b))
                .map(([diameter, pipes]) => (
                  <div key={diameter} className="border rounded-lg p-4">
                    <h3 className="font-semibold mb-3 text-lg">
                      {diameter}mm Diameter
                      <span className="text-sm text-gray-500 ml-2 font-normal">
                        ({pipes.length} options)
                      </span>
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                      {pipes.map(pipe => (
                        <button
                          key={pipe.pipe_id}
                          onClick={() => handleSelectPipe(pipe)}
                          className={`p-3 border rounded text-left transition-all hover:shadow-md ${
                            selectedPipe?.pipe_id === pipe.pipe_id
                              ? 'border-blue-500 bg-blue-50'
                              : 'border-gray-300 hover:border-blue-300'
                          }`}
                        >
                          <div className="font-medium text-sm">
                            {pipe.inner_diameter_mm}mm × {pipe.length_mm}mm
                          </div>
                          <div className="text-xs text-gray-600 mt-1">
                            Vol: {pipe.volume_liters.toFixed(4)}L
                          </div>
                          <div className="text-xs text-gray-600">
                            Max: {pipe.recommended_max_pressure_bar} bar
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            {pipe.size_class} • {pipe.length_class}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                ))
            )}
          </div>
        </CardContent>

        {/* Footer */}
        <div className="border-t p-4 bg-gray-50 flex justify-between items-center">
          <div className="text-sm text-gray-600">
            {selectedPipe ? (
              <span className="font-medium text-blue-600">
                Selected: {selectedPipe.inner_diameter_mm}mm × {selectedPipe.length_mm}mm
              </span>
            ) : (
              <span>Click a pipe to select</span>
            )}
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded"
          >
            Close
          </button>
        </div>
      </Card>
    </div>
  );
});

export default PipeSelector;
