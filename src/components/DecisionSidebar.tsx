import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, History, Search, Zap, LayoutGrid, 
  ChevronLeft, ArrowUpRight, Lock, Library, Box
} from 'lucide-react';
import { useStore } from '../store';
import clsx from 'clsx';

export default function DecisionSidebar() {
  const { 
    isSidebarOpen, toggleSidebar, setView, decisionArchive, currentDecision, 
    setCurrentDecision, xp, rank, user, setAuthOpen, setStatusOpen
  } = useStore();
  
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<'chronological' | 'topic'>('chronological');

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
    const lastMonth = new Date(now).setMonth(now.getMonth() - 1);

    const groups: Record<string, typeof decisionArchive> = {
      'Active Today': [],
      'Yesterday': [],
      'Last 7 Days': [],
      'Previous Month': [],
      'Archived Intelligence': []
    };

    filteredArchive.forEach(item => {
      const d = new Date(item.timestamp || Date.now()).getTime();
      if (d >= today) groups['Active Today'].push(item);
      else if (d >= yesterday) groups['Yesterday'].push(item);
      else if (d >= lastWeek) groups['Last 7 Days'].push(item);
      else if (d >= lastMonth) groups['Previous Month'].push(item);
      else groups['Archived Intelligence'].push(item);
    });

    // Remove empty groups
    return Object.fromEntries(Object.entries(groups).filter(([_, items]) => items.length > 0));
  }, [filteredArchive]);

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
               style={{ backgroundImage: 'radial-gradient(var(--my-accent) 1px, transparent 1px)', backgroundSize: '30px 30px' }} />

          {/* Tactical Header */}
          <div className="p-8 pb-6 border-b border-my-border">
              <div className="flex items-center justify-between mb-8">
                 <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-my-accent rounded-full animate-pulse" />
                    <h2 className="text-[10px] font-bold text-my-accent uppercase tracking-[0.4em]">Matrix Archive</h2>
                 </div>
                 <div className="flex items-center gap-3">
                    <ClearAllButton />
                    <button onClick={toggleSidebar} className="p-1 text-my-muted hover:text-my-ink transition-colors">
                       <ChevronLeft size={18} />
                    </button>
                 </div>
              </div>

             <button 
               onClick={() => { 
                 setCurrentDecision(null); 
               }}
               className="w-full py-4 bg-my-ink text-my-bg font-bold uppercase tracking-[0.3em] text-[10px] flex items-center justify-center gap-3 hover:bg-my-accent transition-all shadow-xl group mb-8 rounded-full"
             >
               <Plus size={14} className="group-hover:rotate-90 transition-transform" /> New Simulation
             </button>

              <div className="flex items-center justify-between">
                  <div className="flex gap-4 shrink-0">
                     <button 
                       onClick={() => setViewMode('chronological')} 
                       className={clsx("transition-colors p-2 -m-1 rounded-md", viewMode === 'chronological' ? "text-my-accent bg-my-accent/5" : "text-my-muted hover:text-my-ink")}
                       title="Chronological View"
                     >
                        <History size={16} />
                     </button>
                  </div>
                  
                  <div className="relative flex-1 max-w-[160px] group cursor-text">
                     <Search size={12} className="absolute left-0 top-1/2 -translate-y-1/2 text-my-muted pointer-events-none group-focus-within:text-my-accent transition-colors" />
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

          {/* Intelligence List */}
          <div className="flex-1 overflow-y-auto no-scrollbar px-8 py-8">
              {filteredArchive.length === 0 ? (
                 <div className="h-60 flex flex-col items-center justify-center text-center px-4">
                    <div className="opacity-20 text-my-muted flex flex-col items-center mb-6">
                       <Box size={48} className="mb-4" />
                       <span className="text-[9px] font-bold uppercase tracking-[0.3em]">No Simulations Found</span>
                    </div>
                    
                    {!user && (
                       <motion.button 
                         initial={{ opacity: 0, y: 10 }}
                         animate={{ opacity: 1, y: 0 }}
                         onClick={() => setAuthOpen(true)}
                         className="p-4 bg-my-bg/50 border border-dashed border-my-border hover:border-my-accent/50 transition-all group"
                       >
                          <div className="flex items-center gap-2 text-my-accent mb-1 justify-center">
                             <Lock size={12} />
                             <span className="text-[10px] font-bold uppercase tracking-widest">Restricted Access</span>
                          </div>
                          <p className="text-[9px] text-my-muted uppercase tracking-widest leading-relaxed">
                             Authorize access to your <br /> operative profile to <br /> archive simulations.
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
                         {items.map(item => <ArchiveItem key={item.id} item={item} />)}
                      </div>
                    ))}
                 </div>
             )}
          </div>

          {/* Forensic Dashboard Footer */}
          <div className="p-8 bg-my-sidebar border-t border-my-border relative">
             <button 
               onClick={() => setStatusOpen(true)}
               className="flex items-center justify-between mb-5 w-full text-left group hover:opacity-80 transition-opacity"
             >
                <div className="flex flex-col">
                    <h4 className="text-[20px] font-bold text-my-ink uppercase tracking-[0.3em] font-serif italic leading-none group-hover:text-my-accent transition-colors truncate">
                       {rank ? rank.replace(/[^\x00-\x7F]/g, "").trim() : 'OPERATIVE'}
                    </h4>
                 </div>
                <div className="text-right flex-shrink-0 ml-4">
                   <span className="text-[12px] font-black text-my-ink opacity-100 whitespace-nowrap">{xp} / {(Math.floor(xp/100)+1)*100} XP</span>
                </div>
             </button>

             {/* Advanced Progress Bar */}
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


             <div className="flex items-center justify-between mt-6">
                <button 
                  onClick={() => setView('landing')}
                  className="text-[11px] font-bold text-my-muted hover:text-my-ink transition-all uppercase tracking-[0.2em] flex items-center gap-2 group"
                >
                   Exit Simulator <ArrowUpRight size={16} className="group-hover:-translate-y-0.5 group-hover:translate-x-0.5 transition-transform" />
                </button>
             </div>
          </div>
        </div>
      </aside>
    </>
  );
}

