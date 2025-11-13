/**
 * 3D Mold and Pipe Visualization Component
 *
 * Renders mold shapes (rectangular, cylindrical, spherical) and injection pipes in 3D
 * using React Three Fiber and Three.js
 */

import React, { useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid, Text, PerspectiveCamera } from '@react-three/drei';
import * as THREE from 'three';

/**
 * Rectangular Mold Component
 */
const RectangularMold = ({ length, width, height }) => {
  // Convert mm to scene units (divide by 100 for better scaling)
  const l = length / 100;
  const w = width / 100;
  const h = height / 100;

  return (
    <group>
      {/* Main solid block */}
      <mesh position={[0, h / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[l, h, w]} />
        <meshStandardMaterial
          color="#4A90E2"
          transparent
          opacity={0.7}
          roughness={0.3}
          metalness={0.1}
        />
      </mesh>
      {/* Wireframe outline */}
      <mesh position={[0, h / 2, 0]}>
        <boxGeometry args={[l, h, w]} />
        <meshBasicMaterial color="#1a5490" wireframe />
      </mesh>
    </group>
  );
};

/**
 * Cylindrical Mold Component (Hollow)
 */
const CylindricalMold = ({ diameter, height, wallThickness }) => {
  const outerRadius = (diameter / 2) / 100;
  const innerRadius = ((diameter / 2) - wallThickness) / 100;
  const h = height / 100;

  return (
    <group>
      {/* Outer cylinder */}
      <mesh position={[0, h / 2, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[outerRadius, outerRadius, h, 32]} />
        <meshStandardMaterial
          color="#E67E22"
          transparent
          opacity={0.7}
          roughness={0.3}
          metalness={0.1}
          side={THREE.DoubleSide}
        />
      </mesh>
      {/* Inner cylinder (hollow) */}
      <mesh position={[0, h / 2, 0]}>
        <cylinderGeometry args={[innerRadius, innerRadius, h + 0.1, 32]} />
        <meshStandardMaterial
          color="#ffffff"
          transparent
          opacity={0.3}
          side={THREE.BackSide}
        />
      </mesh>
      {/* Wireframe */}
      <mesh position={[0, h / 2, 0]}>
        <cylinderGeometry args={[outerRadius, outerRadius, h, 32]} />
        <meshBasicMaterial color="#c0591b" wireframe />
      </mesh>
    </group>
  );
};

/**
 * Spherical Mold Component (Hollow)
 */
const SphericalMold = ({ diameter, wallThickness }) => {
  const outerRadius = (diameter / 2) / 100;
  const innerRadius = ((diameter / 2) - wallThickness) / 100;

  return (
    <group>
      {/* Outer sphere */}
      <mesh position={[0, outerRadius, 0]} castShadow receiveShadow>
        <sphereGeometry args={[outerRadius, 32, 32]} />
        <meshStandardMaterial
          color="#9B59B6"
          transparent
          opacity={0.7}
          roughness={0.3}
          metalness={0.1}
          side={THREE.DoubleSide}
        />
      </mesh>
      {/* Inner sphere (hollow) */}
      <mesh position={[0, outerRadius, 0]}>
        <sphereGeometry args={[innerRadius, 32, 32]} />
        <meshStandardMaterial
          color="#ffffff"
          transparent
          opacity={0.3}
          side={THREE.BackSide}
        />
      </mesh>
      {/* Wireframe */}
      <mesh position={[0, outerRadius, 0]}>
        <sphereGeometry args={[outerRadius, 16, 16]} />
        <meshBasicMaterial color="#7d3c98" wireframe />
      </mesh>
    </group>
  );
};

/**
 * Injection Pipe Component
 */
const InjectionPipe = ({ diameter, length, position = [0, 0, 0], rotation = [0, 0, 0] }) => {
  const radius = (diameter / 2) / 100;
  const len = length / 100;

  return (
    <group position={position} rotation={rotation}>
      {/* Pipe cylinder */}
      <mesh castShadow receiveShadow>
        <cylinderGeometry args={[radius, radius, len, 16]} />
        <meshStandardMaterial
          color="#34495E"
          roughness={0.2}
          metalness={0.8}
        />
      </mesh>
      {/* Pipe wireframe */}
      <mesh>
        <cylinderGeometry args={[radius, radius, len, 16]} />
        <meshBasicMaterial color="#1a252f" wireframe />
      </mesh>
      {/* Injection point indicator (red ball) */}
      <mesh position={[0, len / 2, 0]}>
        <sphereGeometry args={[radius * 1.5, 16, 16]} />
        <meshStandardMaterial
          color="#E74C3C"
          emissive="#E74C3C"
          emissiveIntensity={0.5}
        />
      </mesh>
    </group>
  );
};

/**
 * Dimension Labels Component
 */
const DimensionLabels = ({ moldShape, dimensions }) => {
  const { length, width, height, diameter, cylinderHeight, sphereDiameter, wallThickness } = dimensions;

  if (moldShape === 'rectangular') {
    const l = length / 100;
    const w = width / 100;
    const h = height / 100;

    return (
      <group>
        <Text
          position={[l / 2 + 1, 0, 0]}
          rotation={[0, 0, 0]}
          fontSize={0.5}
          color="#333333"
          anchorX="left"
        >
          {length}mm
        </Text>
        <Text
          position={[0, h / 2 + 1, 0]}
          rotation={[0, 0, 0]}
          fontSize={0.5}
          color="#333333"
          anchorX="center"
        >
          {height}mm
        </Text>
      </group>
    );
  }

  if (moldShape === 'cylinder') {
    const h = cylinderHeight / 100;

    return (
      <group>
        <Text
          position={[0, h + 1, 0]}
          rotation={[0, 0, 0]}
          fontSize={0.5}
          color="#333333"
          anchorX="center"
        >
          H: {cylinderHeight}mm
        </Text>
        <Text
          position={[0, -1, 0]}
          rotation={[0, 0, 0]}
          fontSize={0.5}
          color="#333333"
          anchorX="center"
        >
          ∅{diameter}mm
        </Text>
      </group>
    );
  }

  if (moldShape === 'sphere') {
    const r = (sphereDiameter / 2) / 100;

    return (
      <group>
        <Text
          position={[r + 1, r, 0]}
          rotation={[0, 0, 0]}
          fontSize={0.5}
          color="#333333"
          anchorX="left"
        >
          ∅{sphereDiameter}mm
        </Text>
      </group>
    );
  }

  return null;
};

/**
 * Scene Component - Contains all 3D objects
 */
const Scene = ({ moldShape, moldDimensions, pipeLength, pipeDiameter, showPipe = true, showLabels = true }) => {
  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.6} />
      <directionalLight position={[10, 10, 5]} intensity={0.8} castShadow />
      <directionalLight position={[-10, -10, -5]} intensity={0.3} />
      <pointLight position={[0, 10, 0]} intensity={0.5} />

      {/* Mold based on shape */}
      {moldShape === 'rectangular' && (
        <RectangularMold
          length={moldDimensions.length}
          width={moldDimensions.width}
          height={moldDimensions.height}
        />
      )}

      {moldShape === 'cylinder' && (
        <CylindricalMold
          diameter={moldDimensions.diameter}
          height={moldDimensions.cylinderHeight}
          wallThickness={moldDimensions.wallThickness}
        />
      )}

      {moldShape === 'sphere' && (
        <SphericalMold
          diameter={moldDimensions.sphereDiameter}
          wallThickness={moldDimensions.wallThickness}
        />
      )}

      {/* Injection Pipe */}
      {showPipe && pipeLength > 0 && pipeDiameter > 0 && (
        <InjectionPipe
          diameter={pipeDiameter}
          length={pipeLength}
          position={moldShape === 'sphere'
            ? [0, (moldDimensions.sphereDiameter / 100) + (pipeLength / 200), 0]
            : moldShape === 'cylinder'
            ? [0, (moldDimensions.cylinderHeight / 100) + (pipeLength / 200), 0]
            : [0, (moldDimensions.height / 100) + (pipeLength / 200), 0]
          }
          rotation={[0, 0, 0]}
        />
      )}

      {/* Dimension Labels */}
      {showLabels && (
        <DimensionLabels moldShape={moldShape} dimensions={moldDimensions} />
      )}

      {/* Ground Grid */}
      <Grid
        args={[50, 50]}
        cellSize={1}
        cellThickness={0.5}
        cellColor="#6e6e6e"
        sectionSize={5}
        sectionThickness={1}
        sectionColor="#9d9d9d"
        fadeDistance={30}
        fadeStrength={1}
        followCamera={false}
        infiniteGrid={true}
      />

      {/* Orbit Controls for interaction */}
      <OrbitControls
        enablePan={true}
        enableZoom={true}
        enableRotate={true}
        minDistance={5}
        maxDistance={50}
        autoRotate={false}
        autoRotateSpeed={0.5}
      />
    </>
  );
};

