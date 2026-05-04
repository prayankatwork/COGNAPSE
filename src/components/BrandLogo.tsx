import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '../store';
import NeuralCompanion from './NeuralCompanion';

export default function BrandLogo({ size = 32, className = "", forceOriginal = false }: { size?: number, className?: string, forceOriginal?: boolean }) {
  const currentView = useStore(state => state.currentView);
  const showEye = (currentView === 'research' || currentView === 'apps') && !forceOriginal;
  
  return (
    <div className={`relative flex items-center justify-center ${className}`} style={{ width: size, height: size }}>
      <AnimatePresence mode="wait">
        {showEye ? (
          <motion.div
            key="eye"
            className="absolute inset-0 flex items-center justify-center"
            initial={{ opacity: 0, scale: 0.5, rotate: -90 }}
            animate={{ opacity: 1, scale: size / 40, rotate: 0 }}
            exit={{ opacity: 0, scale: 0.5, rotate: 90 }}
            transition={{ type: 'spring', damping: 15, stiffness: 200 }}
          >
            <NeuralCompanion compact={true} />
          </motion.div>
        ) : (
          <motion.div
            key="original"
            initial={{ opacity: 0, scale: 0.5, rotate: 90 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            exit={{ opacity: 0, scale: 0.5, rotate: -90 }}
            transition={{ type: 'spring', damping: 15, stiffness: 200 }}
            className="relative flex items-center justify-center w-full h-full"
          >
            {/* Outer Rotating Hexagon */}
            <motion.svg
              viewBox="0 0 100 100"
              className="absolute inset-0 w-full h-full text-my-accent opacity-20"
              animate={{ rotate: 360 }}
              transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
            >
              <polygon 
                points="50,5 90,25 90,75 50,95 10,75 10,25" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2" 
              />
            </motion.svg>

            {/* Inner Pulsing Core */}
            <motion.div
              className="relative z-10 bg-my-accent rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(var(--accent-rgb),0.3)]"
              style={{ width: size * 0.6, height: size * 0.6 }}
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4 text-white" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m12.728 0l-.707-.707M6.343 6.343l-.707-.707" strokeLinecap="round" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            </motion.div>

            {/* Dynamic Data Ring */}
            <motion.div
              className="absolute inset-0 border-2 border-dashed border-my-accent/40 rounded-full"
              animate={{ rotate: -360 }}
              transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
