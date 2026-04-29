import React, { useEffect, useState, useMemo } from 'react';
import { motion, useSpring, useMotionValue } from 'framer-motion';
import { useStore } from '../store';

export default function CustomCursor() {
  const { xp, theme } = useStore();
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const [isPointer, setIsPointer] = useState(false);

  // Calculate numeric level from XP (similar to how games work)
  const currentLevel = useMemo(() => {
    const rawXp = typeof xp === 'number' ? xp : 0;
    // Map XP to an internal "cursor level"
    if (rawXp <= 150) return 1;       // Novice / Curious
    if (rawXp <= 700) return 5;       // Explorer / Analyst
    if (rawXp <= 2000) return 10;     // Researcher / Mastermind
    return 15;                        // Omni-Observer
  }, [xp]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      mouseX.set(e.clientX);
      mouseY.set(e.clientY);
      
      const target = e.target as HTMLElement;
      setIsPointer(window.getComputedStyle(target).cursor === 'pointer');
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // Cursor Styles based on Level
  const renderCursor = () => {
    if (currentLevel < 5) {
      // LEVEL 1-4: The Crosshair
      return (
        <div className="relative flex items-center justify-center">
          <div className="w-3 h-3 border border-my-accent rounded-full" />
          <div className="absolute w-[1px] h-4 bg-my-accent" />
          <div className="absolute w-4 h-[1px] bg-my-accent" />
        </div>
      );
    } else if (currentLevel < 10) {
      // LEVEL 5-9: The Orbital
      return (
        <div className="relative flex items-center justify-center">
          <motion.div 
            animate={{ rotate: 360 }}
            transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
            className="w-5 h-5 border border-dashed border-my-accent rounded-full"
          />
          <div className="absolute w-1.5 h-1.5 bg-my-accent rounded-full shadow-glow" />
        </div>
      );
    } else if (currentLevel < 15) {
      // LEVEL 10-14: The Data Glitch
      return (
        <div className="relative flex items-center justify-center">
          <motion.div 
            animate={{ 
              scale: isPointer ? 1.2 : 1,
              opacity: [0.5, 1, 0.5]
            }}
            className="w-6 h-6 border-[1.5px] border-my-accent rounded-sm rotate-45"
          />
          <div className="absolute font-mono text-[5px] text-my-accent font-bold">
            {isPointer ? "ACCS" : "SCR"}
          </div>
        </div>
      );
    } else {
      // LEVEL 15+: The Architect (Fractal)
      return (
        <div className="relative flex items-center justify-center">
          <motion.div 
            animate={{ rotate: 360, scale: isPointer ? 1.1 : 1 }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
            className="w-8 h-8 border border-my-accent opacity-30 rounded-full"
          />
          <motion.div 
            animate={{ rotate: -360 }}
            transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
            className="absolute w-5 h-5 border border-my-accent rounded-full"
          />
          <div className="absolute w-1 h-1 bg-white rounded-full shadow-[0_0_10px_var(--my-accent)]" />
        </div>
      );
    }
  };

  return (
    <motion.div
      style={{
        translateX: mouseX,
        translateY: mouseY,
        left: -15,
        top: -15,
      }}
      className="fixed pointer-events-none z-[9999] mix-blend-difference hidden md:block"
    >
      <motion.div
        animate={{
          scale: isPointer ? 0.8 : 1,
        }}
      >
        {renderCursor()}
      </motion.div>
    </motion.div>
  );
}
