import { useState, useMemo, useRef, useEffect } from 'react';
import { Handle, Position, useStore } from '@xyflow/react';
import { Reality } from '../services/ai';
import { ShieldAlert, Info, TrendingUp, TrendingDown, Target, Zap, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

type RealityData = Reality & { 
  index?: number; 
  isFocused?: boolean; 
  hasFocusMode?: boolean;
  effortLevel?: number;
  isComparing?: boolean;
};

export function RealityNode({ data }: { data: RealityData }) {
  const nodeRef = useRef<HTMLDivElement>(null);
  const [magneticOffset, setMagneticOffset] = useState({ x: 0, y: 0 });
  const [isExpanded, setIsExpanded] = useState(false);
  const hoverTimeout = useRef<NodeJS.Timeout>();
  const zoom = useStore((s) => s.transform[2]);
  const isOptimistic = data.type === 'optimistic';
  const isRealistic = data.type === 'realistic';
  const isPessimistic = data.type === 'pessimistic';
  
  // High risk/volatility = Hot
  const isHot = isPessimistic && data.confidence < 50;
  const isUncertain = data.confidence < 60 && !isHot;
  
  // Dynamic scaling based on effort scrub (0-100)
  const effortLevel = data.effortLevel ?? 50;
  const targetScale = useMemo(() => {
    if (isOptimistic) {
      return 0.85 + (effortLevel / 100) * 0.3; // 0.85 to 1.15
    }
    if (isPessimistic) {
      return 1.15 - (effortLevel / 100) * 0.3; // 1.15 to 0.85
    }
    return 1; // realistic stays same
  }, [effortLevel, isOptimistic, isPessimistic]);

  const targetOpacity = useMemo(() => {
    if (data.hasFocusMode && !data.isFocused && !data.isComparing) return 0.2; // Focus gravity, unless comparing
    
    if (isOptimistic) return 0.5 + (effortLevel / 100) * 0.5;
    if (isPessimistic) return 1 - (effortLevel / 100) * 0.5;
    return 1;
  }, [effortLevel, isOptimistic, isPessimistic, data.hasFocusMode, data.isFocused, data.isComparing]);

  const isDimmed = data.hasFocusMode && !data.isFocused && !data.isComparing;

  // Cognitive Zoom Thresholds
  const showDetailLevel1 = zoom >= 0.75 || isExpanded;
  const showDetailLevel2 = zoom >= 0.95 || isExpanded;

  const handleMouseEnter = () => {
    hoverTimeout.current = setTimeout(() => {
      setIsExpanded(true);
    }, 500); // 500ms intent (Intent Field)
  };

  const handleMouseLeave = () => {
    clearTimeout(hoverTimeout.current);
    if (!data.isFocused) {
      setIsExpanded(false);
    }
  };

  // AI Presence: Magnetic Anticipation and "Breathing"
  useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (!nodeRef.current || isDimmed) return;
      const rect = nodeRef.current.getBoundingClientRect();
      const nodeCenterX = rect.left + rect.width / 2;
      const nodeCenterY = rect.top + rect.height / 2;
      
      const distanceX = e.clientX - nodeCenterX;
      const distanceY = e.clientY - nodeCenterY;
      const distance = Math.sqrt(distanceX * distanceX + distanceY * distanceY);
      
      const magneticRadius = 350; // Activation radius
      if (distance < magneticRadius) {
        // Anticipation scale & pull
        const pullFactor = Math.pow(1 - distance / magneticRadius, 2); 
        // 1 if right on it, 0 if at radius
        setMagneticOffset({
          x: (distanceX * pullFactor) * 0.05, 
          y: (distanceY * pullFactor) * 0.05
        });
      } else {
        setMagneticOffset({ x: 0, y: 0 });
      }
    };
    
    window.addEventListener('mousemove', handleGlobalMouseMove);
    return () => window.removeEventListener('mousemove', handleGlobalMouseMove);
  }, [isDimmed]);

  return (
    <motion.div
      ref={nodeRef}
      initial={{ opacity: 0, y: 40, scale: 0.9 }}
      animate={{ 
        opacity: isDimmed ? 0.05 : targetOpacity, 
        x: magneticOffset.x,
        y: magneticOffset.y, 
        scale: isDimmed ? 0.8 : targetScale,
        filter: isDimmed ? 'blur(12px) grayscale(100%)' : 'blur(0px) grayscale(0%)'
      }}
      transition={{ 
        type: 'spring', 
        stiffness: 200, 
        damping: 20,
        delay: (data.index || 0) * 0.15 
      }}
      whileHover={{ scale: isDimmed ? 0.8 : targetScale * 1.02, y: -4 }}
      className={cn(
        "relative flex flex-col w-[280px] max-w-full glass-card overflow-hidden pointer-events-auto cursor-pointer transition-colors ai-breathing",
        isExpanded ? "border-indigo-500/50" : "hover:border-white/20",
        isOptimistic && "glow-optimistic",
        isRealistic && "glow-realistic",
        isPessimistic && "glow-pessimistic",
        !isExpanded && "backdrop-blur-sm bg-white/5",
        isExpanded && "backdrop-blur-md bg-white/10",
        isUncertain && "uncertain-jitter",
        isHot && "temperature-hot",
        data.isFocused && "ring-2 ring-indigo-500/50 shadow-2xl focus-tunnel-active",
        data.isComparing && "ring-2 ring-fuchsia-500/70 shadow-[0_0_30px_rgba(217,70,239,0.3)] border-fuchsia-500",
        ((data as any).decisionPressure) && "cognitive-heat-zone"
      )}
      onClick={() => setIsExpanded(!isExpanded)}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <Handle type="target" position={Position.Top} className="!opacity-0" />
      
      {/* Header */}
      <div className="p-3 flex flex-col gap-2 relative border-b border-white/10">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-2">
            <div className={cn(
              "p-2 rounded-lg mt-0.5 shadow-inner transition-colors duration-500",
              isOptimistic ? "bg-emerald-500/20 text-emerald-400" : isRealistic ? "bg-blue-500/20 text-blue-400" : "bg-red-500/20 text-red-400"
            )}>
              {isOptimistic ? <TrendingUp size={16} /> : isPessimistic ? <TrendingDown size={16} /> : <Target size={16} />}
            </div>
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <span className={cn(
                  "text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full transition-colors duration-500",
                  isOptimistic ? "bg-emerald-500/20 text-emerald-300" : isRealistic ? "bg-blue-500/20 text-blue-300" : "bg-red-500/20 text-red-300"
                )}>
                  {isOptimistic ? 'Idealistic' : isRealistic ? 'Pragmatic' : 'Cautionary'}
                </span>
                <div className={cn(
                  "text-[9px] font-mono",
                  isOptimistic ? "text-emerald-400" : isRealistic ? "text-blue-400" : "text-red-400"
                )}>
                  Conf: {data.confidence}%
                </div>
              </div>
              <h3 className="text-xs font-semibold text-white mt-1 leading-snug line-clamp-2" title={data.outcome}>{data.outcome}</h3>
            </div>
          </div>
          <button className="text-white/40 hover:text-white/80 mt-1 shrink-0 transition-colors">
            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>
      </div>

      <div className="px-3 pb-3 pt-2">
        <div className="text-[9px] font-bold text-white/50 uppercase tracking-wider mb-1 flex items-center gap-1.5">
          <Info size={10} /> Core Assumption
        </div>
        <p className="text-[11px] text-slate-300 leading-snug line-clamp-3" title={data.assumption}>{data.assumption}</p>
      </div>

      <AnimatePresence>
        {showDetailLevel1 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-t border-white/10 bg-black/20"
          >
            {/* Body */}
            <div className="p-3 space-y-3">
              <motion.div 
                initial={{ opacity: 0, x: -10 }} 
                animate={{ opacity: 1, x: 0 }} 
                transition={{ delay: 0.1 }}
              >
                <div className="text-[9px] font-bold text-white/50 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                  <Zap size={10} /> Key Factors
                </div>
                {showDetailLevel2 ? (
                  <ul className="space-y-1">
                    {data.key_factors.map((factor, i) => (
                      <li key={i} className="text-[10px] text-slate-300 flex items-start gap-2 bg-white/5 rounded p-1.5 line-clamp-2" title={factor}>
                        <span className={cn(
                          "w-1 h-1 rounded-full mt-1 shrink-0",
                          isOptimistic ? "bg-emerald-400" : isRealistic ? "bg-blue-400" : "bg-red-400"
                        )} />
                        <span className="leading-snug">{factor}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="text-[10px] text-white/50">
                    Zoom in to reveal {data.key_factors.length} key factors.
                  </div>
                )}
              </motion.div>

              <motion.div 
                initial={{ opacity: 0, x: -10 }} 
                animate={{ opacity: 1, x: 0 }} 
                transition={{ delay: 0.2 }}
              >
                <div className="text-[9px] font-bold text-white/50 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                  <ShieldAlert size={10} /> Potential Risks
                </div>
                {showDetailLevel2 ? (
                  <ul className="space-y-1">
                    {data.risks.map((risk, i) => (
                      <li key={i} className="text-[10px] text-slate-300 flex items-start gap-2 bg-white/5 rounded p-1.5 line-clamp-2" title={risk}>
                        <span className={cn(
                          "w-1 h-1 rounded-full mt-1 shrink-0 text-white/50",
                        )} />
                        <span className="leading-snug">{risk}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="text-[10px] text-white/50">
                    Zoom in to reveal {data.risks.length} potential risks.
                  </div>
                )}
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      <Handle type="source" position={Position.Bottom} className="!opacity-0" />
    </motion.div>
  );
}
