import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '../store';
import { 
  X, Activity, Cpu, Zap, 
  Terminal, Shield, Database, RefreshCw,
  HardDrive, Activity as ActivityIcon, AlertCircle
} from 'lucide-react';
import { getSwarmHealth, resetSwarmHealth } from '../services/aiService';
import clsx from 'clsx';

export default function DevDashboard() {
  const { isDevOpen, setDevOpen } = useStore();
  const [health, setHealth] = useState(getSwarmHealth());

  useEffect(() => {
    const interval = setInterval(() => {
      setHealth(getSwarmHealth());
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  if (!isDevOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[1000] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 md:p-8 font-mono"
      >
        <motion.div
          initial={{ scale: 0.9, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          className="w-full max-w-4xl bg-[#0A0A0A] border border-my-accent/30 shadow-[0_0_50px_rgba(249,115,22,0.1)] overflow-hidden flex flex-col h-[80vh]"
        >
          {/* Header */}
          <div className="p-6 border-b border-my-accent/20 bg-my-accent/5 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Terminal size={20} className="text-my-accent" />
              <div>
                <h2 className="text-xs font-black uppercase tracking-[0.4em] text-white">COGNAPSE Intelligence Swarm</h2>
                <span className="text-[9px] text-my-accent/60 uppercase tracking-widest font-bold">Admin Level Access Required</span>
              </div>
            </div>
            <div className="flex items-center gap-4">
               <button 
                 onClick={() => {
                   if (confirm("FORCE RESET PROTOCOL? This will clear all rate limits and reset token capacities across the global node network.")) {
                     resetSwarmHealth();
                     setHealth(getSwarmHealth());
                   }
                 }}
                 className="flex items-center gap-2 px-4 py-2 border border-red-500/30 text-red-500 text-[9px] font-black uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all rounded-full"
               >
                 <RefreshCw size={12} /> Force Reset Swarm
               </button>
               <button 
                 onClick={() => setDevOpen(false)}
                 className="p-2 text-white/40 hover:text-white transition-colors"
               >
                 <X size={20} />
               </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
            {/* Quick Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
              <MetricCard 
                label="Global Capacity" 
                value={health.totalTokensRemaining.toLocaleString()} 
                sub="Total Token Reserves" 
                icon={<Database size={24} />} 
              />
              <MetricCard 
                label="Active Nodes" 
                value={health.nodes.filter(n => n.status === 'stable' && n.name !== 'ollama').length} 
                sub={`${health.nodes.filter(n => n.name !== 'ollama').length} Registered Nodes`} 
                icon={<ActivityIcon size={24} />} 
              />

              <MetricCard 
                label="Uptime Index" 
                value="99.98%" 
                sub="Neural Link Stability" 
                icon={<Shield size={24} />} 
              />
            </div>

            {/* Nodes Detail */}
            <h3 className="text-[10px] font-bold text-white/40 uppercase tracking-[0.3em] mb-6 flex items-center gap-2">
              <Cpu size={14} /> Node Registry Status
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               {health.nodes
                 .filter(node => node.name !== 'ollama')
                 .map(node => (
                 <div key={node.name} className="p-6 bg-white/5 border border-white/10 hover:border-my-accent/40 transition-all group relative overflow-hidden">

                    <div className="flex justify-between items-start mb-6">
                       <div className="flex flex-col">
                          <span className="text-sm font-bold text-white group-hover:text-my-accent transition-colors">{node.name}</span>
                          <span className="text-[9px] text-white/40 uppercase tracking-widest mt-1">Intelligence Layer Node</span>
                       </div>
                       <div className={clsx(
                         "px-2 py-1 text-[8px] font-black uppercase tracking-widest border",
                         node.status === 'stable' ? "text-emerald-400 border-emerald-400/30 bg-emerald-400/5" :
                         node.status === 'quarantined' ? "text-red-400 border-red-400/30 bg-red-400/10 animate-pulse" :
                         "text-orange-400 border-orange-400/30 bg-orange-400/5"
                       )}>
                         {node.status}
                       </div>
                    </div>

                    <div className="space-y-4">
                       <div className="flex justify-between items-center text-[10px]">
                          <span className="text-white/40 uppercase tracking-widest">Token Capacity</span>
                          <span className="text-white font-bold">{node.capacity.tokens.toLocaleString()}</span>
                       </div>
                       <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.min(100, (node.capacity.tokens / 1000000) * 100)}%` }}
                            className={clsx(
                              "h-full transition-all duration-1000",
                              node.status === 'stable' ? "bg-emerald-500" : "bg-red-500"
                            )}
                          />
                       </div>

                       <div className="flex justify-between items-center text-[10px]">
                          <span className="text-white/40 uppercase tracking-widest">Request Quota</span>
                          <span className="text-white font-bold">{node.capacity.requests}</span>
                       </div>
                    </div>

                    {node.status !== 'stable' && node.quotaResetAt && (
                      <div className="mt-6 pt-4 border-t border-white/5 flex items-center gap-2 text-[9px] text-red-400/60 uppercase tracking-widest">
                        <AlertCircle size={10} /> 
                        Auto-Recovery: {new Date(node.quotaResetAt).toLocaleTimeString()}
                      </div>
                    )}

                    <div className="absolute -right-4 -bottom-4 opacity-[0.02] group-hover:opacity-[0.05] transition-opacity">
                       <Cpu size={80} />
                    </div>
                 </div>
               ))}
            </div>
          </div>

          <div className="p-6 bg-my-accent/5 border-t border-my-accent/10 flex items-center justify-between">
            <div className="text-[9px] text-white/40 uppercase tracking-widest flex items-center gap-3">
              <span className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Operational</span>
              <span className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-orange-500" /> Degraded</span>
              <span className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" /> Locked Out</span>
            </div>
            <div className="text-[9px] text-white/40 uppercase tracking-widest font-mono">
              SYSTEM TIME: {new Date().toLocaleTimeString()}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

function MetricCard({ label, value, sub, icon }: { label: string, value: string | number, sub: string, icon: any }) {
  return (
    <div className="p-6 bg-white/5 border border-white/10 hover:border-my-accent/20 transition-all group">
      <div className="flex items-center gap-4 mb-4">
        <div className="text-my-accent opacity-60 group-hover:opacity-100 transition-opacity">
          {icon}
        </div>
        <span className="text-[10px] font-bold text-white/40 uppercase tracking-[0.2em]">{label}</span>
      </div>
      <div className="text-3xl font-bold text-white mb-1">{value}</div>
      <div className="text-[9px] text-white/30 uppercase tracking-widest">{sub}</div>
    </div>
  );
}
