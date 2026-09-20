import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

interface CityHotspot {
  name: string;
  state: string;
  lat: number;
  lon: number;
  temp: number;
  risk: 'EXTREME' | 'VERY HIGH' | 'HIGH' | 'MODERATE';
  htsi: number;
  wbgt: number;
  color: string;
}

const INDIAN_HOTSPOTS: CityHotspot[] = [
  { name: 'Delhi NCR', state: 'Delhi', lat: 28.6139, lon: 77.2090, temp: 44.5, risk: 'EXTREME', htsi: 88.2, wbgt: 32.4, color: '#ef4444' },
  { name: 'Ahmedabad', state: 'Gujarat', lat: 23.0225, lon: 72.5714, temp: 43.8, risk: 'EXTREME', htsi: 86.4, wbgt: 31.8, color: '#ef4444' },
  { name: 'Chennai', state: 'Tamil Nadu', lat: 13.0827, lon: 80.2707, temp: 39.4, risk: 'VERY HIGH', htsi: 84.1, wbgt: 31.2, color: '#f97316' },
  { name: 'Nagpur', state: 'Maharashtra', lat: 21.1458, lon: 79.0882, temp: 44.1, risk: 'EXTREME', htsi: 87.5, wbgt: 31.5, color: '#ef4444' },
  { name: 'Hyderabad', state: 'Telangana', lat: 17.3850, lon: 78.4867, temp: 41.2, risk: 'VERY HIGH', htsi: 82.3, wbgt: 30.6, color: '#f97316' },
  { name: 'Kolkata', state: 'West Bengal', lat: 22.5726, lon: 88.3639, temp: 38.6, risk: 'VERY HIGH', htsi: 83.9, wbgt: 31.6, color: '#f97316' },
  { name: 'Mumbai', state: 'Maharashtra', lat: 19.0760, lon: 72.8777, temp: 36.8, risk: 'HIGH', htsi: 79.8, wbgt: 30.1, color: '#eab308' },
  { name: 'Lucknow', state: 'Uttar Pradesh', lat: 26.8467, lon: 80.9462, temp: 42.6, risk: 'EXTREME', htsi: 85.7, wbgt: 31.4, color: '#ef4444' },
];

// Coordinate helper to convert Lat/Lon to 3D Sphere Position
function latLonToVector3(lat: number, lon: number, radius: number): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);
  const x = -(radius * Math.sin(phi) * Math.cos(theta));
  const z = radius * Math.sin(phi) * Math.sin(theta);
  const y = radius * Math.cos(phi);
  return new THREE.Vector3(x, y, z);
}

interface InteractiveGlobeProps {
  onSelectCity?: (city: CityHotspot) => void;
}

