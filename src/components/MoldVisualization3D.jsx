/* eslint-disable react/prop-types */
/**
 * 3D Mold and Pipe Visualization Component
 *
 * Renders mold shapes (rectangular, cylindrical, spherical) and injection pipes in 3D
 * using React Three Fiber and Three.js
 */

/* eslint-disable react/no-unknown-property */
import React, { useState, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid, Text, Html } from '@react-three/drei';
import * as THREE from 'three';

/**
 * Loading fallback for 3D scene
 */
const CanvasLoader = () => (
  <Html center>
    <div className="flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
    </div>
  </Html>
);

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
      {/* Main solid block with gradient-like color */}
      <mesh position={[0, h / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[l, h, w]} />
        <meshStandardMaterial
          color="#60a5fa"
          transparent
          opacity={0.75}
          roughness={0.2}
          metalness={0.3}
        />
      </mesh>
      {/* Wireframe outline */}
      <mesh position={[0, h / 2, 0]}>
        <boxGeometry args={[l, h, w]} />
        <meshBasicMaterial color="#3b82f6" wireframe linewidth={2} />
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
          color="#c084fc"
          transparent
          opacity={0.75}
          roughness={0.2}
          metalness={0.3}
          side={THREE.DoubleSide}
        />
      </mesh>
      {/* Inner cylinder (hollow) */}
      <mesh position={[0, h / 2, 0]}>
        <cylinderGeometry args={[innerRadius, innerRadius, h + 0.1, 32]} />
        <meshStandardMaterial
          color="#fbbf24"
          transparent
          opacity={0.2}
          side={THREE.BackSide}
        />
      </mesh>
      {/* Wireframe */}
      <mesh position={[0, h / 2, 0]}>
        <cylinderGeometry args={[outerRadius, outerRadius, h, 32]} />
        <meshBasicMaterial color="#a855f7" wireframe linewidth={2} />
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
          color="#f472b6"
          transparent
          opacity={0.75}
          roughness={0.2}
          metalness={0.3}
          side={THREE.DoubleSide}
        />
      </mesh>
      {/* Inner sphere (hollow) */}
      <mesh position={[0, outerRadius, 0]}>
        <sphereGeometry args={[innerRadius, 32, 32]} />
        <meshStandardMaterial
          color="#60a5fa"
          transparent
          opacity={0.2}
          side={THREE.BackSide}
        />
      </mesh>
      {/* Wireframe */}
      <mesh position={[0, outerRadius, 0]}>
        <sphereGeometry args={[outerRadius, 16, 16]} />
        <meshBasicMaterial color="#ec4899" wireframe linewidth={2} />
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
          color="#6366f1"
          roughness={0.2}
          metalness={0.7}
        />
      </mesh>
      {/* Pipe wireframe */}
      <mesh>
        <cylinderGeometry args={[radius, radius, len, 16]} />
        <meshBasicMaterial color="#4f46e5" wireframe linewidth={2} />
      </mesh>
      {/* Injection point indicator - at the end pointing toward mold */}
      <mesh position={[0, -len / 2, 0]}>
        <sphereGeometry args={[radius * 2, 16, 16]} />
        <meshStandardMaterial
          color="#f472b6"
          emissive="#f472b6"
          emissiveIntensity={0.6}
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
          color="#000000"
          anchorX="left"
        >
          {length}mm
        </Text>
        <Text
          position={[0, h / 2 + 1, 0]}
          rotation={[0, 0, 0]}
          fontSize={0.5}
          color="#000000"
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
          color="#000000"
          anchorX="center"
        >
          H: {cylinderHeight}mm
        </Text>
        <Text
          position={[0, -1, 0]}
          rotation={[0, 0, 0]}
          fontSize={0.5}
          color="#000000"
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
          color="#000000"
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
      {showPipe && pipeLength > 0 && pipeDiameter > 0 && (() => {
        let pipePosition, pipeRotation;
        const len = pipeLength / 100;
        const angleRad = 22 * (Math.PI / 180); // 22 degrees to radians

        if (moldShape === 'rectangular') {
          const l = moldDimensions.length / 100;
          const w = moldDimensions.width / 100;
          const h = moldDimensions.height / 100;

          // Position pipe centered on short side (width direction)
          // The pipe should point toward the mold at 22 degrees
          // Pipe center should be positioned so the tip touches near the mold surface

          // Calculate offset based on 22-degree angle
          const horizontalOffset = len / 2 * Math.cos(angleRad); // Distance along Z-axis
          const verticalOffset = len / 2 * Math.sin(angleRad);   // Distance along Y-axis

          // Position:
          // X: 0 (centered along length - short side center)
          // Y: height/2 + vertical offset (at mold center height, adjusted for angle)
          // Z: width/2 + horizontal offset (at edge of mold + pipe extends outward)
          pipePosition = [0, h / 2 + verticalOffset, w / 2 + horizontalOffset];

          // Rotation:
          // Pipe points from outside toward mold at 22 degrees downward
          // X rotation: -22 degrees (tilt down toward mold)
          // Y rotation: 0
          // Z rotation: Math.PI / 2 (90 degrees - makes cylinder horizontal, pointing along -Z)
          pipeRotation = [-angleRad, 0, Math.PI / 2];

        } else if (moldShape === 'cylinder') {
          const r = (moldDimensions.diameter / 2) / 100;
          const h = moldDimensions.cylinderHeight / 100;

          const offsetX = len / 2 * Math.cos(angleRad);
          const offsetY = len / 2 * Math.sin(angleRad);

          // Position on side edge of cylinder
          pipePosition = [r + offsetX, h / 2 + offsetY, 0];
          // 22 degree angle toward center
          pipeRotation = [0, -angleRad, 0];

        } else if (moldShape === 'sphere') {
          const r = (moldDimensions.sphereDiameter / 2) / 100;

          const offsetX = len / 2 * Math.cos(angleRad);
          const offsetY = len / 2 * Math.sin(angleRad);

          // Position on side edge of sphere
          pipePosition = [r + offsetX, r + offsetY, 0];
          // 22 degree angle toward center
          pipeRotation = [0, -angleRad, 0];
        }

        return (
          <InjectionPipe
            diameter={pipeDiameter}
            length={pipeLength}
            position={pipePosition}
            rotation={pipeRotation}
          />
        );
      })()}

      {/* Dimension Labels */}
      {showLabels && (
        <DimensionLabels moldShape={moldShape} dimensions={moldDimensions} />
      )}

      {/* Ground Grid */}
      <Grid
        args={[50, 50]}
        cellSize={1}
        cellThickness={0.5}
        cellColor="#a0a0a0"
        sectionSize={5}
        sectionThickness={1}
        sectionColor="#d0d0d0"
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
    <div className="relative w-full bg-gradient-to-br from-blue-400/20 via-purple-400/20 to-indigo-400/20 rounded-lg overflow-hidden border border-blue-400/40 shadow-xl backdrop-blur-sm">
      <Canvas
        shadows
        style={{ height: `${height}px` }}
        camera={{ position: [15, 10, 15], fov: 50 }}
        gl={{ alpha: true, antialias: true }}
      >
        <Suspense fallback={<CanvasLoader />}>
          <Scene
            moldShape={moldShape}
            moldDimensions={moldDimensions}
            pipeLength={pipeLength}
            pipeDiameter={pipeDiameter}
            showPipe={showPipe}
            showLabels={showLabels}
          />
        </Suspense>
      </Canvas>

      {/* Controls overlay with glassmorphism */}
      <div className="absolute top-2 right-2 backdrop-blur-md rounded-lg p-2 shadow-lg" style={{ backgroundColor: 'rgba(26, 31, 46, 0.8)', border: '1px solid rgba(0, 217, 255, 0.3)' }}>
        <div className="text-xs space-y-1">
          <div className="font-semibold border-b pb-1 mb-1" style={{ color: '#00D9FF', borderColor: 'rgba(0, 217, 255, 0.3)' }}>3D Controls</div>
          <div style={{ color: '#E0E2E9' }}>🖱️ Rotate: Click + Drag</div>
          <div style={{ color: '#E0E2E9' }}>🔍 Zoom: Scroll</div>
          <div style={{ color: '#E0E2E9' }}>✋ Pan: Right Click + Drag</div>
        </div>
      </div>

      {/* Shape info overlay with glassmorphism */}
      <div className="absolute top-2 left-2 backdrop-blur-md rounded-lg px-3 py-2 shadow-lg" style={{ backgroundColor: 'rgba(26, 31, 46, 0.8)', border: '1px solid rgba(0, 217, 255, 0.3)' }}>
        <div className="text-sm font-semibold" style={{ color: '#00D9FF' }}>
          {moldShape === 'rectangular' && '📦 Rectangular Mold'}
          {moldShape === 'cylinder' && '🥫 Cylindrical Mold'}
          {moldShape === 'sphere' && '🔵 Spherical Mold'}
        </div>
      </div>
    </div>
  );
};

export default MoldVisualization3D;
