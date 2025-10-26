/**
 * Mold Selector Component
 *
 * Interactive component for selecting standard molds from the database.
 * Provides filtering by shape, application, and volume range.
 */

import React, { useState, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../card';
import { Square, Cylinder, Circle, Search, X, Filter } from 'lucide-react';
import {
  filterMoldsByShape,
  filterMoldsByApplication,
  filterMoldsByVolume
} from '../utils/dimensionsDatabaseLoader';

/**
 * Mold Selector Component
 *
 * @param {Object} props
 * @param {Array} props.moldDatabase - Array of mold configurations
 * @param {Function} props.onSelectMold - Callback when mold is selected
 * @param {Object} props.selectedMold - Currently selected mold
 * @param {boolean} props.isOpen - Whether selector is open/visible
 * @param {Function} props.onClose - Callback to close selector
 */
export function MoldSelector({
  moldDatabase,
  onSelectMold,
  selectedMold = null,
  isOpen = false,
  onClose
}) {
  const [selectedShape, setSelectedShape] = useState('all');
  const [applicationFilter, setApplicationFilter] = useState('');
  const [volumeRange, setVolumeRange] = useState({ min: 0, max: Infinity });

  // Apply filters
  const filteredMolds = useMemo(() => {
    let result = moldDatabase;

    // Shape filter
    if (selectedShape !== 'all') {
      result = filterMoldsByShape(result, selectedShape);
    }

    // Application filter
    if (applicationFilter) {
      result = filterMoldsByApplication(result, applicationFilter);
    }

    // Volume range filter
    result = filterMoldsByVolume(result, volumeRange.min, volumeRange.max);

    return result;
  }, [moldDatabase, selectedShape, applicationFilter, volumeRange]);

  // Get unique applications for quick filters
  const commonApplications = useMemo(() => {
    const apps = new Set();
    moldDatabase.forEach(mold => {
      const appList = mold.application.split(',');
      appList.forEach(app => apps.add(app.trim()));
    });
    return Array.from(apps).slice(0, 10); // Top 10
  }, [moldDatabase]);

  const handleSelectMold = (mold) => {
    onSelectMold(mold);
    if (onClose) onClose();
  };

  const clearFilters = () => {
    setSelectedShape('all');
    setApplicationFilter('');
    setVolumeRange({ min: 0, max: Infinity });
  };

  const getShapeIcon = (shape) => {
    switch (shape) {
      case 'Rectangular':
        return <Square className="h-4 w-4" />;
      case 'Cylindrical':
        return <Cylinder className="h-4 w-4" />;
      case 'Spherical':
        return <Circle className="h-4 w-4" />;
      default:
        return null;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        <CardHeader className="flex flex-row items-center justify-between border-b">
          <CardTitle className="flex items-center gap-2">
            <Square className="h-5 w-5" />
            Select Standard Mold
            <span className="text-sm text-gray-500 font-normal">
              ({filteredMolds.length} molds available)
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
          {/* Shape Tabs */}
          <div className="flex gap-2 mb-4 border-b">
            <button
              onClick={() => setSelectedShape('all')}
              className={`px-4 py-2 border-b-2 transition-colors ${
                selectedShape === 'all'
                  ? 'border-blue-500 text-blue-600 font-medium'
                  : 'border-transparent hover:border-gray-300'
              }`}
            >
              All Shapes
            </button>
            <button
              onClick={() => setSelectedShape('Rectangular')}
              className={`px-4 py-2 border-b-2 transition-colors flex items-center gap-2 ${
                selectedShape === 'Rectangular'
                  ? 'border-blue-500 text-blue-600 font-medium'
                  : 'border-transparent hover:border-gray-300'
              }`}
            >
              <Square className="h-4 w-4" />
              Rectangular
            </button>
            <button
              onClick={() => setSelectedShape('Cylindrical')}
              className={`px-4 py-2 border-b-2 transition-colors flex items-center gap-2 ${
                selectedShape === 'Cylindrical'
                  ? 'border-blue-500 text-blue-600 font-medium'
                  : 'border-transparent hover:border-gray-300'
              }`}
            >
              <Cylinder className="h-4 w-4" />
              Cylindrical
            </button>
            <button
              onClick={() => setSelectedShape('Spherical')}
              className={`px-4 py-2 border-b-2 transition-colors flex items-center gap-2 ${
                selectedShape === 'Spherical'
                  ? 'border-blue-500 text-blue-600 font-medium'
                  : 'border-transparent hover:border-gray-300'
              }`}
            >
              <Circle className="h-4 w-4" />
              Spherical
            </button>
          </div>

          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 p-4 bg-gray-50 rounded-lg">
            {/* Application Filter */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-1">
                <Search className="h-4 w-4 inline mr-1" />
                Search Application
              </label>
              <input
                type="text"
                placeholder="e.g., refrigerator, water heater, door..."
                value={applicationFilter}
                onChange={(e) => setApplicationFilter(e.target.value)}
                className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Volume Range */}
            <div>
              <label className="block text-sm font-medium mb-1">
                <Filter className="h-4 w-4 inline mr-1" />
                Volume Range
              </label>
              <select
                onChange={(e) => {
                  const value = e.target.value;
                  if (value === 'all') {
                    setVolumeRange({ min: 0, max: Infinity });
                  } else if (value === 'small') {
                    setVolumeRange({ min: 0, max: 10 });
                  } else if (value === 'medium') {
                    setVolumeRange({ min: 10, max: 100 });
                  } else if (value === 'large') {
                    setVolumeRange({ min: 100, max: Infinity });
                  }
                }}
                className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Volumes</option>
                <option value="small">Small (&lt; 10L)</option>
                <option value="medium">Medium (10-100L)</option>
                <option value="large">Large (&gt; 100L)</option>
              </select>
            </div>
          </div>

          {/* Quick Application Filters */}
          <div className="mb-4">
            <div className="text-sm text-gray-600 mb-2">Quick Filters:</div>
            <div className="flex flex-wrap gap-2">
              {['Refrigerator', 'Water Heater', 'Door', 'Panel', 'Tank', 'Insulation'].map(app => (
                <button
                  key={app}
                  onClick={() => setApplicationFilter(app)}
                  className="px-3 py-1 bg-white border rounded-full text-sm hover:bg-blue-50 hover:border-blue-300 transition-colors"
                >
                  {app}
                </button>
              ))}
            </div>
          </div>

          {/* Clear Filters */}
          {(selectedShape !== 'all' || applicationFilter || volumeRange.max !== Infinity) && (
            <button
              onClick={clearFilters}
              className="mb-4 px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded text-sm"
            >
              Clear All Filters
            </button>
          )}

          {/* Molds Grid */}
          {filteredMolds.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Search className="h-16 w-16 mx-auto mb-3 opacity-30" />
              <p className="text-lg">No molds match your filters</p>
              <button
                onClick={clearFilters}
                className="mt-3 text-blue-600 hover:underline"
              >
                Clear filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredMolds.map(mold => (
                <button
                  key={mold.mold_id}
                  onClick={() => handleSelectMold(mold)}
                  className={`p-4 border-2 rounded-lg text-left transition-all hover:shadow-lg ${
                    selectedMold?.mold_id === mold.mold_id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-blue-300'
                  }`}
                >
                  {/* Header */}
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {getShapeIcon(mold.shape)}
                      <span className="font-semibold text-sm">{mold.type}</span>
                    </div>
                    <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                      {mold.shape}
                    </span>
                  </div>

                  {/* Dimensions */}
                  <div className="text-sm text-gray-700 mb-2">
                    {mold.shape === 'Rectangular' && mold.length_mm && (
                      <div>📏 {mold.length_mm} × {mold.width_mm} × {mold.height_thickness_mm}mm</div>
                    )}
                    {mold.shape === 'Cylindrical' && mold.diameter_mm && (
                      <div>
                        📐 ∅{mold.diameter_mm}mm × {mold.height_thickness_mm}mm
                        <br />
                        <span className="text-xs">Wall: {mold.wall_thickness_mm}mm</span>
                      </div>
                    )}
                    {mold.shape === 'Spherical' && mold.diameter_mm && (
                      <div>
                        🔵 ∅{mold.diameter_mm}mm
                        <br />
                        <span className="text-xs">Wall: {mold.wall_thickness_mm}mm</span>
                      </div>
                    )}
                  </div>

                  {/* Volume */}
                  <div className="text-sm font-medium text-blue-600 mb-2">
                    Volume: {mold.volume_liters.toFixed(2)}L
                  </div>

                  {/* Application */}
                  <div className="text-xs text-gray-600 line-clamp-2">
                    {mold.application}
                  </div>

                  {/* Footer Info */}
                  <div className="mt-3 pt-3 border-t text-xs text-gray-500 flex justify-between">
                    <span>⏱ {Math.round(mold.cycle_time_estimate_s)}s cycle</span>
                    <span>💉 {mold.injection_points} point{mold.injection_points > 1 ? 's' : ''}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </CardContent>

        {/* Footer */}
        <div className="border-t p-4 bg-gray-50 flex justify-between items-center">
          <div className="text-sm text-gray-600">
            {selectedMold ? (
              <span className="font-medium text-blue-600">
                Selected: {selectedMold.type} ({selectedMold.volume_liters.toFixed(2)}L)
              </span>
            ) : (
              <span>Click a mold to select</span>
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
}

export default MoldSelector;
