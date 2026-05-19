import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { motion, AnimatePresence } from 'framer-motion';

export type LoaderScenario = 
  | 'general-load' 
  | 'deep-research' 
  | 'pdf-export' 
  | 'graph-system' 
  | 'premium-validation' 
  | 'extension-analysis';

interface IntelligenceLoaderProps {
  scenario?: LoaderScenario;
  label?: string; // Optional custom label
  className?: string;
}

const SCENARIOS = {
  'general-load': ['Initializing Workspace', 'Synchronizing Interface', 'Establishing Secure Handshake'],
  'deep-research': ['Analyzing Research Context', 'Generating Structured Intelligence', 'Resolving Multi-Model Synthesis'],
  'pdf-export': ['Preparing Intelligence Report', 'Compiling Citation References', 'Structuring Export Layout'],
  'graph-system': ['Building Entity Relationships', 'Mapping Concept Structures', 'Generating Semantic Graph'],
  'premium-validation': ['Verifying Premium Access', 'Checking Secure Subscription Status', 'Authorizing Swarm Access'],
  'extension-analysis': ['Analyzing Highlighted Content', 'Generating Browser Intelligence', 'Synthesizing Swarm Insight']
};

export default function IntelligenceLoader({
  scenario = 'general-load',
  label,
  className = ''
}: IntelligenceLoaderProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const [progress, setProgress] = useState(0);
  const [textIndex, setTextIndex] = useState(0);
  const texts = SCENARIOS[scenario];

  // Auto-cycle scenario texts
  useEffect(() => {
    const interval = setInterval(() => {
      setTextIndex((prev) => (prev + 1) % texts.length);
    }, 2800);
    return () => clearInterval(interval);
  }, [texts.length]);

  // Simulated Progress Bar Logic
  useEffect(() => {
    const interval = setInterval(() => {
      setProgress(prev => {
        const next = prev + Math.random() * 1.8;
        return next > 100 ? 100 : next;
      });
    }, 60);
    return () => clearInterval(interval);
  }, []);

  // Three.js 3D Loader Implementation
  useEffect(() => {
    if (!mountRef.current) return;
    const container = mountRef.current;
    
    // Use container dimensions, fallback to typical loader size if very small
    let width = container.clientWidth || 300;
    let height = container.clientHeight || 300;

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x050508, 0.15);

    const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 100);
    camera.position.z = 5;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    // Transparent background to blend with app's theme
    renderer.setClearColor(0x050508, 0);
    container.appendChild(renderer.domElement);

    // --- Core Objects ---
    // 1. Central Core
    const coreGeo = new THREE.IcosahedronGeometry(1, 2);
    const coreMat = new THREE.MeshBasicMaterial({
        color: 0x0055ff,
        wireframe: true,
        transparent: true,
        opacity: 0.4
    });
    const coreMesh = new THREE.Mesh(coreGeo, coreMat);
    scene.add(coreMesh);

    // Outer glow wireframe for the core
    const coreGeoOuter = new THREE.IcosahedronGeometry(1.05, 1);
    const coreMatOuter = new THREE.MeshBasicMaterial({
        color: 0x00f0ff,
        wireframe: true,
        transparent: true,
        opacity: 0.15
    });
    const coreMeshOuter = new THREE.Mesh(coreGeoOuter, coreMatOuter);
    scene.add(coreMeshOuter);

    // 2. Synaptic Floating Nodes
    const particleCount = 200;
    const particleGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);

    const colorCore = new THREE.Color(0x0055ff);
    const colorSynapse = new THREE.Color(0x00f0ff);

    for(let i = 0; i < particleCount * 3; i+=3) {
        const u = Math.random();
        const v = Math.random();
        const theta = u * 2.0 * Math.PI;
        const phi = Math.acos(2.0 * v - 1.0);
        const r = 2.5 + Math.random() * 3.5; 
        
        positions[i] = r * Math.sin(phi) * Math.cos(theta);
        positions[i+1] = r * Math.sin(phi) * Math.sin(theta);
        positions[i+2] = r * Math.cos(phi);

        const mixedColor = colorCore.clone().lerp(colorSynapse, Math.random());
        colors[i] = mixedColor.r;
        colors[i+1] = mixedColor.g;
        colors[i+2] = mixedColor.b;
    }

    particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    particleGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const pCanvas = document.createElement('canvas');
    pCanvas.width = 16;
    pCanvas.height = 16;
    const pCtx = pCanvas.getContext('2d');
    if (pCtx) {
      const grad = pCtx.createRadialGradient(8, 8, 0, 8, 8, 8);
      grad.addColorStop(0, 'rgba(255,255,255,1)');
      grad.addColorStop(1, 'rgba(255,255,255,0)');
      pCtx.fillStyle = grad;
      pCtx.fillRect(0, 0, 16, 16);
    }
    const pTex = new THREE.CanvasTexture(pCanvas);

    const particleMat = new THREE.PointsMaterial({
        size: 0.08,
        vertexColors: true,
        map: pTex,
        transparent: true,
        opacity: 0.7,
        blending: THREE.AdditiveBlending,
        depthWrite: false
    });

    const particleSystem = new THREE.Points(particleGeo, particleMat);
    scene.add(particleSystem);

    // --- Animation Loop ---
    const clock = new THREE.Clock();
    let animationId: number;
    let animProgress = 0;

    const animate = () => {
        animationId = requestAnimationFrame(animate);
        const elapsedTime = clock.getElapsedTime();

        // Internal progress for animation scaling
        animProgress += Math.random() * 1.8;
        if (animProgress > 100) animProgress = 100;

        coreMesh.rotation.x = elapsedTime * 0.25;
        coreMesh.rotation.y = elapsedTime * 0.3;
        
        coreMeshOuter.rotation.x = -elapsedTime * 0.15;
        coreMeshOuter.rotation.y = -elapsedTime * 0.2;

        const pulseScale = 1 + Math.sin(elapsedTime * 3) * 0.05 + (animProgress / 400);
        coreMesh.scale.set(pulseScale, pulseScale, pulseScale);
        coreMeshOuter.scale.set(pulseScale, pulseScale, pulseScale);

        particleSystem.rotation.y = elapsedTime * 0.04;
        particleSystem.rotation.x = elapsedTime * 0.02;

        renderer.render(scene, camera);
    };

    animate();

    const handleResize = () => {
      if (!mountRef.current) return;
      width = mountRef.current.clientWidth || 300;
      height = mountRef.current.clientHeight || 300;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };
    
    // We also use a ResizeObserver to catch container size changes
    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);

    return () => {
        resizeObserver.disconnect();
        cancelAnimationFrame(animationId);
        if (container.contains(renderer.domElement)) {
          container.removeChild(renderer.domElement);
        }
        
        // Cleanup resources
        coreGeo.dispose();
        coreMat.dispose();
        coreGeoOuter.dispose();
        coreMatOuter.dispose();
        particleGeo.dispose();
        particleMat.dispose();
        pTex.dispose();
        renderer.dispose();
    };
  }, []);

  return (
    <div className={`relative w-full h-[320px] md:h-[400px] flex flex-col items-center justify-center overflow-hidden rounded-lg bg-[#050508] ${className}`}>
      {/* 3D Canvas Container */}
      <div ref={mountRef} className="absolute inset-0 z-0" />

      {/* Interface Overlay */}
      <div className="relative z-10 flex flex-col items-center gap-4 pointer-events-none p-6">
        <h1 
          className="text-3xl md:text-5xl font-black tracking-[0.4em] uppercase text-white opacity-0 animate-[fadeIn_1.5s_ease-out_forwards] ml-[0.4em]" 
          style={{ textShadow: '0 0 20px rgba(0, 149, 255, 0.4)' }}
        >
          Cognapse
        </h1>
        
        <div className="flex flex-col items-center gap-1.5 mt-8">
          <div className="text-[1.1rem] font-semibold font-mono" style={{ color: '#00f0ff' }}>
            {Math.floor(progress)}%
          </div>
          <div className="w-40 h-[2px] bg-white/10 rounded-sm overflow-hidden relative">
            <div 
              className="h-full"
              style={{ 
                width: `${progress}%`,
                background: 'linear-gradient(90deg, #0055ff, #00f0ff)',
                boxShadow: '0 0 8px #00f0ff',
                transition: 'width 0.4s cubic-bezier(0.1, 0.8, 0.2, 1)'
              }} 
            />
          </div>
        </div>

        <AnimatePresence mode="wait">
          <motion.p
            key={textIndex}
            initial={{ opacity: 0, y: 8, filter: 'blur(2px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            exit={{ opacity: 0, y: -8, filter: 'blur(2px)' }}
            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
            className="text-[10px] md:text-[11px] font-bold text-white/70 uppercase tracking-[0.25em] mt-4"
          >
            {label || texts[textIndex]}
          </motion.p>
        </AnimatePresence>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); filter: blur(5px); }
          to { opacity: 1; transform: translateY(0); filter: blur(0); }
        }
      `}</style>
    </div>
  );
}
