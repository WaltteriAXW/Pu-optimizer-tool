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
import { FlowParticleSystem } from './FlowParticleSystem';

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
      {/* Main solid block with industrial metallic finish */}
      <mesh position={[0, h / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[l, h, w]} />
        <meshStandardMaterial
          color="#06b6d4"
          transparent
          opacity={0.7}
          roughness={0.2}
          metalness={0.8}
          envMapIntensity={1}
        />
      </mesh>
      {/* Wireframe outline with cyan glow */}
      <mesh position={[0, h / 2, 0]}>
        <boxGeometry args={[l, h, w]} />
        <meshBasicMaterial color="#22d3ee" wireframe linewidth={2} />
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
      {/* Outer cylinder with industrial metallic finish */}
      <mesh position={[0, h / 2, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[outerRadius, outerRadius, h, 32]} />
        <meshStandardMaterial
          color="#06b6d4"
          transparent
          opacity={0.7}
          roughness={0.2}
          metalness={0.8}
          envMapIntensity={1}
          side={THREE.DoubleSide}
        />
      </mesh>
      {/* Inner cylinder (hollow) */}
      <mesh position={[0, h / 2, 0]}>
        <cylinderGeometry args={[innerRadius, innerRadius, h + 0.1, 32]} />
        <meshStandardMaterial
          color="#34d399"
          transparent
          opacity={0.2}
          side={THREE.BackSide}
        />
      </mesh>
      {/* Wireframe with cyan */}
      <mesh position={[0, h / 2, 0]}>
        <cylinderGeometry args={[outerRadius, outerRadius, h, 32]} />
        <meshBasicMaterial color="#22d3ee" wireframe linewidth={2} />
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
      {/* Outer sphere with industrial metallic finish */}
      <mesh position={[0, outerRadius, 0]} castShadow receiveShadow>
        <sphereGeometry args={[outerRadius, 32, 32]} />
        <meshStandardMaterial
          color="#06b6d4"
          transparent
          opacity={0.7}
          roughness={0.2}
          metalness={0.8}
          envMapIntensity={1}
          side={THREE.DoubleSide}
        />
      </mesh>
      {/* Inner sphere (hollow) */}
      <mesh position={[0, outerRadius, 0]}>
        <sphereGeometry args={[innerRadius, 32, 32]} />
        <meshStandardMaterial
          color="#34d399"
          transparent
          opacity={0.2}
          side={THREE.BackSide}
        />
      </mesh>
      {/* Wireframe with cyan */}
      <mesh position={[0, outerRadius, 0]}>
        <sphereGeometry args={[outerRadius, 16, 16]} />
        <meshBasicMaterial color="#22d3ee" wireframe linewidth={2} />
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
      {/* Pipe cylinder with industrial steel finish */}
      <mesh castShadow receiveShadow>
        <cylinderGeometry args={[radius, radius, len, 16]} />
        <meshStandardMaterial
          color="#64748b"
          roughness={0.3}
          metalness={0.8}
        />
      </mesh>
      {/* Pipe wireframe */}
      <mesh>
        <cylinderGeometry args={[radius, radius, len, 16]} />
        <meshBasicMaterial color="#94a3b8" wireframe linewidth={2} />
      </mesh>
      {/* Injection point indicator - at the end pointing toward mold */}
      <mesh position={[0, -len / 2, 0]}>
        <sphereGeometry args={[radius * 2, 16, 16]} />
        <meshStandardMaterial
          color="#22d3ee"
          emissive="#22d3ee"
          emissiveIntensity={0.8}
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
const Scene = ({
  moldShape,
  moldDimensions,
  pipeLength,
  pipeDiameter,
  showPipe = true,
  showLabels = true,
  showFlow = false,
  flowData = {}
}) => {
  // Calculate injection point based on mold shape and pipe position
  const getInjectionPoint = () => {
    if (moldShape === 'rectangular') {
      const l = moldDimensions.length / 100;
      const h = moldDimensions.height / 100;
      // Injection point at the mold edge where pipe enters
      return [l / 2, h / 2, 0];
    } else if (moldShape === 'cylinder') {
      const r = (moldDimensions.diameter / 2) / 100;
      const h = moldDimensions.cylinderHeight / 100;
      return [r, h / 2, 0];
    } else if (moldShape === 'sphere') {
      const r = (moldDimensions.sphereDiameter / 2) / 100;
      return [r, r, 0];
    }
    return [0, 0, 0];
  };

  return (
    <>
      {/* Industrial studio lighting */}
      <ambientLight intensity={0.4} />
      <directionalLight position={[10, 10, 5]} intensity={1.0} color="#ffffff" castShadow />
      <directionalLight position={[-10, -10, -5]} intensity={0.5} color="#22d3ee" />
      <pointLight position={[0, 15, 0]} intensity={0.6} color="#06b6d4" />

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

          // Position pipe on LONG SIDE (length direction)
          // Injection point at the edge, pipe extends inward toward center at 22 degrees

          // Tip should be exactly at the mold edge
          const tipX = l / 2;
          const tipY = h / 2;

          // Calculate pipe center position:
          // The pipe extends INWARD from the edge, so we offset in negative X direction
          const horizontalOffset = (len / 2) * Math.cos(angleRad);
          const verticalOffset = (len / 2) * Math.sin(angleRad);

          // Pipe center is offset inward and upward from the edge injection point
          pipePosition = [tipX - horizontalOffset, tipY + verticalOffset, 0];

          // Rotation: pipe points inward (negative X) at 22° angle
          // Rotate around Y-axis: -angleRad makes it point inward with downward tilt
          pipeRotation = [0, -angleRad, 0];

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

      {/* Flow Particle System */}
      {showFlow && (
        <FlowParticleSystem
          flowData={flowData}
          moldDimensions={moldDimensions}
          moldShape={moldShape}
          injectionPoint={getInjectionPoint()}
          enabled={showFlow}
          particleCount={2000}
        />
      )}

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
  showFlow = false,
  flowData = {},
  height = 400
}) => {
  const [autoRotate, setAutoRotate] = useState(false);

  return (
    <div className="relative w-full bg-black rounded overflow-hidden border border-slate-800 shadow-xl">
      <Canvas
        shadows
        style={{ height: `${height}px`, background: '#020617' }}
        camera={{ position: [15, 10, 15], fov: 50 }}
        gl={{ alpha: false, antialias: true }}
      >
        {/* Industrial slate background */}
        <color attach="background" args={['#020617']} />

        <Suspense fallback={<CanvasLoader />}>
          <Scene
            moldShape={moldShape}
            moldDimensions={moldDimensions}
            pipeLength={pipeLength}
            pipeDiameter={pipeDiameter}
            showPipe={showPipe}
            showLabels={showLabels}
            showFlow={showFlow}
            flowData={flowData}
          />
        </Suspense>
      </Canvas>

      {/* Controls overlay with industrial style */}
      <div className="absolute top-2 right-2 bg-slate-900/80 backdrop-blur-md rounded-lg p-2 shadow-lg border border-slate-700">
        <div className="text-xs space-y-1 font-mono">
          <div className="font-semibold border-b border-slate-700 pb-1 mb-1 text-cyan-400">3D CONTROLS</div>
          <div className="text-slate-300">🖱️ Rotate: Click + Drag</div>
          <div className="text-slate-300">🔍 Zoom: Scroll</div>
          <div className="text-slate-300">✋ Pan: Right Click + Drag</div>
        </div>
      </div>

      {/* Shape info overlay with industrial style */}
      <div className="absolute top-2 left-2 bg-slate-900/80 backdrop-blur-md rounded-lg px-3 py-2 shadow-lg border border-slate-700">
        <div className="text-sm font-semibold font-mono text-cyan-400">
          {moldShape === 'rectangular' && '📦 RECTANGULAR'}
          {moldShape === 'cylinder' && '🥫 CYLINDRICAL'}
          {moldShape === 'sphere' && '🔵 SPHERICAL'}
        </div>
      </div>
    </div>
  );
};

export default MoldVisualization3D;
