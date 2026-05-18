import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '../store';
import { 
  X, Shield, Fingerprint,
  Activity, Flame, Star, Target, Cpu,
  BarChart3, PieChart, Activity as ActivityIcon,
  TrendingUp, Zap, ZapOff, History, Search, Link2
} from 'lucide-react';
import clsx from 'clsx';

// ─── Analytics Components ─────────────────────────────────────────────────────

/**
 * Custom Radar Chart for "Neural Footprint"
 */
function NeuralRadar({ data }: { data: { category: string; value: number }[] }) {
  const size = 180;
  const center = size / 2;
  const radius = center * 0.7;
  const angleStep = (Math.PI * 2) / data.length;

  const points = data.map((d, i) => {
    const angle = i * angleStep - Math.PI / 2;
    const r = (d.value / 100) * radius;
    return {
      x: center + r * Math.cos(angle),
      y: center + r * Math.sin(angle)
    };
  });

  const polygonPath = points.map(p => `${p.x},${p.y}`).join(' ');

  return (
    <div className="relative flex flex-col items-center">
      <svg width={size} height={size} className="overflow-visible">
        {/* Background Hexagons */}
        {[0.2, 0.4, 0.6, 0.8, 1].map((scale) => {
          const r = radius * scale;
          const bgPoints = data.map((_, i) => {
            const angle = i * angleStep - Math.PI / 2;
            return `${center + r * Math.cos(angle)},${center + r * Math.sin(angle)}`;
          }).join(' ');
          return <polygon key={scale} points={bgPoints} fill="none" stroke="currentColor" strokeWidth="0.5" className="text-my-border" />;
        })}
        
        {/* Axis Lines */}
        {data.map((_, i) => {
          const angle = i * angleStep - Math.PI / 2;
          return (
            <line
              key={i}
              x1={center}
              y1={center}
              x2={center + radius * Math.cos(angle)}
              y2={center + radius * Math.sin(angle)}
              stroke="currentColor"
              strokeWidth="0.5"
              className="text-my-border"
            />
          );
        })}

        {/* Data Shape */}
        <motion.polygon
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          points={polygonPath}
          fill="rgba(var(--accent-rgb, 242, 125, 38), 0.2)"
          stroke="currentColor"
          strokeWidth="2"
          className="text-my-accent"
        />
        
        {/* Data Points */}
        {points.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r="2.5" className="fill-my-accent shadow-lg shadow-my-accent/50" />
        ))}
      </svg>
      
      {/* Labels */}
      {data.map((d, i) => {
        const angle = i * angleStep - Math.PI / 2;
        const x = center + (radius + 25) * Math.cos(angle);
        const y = center + (radius + 15) * Math.sin(angle);
        return (
          <div 
            key={i} 
            className="absolute text-[8px] font-black uppercase tracking-tighter text-my-muted text-center leading-none w-20"
            style={{ left: x - 40, top: y - 5, pointerEvents: 'none' }}
          >
            {d.category}
          </div>
        );
      })}
    </div>
  );
}

/**
 * Custom Area Chart for "XP Velocity"
 */
function VelocityChart({ data }: { data: number[] }) {
  const width = 360;
  const height = 80;
  const max = Math.max(...data, 100);
  const step = width / (data.length - 1);
  
  const points = data.map((v, i) => `${i * step},${height - (v / max) * height}`).join(' ');
  const areaPoints = `${points} ${width},${height} 0,${height}`;

  return (
    <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className="overflow-visible">
      <defs>
        <linearGradient id="velocityGradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.3" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
        </linearGradient>
      </defs>
      <motion.polyline
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1.5, ease: "easeInOut" }}
        points={points}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        className="text-my-accent"
      />
      <motion.polygon
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        points={areaPoints}
        fill="url(#velocityGradient)"
        className="text-my-accent"
      />
    </svg>
  );
}

/**
 * Mini Circular Gauge
 */
