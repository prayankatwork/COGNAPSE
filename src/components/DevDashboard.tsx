import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '../store';
import {
  X, Activity, Cpu,
  Terminal, Shield, Database, RefreshCw,
  AlertCircle, BarChart3, Gauge, Zap, Clock,
  Layers, TrendingUp, Hash
} from 'lucide-react';
import { Button } from './ui';
import { getSwarmHealth, resetSwarmHealth } from '../services/aiService';
import { benchmarkTracker } from '../services/benchmarkTracker';
import type { BenchmarkStats, BenchmarkPoint } from '../services/benchmarkTracker';
import clsx from 'clsx';

type DashboardTab = 'nodes' | 'benchmarks';

export default function DevDashboard() {
  const { isDevOpen, setDevOpen } = useStore();
  const [health, setHealth] = useState(getSwarmHealth());
  const [activeTab, setActiveTab] = useState<DashboardTab>('nodes');
  const [stats, setStats] = useState<BenchmarkStats>(benchmarkTracker.getStats());
  const [researchStats, setResearchStats] = useState<BenchmarkStats>(benchmarkTracker.getStats('research'));
  const [deepStats, setDeepStats] = useState<BenchmarkStats>(benchmarkTracker.getStats('deep_research'));
  const [recentEvents, setRecentEvents] = useState<BenchmarkPoint[]>(benchmarkTracker.getRecentEvents());

  useEffect(() => {
    const interval = setInterval(() => {
      setHealth(getSwarmHealth());
      setStats(benchmarkTracker.getStats());
      setResearchStats(benchmarkTracker.getStats('research'));
      setDeepStats(benchmarkTracker.getStats('deep_research'));
      setRecentEvents(benchmarkTracker.getRecentEvents());
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
          className="w-full max-w-4xl bg-my-bg dark:bg-[#0A0A0A] border border-my-border shadow-signal overflow-hidden flex flex-col h-[80vh] rounded-[4px]"
        >
          {/* Header */}
          <div className="p-6 border-b border-my-accent/20 bg-my-accent/5 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Terminal size={20} className="text-my-accent" />
              <div>
                <h2 className="text-xs font-black uppercase tracking-[0.3em] text-white">COGNAPSE Intelligence Swarm</h2>
                <span className="text-[9px] text-my-accent/60 uppercase tracking-widest font-bold">Admin Level Access Required</span>
              </div>
            </div>
            <div className="flex items-center gap-4">
               <Button
                 variant="danger"
                 onClick={() => {
                   if (confirm("FORCE RESET PROTOCOL? This will clear all rate limits and reset token capacities across the global node network.")) {
                     resetSwarmHealth();
                     setHealth(getSwarmHealth());
                   }
                 }}
                 className="text-[9px] px-4 py-2 rounded-full"
                 icon={<RefreshCw size={12} />}
               >
                 Force Reset Swarm
               </Button>
               <Button
                 variant="ghost"
                 onClick={() => setDevOpen(false)}
                 className="p-2 text-white/40 hover:text-white"
                 icon={<X size={20} />}
               ><></></Button>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex border-b border-white/10 px-6">
            <TabButton
              active={activeTab === 'nodes'}
              onClick={() => setActiveTab('nodes')}
              icon={<Cpu size={14} />}
              label="Node Registry"
            />
            <TabButton
              active={activeTab === 'benchmarks'}
              onClick={() => setActiveTab('benchmarks')}
              icon={<BarChart3 size={14} />}
              label="Benchmarks"
              badge={stats.count > 0 ? stats.count : undefined}
            />
          </div>

          <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
            {activeTab === 'nodes' && <NodesTab health={health} />}
            {activeTab === 'benchmarks' && (
              <BenchmarksTab
                stats={stats}
                researchStats={researchStats}
                deepStats={deepStats}
                recentEvents={recentEvents}
              />
            )}
          </div>

          <div className="p-6 bg-my-accent/5 border-t border-my-accent/10 flex items-center justify-between">
            <div className="text-[9px] text-white/40 uppercase tracking-widest flex items-center gap-3">
              <span className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-current ds-text-success" /> Operational</span>
              <span className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-my-signal" /> Degraded</span>
              <span className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-current ds-text-danger animate-pulse" /> Locked Out</span>
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

/* ─── Tab Button ─── */

function TabButton({ active, onClick, icon, label, badge }: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  badge?: number;
}) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        "flex items-center gap-2 px-5 py-3 text-[10px] font-black uppercase tracking-[0.2em] border-b-2 transition-all",
        active
          ? "text-my-accent border-my-accent bg-my-accent/5"
          : "text-white/30 border-transparent hover:text-white/60 hover:border-white/20"
      )}
    >
      {icon}
      {label}
      {badge !== undefined && (
        <span className="ml-1 px-1.5 py-0.5 text-[8px] rounded-full bg-my-accent/20 text-my-accent">
          {badge}
        </span>
      )}
    </button>
  );
}

/* ─── Nodes Tab ─── */

