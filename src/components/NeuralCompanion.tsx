import React, { useMemo, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '../store';
import clsx from 'clsx';
import { Crosshair, Scan } from 'lucide-react';

interface ClickMarker {
  id: number;
  x: number;
  y: number;
}

export default function NeuralCompanion({ compact = false }: { compact?: boolean }) {
  const { rank, isResearching, currentReport, deepResearch, isBlinking } = useStore();

  const isDeep = deepResearch?.status === 'running' || !!currentReport?.deep_research;

  const confidence = useMemo(() => {
    if (!currentReport?.scores?.overall_credibility) return 50;
    const score = currentReport.scores.overall_credibility;
    return typeof score === 'number' ? score : parseFloat(score) || 50;
  }, [currentReport]);

  const companionLevel = Math.floor(
    (typeof rank === 'string' ? (parseInt(rank.match(/\d+/)?.[0] || '0')) : (rank || 0)) / 5
  ) + 1;

  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  // ── Tactical Click Intercept System ─────────────────────────────────────────
  const [markers, setMarkers] = useState<ClickMarker[]>([]);
  const markerIdRef = useRef(0);
  
  // The eye's internal reaction state
  const [targetCoords, setTargetCoords] = useState<{x: number, y: number} | null>(null);
  const scanTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleClick = useCallback((e: MouseEvent) => {
    const x = e.clientX;
    const y = e.clientY;

    // 1. Spawn holographic reticle at cursor
    const id = ++markerIdRef.current;
    setMarkers(prev => [...prev, { id, x, y }]);
    setTimeout(() => {
      setMarkers(prev => prev.filter(m => m.id !== id));
    }, 800); // Fades out after 800ms

    // 2. Eye "Lock On" reaction
    if (scanTimeoutRef.current) clearTimeout(scanTimeoutRef.current);
    setTargetCoords({ x, y });

    // Hold the lock for 400ms, then release
    scanTimeoutRef.current = setTimeout(() => {
      setTargetCoords(null);
    }, 400);
  }, []);

  React.useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const px = (e.clientX / window.innerWidth - 0.5) * (compact ? 8 : 20);
      const py = (e.clientY / window.innerHeight - 0.5) * (compact ? 8 : 20);
      setMousePos({ x: px, y: py });
    };
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('click', handleClick);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('click', handleClick);
      if (scanTimeoutRef.current) clearTimeout(scanTimeoutRef.current);
    };
  }, [compact, handleClick]);

  const isScanning = targetCoords !== null;

  const size      = compact ? 'w-10 h-10'   : 'w-20 h-20';
  const irisSize  = compact ? 'w-5 h-5'     : 'w-14 h-14';
  const coreSize  = compact ? 'w-3 h-3'     : 'w-8 h-8';
  
  // Normal pupil vs Scanning Slit
  const pupilWidth = isScanning ? '100%' : (compact ? '6px' : '12px');
  const pupilHeight = isScanning ? '2px' : (compact ? '6px' : '12px');

  return (
    <>
      {/* ── Global Holographic Click Markers ── */}
      {/* Rendered outside the flow so they overlay the whole screen exactly where clicked */}
      {typeof window !== 'undefined' && (
        <div className="fixed inset-0 pointer-events-none z-[9999] overflow-hidden">
          <AnimatePresence>
            {markers.map(m => (
              <motion.div
                key={m.id}
                initial={{ scale: 0.2, opacity: 1, rotate: -45 }}
                animate={{ scale: 1.5, opacity: 0, rotate: 90 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="absolute flex items-center justify-center text-my-accent"
                style={{ left: m.x - 12, top: m.y - 12, width: 24, height: 24 }}
              >
                {/* Crosshair ring */}
                <div className="absolute inset-0 border border-my-accent/80 rounded-sm" />
                {/* Inner dot */}
                <div className="w-1 h-1 bg-white rounded-full shadow-[0_0_8px_white]" />
                <Crosshair size={24} className="opacity-50" strokeWidth={1} />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* ── The Eye Component ── */}
      <div
        className={clsx(
          'flex flex-col items-center relative group transition-all duration-700 pointer-events-none select-none',
          compact ? 'overflow-visible' : 'overflow-hidden gap-3 p-8 bg-my-bg/80 backdrop-blur-3xl border border-my-border rounded-[4px] mx-4 my-2 mb-6 shadow-2xl',
          isDeep && !compact && 'border-purple-500/40 shadow-[0_0_50px_rgba(168,85,247,0.15)]',
          isScanning && !compact && 'border-my-accent/50 shadow-signal'
        )}
      >
        {/* Background Neural Web */}
        <motion.div
          animate={{ x: mousePos.x * 0.3, y: mousePos.y * 0.3 }}
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: 'radial-gradient(circle at 50% 50%, var(--my-accent) 1px, transparent 1px)',
            backgroundSize: '12px 12px'
          }}
        />

        {/* Pulse Field (research active) */}
        {isResearching && (
          <motion.div
            animate={{ scale: [1, compact ? 1.4 : 2.5], opacity: [0.8, 0] }}
            transition={{ duration: 1.2, repeat: Infinity, ease: 'easeOut' }}
            className={clsx('absolute rounded-full border-[3px] z-0', size, isDeep ? 'border-purple-400' : 'border-my-accent')}
          />
        )}

        {/* Background Scanning Beams (ambient) */}
        {!compact && (
          <div className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden">
            <motion.div
              animate={{ y: ['0%', '400%'] }}
              transition={{ duration: isScanning ? 1 : 4, repeat: Infinity, ease: 'linear' }}
              className={clsx(
                'w-full h-[2px] blur-[1px]',
                isScanning ? 'opacity-80 bg-white shadow-[0_0_20px_white]' :
                isDeep ? 'opacity-40 bg-purple-500 shadow-[0_0_15px_purple]' : 'opacity-40 bg-my-accent shadow-[0_0_15px_var(--my-accent)]'
              )}
            />
          </div>
        )}

        {/* ── Eye Container ──────────────────────────────────────────────────── */}
        <div className={clsx('relative flex items-center justify-center', size)}>

          {/* Outer Chassis */}
          <motion.div
            animate={{ scale: isScanning ? 0.96 : 1 }}
            transition={{ duration: 0.15 }}
            className={clsx(
              'absolute inset-0 border-[3px] rounded-full transition-colors duration-300',
              isScanning ? 'border-white shadow-[inset_0_0_30px_rgba(255,255,255,0.6)]' :
              isDeep ? 'border-purple-500 shadow-[inset_0_0_25px_rgba(168,85,247,0.4)]' : 'border-my-accent shadow-[inset_0_0_25px_rgba(0,0,0,0.6)]'
            )}
          />

          {/* Iris & Pupil */}
          <motion.div
            animate={{
              // When scanning, the eye "locks on" strongly toward the mouse
              x: mousePos.x * (isScanning ? 4 : isResearching ? 3 : 2),
              y: mousePos.y * (isScanning ? 4 : isResearching ? 3 : 2),
              scale: isScanning ? 1.25 : isResearching ? 1.15 : 1,
            }}
            transition={{ type: 'spring', damping: 20, stiffness: 450, mass: 0.4 }}
            className={clsx(
              'relative rounded-full border-[3px] flex items-center justify-center overflow-hidden bg-black shadow-2xl',
              irisSize,
              isScanning ? 'border-my-accent shadow-[0_0_20px_var(--my-accent)]' :
              isDeep ? 'border-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.4)]' : 'border-my-accent shadow-signal'
            )}
          >
            {/* Conic Pattern */}
            <motion.div
              animate={{ rotate: isScanning ? [0, 90] : 0 }}
              transition={{ duration: isScanning ? 0.4 : 20, ease: 'easeOut', repeat: isScanning ? 0 : Infinity }}
              className="absolute inset-0 opacity-60 mix-blend-screen"
              style={{
                backgroundImage: `conic-gradient(from 0deg, transparent, ${isDeep && !isScanning ? '#A855F7' : 'var(--my-accent)'}, transparent, white, transparent)`
              }}
            />

            {/* PUPIL / LASER SLIT */}
            <motion.div
              animate={{
                scale: isScanning ? 1.2 : isResearching ? [0.9, 1.4, 0.9] : (0.7 + confidence / 200),
                backgroundColor: isScanning ? '#ffffff' : 'var(--my-accent)',
                boxShadow: `0 0 ${isScanning ? '40' : (compact ? 20 : 30)}px ${isScanning ? 'white' : 'var(--my-accent)'}`
              }}
              transition={{ duration: 0.15 }}
              className={clsx('rounded-full relative flex items-center justify-center opacity-100', coreSize)}
            >
              {/* The inner black void changes shape */}
              <motion.div
                animate={{
                  width: pupilWidth,
                  height: pupilHeight,
                  backgroundColor: isScanning ? '#ffffff' : '#000000',
                  boxShadow: isScanning ? '0 0 10px white' : 'inset 0 0 15px white'
                }}
                transition={{ duration: 0.15, ease: 'easeOut' }}
                className="rounded-[1px]"
              />
            </motion.div>

            {/* Target Lock Scanner Line across the iris */}
            <AnimatePresence>
              {isScanning && (
                <motion.div
                  initial={{ y: -20, opacity: 0 }}
                  animate={{ y: 20, opacity: 1 }}
                  exit={{ opacity: 0, transition: { duration: 0.1 } }}
                  transition={{ duration: 0.4, ease: 'linear' }}
                  className="absolute w-full h-[2px] bg-white shadow-[0_0_10px_white] z-20"
                />
              )}
            </AnimatePresence>
            
          </motion.div>

          {/* Internal Mechanical Eyelids (Shutter) */}
          <div className="absolute inset-0 rounded-full overflow-hidden z-30 pointer-events-none">
            <motion.div
              animate={{ height: isScanning ? '35%' : isBlinking ? '50%' : '0%' }}
              className="absolute top-0 left-0 w-full bg-black/95 backdrop-blur-md transition-all duration-100 ease-out border-b border-my-accent/40"
            />
            <motion.div
              animate={{ height: isScanning ? '35%' : isBlinking ? '50%' : '0%' }}
              className="absolute bottom-0 left-0 w-full bg-black/95 backdrop-blur-md transition-all duration-100 ease-out border-t border-my-accent/40"
            />
          </div>

          {/* Tactical Orbital Arrays */}
          {[...Array(companionLevel + 1)].map((_, i) => (
            <motion.div
              key={i}
              animate={{ rotate: 360 * (i % 2 ? 1 : -1) }}
              transition={{
                duration: isScanning ? 1.5 : (isDeep ? 2.5 : 6) + i * 2,
                repeat: Infinity,
                ease: isScanning ? "easeOut" : "linear"
              }}
              style={{ width: `${90 + i * 18}%`, height: `${90 + i * 18}%` }}
              className={clsx(
                'absolute border-t-2 border-r border-dashed rounded-full transition-all duration-300',
                isScanning ? 'border-white opacity-80 shadow-[0_0_15px_white]' :
                isDeep ? 'border-purple-500 opacity-40 shadow-[0_0_10px_rgba(168,85,247,0.3)]' : 'border-my-accent opacity-20'
              )}
            >
              <div className={clsx(
                'absolute top-0 left-1/2 w-1.5 h-1.5 rounded-full -translate-x-1/2 -translate-y-1/2',
                isScanning ? 'bg-white shadow-glow' :
                isDeep ? 'bg-purple-400 shadow-glow' : 'bg-my-accent'
              )} />
            </motion.div>
          ))}
        </div>

        {/* ── Status HUD ── */}
        {!compact && (
          <div className="flex flex-col items-center z-10 text-center">
            <div className="flex items-center gap-3 mb-2">
              <motion.div
                animate={{ scale: isScanning ? [1, 2.5, 1] : 1 }}
                transition={{ duration: 0.2 }}
                className={clsx(
                  "w-3 h-3 rounded-full shadow-glow",
                  isScanning ? "bg-white" :
                  isResearching ? "bg-red-500 animate-pulse" : isDeep ? "bg-purple-500 shadow-[0_0_15px_purple]" : "bg-my-accent"
                )}
              />
              <span className={clsx(
                "text-[12px] font-black uppercase tracking-[0.6em] transition-all duration-300",
                isScanning ? "text-white drop-shadow-[0_0_8px_white]" :
                isDeep ? "text-purple-400 drop-shadow-[0_0_8px_purple]" : "text-my-ink"
              )}>
                {isScanning ? "TARGET LOCKED" : isResearching ? (isDeep ? "SUPREME VOID" : "SENTIENT SYNERGY") : "COGNAPSE PRIME"}
              </span>
            </div>
            
            <p className={clsx(
              "text-[11px] font-bold uppercase tracking-[0.2em] w-[200px] leading-tight font-mono whitespace-nowrap overflow-hidden text-ellipsis transition-colors",
              isScanning ? "text-white" : "text-my-muted"
            )}>
              {isScanning && targetCoords
                ? `>>> X:${targetCoords.x} Y:${targetCoords.y} SCANNED <<<`
                : isResearching
                ? (isDeep ? ">>> ABSORBING MULTIVERSE <<<" : ">>> SYNCING SWARM NODES <<<")
                : `CORE STATUS: ${confidence}% STABLE`}
            </p>
          </div>
        )}
      </div>
    </>
  );
}
