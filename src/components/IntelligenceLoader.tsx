import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Cpu, Database, FileText, ShieldCheck, Network, Workflow } from 'lucide-react';

export type LoaderScenario = 
  | 'general-load' 
  | 'deep-research' 
  | 'pdf-export' 
  | 'graph-system' 
  | 'premium-validation' 
  | 'extension-analysis';

interface IntelligenceLoaderProps {
  scenario?: LoaderScenario;
  label?: string; // Optional custom label to override scenario cycle
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

interface ScenarioConfig {
  texts: string[];
  icon: React.ComponentType<any>;
  themeColor: string; // Hex color for matching node highlights
  accentName: string; // Tailwind class equivalent
}

const SCENARIOS: Record<LoaderScenario, ScenarioConfig> = {
  'general-load': {
    texts: ['Initializing Workspace', 'Synchronizing Interface', 'Establishing Secure Handshake'],
    icon: Cpu,
    themeColor: '#10B981', // Subtle Green
    accentName: 'text-emerald-500'
  },
  'deep-research': {
    texts: ['Analyzing Research Context', 'Generating Structured Intelligence', 'Resolving Multi-Model Synthesis'],
    icon: Workflow,
    themeColor: '#10B981',
    accentName: 'text-emerald-500'
  },
  'pdf-export': {
    texts: ['Preparing Intelligence Report', 'Compiling Citation References', 'Structuring Export Layout'],
    icon: FileText,
    themeColor: '#fbbf24', // Amber/Yellow
    accentName: 'text-amber-500'
  },
  'graph-system': {
    texts: ['Building Entity Relationships', 'Mapping Concept Structures', 'Generating Semantic Graph'],
    icon: Network,
    themeColor: '#10B981',
    accentName: 'text-emerald-500'
  },
  'premium-validation': {
    texts: ['Verifying Premium Access', 'Checking Secure Subscription Status', 'Authorizing Swarm Access'],
    icon: ShieldCheck,
    themeColor: '#fbbf24',
    accentName: 'text-amber-500'
  },
  'extension-analysis': {
    texts: ['Analyzing Highlighted Content', 'Generating Browser Intelligence', 'Synthesizing Swarm Insight'],
    icon: Database,
    themeColor: '#10B981',
    accentName: 'text-emerald-500'
  }
};

interface Node {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  opacity: number;
  pulseSpeed: number;
  pulsePhase: number;
}

export default function IntelligenceLoader({
  scenario = 'general-load',
  label,
  className = '',
  size = 'md'
}: IntelligenceLoaderProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const config = SCENARIOS[scenario];
  const [textIndex, setTextIndex] = useState(0);

  // Auto-cycle scenario texts
  useEffect(() => {
    const interval = setInterval(() => {
      setTextIndex((prev) => (prev + 1) % config.texts.length);
    }, 2800);
    return () => clearInterval(interval);
  }, [config.texts.length]);

  // Performance-optimized Canvas Neural Network rendering loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    let width = canvas.width = canvas.offsetWidth;
    let height = canvas.height = canvas.offsetHeight;

    // Detect mobile for dynamic optimization
    const isMobile = window.innerWidth < 768;
    const maxNodes = isMobile ? 8 : 20;
    const maxDistance = isMobile ? 65 : 100;
    const nodeSpeedMultiplier = isMobile ? 0.3 : 0.45;

    const nodes: Node[] = [];

    // Initialize nodes
    for (let i = 0; i < maxNodes; i++) {
      nodes.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * nodeSpeedMultiplier,
        vy: (Math.random() - 0.5) * nodeSpeedMultiplier,
        radius: Math.random() * 1.8 + 1,
        opacity: Math.random() * 0.4 + 0.2,
        pulseSpeed: Math.random() * 0.02 + 0.005,
        pulsePhase: Math.random() * Math.PI * 2
      });
    }

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = canvas.offsetWidth;
      height = canvas.height = canvas.offsetHeight;
    };
    window.addEventListener('resize', handleResize);

    const draw = () => {
      ctx.clearRect(0, 0, width, height);

      // Render Nodes & Dynamic Connections
      for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];
        
        // Dynamic positioning with bounds check
        node.x += node.vx;
        node.y += node.vy;

        if (node.x < 0 || node.x > width) node.vx *= -1;
        if (node.y < 0 || node.y > height) node.vy *= -1;

        // Draw connections
        for (let j = i + 1; j < nodes.length; j++) {
          const otherNode = nodes[j];
          const dx = node.x - otherNode.x;
          const dy = node.y - otherNode.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < maxDistance) {
            const alpha = (1 - dist / maxDistance) * 0.15;
            ctx.strokeStyle = `rgba(120, 130, 140, ${alpha})`;
            ctx.lineWidth = 0.55;
            ctx.beginPath();
            ctx.moveTo(node.x, node.y);
            ctx.lineTo(otherNode.x, otherNode.y);
            ctx.stroke();
          }
        }

        // Pulse logic
        node.pulsePhase += node.pulseSpeed;
        const pulseOpacity = node.opacity + Math.sin(node.pulsePhase) * 0.1;

        // Draw individual Node
        ctx.fillStyle = `rgba(255, 255, 255, ${Math.max(0.05, Math.min(pulseOpacity, 0.8))})`;
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
        ctx.fill();

        // Subtly highlight nodes near the center
        const cx = width / 2;
        const cy = height / 2;
        const distToCenter = Math.sqrt((node.x - cx) ** 2 + (node.y - cy) ** 2);
        if (distToCenter < 60) {
          ctx.fillStyle = `${config.themeColor}33`; // Theme color with alpha
          ctx.beginPath();
          ctx.arc(node.x, node.y, node.radius * 2.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      animationId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationId);
    };
  }, [scenario, config.themeColor]);

  // Dimension helpers
  const containerSizes = {
    sm: 'w-16 h-16',
    md: 'w-24 h-24',
    lg: 'w-36 h-36'
  };

  const iconSizes = {
    sm: 14,
    md: 20,
    lg: 32
  };

  const ActiveIcon = config.icon;

  return (
    <div className={`flex flex-col items-center justify-center p-6 select-none ${className}`}>
      {/* Visual System Container */}
      <div className={`relative ${containerSizes[size]} flex items-center justify-center mb-8`}>
        
        {/* Canvas Neural Background */}
        <canvas 
          ref={canvasRef} 
          className="absolute inset-[-40px] w-[calc(100%+80px)] h-[calc(100%+80px)] pointer-events-none opacity-60 rounded-full"
        />

        {/* Structured Network Grid layer (using Tailwind CSS background) */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(120,130,140,0.06)_1px,transparent_1px),linear-gradient(to_bottom,rgba(120,130,140,0.06)_1px,transparent_1px)] bg-[size:10px_10px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] pointer-events-none rounded-full" />

        {/* Rotating Outer Ring */}
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
          className="absolute inset-0 border border-my-border/30 border-t-my-accent rounded-full pointer-events-none"
          style={{ borderColor: `rgba(255, 255, 255, 0.08) ${config.themeColor}33 rgba(255, 255, 255, 0.08) rgba(255, 255, 255, 0.08)` }}
        />

        {/* Rotating Inner Synthesis Ring */}
        <motion.div 
          animate={{ rotate: -360 }}
          transition={{ duration: 7, repeat: Infinity, ease: "linear" }}
          className="absolute inset-2.5 border border-dashed border-my-border/15 rounded-full pointer-events-none"
        />

        {/* Pulsing Core Glow */}
        <motion.div 
          animate={{ 
            scale: [0.95, 1.05, 0.95],
            opacity: [0.15, 0.35, 0.15]
          }}
          transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
          className="absolute inset-5 rounded-full filter blur-xl pointer-events-none"
          style={{ backgroundColor: config.themeColor }}
        />

        {/* Center Panel & Scenario Aware Icon */}
        <div className="relative z-10 p-3.5 bg-[#080d16] border border-my-border/40 rounded-full flex items-center justify-center shadow-[0_15px_35px_rgba(0,0,0,0.6)]">
          <ActiveIcon size={iconSizes[size]} className={`${config.accentName} animate-pulse`} strokeWidth={1.5} />
        </div>
      </div>

      {/* Typography State System */}
      <div className="text-center min-h-[50px] flex flex-col justify-start max-w-sm px-4">
        <AnimatePresence mode="wait">
          <motion.p
            key={textIndex}
            initial={{ opacity: 0, y: 8, filter: 'blur(2px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            exit={{ opacity: 0, y: -8, filter: 'blur(2px)' }}
            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
            className="text-[10px] md:text-[11px] font-bold text-my-ink uppercase tracking-[0.25em]"
          >
            {label || config.texts[textIndex]}
          </motion.p>
        </AnimatePresence>
        
        {/* Soft, rotating status details */}
        <p className="text-[9px] text-my-muted uppercase tracking-[0.35em] mt-2 opacity-50 animate-pulse">
          COGNAPSE SECURITY ENVELOPE ACTIVE
        </p>
      </div>
    </div>
  );
}
