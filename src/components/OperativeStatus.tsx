import React from 'react';
import { motion } from 'framer-motion';
import { useStore } from '../store';
import { 
  X, Shield, Fingerprint,
  Activity, Flame, Star, Target, Cpu
} from 'lucide-react';

interface OperativeStatusProps {
  onClose: () => void;
}

export default function OperativeStatus({ onClose }: OperativeStatusProps) {
  const { xp, rank, searchCount, streak } = useStore();
  
  const nextRankXp = (Math.floor(xp / 100) + 1) * 100;
  const progress = (xp % 100);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[300] bg-my-bg/80 backdrop-blur-2xl flex items-center justify-center p-6 md:p-10"
    >
      <motion.div
        initial={{ scale: 0.95, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className="w-full max-w-lg bg-my-bg border border-my-border shadow-[0_40px_100px_rgba(0,0,0,0.15)] relative overflow-hidden flex flex-col"
      >


        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute top-6 right-6 z-50 p-2 text-my-muted hover:text-my-accent transition-colors bg-my-callout rounded-full"
        >
          <X size={18} />
        </button>

        <div className="p-10 flex flex-col items-center text-center">
           {/* Tactical Header */}
           <div className="flex items-center gap-3 text-my-accent font-bold uppercase tracking-[0.4em] text-[9px] mb-12">
              <div className="w-8 h-px bg-my-accent" /> Operative Dossier
           </div>

           {/* Profile Badge - Upgraded to tactical icon */}
           <div className="relative w-36 h-36 mb-10 flex items-center justify-center">
              <motion.div 
                animate={{ scale: [1, 1.1, 1], opacity: [0.2, 0.1, 0.2] }}
                transition={{ duration: 4, repeat: Infinity }}
                className="absolute inset-0 bg-my-accent/10 rounded-full blur-2xl"
              />
              {/* Spinning technical rings */}
              <div className="absolute inset-0 border border-dashed border-my-accent/20 rounded-full animate-spin-slow" />
              <div className="absolute inset-2 border border-my-border/40 rounded-full" />
              
              <div className="w-24 h-24 bg-my-ink dark:bg-my-accent rounded-full flex items-center justify-center shadow-2xl relative z-10 overflow-hidden group">
                 <div className="absolute inset-0 bg-gradient-to-tr from-my-accent/40 to-transparent opacity-60" />
                 <Fingerprint size={48} className="text-white dark:text-black relative z-10" strokeWidth={1.5} />
              </div>
              
              {/* Mini Status Orb */}
              <div className="absolute bottom-2 right-2 w-4 h-4 bg-emerald-500 rounded-full border-4 border-my-bg shadow-lg animate-pulse" />
           </div>

           {/* Identity Section */}
           <div className="mb-12">
              <h2 className="text-5xl font-serif font-bold italic text-my-ink leading-tight tracking-tight">
                 {rank?.replace(/[^\x00-\x7F]/g, "").trim()}
              </h2>
           </div>

           {/* Detailed Stats */}
           <div className="w-full space-y-4 mb-10">
              <StatRow label="Forensic Dossiers" value={searchCount} icon={<Target size={14} />} />
              <StatRow label="Research Streak" value={`${streak || 0} Days`} icon={<Flame size={14} className="text-orange-500" />} />
              <StatRow label="Cognition XP" value={xp} icon={<Star size={14} className="text-yellow-500" />} />
           </div>

           {/* Progression Panel */}
           <div className="w-full p-8 bg-my-callout border border-my-border rounded-none relative overflow-hidden shadow-inner">
              <div className="flex items-center justify-between mb-4">
                 <h3 className="text-[10px] font-bold uppercase tracking-[0.4em] text-my-muted flex items-center gap-2">
                    <Cpu size={12} /> System Progression
                 </h3>
                 <span className="text-[10px] font-mono text-my-accent font-bold tracking-tighter">{xp} / {nextRankXp} XP</span>
              </div>
              <div className="h-2 w-full bg-my-border rounded-full overflow-hidden">
                 <motion.div 
                   initial={{ width: 0 }}
                   animate={{ width: `${progress}%` }}
                   className="h-full bg-my-accent relative"
                 >
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent animate-[shimmer_2s_infinite]" />
                 </motion.div>
              </div>
              <p className="mt-4 text-[9px] text-my-muted italic leading-relaxed text-left opacity-70">
                 Collect {nextRankXp - xp} XP to unlock Tier {Math.floor(xp/100) + 2} investigative protocols. 
                 Current rank efficiency: 100%.
              </p>
           </div>
        </div>

        {/* Technical Footer */}
        <div className="px-10 py-5 border-t border-my-border flex justify-between items-center bg-my-callout/50 text-[9px] font-mono text-my-muted uppercase tracking-[0.2em]">
           <div className="flex items-center gap-2">
              <div className="w-1 h-1 bg-my-accent rounded-full" />
              <span>COGNAPSE CORE V4.2</span>
           </div>
           <span>AUTH: {Math.random().toString(36).substr(2, 6).toUpperCase()}</span>
        </div>
      </motion.div>
    </motion.div>
  );
}

function StatRow({ label, value, icon }: { label: string, value: string | number, icon: any }) {
  return (
    <div className="flex items-center justify-between group border-b border-my-border/30 pb-3">
       <div className="flex items-center gap-3">
          <div className="text-my-muted group-hover:text-my-accent transition-colors">
             {icon}
          </div>
          <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-my-muted">{label}</span>
       </div>
       <span className="text-[12px] font-black text-my-ink tracking-tight">{value}</span>
    </div>
  );
}