function TacticalGauge({ label, value, icon, colorClass = "text-my-accent" }: { label: string, value: number, icon: any, colorClass?: string }) {
  const radius = 24;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-2 flex-1 p-3 bg-my-bg border border-my-border">
      <div className="relative w-14 h-14 flex items-center justify-center">
        <svg className="absolute inset-0 w-full h-full -rotate-90">
          <circle cx="28" cy="28" r={radius} fill="none" stroke="currentColor" strokeWidth="2.5" className="text-my-border" />
          <motion.circle
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 1.5, ease: "easeOut" }}
            cx="28" cy="28" r={radius} 
            fill="none" stroke="currentColor" strokeWidth="2.5" 
            strokeDasharray={circumference}
            className={colorClass}
          />
        </svg>
        <div className={clsx("relative z-10", colorClass)}>{icon}</div>
      </div>
      <div className="text-center">
        <p className="text-[14px] font-black text-my-ink leading-none mb-1">{value}%</p>
        <p className="text-[7px] font-bold text-my-muted uppercase tracking-widest">{label}</p>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function OperativeStatus({ onClose }: OperativeStatusProps) {
  const { xp, rank, searchCount, streak, archive } = useStore();
  const [activeTab, setActiveTab] = useState<'overview' | 'analytics'>('overview');
  
  const nextRankXp = (Math.floor(xp / 100) + 1) * 100;
  const progress = (xp % 100);

  // Derive Radar Data from Archive
  const radarData = useMemo(() => {
    const counts: Record<string, number> = { TECH: 0, FINANCE: 0, GEOPOLITICS: 0, SCIENCE: 0, HEALTH: 0 };
    archive.forEach(entry => {
      if (counts[entry.topic_cluster]) counts[entry.topic_cluster]++;
    });
    const max = Math.max(...Object.values(counts), 1);
    return Object.entries(counts).map(([category, count]) => ({
      category,
      value: Math.max(20, (count / max) * 100) // Ensure a minimum shape
    }));
  }, [archive]);

  // Derive Growth Data (Fake historical velocity for demo based on search count)
  const growthData = useMemo(() => {
    // Generates a mock "growth" curve based on your actual stats
    return [10, 25, 18, 45, 32, 60, 48, searchCount % 100];
  }, [searchCount]);

  // Top Investigative Clusters
  const topClusters = useMemo(() => {
    const clusters: Record<string, number> = {};
    archive.forEach(e => {
      clusters[e.topic_cluster] = (clusters[e.topic_cluster] || 0) + 1;
    });
    return Object.entries(clusters)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);
  }, [archive]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[1000] bg-black/60 backdrop-blur-md md:backdrop-blur-2xl flex items-center justify-center p-4 md:p-6"
    >
      <motion.div
        initial={{ scale: 0.95, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className="w-full max-w-2xl bg-my-bg border border-my-border shadow-[0_40px_120px_rgba(0,0,0,0.3)] relative overflow-hidden flex flex-col h-[85vh] md:h-auto md:max-h-[90vh]"
      >
        {/* Animated Background Text */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[150px] font-black text-my-accent/[0.03] select-none pointer-events-none rotate-12">
          PROFILE
        </div>

        {/* Header / Tabs */}
        <div className="px-8 pt-8 flex items-center justify-between border-b border-my-border bg-my-bg/50 backdrop-blur-md md:backdrop-blur-xl relative z-10">
          <div className="flex gap-8">
            <button 
              onClick={() => setActiveTab('overview')}
              className={clsx(
                "pb-4 text-[10px] font-black uppercase tracking-[0.3em] transition-all relative",
                activeTab === 'overview' ? "text-my-accent" : "text-my-muted hover:text-my-ink"
              )}
            >
              01/ Overview
              {activeTab === 'overview' && <motion.div layoutId="tab" className="absolute bottom-0 left-0 w-full h-0.5 bg-my-accent" />}
            </button>
            <button 
              onClick={() => setActiveTab('analytics')}
              className={clsx(
                "pb-4 text-[10px] font-black uppercase tracking-[0.3em] transition-all relative",
                activeTab === 'analytics' ? "text-my-accent" : "text-my-muted hover:text-my-ink"
              )}
            >
              02/ Research Analytics
              {activeTab === 'analytics' && <motion.div layoutId="tab" className="absolute bottom-0 left-0 w-full h-0.5 bg-my-accent" />}
            </button>
          </div>
          <button 
            onClick={onClose}
            className="mb-4 p-2 text-my-muted hover:text-my-accent transition-colors bg-my-callout rounded-full"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar relative z-10">
          <AnimatePresence mode="wait">
            {activeTab === 'overview' ? (
              <motion.div
                key="overview"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="p-8 md:p-10 flex flex-col md:flex-row gap-10 items-center"
              >
                {/* Profile Section */}
                <div className="flex flex-col items-center text-center flex-1">
                   <div className="relative w-36 h-36 mb-8 flex items-center justify-center">
                      <motion.div 
                        animate={{ scale: [1, 1.1, 1], opacity: [0.2, 0.1, 0.2] }}
                        transition={{ duration: 4, repeat: Infinity }}
                        className="absolute inset-0 bg-my-accent/10 rounded-full blur-2xl"
                      />
                      <div className="absolute inset-0 border border-dashed border-my-accent/20 rounded-full animate-spin-slow" />
                      <div className="w-24 h-24 bg-my-ink dark:bg-my-accent rounded-full flex items-center justify-center shadow-2xl relative z-10 overflow-hidden group">
                         <div className="absolute inset-0 bg-gradient-to-tr from-my-accent/40 to-transparent opacity-60" />
                         <Fingerprint size={48} className="text-white dark:text-black relative z-10" strokeWidth={1.5} />
                      </div>
                      <div className="absolute bottom-2 right-2 w-4 h-4 bg-emerald-500 rounded-full border-4 border-my-bg shadow-lg animate-pulse" />
                   </div>

                   <div className="mb-8">
                      <h2 className="text-4xl md:text-5xl font-serif font-bold italic text-my-ink leading-tight tracking-tight">
                         {rank?.replace(/[^\x00-\x7F]/g, "").trim() || "Analyst"}
                      </h2>
                      <p className="text-[10px] font-bold text-my-accent uppercase tracking-[0.5em] mt-2">Verified Professional Identity</p>
                   </div>

                   <div className="w-full space-y-3">
                      <StatRow label="Research Reports" value={searchCount} icon={<Target size={14} />} />
                      <StatRow label="Activity Streak" value={`${streak || 0} Days`} icon={<Flame size={14} className="text-orange-500" />} />
                      <StatRow label="Account Standing" value={xp} icon={<Star size={14} className="text-yellow-500" />} />
                   </div>
                </div>

                {/* Progression Panel */}
                <div className="flex-1 w-full space-y-6">
                   <div className="p-8 bg-my-callout/50 border border-my-border backdrop-blur-sm relative overflow-hidden shadow-inner">
                      <div className="flex items-center justify-between mb-4">
                         <h3 className="text-[10px] font-bold uppercase tracking-[0.4em] text-my-muted flex items-center gap-2">
                            <Cpu size={12} /> System Clearance
                         </h3>
                         <span className="text-[10px] font-mono text-my-accent font-bold tracking-tighter">{xp} / {nextRankXp} Score</span>
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
                         Acquire {nextRankXp - xp} additional points to unlock Tier {Math.floor(xp/100) + 2} analysis tools. 
                         Data quota utilized: {progress}%.
                      </p>
                   </div>
                   
                   <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 border border-my-border bg-my-bg">
                         <p className="text-[8px] font-black text-my-muted uppercase tracking-widest mb-1">Clearance Tier</p>
                         <p className="text-xl font-bold text-my-ink italic">Level {Math.floor(xp/100) + 1}</p>
                      </div>
                      <div className="p-4 border border-my-border bg-my-bg">
                         <p className="text-[8px] font-black text-my-muted uppercase tracking-widest mb-1">Account Rating</p>
                         <p className="text-xl font-bold text-my-ink italic">Verified</p>
                      </div>
                   </div>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="analytics"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="p-8 md:p-10 flex flex-col gap-8"
              >
                {/* Row 1: Radar & Velocity */}
                <div className="flex flex-col md:flex-row gap-8">
                  <div className="flex-1 p-6 bg-my-callout/30 border border-my-border flex flex-col items-center">
                    <h4 className="text-[9px] font-black text-my-accent uppercase tracking-[0.3em] mb-8 text-center">Research Focus (Topic Bias)</h4>
                    <NeuralRadar data={radarData} />
                    <p className="mt-6 text-[8px] text-my-muted text-center italic">Specialization: {radarData.sort((a,b)=>b.value-a.value)[0].category} Specialist</p>
                  </div>
                  
                  <div className="flex-[1.5] p-6 bg-my-callout/30 border border-my-border flex flex-col justify-between">
                    <div>
                      <h4 className="text-[9px] font-black text-my-accent uppercase tracking-[0.3em] mb-2">Activity Growth</h4>
                      <p className="text-[8px] text-my-muted mb-6">Aggregate research accumulation across active work sessions.</p>
                    </div>
                    <div className="bg-black/5 dark:bg-white/5 p-4 border border-my-border/50">
                      <VelocityChart data={growthData} />
                    </div>
                    <div className="flex justify-between mt-4">
                      <div className="flex flex-col">
                        <span className="text-xl font-bold text-my-ink">+{xp}</span>
                        <span className="text-[7px] text-my-muted uppercase font-bold tracking-widest">Total Activity Score</span>
                      </div>
                      <div className="flex flex-col text-right">
                        <span className="text-xl font-bold text-emerald-500 flex items-center gap-1 justify-end"><TrendingUp size={14} /> 12%</span>
                        <span className="text-[7px] text-my-muted uppercase font-bold tracking-widest">Session Productivity</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Row 2: Gauges & Topics */}
                <div className="flex flex-col md:flex-row gap-6">
                  <div className="flex-1 flex gap-3">
                    <TacticalGauge 
                      label="Report Density" 
                      value={Math.min(100, Math.round((xp / (searchCount || 1)) * 5))} 
                      icon={<Zap size={14} />} 
                    />
                    <TacticalGauge 
                      label="Knowledge Scope" 
                      value={Math.min(100, (archive.length / 50) * 100)} 
                      icon={<Link2 size={14} />} 
                      colorClass="text-blue-400"
                    />
                  </div>

                  <div className="flex-1 p-6 bg-my-callout/30 border border-my-border">
                    <h4 className="text-[9px] font-black text-my-accent uppercase tracking-[0.3em] mb-6">Core Topic Focus</h4>
                    <div className="space-y-3">
                      {topClusters.length > 0 ? topClusters.map(([cat, count]) => (
                        <div key={cat} className="space-y-1">
                          <div className="flex justify-between text-[8px] font-bold uppercase tracking-widest">
                            <span className="text-my-ink">{cat}</span>
                            <span className="text-my-accent">{count} Entries</span>
                          </div>
                          <div className="h-1.5 w-full bg-my-border rounded-full overflow-hidden">
                            <motion.div 
                              initial={{ width: 0 }}
                              animate={{ width: `${(count / topClusters[0][1]) * 100}%` }}
                              className="h-full bg-my-accent" 
                            />
                          </div>
                        </div>
                      )) : (
                        <p className="text-[10px] text-my-muted italic text-center py-4">No data recorded yet.</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Heatmap Section */}
                <div className="p-6 bg-my-callout/30 border border-my-border">
                   <div className="flex items-center justify-between mb-4">
                      <h4 className="text-[9px] font-black text-my-accent uppercase tracking-[0.3em]">Research Activity Map</h4>
                      <div className="flex gap-1">
                         {[1,2,3,4].map(v => <div key={v} className={clsx("w-2 h-2", v === 1 ? "bg-my-border" : v === 2 ? "bg-my-accent/30" : v === 3 ? "bg-my-accent/60" : "bg-my-accent")} />)}
                      </div>
                   </div>
                   <div className="flex flex-wrap gap-1.5 justify-between">
                      {Array.from({ length: 42 }).map((_, i) => (
                        <motion.div 
                          key={i}
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: i * 0.01 }}
                          className={clsx(
                            "w-4 h-4 border border-my-border/20 transition-all",
                            i % 7 === 0 ? "bg-my-accent" : i % 5 === 0 ? "bg-my-accent/40" : "bg-my-border/40"
                          )}
                        />
                      ))}
                   </div>
                   <p className="text-[7px] text-my-muted uppercase tracking-[0.2em] mt-4 font-bold text-center">Historical research frequency over the trailing 42-day cycle</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Technical Footer */}
        <div className="px-8 py-6 border-t border-my-border bg-my-callout/30 flex items-center justify-between relative z-10">
           <div className="flex items-center gap-2 text-my-muted">
              <Shield size={12} className="opacity-50" />
              <span className="text-[8px] font-black uppercase tracking-[0.2em] opacity-50">Secure Data Protocol: AES-256 Encrypted</span>
           </div>
           <button 
             onClick={() => {
               if (window.confirm("WARNING: This will permanently and irreversibly delete your research history, saved reports, and account credentials from our servers. \n\nProceed with data deletion?")) {
                  useStore.getState().deleteAccount();
               }
             }}
             className="text-[8px] font-black uppercase tracking-[0.3em] text-red-500/60 hover:text-red-500 transition-colors"
           >
              Purge Personal Data
           </button>
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
       <span className="text-[14px] font-black text-my-ink tracking-tight">{value}</span>
    </div>
  );
}

interface OperativeStatusProps {
  onClose: () => void;
}
