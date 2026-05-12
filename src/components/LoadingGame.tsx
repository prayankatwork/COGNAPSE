import React from 'react';
import { motion } from 'framer-motion';

export default function LoadingGame() {
  return (
    <div className="flex flex-col items-center justify-center py-20">
      <div className="relative w-32 h-32 mb-10">
        {/* Outer Ring */}
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
          className="absolute inset-0 border-2 border-my-accent/10 border-t-my-accent rounded-full"
        />
        {/* Inner Ring */}
        <motion.div 
          animate={{ rotate: -360 }}
          transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
          className="absolute inset-4 border-2 border-my-ink/5 border-b-my-accent/40 rounded-full"
        />
        {/* Pulsing Core */}
        <motion.div 
          animate={{ 
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.6, 0.3]
          }}
          transition={{ duration: 2, repeat: Infinity }}
          className="absolute inset-10 bg-my-accent/20 rounded-full flex items-center justify-center"
        >
          <div className="w-2 h-2 bg-my-accent rounded-full animate-ping" />
        </motion.div>
      </div>

      <div className="text-center space-y-3">
        <h3 className="text-xl font-serif italic font-bold">Synthesizing Intelligence.</h3>
        <p className="text-[10px] text-my-muted uppercase tracking-[0.4em] animate-pulse">
          Accessing Research Archive • Verifying Claims • Building Thesis
        </p>
      </div>

      <div className="mt-12 flex gap-4">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            animate={{ 
              height: [10, 30, 10],
              opacity: [0.2, 0.5, 0.2]
            }}
            transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
            className="w-1 bg-my-accent"
          />
        ))}
      </div>
    </div>
  );
}
