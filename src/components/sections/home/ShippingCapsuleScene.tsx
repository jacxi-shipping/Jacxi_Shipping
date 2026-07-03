'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

interface ShippingCapsuleSceneProps {
  className?: string;
}

type Parent3D = THREE.Scene | THREE.Group;

function cssColor(name: string, fallback: string) {
  if (typeof window === 'undefined') return fallback;
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value || fallback;
}

function addBox(parent: Parent3D, size: [number, number, number], position: [number, number, number], material: THREE.Material) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(size[0], size[1], size[2]), material);
  mesh.position.set(position[0], position[1], position[2]);
  parent.add(mesh);
  return mesh;
}

function addRoundedBox(
  parent: Parent3D,
  size: [number, number, number],
  position: [number, number, number],
  material: THREE.Material,
  radius = 0.08,
  segments = 4,
) {
  const mesh = new THREE.Mesh(new RoundedBoxGeometry(size[0], size[1], size[2], segments, radius), material);
  mesh.position.set(position[0], position[1], position[2]);
  parent.add(mesh);
  return mesh;
}

function addSuvBody(parent: Parent3D, material: THREE.Material) {
  const shape = new THREE.Shape();
  shape.moveTo(-2.95, -0.54);
  shape.lineTo(2.64, -0.54);
  shape.bezierCurveTo(2.92, -0.48, 3.06, -0.26, 2.96, -0.03);
  shape.bezierCurveTo(2.76, 0.32, 2.43, 0.48, 2.04, 0.58);
  shape.bezierCurveTo(1.67, 0.90, 1.06, 1.05, 0.12, 1.06);
  shape.lineTo(-0.78, 1.03);
  shape.bezierCurveTo(-1.28, 0.98, -1.65, 0.78, -1.98, 0.48);
  shape.lineTo(-2.54, 0.34);
  shape.bezierCurveTo(-2.88, 0.26, -3.06, 0.06, -3.02, -0.20);
  shape.lineTo(-2.95, -0.54);

  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: 1.9,
    bevelEnabled: true,
    bevelThickness: 0.055,
    bevelSize: 0.075,
    bevelSegments: 5,
    curveSegments: 16,
  });
  geometry.translate(0, 0, -0.95);
  geometry.computeVertexNormals();

  const mesh = new THREE.Mesh(geometry, material);
  parent.add(mesh);
  return mesh;
}

function addGlassStrip(
  parent: Parent3D,
  position: [number, number, number],
  scale: [number, number, number],
  material: THREE.Material,
  rotationZ = 0,
) {
  const mesh = addRoundedBox(parent, scale, position, material, 0.035, 4);
  mesh.rotation.z = rotationZ;
  return mesh;
}

function addCylinderBetween(
  parent: Parent3D,
  start: THREE.Vector3,
  end: THREE.Vector3,
  radius: number,
  material: THREE.Material,
) {
  const direction = new THREE.Vector3().subVectors(end, start);
  const length = direction.length();
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, length, 12), material);
  mesh.position.copy(start).add(end).multiplyScalar(0.5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
  parent.add(mesh);
  return mesh;
}

function addWheel(parent: Parent3D, position: [number, number, number], materials: { tire: THREE.Material; rim: THREE.Material; hub: THREE.Material }) {
  const wheel = new THREE.Group();
  wheel.position.set(position[0], position[1], position[2]);
  parent.add(wheel);

  const tire = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.105, 14, 48), materials.tire);
  wheel.add(tire);

  const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.10, 42), materials.rim);
  rim.rotation.x = Math.PI / 2;
  wheel.add(rim);

  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.12, 28), materials.hub);
  hub.rotation.x = Math.PI / 2;
  wheel.add(hub);

  for (let index = 0; index < 8; index += 1) {
    const spoke = addBox(wheel, [0.22, 0.025, 0.025], [0.09, 0, 0], materials.rim);
    spoke.rotation.z = (Math.PI / 4) * index;
  }

  return wheel;
}

