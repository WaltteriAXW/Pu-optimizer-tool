/**
 * Lazy-loaded wrapper for 3D Mold Visualization
 * Only loads Three.js and MoldVisualization3D when component is visible
 * This significantly improves initial page load time
 */

import React, { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { Eye } from 'lucide-react';

// Lazy load the 3D visualization component
const MoldVisualization3D = lazy(
  () => import('./MoldVisualization3D')
);

/**
 * Lazy loading wrapper for 3D Mold Visualization
 * Uses React.lazy and Suspense to defer loading until needed
 *
 * @param {Object} props - Component props
 * @param {string} props.moldShape - Shape of the mold
 * @param {Object} props.moldDimensions - Mold dimensions
 * @param {number} props.pipeLength - Pipe length in mm
 * @param {number} props.pipeDiameter - Pipe diameter in mm
 * @param {boolean} [props.showPipe=true] - Whether to show pipe in visualization
 * @param {boolean} [props.showLabels=true] - Whether to show dimension labels
 * @param {number} [props.height=500] - Canvas height in pixels
 * @returns {JSX.Element} Lazy-loaded 3D visualization or fallback
 */
export const MoldVisualization3DLazy = ({
  moldShape,
  moldDimensions,
  pipeLength,
  pipeDiameter,
  showPipe = true,
  showLabels = true,
  height = 500
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const containerRef = useRef(null);

  // Use Intersection Observer to detect when component comes into view
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(entry.target);
        }
      },
      { threshold: 0.1 }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => {
      observer.disconnect();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="w-full bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden"
    >
      {isVisible ? (
        <Suspense
          fallback={
            <div
              className="flex flex-col items-center justify-center gap-3 bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800"
              style={{ height: `${height}px` }}
            >
              <div className="animate-spin">
                <Eye className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Loading 3D visualization...
              </p>
            </div>
          }
        >
          <MoldVisualization3D
            moldShape={moldShape}
            moldDimensions={moldDimensions}
            pipeLength={pipeLength}
            pipeDiameter={pipeDiameter}
            showPipe={showPipe}
            showLabels={showLabels}
            height={height}
          />
        </Suspense>
      ) : (
        <div
          className="flex flex-col items-center justify-center gap-3 bg-gradient-to-b from-gray-100 to-gray-50 dark:from-gray-800 dark:to-gray-900 text-gray-600 dark:text-gray-400"
          style={{ height: `${height}px` }}
        >
          <Eye className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
          <p className="text-sm">Scroll down to load 3D visualization</p>
        </div>
      )}
    </div>
  );
};

export default MoldVisualization3DLazy;