function NodesTab({ health }: { health: Record<string, { status: 'stable' | 'unstable', lastFailure: number }> }) {
  return (
    <>
      {/* Quick Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        <MetricCard
          label="Total Nodes"
          value={Object.keys(health).length}
          sub="Registered Intelligence Layers"
          icon={<Database size={24} />}
        />
        <MetricCard
          label="Stable Nodes"
          value={Object.values(health).filter(n => n.status === 'stable').length}
          sub="Active and Available"
          icon={<Activity size={24} />}
        />
        <MetricCard
          label="Uptime Index"
          value="99.98%"
          sub="System Link Stability"
          icon={<Shield size={24} />}
        />
      </div>

      {/* Nodes Detail */}
      <h3 className="text-[10px] font-bold text-white/40 uppercase tracking-[0.3em] mb-6 flex items-center gap-2">
        <Cpu size={14} /> Node Registry Status
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
         {Object.entries(health).map(([name, node]) => (
           <div key={name} className="p-6 bg-white/5 border border-white/10 hover:border-my-accent/40 transition-all group relative overflow-hidden">

              <div className="flex justify-between items-start mb-4">
                 <div className="flex flex-col">
                    <span className="text-sm font-bold text-white group-hover:text-my-accent transition-colors">{name}</span>
                    <span className="text-[9px] text-white/40 uppercase tracking-widest mt-1">Intelligence Layer Node</span>
                 </div>
                 <div className={clsx(
                   "px-2 py-1 text-[8px] font-black uppercase tracking-widest border",
                   node.status === 'stable' ? "text-emerald-400 border-emerald-400/30 bg-emerald-400/5" :
                   "text-red-400 border-red-400/30 bg-red-400/10 animate-pulse"
                 )}>
                   {node.status}
                 </div>
              </div>

              <div className="space-y-4">
                 <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: node.status === 'stable' ? '100%' : '0%' }}
                      className={clsx(
                        "h-full transition-all duration-1000",
                        node.status === 'stable' ? "bg-emerald-500" : "bg-red-500"
                      )}
                    />
                 </div>
              </div>

              {node.status !== 'stable' && node.lastFailure > 0 && (
                <div className="mt-6 pt-4 border-t border-white/5 flex items-center gap-2 text-[9px] text-red-400/60 uppercase tracking-widest">
                  <AlertCircle size={10} />
                  Node Quarantined at {new Date(node.lastFailure).toLocaleTimeString()}
                </div>
              )}

              <div className="absolute -right-4 -bottom-4 opacity-[0.02] group-hover:opacity-[0.05] transition-opacity">
                 <Cpu size={80} />
              </div>
           </div>
         ))}
      </div>
    </>
  );
}

/* ─── Benchmarks Tab ─── */

