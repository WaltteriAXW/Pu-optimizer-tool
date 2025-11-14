/* eslint-disable react/no-unknown-property */
/* eslint-disable react/prop-types */
/**
 * Advanced Flow Particle System
 *
 * Simulates polyurethane flow through injection mold with:
 * - Velocity-based coloring (blue=slow, red=fast)
 * - Pressure-based particle density
 * - Turbulent/laminar flow patterns
 * - Realistic physics based on calculation results
 */

import React, { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

/**
 * Calculate color based on velocity (blue to red gradient)
 */
const getVelocityColor = (velocity, maxVelocity) => {
  const normalized = Math.min(velocity / maxVelocity, 1);

  // Blue (slow) -> Cyan -> Green -> Yellow -> Red (fast)
  if (normalized < 0.25) {
    // Blue to Cyan
    const t = normalized / 0.25;
    return new THREE.Color().setRGB(0, t, 1);
  } else if (normalized < 0.5) {
    // Cyan to Green
    const t = (normalized - 0.25) / 0.25;
    return new THREE.Color().setRGB(0, 1, 1 - t);
  } else if (normalized < 0.75) {
    // Green to Yellow
    const t = (normalized - 0.5) / 0.25;
    return new THREE.Color().setRGB(t, 1, 0);
  } else {
    // Yellow to Red
    const t = (normalized - 0.75) / 0.25;
    return new THREE.Color().setRGB(1, 1 - t, 0);
  }
};

/**
 * Particle class for managing individual particle state
 */
class Particle {
  constructor(startPosition, flowData, moldDimensions, moldShape) {
    this.position = new THREE.Vector3(...startPosition);
    this.velocity = new THREE.Vector3();
    this.age = 0;
    this.maxAge = 3 + Math.random() * 2; // 3-5 seconds lifetime
    this.size = 0.02 + Math.random() * 0.02;
    this.flowData = flowData;
    this.moldDimensions = moldDimensions;
    this.moldShape = moldShape;

    // Initialize velocity based on flow rate
    // Flow direction: 22° angle pointing inward (negative X, negative Y)
    const baseVelocity = (flowData.flowRate || 0.1) * 0.01;
    const angleRad = 22 * (Math.PI / 180);
    const velocityVariation = 0.9 + Math.random() * 0.2;

    this.velocity.set(
      -Math.cos(angleRad) * baseVelocity * velocityVariation,  // Inward X direction
      -Math.sin(angleRad) * baseVelocity * velocityVariation,  // Downward Y direction
      (Math.random() - 0.5) * baseVelocity * 0.1              // Small lateral variation
    );

    // Apply turbulence based on Reynolds number
    const turbulenceIntensity = this.calculateTurbulence();
    if (turbulenceIntensity > 0.3) {
      this.velocity.x *= (0.8 + Math.random() * 0.4);
      this.velocity.y *= (0.5 + Math.random() * 1.0);
      this.velocity.z *= (0.5 + Math.random() * 1.0);
    }
  }

  calculateTurbulence() {
    const reynoldsNumber = this.flowData.reynoldsNumber || 1000;
    // Laminar: Re < 2300, Transitional: 2300-4000, Turbulent: > 4000
    if (reynoldsNumber < 2300) return 0.1;
    if (reynoldsNumber < 4000) return 0.3 + (reynoldsNumber - 2300) / 1700 * 0.4;
    return 0.7 + Math.min((reynoldsNumber - 4000) / 6000, 0.3);
  }

  isInsideMold() {
    const pos = this.position;
    const dims = this.moldDimensions;

    if (this.moldShape === 'rectangular') {
      const l = dims.length / 100;
      const w = dims.width / 100;
      const h = dims.height / 100;

      return (
        Math.abs(pos.x) < l / 2 &&
        pos.y > 0 && pos.y < h &&
        Math.abs(pos.z) < w / 2
      );
    } else if (this.moldShape === 'cylinder') {
      const r = (dims.diameter / 2) / 100;
      const h = dims.cylinderHeight / 100;
      const distFromCenter = Math.sqrt(pos.x * pos.x + pos.z * pos.z);

      return (
        distFromCenter < r &&
        pos.y > 0 && pos.y < h
      );
    } else if (this.moldShape === 'sphere') {
      const r = (dims.sphereDiameter / 2) / 100;
      const distFromCenter = Math.sqrt(
        pos.x * pos.x +
        (pos.y - r) * (pos.y - r) +
        pos.z * pos.z
      );

      return distFromCenter < r;
    }

    return false;
  }

  update(deltaTime) {
    this.age += deltaTime;

    // Apply gravity (very slight downward bias)
    this.velocity.y -= 0.001;

    // Apply viscosity drag
    const viscosity = this.flowData.viscosity || 1;
    const dragFactor = 1 - (viscosity * 0.0001);
    this.velocity.multiplyScalar(dragFactor);

    // Add turbulence noise
    const turbulence = this.calculateTurbulence();
    if (turbulence > 0.3) {
      this.velocity.x += (Math.random() - 0.5) * turbulence * 0.01;
      this.velocity.y += (Math.random() - 0.5) * turbulence * 0.01;
      this.velocity.z += (Math.random() - 0.5) * turbulence * 0.01;
    }

    // Update position
    this.position.add(
      new THREE.Vector3().copy(this.velocity).multiplyScalar(deltaTime)
    );

    // Check if still inside mold
    if (!this.isInsideMold()) {
      this.age = this.maxAge; // Mark for removal
    }

    return this.age < this.maxAge;
  }

  getColor() {
    const speed = this.velocity.length();
    const maxSpeed = (this.flowData.flowRate || 0.1) * 0.015;
    return getVelocityColor(speed, maxSpeed);
  }

  getOpacity() {
    // Fade in at start, fade out at end
    if (this.age < 0.2) return this.age / 0.2;
    if (this.age > this.maxAge - 0.5) return (this.maxAge - this.age) / 0.5;
    return 1;
  }
}

/**
 * Flow Particle System Component
 */
export const FlowParticleSystem = ({
  flowData = {},
  moldDimensions = {},
  moldShape = 'rectangular',
  injectionPoint = [0, 0, 0],
  enabled = true,
  particleCount = 2000
}) => {
  const meshRef = useRef();
  const particlesRef = useRef([]);
  const timeRef = useRef(0);

  // Create particle geometry and material
  const { geometry, material } = useMemo(() => {
    const geom = new THREE.SphereGeometry(0.02, 8, 8);
    const mat = new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: 0.8,
      depthWrite: false
    });
    return { geometry: geom, material: mat };
  }, []);

  // Initialize particle pool
  useEffect(() => {
    if (!enabled) return;

    particlesRef.current = [];
    for (let i = 0; i < particleCount; i++) {
      // Stagger initial spawning
      const delay = (i / particleCount) * 2;
      setTimeout(() => {
        if (enabled && particlesRef.current.length < particleCount) {
          const particle = new Particle(
            injectionPoint,
            flowData,
            moldDimensions,
            moldShape
          );
          particlesRef.current.push(particle);
        }
      }, delay * 1000);
    }

    return () => {
      particlesRef.current = [];
    };
  }, [enabled, flowData, moldDimensions, moldShape, injectionPoint, particleCount]);

  // Update particles each frame
  useFrame((state, delta) => {
    if (!enabled || !meshRef.current) return;

    timeRef.current += delta;

    const mesh = meshRef.current;
    const particles = particlesRef.current;

    // Spawn new particles at injection point
    const spawnRate = (flowData.flowRate || 0.1) * 10; // particles per second
    const particlesToSpawn = Math.floor(spawnRate * delta);

    for (let i = 0; i < particlesToSpawn && particles.length < particleCount; i++) {
      particles.push(new Particle(
        injectionPoint,
        flowData,
        moldDimensions,
        moldShape
      ));
    }

    // Update existing particles
    for (let i = particles.length - 1; i >= 0; i--) {
      const particle = particles[i];
      const alive = particle.update(delta);

      if (!alive) {
        particles.splice(i, 1);
      }
    }

    // Update instance matrices
    const dummy = new THREE.Object3D();
    particles.forEach((particle, i) => {
      if (i >= mesh.count) return;

      dummy.position.copy(particle.position);
      dummy.scale.setScalar(particle.size);
      dummy.updateMatrix();

      mesh.setMatrixAt(i, dummy.matrix);
      mesh.setColorAt(i, particle.getColor());

      // Update opacity (would need custom shader for per-instance opacity)
    });

    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  });

  if (!enabled) return null;

  return (
    <instancedMesh
      ref={meshRef}
      args={[geometry, material, particleCount]}
      frustumCulled={false}
    />
  );
};

export default FlowParticleSystem;