export const InteractiveGlobe: React.FC<InteractiveGlobeProps> = ({ onSelectCity }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [selectedCity, setSelectedCity] = useState<CityHotspot>(INDIAN_HOTSPOTS[2]); // Default Chennai
  const [isRotating, setIsRotating] = useState(true);

  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    const width = container.clientWidth || 600;
    const height = container.clientHeight || 500;

    // Scene, Camera, Renderer
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.z = 240;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    // Globe Group for rotation
    const globeGroup = new THREE.Group();
    scene.add(globeGroup);

    // 1. Earth Sphere Core
    const globeRadius = 80;
    const sphereGeometry = new THREE.SphereGeometry(globeRadius, 64, 64);
    const sphereMaterial = new THREE.MeshPhongMaterial({
      color: 0x0a1628,
      emissive: 0x050c18,
      specular: 0x1e3a8a,
      shininess: 15,
      wireframe: false,
    });
    const globeMesh = new THREE.Mesh(sphereGeometry, sphereMaterial);
    globeGroup.add(globeMesh);

    // 2. Glowing Lat/Lon Wireframe Grid
    const wireGeometry = new THREE.SphereGeometry(globeRadius + 0.3, 36, 18);
    const wireMaterial = new THREE.MeshBasicMaterial({
      color: 0x1e40af,
      wireframe: true,
      transparent: true,
      opacity: 0.18,
    });
    const wireMesh = new THREE.Mesh(wireGeometry, wireMaterial);
    globeGroup.add(wireMesh);

    // 3. Atmospheric Outer Halo
    const glowGeometry = new THREE.SphereGeometry(globeRadius + 4, 32, 32);
    const glowMaterial = new THREE.ShaderMaterial({
      uniforms: {
        glowColor: { value: new THREE.Color(0x38bdf8) },
        viewVector: { value: camera.position },
      },
      vertexShader: `
        uniform vec3 viewVector;
        varying float intensity;
        void main() {
          vec3 vNormal = normalize(normalMatrix * normal);
          vec3 vNormel = normalize(normalMatrix * viewVector);
          intensity = pow(0.65 - dot(vNormal, vNormel), 2.0);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 glowColor;
        varying float intensity;
        void main() {
          vec3 glow = glowColor * intensity;
          gl_FragColor = vec4(glow, intensity * 0.5);
        }
      `,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
      transparent: true,
    });
    const glowMesh = new THREE.Mesh(glowGeometry, glowMaterial);
    scene.add(glowMesh);

    // 4. City Hotspot Markers and Rings
    const markerGroup = new THREE.Group();
    globeGroup.add(markerGroup);

    const markerMeshes: { mesh: THREE.Mesh; city: CityHotspot }[] = [];
    const pulsingRings: { mesh: THREE.Mesh; initialScale: number }[] = [];

    INDIAN_HOTSPOTS.forEach((city) => {
      const pos = latLonToVector3(city.lat, city.lon, globeRadius + 1.2);

      // Core Hotspot Dot
      const dotGeometry = new THREE.SphereGeometry(1.6, 16, 16);
      const dotMaterial = new THREE.MeshBasicMaterial({
        color: new THREE.Color(city.color),
      });
      const dot = new THREE.Mesh(dotGeometry, dotMaterial);
      dot.position.copy(pos);
      markerGroup.add(dot);
      markerMeshes.push({ mesh: dot, city });

      // Pulsing Thermal Ring
      const ringGeometry = new THREE.RingGeometry(2.0, 3.5, 32);
      const ringMaterial = new THREE.MeshBasicMaterial({
        color: new THREE.Color(city.color),
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.7,
      });
      const ring = new THREE.Mesh(ringGeometry, ringMaterial);
      ring.position.copy(pos);
      ring.lookAt(new THREE.Vector3(0, 0, 0));
      markerGroup.add(ring);
      pulsingRings.push({ mesh: ring, initialScale: 1.0 });

      // Arc Pillar / Beam
      const beamGeometry = new THREE.CylinderGeometry(0.2, 0.4, 6, 8);
      const beamMaterial = new THREE.MeshBasicMaterial({
        color: new THREE.Color(city.color),
        transparent: true,
        opacity: 0.8,
      });
      const beam = new THREE.Mesh(beamGeometry, beamMaterial);
      const beamPos = latLonToVector3(city.lat, city.lon, globeRadius + 3.5);
      beam.position.copy(beamPos);
      beam.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), pos.clone().normalize());
      markerGroup.add(beam);
    });

    // 5. Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.85);
    scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0x60a5fa, 1.8);
    dirLight1.position.set(150, 100, 150);
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0xf97316, 0.6);
    dirLight2.position.set(-150, -100, -100);
    scene.add(dirLight2);

    // Initial orientation: Center on India (approx lat 20°, lon 78°)
    // Convert to globe rotation
    globeGroup.rotation.y = -Math.PI / 2 - (78 * Math.PI / 180);
    globeGroup.rotation.x = (20 * Math.PI / 180);

    // Mouse Interaction (Drag to rotate & Raycasting)
    let isDragging = false;
    let previousMousePosition = { x: 0, y: 0 };
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const onMouseDown = (e: MouseEvent) => {
      isDragging = true;
      setIsRotating(false);
      previousMousePosition = { x: e.clientX, y: e.clientY };
    };

    const onMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / container.clientWidth) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / container.clientHeight) * 2 + 1;

      if (isDragging) {
        const deltaX = e.clientX - previousMousePosition.x;
        const deltaY = e.clientY - previousMousePosition.y;

        globeGroup.rotation.y += deltaX * 0.005;
        globeGroup.rotation.x += deltaY * 0.005;

        // Clamp x rotation to avoid upside-down flip
        globeGroup.rotation.x = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, globeGroup.rotation.x));
        previousMousePosition = { x: e.clientX, y: e.clientY };
      }
    };

    const onMouseUp = () => {
      isDragging = false;
    };

    const onClick = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / container.clientWidth) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / container.clientHeight) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const hits = raycaster.intersectObjects(markerMeshes.map(m => m.mesh));
      if (hits.length > 0) {
        const clickedMesh = hits[0].object;
        const found = markerMeshes.find(m => m.mesh === clickedMesh);
        if (found) {
          setSelectedCity(found.city);
          if (onSelectCity) onSelectCity(found.city);
        }
      }
    };

    const domEl = renderer.domElement;
    domEl.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    domEl.addEventListener('click', onClick);

    // Animation Loop
    let animationFrameId: number;
    let pulseTime = 0;

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      if (isRotating && !isDragging) {
        globeGroup.rotation.y += 0.0018;
      }

      pulseTime += 0.035;
      pulsingRings.forEach((ring, idx) => {
        const scale = 1.0 + 0.35 * Math.sin(pulseTime + idx * 0.5);
        ring.mesh.scale.set(scale, scale, 1);
        const mat = ring.mesh.material as THREE.MeshBasicMaterial;
        mat.opacity = 0.8 - (scale - 1.0) * 1.5;
      });

      renderer.render(scene, camera);
    };

    animate();

    // Resize Handler
    const handleResize = () => {
      if (!containerRef.current) return;
      const newWidth = containerRef.current.clientWidth;
      const newHeight = containerRef.current.clientHeight;
      camera.aspect = newWidth / newHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(newWidth, newHeight);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animationFrameId);
      domEl.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      domEl.removeEventListener('click', onClick);
      window.removeEventListener('resize', handleResize);
      if (container.contains(domEl)) {
        container.removeChild(domEl);
      }
      renderer.dispose();
    };
  }, [isRotating, onSelectCity]);

  return (
    <div className="relative w-full h-[520px] flex items-center justify-center select-none overflow-hidden rounded-2xl bg-gradient-to-b from-[#060b14] via-[#091322] to-[#040810] border border-slate-800/80 shadow-2xl">
      {/* 3D WebGL Canvas Container */}
      <div ref={containerRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

      {/* Floating Controls Overlay */}
      <div className="absolute top-4 left-4 z-10 flex items-center gap-2">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-950/80 text-blue-400 border border-blue-700/50 backdrop-blur-md">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          LIVE 3D EARTH • INDIA SURVEILLANCE
        </span>
        <button
          onClick={() => setIsRotating(!isRotating)}
          className="px-2.5 py-1 text-xs font-medium rounded-lg bg-slate-900/80 text-slate-300 border border-slate-700 hover:border-slate-500 backdrop-blur-md transition-colors"
        >
          {isRotating ? 'Pause Orbit' : 'Resume Orbit'}
        </button>
      </div>

      {/* Selected Hotspot Detail Card (Bottom Right Floating Glass Panel) */}
      <div className="absolute bottom-4 right-4 z-10 max-w-xs w-full bg-slate-950/85 backdrop-blur-xl border border-slate-800 p-4 rounded-xl shadow-2xl text-slate-200">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: selectedCity.color }} />
              {selectedCity.name}
            </h4>
            <span className="text-[11px] text-slate-400">{selectedCity.state} • India</span>
          </div>
          <span
            className="text-[10px] font-bold px-2 py-0.5 rounded"
            style={{
              backgroundColor: selectedCity.risk === 'EXTREME' ? 'rgba(239,68,68,0.2)' : 'rgba(249,115,22,0.2)',
              color: selectedCity.color,
              border: `1px solid ${selectedCity.color}55`,
            }}
          >
            {selectedCity.risk} RISK
          </span>
        </div>

        <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-800/80 text-center">
          <div className="bg-slate-900/60 p-2 rounded-lg border border-slate-800">
            <span className="text-[10px] block text-slate-400 uppercase font-semibold">Ambient</span>
            <span className="text-base font-black text-amber-300">{selectedCity.temp}°C</span>
          </div>
          <div className="bg-slate-900/60 p-2 rounded-lg border border-slate-800">
            <span className="text-[10px] block text-slate-400 uppercase font-semibold">WBGT</span>
            <span className="text-base font-black text-orange-400">{selectedCity.wbgt}°C</span>
          </div>
          <div className="bg-slate-900/60 p-2 rounded-lg border border-slate-800">
            <span className="text-[10px] block text-slate-400 uppercase font-semibold">HTSI</span>
            <span className="text-base font-black text-red-400">{selectedCity.htsi}</span>
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400">
          <span>Click hotspot or drag to inspect</span>
          <span className="text-blue-400 font-medium">3D Geospatial</span>
        </div>
      </div>
    </div>
  );
};