function ClearAllButton() {
  const { clearDecisionArchive, decisionArchive } = useStore();
  const [confirming, setConfirming] = useState(false);

  if (!decisionArchive || decisionArchive.length === 0) return null;

  return (
    <button 
      onClick={(e) => {
        e.stopPropagation();
        if (confirming) {
          clearDecisionArchive();
          setConfirming(false);
        } else {
          setConfirming(true);
          setTimeout(() => setConfirming(false), 3000);
        }
      }}
      className={clsx(
        "px-2 py-1 text-[8px] font-black uppercase tracking-[0.2em] transition-all border rounded-full",
        confirming 
          ? "bg-red-500 text-white border-red-500 animate-pulse" 
          : "text-my-muted border-my-border hover:border-red-500/50 hover:text-red-500"
      )}
    >
      {confirming ? "CONFIRM PURGE?" : "CLEAR ALL"}
    </button>
  );
}

function ArchiveItem({ item }: { item: any }) {
  const { setCurrentDecision, currentDecision, removeFromDecisionArchive } = useStore();
  const isActive = currentDecision?.id === item.id;

  const relativeTime = useMemo(() => {
    const now = new Date();
    const past = new Date(item.timestamp || Date.now());
    const diffInMs = now.getTime() - past.getTime();
    const diffInMins = Math.floor(diffInMs / 60000);
    const diffInHours = Math.floor(diffInMins / 60);
    
    if (diffInMins < 1) return "Just Now";
    if (diffInMins < 60) return `${diffInMins}m ago`;
    if (diffInHours < 24) return `${diffInHours}h ago`;
    return past.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }, [item.timestamp]);

  return (
    <div
      onClick={() => { 
        setCurrentDecision(item); 
      }}
      role="button"
      tabIndex={0}
      className="w-full text-left group transition-all cursor-pointer"
    >
      <div className="flex items-start justify-between gap-3 mb-1.5">
          <h3 className={clsx(
            "text-[13px] font-serif font-bold italic transition-colors leading-tight line-clamp-2",
            isActive ? "text-my-accent" : "text-my-ink group-hover:text-my-accent"
          )}>
            "{item.query}"
          </h3>

          <div className="flex items-center gap-2 shrink-0 mt-1">
            <Zap size={10} className="text-my-accent" />
            <button 
              onClick={(e) => {
                e.stopPropagation();
                removeFromDecisionArchive(item.id);
              }}
              className="opacity-0 group-hover:opacity-40 hover:!opacity-100 transition-opacity p-1 hover:text-red-500"
            >
              <Plus size={12} className="rotate-45" /> 
            </button>
          </div>
      </div>
      
      <p className="text-[10px] text-my-muted mb-3 line-clamp-2 leading-relaxed font-light italic opacity-80">
        Simulation completed. {item.data?.realities?.length || 0} realities explored.
      </p>
      
      <div className="flex justify-between items-center">
         <span className="text-[8px] text-my-muted font-bold uppercase tracking-widest opacity-40 group-hover:opacity-100 transition-opacity">
           {relativeTime} • Parallel Paths
         </span>
         {isActive && (
           <motion.div 
             layoutId="activeIndicator"
             className="w-1.5 h-1.5 bg-my-accent rounded-full shadow-[0_0_8px_rgba(249,115,22,0.6)]" 
           />
         )}
      </div>
    </div>
  );
}