export default function ShippingCapsuleScene({ className }: ShippingCapsuleSceneProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const mount = mountRef.current;
    const canvas = canvasRef.current;
    if (!mount || !canvas) return;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const isMobile = window.matchMedia('(max-width: 767px)').matches;
    const accent = cssColor('--accent-gold', '#D4AF37');
    const textPrimary = cssColor('--text-primary', '#1C1C1E');
    const panel = cssColor('--panel', '#FFFFFF');

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(31, 1, 0.1, 100);
    camera.position.set(8.7, 3.4, 7.5);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: !isMobile,
      powerPreference: 'high-performance',
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.setClearColor(0x000000, 0);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobile ? 1.15 : 1.65));

    const root = new THREE.Group();
    const rootBaseY = isMobile ? 0.82 : -0.28;
    root.rotation.set(-0.05, -0.42, 0.02);
    root.position.set(0.2, rootBaseY, 0);
    root.scale.setScalar(isMobile ? 0.76 : 0.84);
    scene.add(root);

    const capsuleRoot = new THREE.Group();
    root.add(capsuleRoot);

    const vehicleRoot = new THREE.Group();
    vehicleRoot.position.set(0, -0.36, 0);
    root.add(vehicleRoot);

    const glassMaterial = new THREE.MeshPhysicalMaterial({
      color: '#EAF4FF',
      transparent: true,
      opacity: 0.25,
      roughness: 0.08,
      metalness: 0,
      transmission: 0.35,
      thickness: 0.3,
      clearcoat: 1,
      side: THREE.DoubleSide,
    });

    const edgeGlassMaterial = new THREE.MeshPhysicalMaterial({
      color: '#D9E9F7',
      transparent: true,
      opacity: 0.34,
      roughness: 0.06,
      transmission: 0.28,
      clearcoat: 1,
    });

    const glassGlintMaterial = new THREE.MeshBasicMaterial({
      color: '#FFFFFF',
      transparent: true,
      opacity: 0.26,
      side: THREE.DoubleSide,
    });

    const chromeMaterial = new THREE.MeshStandardMaterial({
      color: '#D8DDE3',
      metalness: 0.92,
      roughness: 0.16,
    });

    const darkMetalMaterial = new THREE.MeshStandardMaterial({
      color: textPrimary,
      metalness: 0.72,
      roughness: 0.34,
    });

    const glossBlackMaterial = new THREE.MeshPhysicalMaterial({
      color: '#080A0C',
      metalness: 0.18,
      roughness: 0.22,
      clearcoat: 0.7,
      clearcoatRoughness: 0.18,
    });

    const tireMaterial = new THREE.MeshStandardMaterial({
      color: '#101113',
      roughness: 0.88,
    });

    const carPaintMaterial = new THREE.MeshPhysicalMaterial({
      color: '#EEF1F4',
      metalness: 0.64,
      roughness: 0.18,
      clearcoat: 1,
      clearcoatRoughness: 0.12,
    });

    const windowMaterial = new THREE.MeshPhysicalMaterial({
      color: '#17212A',
      transparent: true,
      opacity: 0.72,
      roughness: 0.08,
      metalness: 0,
      clearcoat: 1,
    });

    const ledMaterial = new THREE.MeshStandardMaterial({
      color: accent,
      emissive: accent,
      emissiveIntensity: 1.8,
      roughness: 0.22,
    });

    const headlightMaterial = new THREE.MeshStandardMaterial({
      color: panel,
      emissive: '#F8FBFF',
      emissiveIntensity: 1.5,
      roughness: 0.18,
    });

    const tailLightMaterial = new THREE.MeshStandardMaterial({
      color: '#C8332C',
      emissive: '#E83932',
      emissiveIntensity: 1.2,
      roughness: 0.24,
    });

    addRoundedBox(capsuleRoot, [9.2, 0.18, 3.7], [0, -1.03, 0], darkMetalMaterial, 0.10, 5);
    addRoundedBox(capsuleRoot, [8.55, 0.10, 3.16], [0, -0.88, 0], chromeMaterial, 0.08, 4);

    [-0.94, 0, 0.94].forEach((z) => {
      addRoundedBox(capsuleRoot, [8.1, 0.055, 0.08], [0, -0.78, z], chromeMaterial, 0.03, 3);
    });

    addRoundedBox(capsuleRoot, [8.28, 2.35, 0.055], [0, 0.28, 1.74], glassMaterial, 0.055, 4);
    addRoundedBox(capsuleRoot, [8.28, 2.35, 0.055], [0, 0.28, -1.74], glassMaterial, 0.055, 4);
    addRoundedBox(capsuleRoot, [0.055, 2.35, 3.1], [-4.35, 0.28, 0], glassMaterial, 0.055, 4);
    addRoundedBox(capsuleRoot, [0.055, 2.35, 3.1], [4.35, 0.28, 0], glassMaterial, 0.055, 4);

    [-4.42, 4.42].forEach((x) => {
      [-1.77, 1.77].forEach((z) => {
        addRoundedBox(capsuleRoot, [0.12, 2.7, 0.12], [x, 0.27, z], chromeMaterial, 0.04, 4);
      });
    });

    [-1.77, 1.77].forEach((z) => {
      addRoundedBox(capsuleRoot, [9.0, 0.10, 0.10], [0, -0.68, z], chromeMaterial, 0.04, 4);
      addRoundedBox(capsuleRoot, [9.0, 0.10, 0.10], [0, 1.63, z], chromeMaterial, 0.04, 4);
      addRoundedBox(capsuleRoot, [8.2, 0.038, 0.045], [0, -0.55, z > 0 ? 1.55 : -1.55], ledMaterial, 0.018, 3);
      addRoundedBox(capsuleRoot, [8.0, 0.038, 0.045], [0, 1.44, z > 0 ? 1.55 : -1.55], ledMaterial, 0.018, 3);
    });

    [-4.42, 4.42].forEach((x) => {
      addRoundedBox(capsuleRoot, [0.10, 0.10, 3.64], [x, -0.68, 0], chromeMaterial, 0.04, 4);
      addRoundedBox(capsuleRoot, [0.10, 0.10, 3.64], [x, 1.63, 0], chromeMaterial, 0.04, 4);
    });

    const lidPivot = new THREE.Group();
    lidPivot.position.set(0, 1.64, -1.77);
    capsuleRoot.add(lidPivot);
    addRoundedBox(lidPivot, [8.45, 0.08, 3.50], [0, 0.04, 1.77], edgeGlassMaterial, 0.08, 5);
    addRoundedBox(lidPivot, [8.55, 0.11, 0.10], [0, 0.05, 3.52], chromeMaterial, 0.04, 4);
    addRoundedBox(lidPivot, [8.55, 0.11, 0.10], [0, 0.05, 0], chromeMaterial, 0.04, 4);
    addRoundedBox(lidPivot, [0.12, 0.11, 3.52], [-4.42, 0.05, 1.77], chromeMaterial, 0.04, 4);
    addRoundedBox(lidPivot, [0.12, 0.11, 3.52], [4.42, 0.05, 1.77], chromeMaterial, 0.04, 4);

    const sideGlint = addRoundedBox(capsuleRoot, [0.030, 1.48, 0.018], [3.55, 0.42, 1.785], glassGlintMaterial, 0.012, 2);
    sideGlint.rotation.z = -0.42;
    const rearGlint = addRoundedBox(capsuleRoot, [0.022, 1.18, 0.018], [4.385, 0.48, -0.65], glassGlintMaterial, 0.012, 2);
    rearGlint.rotation.z = 0.38;

    addSuvBody(vehicleRoot, carPaintMaterial);
    addRoundedBox(vehicleRoot, [5.88, 0.18, 2.08], [0, -0.58, 0], glossBlackMaterial, 0.08, 5);
    addRoundedBox(vehicleRoot, [2.62, 0.08, 1.46], [0.02, 1.05, 0], carPaintMaterial, 0.08, 5);
    addRoundedBox(vehicleRoot, [1.55, 0.045, 0.96], [-0.34, 1.10, 0], windowMaterial, 0.05, 5);

    [0.98, -0.98].forEach((zSide) => {
      const side = zSide > 0 ? 1 : -1;
      addGlassStrip(vehicleRoot, [-1.18, 0.62, zSide], [0.86, 0.36, 0.035], windowMaterial, -0.19);
      addGlassStrip(vehicleRoot, [-0.22, 0.70, zSide], [0.92, 0.42, 0.035], windowMaterial, 0.02);
      addGlassStrip(vehicleRoot, [0.82, 0.66, zSide], [0.78, 0.38, 0.035], windowMaterial, 0.16);
      addRoundedBox(vehicleRoot, [2.92, 0.035, 0.055], [-0.16, 0.98, zSide], glossBlackMaterial, 0.02, 3);
      addRoundedBox(vehicleRoot, [1.40, 0.030, 0.050], [-0.52, 0.02, zSide + side * 0.03], glossBlackMaterial, 0.02, 3);
      addRoundedBox(vehicleRoot, [0.20, 0.04, 0.035], [-0.34, 0.08, zSide + side * 0.05], chromeMaterial, 0.01, 3);
      addRoundedBox(vehicleRoot, [0.24, 0.16, 0.08], [-1.48, 0.52, zSide + side * 0.11], carPaintMaterial, 0.035, 4);
      addRoundedBox(vehicleRoot, [0.20, 0.055, 0.045], [-1.34, 0.48, zSide + side * 0.05], glossBlackMaterial, 0.018, 3);
    });

    const windshield = addRoundedBox(vehicleRoot, [0.065, 0.52, 1.32], [-1.72, 0.58, 0], windowMaterial, 0.04, 4);
    windshield.rotation.z = -0.34;
    const rearWindow = addRoundedBox(vehicleRoot, [0.065, 0.44, 1.22], [1.78, 0.48, 0], windowMaterial, 0.04, 4);
    rearWindow.rotation.z = 0.24;
    addRoundedBox(vehicleRoot, [0.060, 0.42, 1.04], [3.03, 0.33, 0], windowMaterial, 0.035, 4);
    addRoundedBox(vehicleRoot, [0.20, 0.07, 1.46], [2.78, 0.90, 0], carPaintMaterial, 0.035, 4);

    addRoundedBox(vehicleRoot, [2.15, 0.035, 0.055], [-1.42, 0.28, 0], chromeMaterial, 0.015, 3);
    addRoundedBox(vehicleRoot, [2.20, 0.035, 0.045], [0.76, 0.18, 0], chromeMaterial, 0.015, 3);
    addRoundedBox(vehicleRoot, [3.18, 0.055, 0.055], [-0.03, 1.18, 0.72], chromeMaterial, 0.02, 3);
    addRoundedBox(vehicleRoot, [3.18, 0.055, 0.055], [-0.03, 1.18, -0.72], chromeMaterial, 0.02, 3);

    addRoundedBox(vehicleRoot, [0.08, 0.40, 0.94], [-2.90, -0.06, 0], glossBlackMaterial, 0.035, 4);
    addRoundedBox(vehicleRoot, [0.055, 0.12, 1.02], [-2.96, 0.17, 0], headlightMaterial, 0.025, 4);
    addRoundedBox(vehicleRoot, [0.075, 0.26, 1.12], [2.91, -0.04, 0], glossBlackMaterial, 0.035, 4);
    addRoundedBox(vehicleRoot, [0.10, 0.24, 1.76], [3.00, -0.42, 0], glossBlackMaterial, 0.04, 4);
    addRoundedBox(vehicleRoot, [0.050, 0.16, 0.48], [3.05, -0.18, 0], chromeMaterial, 0.018, 3);
    [-0.58, 0.58].forEach((z) => {
      addRoundedBox(vehicleRoot, [0.060, 0.14, 0.36], [-2.99, 0.11, z], headlightMaterial, 0.02, 4);
      addRoundedBox(vehicleRoot, [0.065, 0.18, 0.38], [3.06, 0.07, z], tailLightMaterial, 0.02, 4);
      addRoundedBox(vehicleRoot, [0.052, 0.055, 0.30], [3.08, -0.24, z], chromeMaterial, 0.015, 3);
    });

    [-2.12, 2.12].forEach((x) => {
      [1.03, -1.03].forEach((z) => {
        const arch = new THREE.Mesh(new THREE.TorusGeometry(0.48, 0.035, 8, 38, Math.PI), glossBlackMaterial);
        arch.position.set(x, -0.54, z);
        arch.rotation.z = 0;
        vehicleRoot.add(arch);
      });
    });

    addRoundedBox(vehicleRoot, [0.38, 0.38, 0.32], [-0.76, 0.00, 0.38], glossBlackMaterial, 0.04, 4);
    addRoundedBox(vehicleRoot, [0.38, 0.38, 0.32], [-0.76, 0.00, -0.38], glossBlackMaterial, 0.04, 4);
    addRoundedBox(vehicleRoot, [0.64, 0.34, 1.06], [0.42, 0.00, 0], glossBlackMaterial, 0.05, 4);

    const wheels = [
      addWheel(vehicleRoot, [-2.12, -0.58, 1.00], { tire: tireMaterial, rim: chromeMaterial, hub: darkMetalMaterial }),
      addWheel(vehicleRoot, [2.12, -0.58, 1.00], { tire: tireMaterial, rim: chromeMaterial, hub: darkMetalMaterial }),
      addWheel(vehicleRoot, [-2.12, -0.58, -1.00], { tire: tireMaterial, rim: chromeMaterial, hub: darkMetalMaterial }),
      addWheel(vehicleRoot, [2.12, -0.58, -1.00], { tire: tireMaterial, rim: chromeMaterial, hub: darkMetalMaterial }),
    ];

    const leftDoor = new THREE.Group();
    leftDoor.position.set(-1.38, -0.07, 0.96);
    vehicleRoot.add(leftDoor);
    addRoundedBox(leftDoor, [1.24, 0.64, 0.035], [0.56, 0, 0], carPaintMaterial, 0.04, 4);
    addRoundedBox(leftDoor, [1.04, 0.30, 0.03], [0.56, 0.35, 0.01], windowMaterial, 0.03, 4);

    const rightDoor = new THREE.Group();
    rightDoor.position.set(-1.38, -0.07, -0.96);
    vehicleRoot.add(rightDoor);
    addRoundedBox(rightDoor, [1.24, 0.64, 0.035], [0.56, 0, 0], carPaintMaterial, 0.04, 4);
    addRoundedBox(rightDoor, [1.04, 0.30, 0.03], [0.56, 0.35, -0.01], windowMaterial, 0.03, 4);

    const strapMaterial = new THREE.MeshStandardMaterial({ color: '#151719', roughness: 0.78 });
    [
      [new THREE.Vector3(-2.72, -0.72, 1.28), new THREE.Vector3(-2.12, -0.30, 1.02)],
      [new THREE.Vector3(-1.58, -0.72, 1.28), new THREE.Vector3(-2.12, -0.84, 1.02)],
      [new THREE.Vector3(1.58, -0.72, 1.28), new THREE.Vector3(2.12, -0.84, 1.02)],
      [new THREE.Vector3(2.72, -0.72, 1.28), new THREE.Vector3(2.12, -0.30, 1.02)],
      [new THREE.Vector3(-2.72, -0.72, -1.28), new THREE.Vector3(-2.12, -0.30, -1.02)],
      [new THREE.Vector3(2.72, -0.72, -1.28), new THREE.Vector3(2.12, -0.30, -1.02)],
    ].forEach(([start, end]) => addCylinderBetween(capsuleRoot, start, end, 0.022, strapMaterial));

    const routeRingMaterial = new THREE.MeshBasicMaterial({
      color: accent,
      transparent: true,
      opacity: 0.28,
      side: THREE.DoubleSide,
    });
    const halo = new THREE.Mesh(new THREE.TorusGeometry(4.85, 0.012, 10, 140), routeRingMaterial);
    halo.rotation.x = Math.PI / 2.16;
    halo.position.set(0, -0.68, 0);
    root.add(halo);

    scene.add(new THREE.AmbientLight('#FFFFFF', 1.8));
    const keyLight = new THREE.DirectionalLight('#FFFFFF', 2.2);
    keyLight.position.set(-4, 6, 5);
    scene.add(keyLight);

    const rimLight = new THREE.PointLight(accent, 6, 15);
    rimLight.position.set(3.8, 2.0, -3.8);
    scene.add(rimLight);

    const fillLight = new THREE.PointLight('#FFFFFF', 2.1, 12);
    fillLight.position.set(-3.4, 1.8, 3.4);
    scene.add(fillLight);

    let targetRotationX = root.rotation.x;
    let targetRotationY = root.rotation.y;
    const startTime = performance.now();
    let animationFrame = 0;

    const render = () => {
      const rect = mount.getBoundingClientRect();
      const width = Math.max(1, Math.floor(rect.width));
      const height = Math.max(1, Math.floor(rect.height));
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.render(scene, camera);
    };

    const resizeObserver = new ResizeObserver(render);
    resizeObserver.observe(mount);

    const handlePointerMove = (event: PointerEvent) => {
      if (isMobile || prefersReducedMotion) return;
      const rect = mount.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width - 0.5;
      const y = (event.clientY - rect.top) / rect.height - 0.5;
      targetRotationY = -0.42 + x * 0.24;
      targetRotationX = -0.05 - y * 0.10;
    };
    mount.addEventListener('pointermove', handlePointerMove);

    const animate = () => {
      const elapsed = (performance.now() - startTime) / 1000;
      const doorCycle = (Math.sin(elapsed * 0.75 - 0.9) + 1) * 0.5;
      const easedDoor = doorCycle * doorCycle * (3 - 2 * doorCycle);
      const lidCycle = (Math.sin(elapsed * 0.68 - 0.35) + 1) * 0.5;
      const easedLid = lidCycle * lidCycle * (3 - 2 * lidCycle);

      root.rotation.x += (targetRotationX - root.rotation.x) * 0.04;
      root.rotation.y += (targetRotationY - root.rotation.y) * 0.04;
      root.position.y = rootBaseY + Math.sin(elapsed * 0.7) * 0.045;

      lidPivot.rotation.x = -easedLid * 0.82;
      leftDoor.rotation.y = easedDoor * 0.64;
      rightDoor.rotation.y = -easedDoor * 0.64;
      halo.rotation.z = elapsed * 0.08;

      wheels.forEach((wheel) => {
        wheel.rotation.z = elapsed * 0.36;
      });

      ledMaterial.emissiveIntensity = 1.55 + Math.sin(elapsed * 2.4) * 0.35;
      rimLight.intensity = 5.4 + Math.sin(elapsed * 2.2) * 0.9;

      render();
      animationFrame = window.requestAnimationFrame(animate);
    };

    if (prefersReducedMotion) {
      lidPivot.rotation.x = -0.52;
      leftDoor.rotation.y = 0.34;
      rightDoor.rotation.y = -0.34;
      render();
    } else {
      animate();
    }

    return () => {
      window.cancelAnimationFrame(animationFrame);
      resizeObserver.disconnect();
      mount.removeEventListener('pointermove', handlePointerMove);
      renderer.dispose();
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          object.geometry.dispose();
          const material = object.material;
          if (Array.isArray(material)) {
            material.forEach((item) => item.dispose());
          } else {
            material.dispose();
          }
        }
      });
    };
  }, []);

  return (
    <div ref={mountRef} className={className}>
      <canvas
        ref={canvasRef}
        aria-label="Animated 3D SUV secured inside a glass international shipping capsule"
        className="h-full w-full"
      />
    </div>
  );
}
