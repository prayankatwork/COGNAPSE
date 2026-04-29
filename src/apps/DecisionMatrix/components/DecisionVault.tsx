import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, History, Search, Zap, 
  Layers, Database,
  Activity, ChevronLeft, ChevronRight, 
  Library, Box, Fingerprint, Lock, Shield,
  Network, ArrowUpRight
} from 'lucide-react';
import { useStore } from '../../../store';
import clsx from 'clsx';

export default function DecisionVault() {
  const { 
    decisionArchive, setDecisionArchive, user, setAuthOpen,
    setActiveApp, xp, rank, setView
  } = useStore();
  
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const filteredArchive = useMemo(() => {
    if (!decisionArchive) return [];
    return decisionArchive.filter(item => 
      (item.query || "").toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [decisionArchive, searchQuery]);

  const dateGroups = useMemo(() => {
    const now = new Date();
    const today = new Date(now).setHours(0, 0, 0, 0);
    const yesterday = new Date(now).setDate(now.getDate() - 1);
    const lastWeek = new Date(now).setDate(now.getDate() - 7);

    const groups: Record<string, any[]> = {
      'Active Simulations': [],
      'Yesterday': [],
      'Archived Timelines': []
    };

    filteredArchive.forEach(item => {
      const d = new Date(item.timestamp || Date.now()).getTime();
      if (d >= today) groups['Active Simulations'].push(item);
      else if (d >= yesterday) groups['Yesterday'].push(item);
      else groups['Archived Timelines'].push(item);
    });

    return Object.fromEntries(Object.entries(groups).filter(([_, items]) => items.length > 0));
  }, [filteredArchive]);

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  return (
    <>
      {/* Mobile Backdrop */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 z-40 md:hidden backdrop-blur-sm"
          onClick={toggleSidebar}
        />
      )}

      <aside 
        className={clsx(
          "fixed md:relative top-0 left-0 h-full bg-my-sidebar border-r border-my-border flex flex-col z-50 transition-all duration-500 ease-in-out",
          isSidebarOpen ? "w-80" : "w-0 overflow-hidden border-none"
        )}
      >
        <div className="flex flex-col h-full w-80 relative overflow-hidden">
          {/* Blueprint Overlay */}
          <div className="absolute inset-0 opacity-[0.03] pointer-events-none -z-10" 
               style={{ backgroundImage: 'radial-gradient(#1A1A1A 1px, transparent 1px)', backgroundSize: '30px 30px' }} />

          {/* Tactical Header */}
          <div className="p-8 pb-6 border-b border-my-border">
              <div className="flex items-center justify-between mb-8">
                 <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse" />
                    <h2 className="text-[10px] font-bold text-my-accent uppercase tracking-[0.4em]">Simulation Vault</h2>
                 </div>
                 <div className="flex items-center gap-3">
                    <button onClick={toggleSidebar} className="p-1 text-[#CBD5E1] hover:text-black dark:hover:text-white transition-colors">
                       <ChevronLeft size={18} />
                    </button>
                 </div>
              </div>

             <button 
               onClick={() => {
                 window.location.reload();
               }}
               className="w-full py-4 bg-black text-white font-bold uppercase tracking-[0.3em] text-[10px] flex items-center justify-center gap-3 hover:bg-orange-500 transition-all shadow-xl group mb-8"
             >
               <Plus size={14} className="group-hover:rotate-90 transition-transform" /> New Simulation
             </button>

              <div className="flex items-center justify-between">
                  <div className="flex gap-4 shrink-0">
                     <button className="text-orange-500 p-1">
                        <History size={16} />
                     </button>
                  </div>
                  
                  <div className="relative flex-1 max-w-[160px]">
                     <Search size={12} className="absolute left-0 top-1/2 -translate-y-1/2 text-[#CBD5E1]" />
                     <input 
                       type="text"
                       placeholder="Filter..."
                       value={searchQuery}
                       onChange={(e) => setSearchQuery(e.target.value)}
                       className="w-full bg-transparent pl-6 pr-4 py-1 text-[9px] font-bold uppercase tracking-widest border-b border-my-border focus:outline-none focus:border-my-accent transition-all text-my-ink"
                     />
                  </div>
              </div>
          </div>

          {/* Simulation List */}
          <div className="flex-1 overflow-y-auto no-scrollbar px-8 py-8">
              {filteredArchive.length === 0 ? (
                 <div className="h-60 flex flex-col items-center justify-center text-center px-4">
                    <div className="opacity-20 text-[#64748B] flex flex-col items-center mb-6">
                       <Network size={48} className="mb-4" />
                       <span className="text-[9px] font-bold uppercase tracking-[0.3em]">No Timelines Found</span>
                    </div>
                    
                    {!user && (
                       <motion.button 
                         initial={{ opacity: 0, y: 10 }}
                         animate={{ opacity: 1, y: 0 }}
                         onClick={() => setAuthOpen(true)}
                         className="p-4 bg-black/5 border border-dashed border-[#E2E8F0] hover:border-orange-500/50 transition-all group"
                       >
                          <div className="flex items-center gap-2 text-orange-500 mb-1 justify-center">
                             <Lock size={12} />
                             <span className="text-[10px] font-bold uppercase tracking-widest">Restricted Access</span>
                          </div>
                          <p className="text-[9px] text-[#718096] uppercase tracking-widest leading-relaxed">
                             Authorize access to your <br /> operative profile to <br /> archive timelines.
                          </p>
                       </motion.button>
                    )}
                 </div>
              ) : (
                 <div className="flex flex-col gap-12">
                    {Object.entries(dateGroups).map(([group, items]) => (
                       <div key={group} className="space-y-8">
                           <div className="flex items-center gap-3">
                              <span className="text-[8px] font-bold text-my-accent uppercase tracking-[0.2em]">{group}</span>
                              <div className="h-px flex-1 bg-my-border" />
                           </div>
                          {items.map(item => (
                             <div 
                                key={item.id}
                                onClick={() => {
                                   const event = new CustomEvent('load-decision', { detail: item });
                                   window.dispatchEvent(event);
                                }}
                                role="button"
                                tabIndex={0}
                                className="w-full text-left group transition-all cursor-pointer"
                             >
                                <div className="flex items-start justify-between gap-3 mb-1.5">
                                    <h3 className="text-[13px] font-serif font-bold italic text-my-ink group-hover:text-my-accent transition-colors leading-tight">
                                      {item.query}
                                    </h3>
                                    <div className="flex items-center gap-2 shrink-0 mt-1">
                                      <Box size={10} className="text-my-accent opacity-40 group-hover:opacity-100 transition-opacity" />
                                    </div>
                                </div>
                                <div className="flex justify-between items-center">
                                   <span className="text-[8px] text-my-muted font-bold uppercase tracking-widest opacity-40 group-hover:opacity-100 transition-opacity">
                                     {new Date(item.timestamp).toLocaleDateString()} • {item.data?.realities?.length || 0} Realities
                                   </span>
                                </div>
                             </div>
                          ))}
                       </div>
                    ))}
                 </div>
              )}
          </div>

          {/* Footer - Identical to Sidebar */}
          <div className="p-8 bg-my-sidebar border-t border-my-border relative">
             <div className="flex items-center justify-between mb-5 w-full text-left group">
                <div className="flex flex-col">
                    <h4 className="text-[20px] font-bold text-my-ink uppercase tracking-[0.3em] font-serif italic leading-none">
                       {rank ? rank.replace(/[^\x00-\x7F]/g, "").trim() : 'OPERATIVE'}
                    </h4>
                 </div>
                <div className="text-right">
                   <span className="text-[12px] font-black text-my-ink opacity-100">{xp} / {(Math.floor(xp/100)+1)*100} XP</span>
                </div>
             </div>

             <div className="relative h-2 w-full bg-my-border rounded-none mb-8 group overflow-hidden">
                <div className="absolute inset-0 flex justify-between px-[1px]">
                   {[...Array(10)].map((_, i) => (
                      <div key={i} className="w-[1px] h-full bg-my-bg z-10" />
                   ))}
                </div>
                <motion.div 
                   initial={{ width: 0 }}
                   animate={{ width: `${(xp % 100)}%` }}
                   className="h-full bg-my-accent relative transition-all duration-1000"
                >
                   <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full animate-[shimmer_2s_infinite]" />
                </motion.div>
             </div>

             <div className="mb-4 p-3 bg-my-bg/50 border border-my-border rounded-[2px] relative overflow-hidden">
                <div className="flex items-center gap-2 mb-1 text-my-accent">
                   <Fingerprint size={10} />
                   <span className="text-[8px] font-black uppercase tracking-widest">Dev Note</span>
                </div>
                <p className="text-[9px] text-my-ink leading-relaxed font-semibold italic">
                  I am a Student & built this using Gemini, Groq, and Ollama (free models). 
                  If limits are hit, results might be slower.
                </p>
             </div>

             <div className="flex items-center justify-between">
                <button 
                  onClick={() => setView('landing')}
                  className="text-[11px] font-bold text-my-muted hover:text-my-ink transition-all uppercase tracking-[0.2em] flex items-center gap-2 group"
                >
                   Exit Protocol <ArrowUpRight size={16} className="group-hover:-translate-y-0.5 group-hover:translate-x-0.5 transition-transform" />
                </button>
             </div>
          </div>
        </div>
      </aside>

      {/* Floating Toggle for closed state */}
      {!isSidebarOpen && (
        <button 
          onClick={toggleSidebar}
          className="fixed top-1/2 left-4 -translate-y-1/2 w-10 h-10 bg-my-sidebar border border-my-border flex items-center justify-center text-my-muted hover:text-my-accent transition-all z-[60] shadow-2xl rounded-full"
        >
          <ChevronRight size={20} />
        </button>
      )}
    </>
  );
}