/**
 * Main 3D Visualization Component
 */
export const MoldVisualization3D = ({
  moldShape = 'rectangular',
  moldDimensions = {
    length: 1000,
    width: 500,
    height: 50,
    diameter: 500,
    cylinderHeight: 1000,
    sphereDiameter: 500,
    wallThickness: 50
  },
  pipeLength = 500,
  pipeDiameter = 12,
  showPipe = true,
  showLabels = true,
  height = 400
}) => {
  const [autoRotate, setAutoRotate] = useState(false);

  return (
    <div className="relative w-full bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg overflow-hidden border-2 border-gray-200 shadow-lg">
      <Canvas
        shadows
        style={{ height: `${height}px` }}
        camera={{ position: [15, 10, 15], fov: 50 }}
      >
        <Scene
          moldShape={moldShape}
          moldDimensions={moldDimensions}
          pipeLength={pipeLength}
          pipeDiameter={pipeDiameter}
          showPipe={showPipe}
          showLabels={showLabels}
        />
      </Canvas>

      {/* Controls overlay */}
      <div className="absolute top-2 right-2 bg-white bg-opacity-90 rounded-lg p-2 shadow-md">
        <div className="text-xs space-y-1">
          <div className="font-semibold text-gray-700 border-b pb-1 mb-1">3D Controls</div>
          <div className="text-gray-600">🖱️ Rotate: Click + Drag</div>
          <div className="text-gray-600">🔍 Zoom: Scroll</div>
          <div className="text-gray-600">✋ Pan: Right Click + Drag</div>
        </div>
      </div>

      {/* Shape info overlay */}
      <div className="absolute top-2 left-2 bg-white bg-opacity-90 rounded-lg px-3 py-2 shadow-md">
        <div className="text-sm font-semibold text-gray-700">
          {moldShape === 'rectangular' && '📦 Rectangular Mold'}
          {moldShape === 'cylinder' && '🥫 Cylindrical Mold'}
          {moldShape === 'sphere' && '🔵 Spherical Mold'}
        </div>
      </div>
    </div>
  );
};

export default MoldVisualization3D;