function BenchmarksTab({ stats, researchStats, deepStats, recentEvents }: {
  stats: BenchmarkStats;
  researchStats: BenchmarkStats;
  deepStats: BenchmarkStats;
  recentEvents: BenchmarkPoint[];
}) {
  return (
    <>
      {/* Latency Overview */}
      <h3 className="text-[10px] font-bold text-white/40 uppercase tracking-[0.3em] mb-6 flex items-center gap-2">
        <Gauge size={14} /> Latency Overview
      </h3>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-10">
        <LatencyCard label="p50" value={`${stats.p50}ms`} icon={<Zap size={16} />} />
        <LatencyCard label="p95" value={`${stats.p95}ms`} icon={<Zap size={16} />} highlight={stats.p95 > 10000} />
        <LatencyCard label="Min" value={`${stats.min}ms`} icon={<Clock size={16} />} />
        <LatencyCard label="Max" value={`${stats.max}ms`} icon={<TrendingUp size={16} />} />
        <LatencyCard label="Avg" value={`${stats.avg}ms`} icon={<Activity size={16} />} />
      </div>

      {/* Category Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
        {/* Standard Research */}
        <div className="p-6 bg-white/5 border border-white/10">
          <h4 className="text-[9px] font-black text-white/40 uppercase tracking-[0.3em] mb-4 flex items-center gap-2">
            <Layers size={12} /> Standard Research
          </h4>
          <div className="space-y-3">
            <StatRow label="Samples" value={researchStats.count} />
            <StatRow label="p50 / p95" value={`${researchStats.p50}ms / ${researchStats.p95}ms`} />
            <StatRow label="Min / Max" value={`${researchStats.min}ms / ${researchStats.max}ms`} />
            <StatRow label="Avg Latency" value={`${researchStats.avg}ms`} />
            <StatRow label="Total Tokens" value={researchStats.totalTokens.toLocaleString()} />
            <StatRow label="Retries" value={researchStats.retryCount} />
          </div>
        </div>

        {/* Deep Research */}
        <div className="p-6 bg-white/5 border border-white/10">
          <h4 className="text-[9px] font-black text-white/40 uppercase tracking-[0.3em] mb-4 flex items-center gap-2">
            <Layers size={12} /> Deep Research
          </h4>
          <div className="space-y-3">
            <StatRow label="Samples" value={deepStats.count} />
            <StatRow label="p50 / p95" value={`${deepStats.p50}ms / ${deepStats.p95}ms`} />
            <StatRow label="Min / Max" value={`${deepStats.min}ms / ${deepStats.max}ms`} />
            <StatRow label="Avg Latency" value={`${deepStats.avg}ms`} />
            <StatRow label="Total Tokens" value={deepStats.totalTokens.toLocaleString()} />
            <StatRow label="Retries" value={deepStats.retryCount} />
          </div>
        </div>
      </div>

      {/* Model Distribution */}
      <h3 className="text-[10px] font-bold text-white/40 uppercase tracking-[0.3em] mb-6 flex items-center gap-2">
        <Hash size={14} /> Model Distribution
      </h3>

      <div className="p-6 bg-white/5 border border-white/10 mb-10">
        {Object.keys(stats.modelDistribution).length === 0 ? (
          <div className="text-[10px] text-white/30 italic">No data collected yet. Run some research queries first.</div>
        ) : (
          <div className="space-y-3">
            {Object.entries(stats.modelDistribution)
              .sort(([, a], [, b]) => b - a)
              .map(([model, count]) => {
                const pct = stats.count > 0 ? Math.round((count / stats.count) * 100) : 0;
                return (
                  <div key={model} className="flex items-center gap-4">
                    <span className="text-xs text-white/80 min-w-[200px] truncate">{model}</span>
                    <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        className="h-full rounded-full bg-my-accent/60"
                      />
                    </div>
                    <span className="text-[10px] text-white/40 min-w-[60px] text-right">{count}x ({pct}%)</span>
                  </div>
                );
              })}
          </div>
        )}
      </div>

      {/* Recent Events */}
      <h3 className="text-[10px] font-bold text-white/40 uppercase tracking-[0.3em] mb-6 flex items-center gap-2">
        <Activity size={14} /> Recent Events (Last {Math.min(recentEvents.length, 20)})
      </h3>

      <div className="space-y-2">
        {recentEvents.length === 0 ? (
          <div className="p-6 bg-white/5 border border-white/10">
            <div className="text-[10px] text-white/30 italic">No events recorded yet.</div>
          </div>
        ) : (
          recentEvents.slice(0, 20).map((event) => (
            <div key={event.id} className="p-3 bg-white/[0.03] border border-white/5 flex items-center justify-between text-[10px]">
              <div className="flex items-center gap-4 min-w-0 flex-1">
                <span className={clsx(
                  "px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider",
                  event.category === 'research' ? 'bg-blue-500/20 text-blue-400' : 'bg-purple-500/20 text-purple-400'
                )}>
                  {event.category === 'research' ? 'STD' : 'DEEP'}
                </span>
                <span className="text-white/80 truncate">{event.queryPreview}...</span>
                {event.isRetry && (
                  <span className="ds-text-warning/80 text-[8px] uppercase tracking-wider">retry</span>
                )}
              </div>
              <div className="flex items-center gap-4 shrink-0 ml-4">
                <span className="text-white/60">{event.model.split('-').slice(0, 2).join('-')}</span>
                <span className={clsx(
                  "font-mono font-bold",
                  event.roundTripMs < 3000 ? "text-emerald-400" :
                  event.roundTripMs < 10000 ? "text-yellow-400" :
                  "text-red-400"
                )}>
                  {event.roundTripMs}ms
                </span>
                {event.swarmMs > 0 && (
                  <span className="text-white/30">{event.swarmMs}ms</span>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </>
  );
}

/* ─── Sub-components ─── */

function MetricCard({ label, value, sub, icon }: { label: string, value: string | number, sub: string, icon: React.ReactNode }) {
  return (
    <div className="p-6 bg-white/5 border border-white/10 hover:border-my-accent/20 transition-all group">
      <div className="flex items-center gap-4 mb-4">
        <div className="text-my-accent opacity-60 group-hover:opacity-100 transition-opacity">
          {icon}
        </div>
        <span className="text-xs font-bold text-white/40 uppercase tracking-[0.2em]">{label}</span>
      </div>
      <div className="text-3xl font-bold text-white mb-1">{value}</div>
      <div className="text-[9px] text-white/30 uppercase tracking-widest">{sub}</div>
    </div>
  );
}

function LatencyCard({ label, value, icon, highlight }: {
  label: string;
  value: string;
  icon: React.ReactNode;
  highlight?: boolean;
}) {
  return (
    <div className={clsx(
      "p-4 border transition-all",
      highlight
        ? "bg-red-500/5 border-red-500/30"
        : "bg-white/5 border-white/10 hover:border-my-accent/20"
    )}>
      <div className="flex items-center gap-2 mb-3">
        <div className={highlight ? 'text-red-400' : 'text-my-accent/60'}>
          {icon}
        </div>
        <span className="text-[8px] font-bold text-white/40 uppercase tracking-[0.2em]">{label}</span>
      </div>
      <div className={clsx(
        "text-xl font-bold",
        highlight ? 'text-red-400' : 'text-white'
      )}>{value}</div>
    </div>
  );
}

function StatRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex items-center justify-between text-[10px]">
      <span className="text-white/40 uppercase tracking-wider">{label}</span>
      <span className="text-white font-mono">{value}</span>
    </div>
  );
}
