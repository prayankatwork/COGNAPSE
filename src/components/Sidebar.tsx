import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, History, Search, Zap, Music, 
  Layers, Globe as GlobeIcon, Sun, Moon, Database,
  Cpu, FileText, LayoutGrid, Activity, 
  BookOpen, ChevronLeft, ChevronRight, 
  ArrowUpRight, ShieldCheck, Terminal,
  Library, Box, Fingerprint, Lock, Shield,
  FolderKanban
} from 'lucide-react';
import { useStore } from '../store';
import { Button } from './ui';
import clsx from 'clsx';
import { useShallow } from 'zustand/react/shallow';

export default function Sidebar() {
  const { 
    isSidebarOpen, toggleSidebar, setView, archive, currentReport, 
    setCurrentReport, xp, rank, searchCount, user, setAuthOpen, setStatusOpen,
    resetDeepResearch, setWalkthroughCompleted, walkthroughCompleted,
    currentView
  } = useStore(useShallow((state) => ({
    isSidebarOpen: state.isSidebarOpen,
    toggleSidebar: state.toggleSidebar,
    setView: state.setView,
    archive: state.archive,
    currentReport: state.currentReport,
    setCurrentReport: state.setCurrentReport,
    xp: state.xp,
    rank: state.rank,
    searchCount: state.searchCount,
    user: state.user,
    setAuthOpen: state.setAuthOpen,
    setStatusOpen: state.setStatusOpen,
    resetDeepResearch: state.resetDeepResearch,
    setWalkthroughCompleted: state.setWalkthroughCompleted,
    walkthroughCompleted: state.walkthroughCompleted,
    currentView: state.currentView
  })));
  
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<'chronological' | 'topic'>('chronological');

  const filteredArchive = useMemo(() => {
    if (!archive || !Array.isArray(archive)) return [];
    return archive.filter(item => 
      (item.query || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.report?.query_understood || "").toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [archive, searchQuery]);

  const topicGroups = useMemo(() => {
    const groups: Record<string, typeof archive> = {};
    filteredArchive.forEach(item => {
      const topic = item.topic_cluster || "Unclassified";
      if (!groups[topic]) groups[topic] = [];
      groups[topic].push(item);
    });
    return groups;
  }, [filteredArchive]);

  const dateGroups = useMemo(() => {
    const now = new Date();
    const today = new Date(now).setHours(0, 0, 0, 0);
    const yesterday = new Date(now).setDate(now.getDate() - 1);
    const lastWeek = new Date(now).setDate(now.getDate() - 7);
    const lastMonth = new Date(now).setMonth(now.getMonth() - 1);

    const groups: Record<string, typeof archive> = {
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
        id="walkthrough-sidebar-anchor"
        className={clsx(
          "fixed md:relative top-0 left-0 h-full bg-my-sidebar border-r border-my-border flex flex-col z-50 transition-all duration-500 ease-in-out",
          isSidebarOpen ? "w-80" : "w-0 overflow-hidden border-none"
        )}
      >
        <div className="flex flex-col h-full w-80 relative overflow-hidden">
          {/* Blueprint Overlay - Hidden on mobile for performance */}
          <div className="hidden md:block absolute inset-0 opacity-[0.03] pointer-events-none -z-10" 
               style={{ backgroundImage: 'radial-gradient(#1A1A1A 1px, transparent 1px)', backgroundSize: '30px 30px' }} />

          {/* View Toggle */}
          <div className="px-8 pt-6 pb-2 border-b border-my-border">
            <div className="flex items-center gap-1 bg-my-callout border border-my-border p-0.5 rounded-sm">
              <button
                onClick={() => setView('research')}
                className={`flex-1 py-1.5 text-[8px] font-bold uppercase tracking-widest transition-all rounded-sm ${
                  currentView === 'research'
                    ? 'bg-my-accent text-white dark:text-black shadow-sm'
                    : 'text-my-muted hover:text-my-ink'
                }`}
              >
                <div className="flex items-center justify-center gap-1">
                  <History size={10} />
                  Archive
                </div>
              </button>
              <button
                onClick={() => setView('documents')}
                className={`flex-1 py-1.5 text-[8px] font-bold uppercase tracking-widest transition-all rounded-sm ${
                  currentView === 'documents'
                    ? 'bg-my-accent text-white dark:text-black shadow-sm'
                    : 'text-my-muted hover:text-my-ink'
                }`}
              >
                <div className="flex items-center justify-center gap-1">
                  <FolderKanban size={10} />
                  Files
                </div>
              </button>
            </div>
          </div>

          {/* Sidebar Header */}
          <div className="p-8 pb-6 border-b border-my-border">
              <div className="flex items-center justify-between gap-4 mb-8">
                 <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-1.5 h-1.5 bg-my-signal rounded-full animate-pulse shrink-0" />
                    <h2 className="text-[10px] font-bold text-my-accent uppercase tracking-[0.4em] truncate">Archive</h2>
                 </div>
                 <div className="flex items-center gap-3 shrink-0">
                    <ClearAllButton />
                    <button 
                      onClick={() => walkthroughCompleted && toggleSidebar()} 
                      disabled={!walkthroughCompleted}
                      className={clsx(
                        "p-1 transition-colors shrink-0",
                        walkthroughCompleted ? "text-my-muted hover:text-my-ink cursor-pointer" : "text-my-muted/30 cursor-not-allowed"
                      )}
                    >
                       <ChevronLeft size={18} />
                    </button>
                 </div>
              </div>

             <Button
               variant="primary"
               disabled={!walkthroughCompleted}
               className={clsx('w-full py-4 tracking-[0.3em] shadow-accent mb-8 group', !walkthroughCompleted && 'opacity-30')}
               onClick={() => {
                 if (!walkthroughCompleted) return;
                 setView('research');
                 setCurrentReport(null);
                 resetDeepResearch();
               }}
               icon={<Plus size={14} className="group-hover:rotate-90 transition-transform" />}
             >
               New Investigation
             </Button>

              <div className="flex items-center justify-between">
                  <div className="flex gap-4 shrink-0">
                     <button onClick={() => setViewMode('chronological')} className={clsx("transition-colors p-1", viewMode === 'chronological' ? "text-my-accent" : "text-my-muted hover:text-my-ink")}>
                        <History size={16} />
                     </button>
                     <button onClick={() => setViewMode('topic')} className={clsx("transition-colors p-1", viewMode === 'topic' ? "text-my-accent" : "text-my-muted hover:text-my-ink")}>
                        <LayoutGrid size={16} />
                     </button>
                  </div>
                  
                  <div className="relative flex-1 max-w-[160px]">
                     <Search size={12} className="absolute left-0 top-1/2 -translate-y-1/2 text-my-muted" />
                     <input 
                       type="text"
                       placeholder="Filter History..."
                       value={searchQuery}
                       onChange={(e) => setSearchQuery(e.target.value)}
                       className="w-full bg-transparent pl-6 pr-4 py-1 text-[9px] font-bold uppercase tracking-widest border-b border-my-border focus:outline-none focus:border-my-accent transition-all text-my-ink"
                     />
                  </div>
              </div>
          </div>

          {/* Research List */}
          <div className="flex-1 overflow-y-auto no-scrollbar px-8 py-8">
              {filteredArchive.length === 0 ? (
                 <div className="h-60 flex flex-col items-center justify-center text-center px-4">
                    <div className="opacity-20 text-my-muted flex flex-col items-center mb-6">
                       <Library size={48} className="mb-4" />
                       <span className="text-[9px] font-bold uppercase tracking-[0.3em]">No Reports Archived</span>
                    </div>
                    
                    {!user ? (
                       <motion.button 
                         initial={{ opacity: 0, y: 10 }}
                         animate={{ opacity: 1, y: 0 }}
                         onClick={() => setAuthOpen(true)}
                         className="p-4 bg-my-callout/50 border border-dashed border-my-border hover:border-my-signal/50 transition-all group rounded-[4px]"
                       >
                          <div className="flex items-center gap-2 text-my-signal mb-1 justify-center">
                             <Lock size={12} />
                             <span className="text-[10px] font-bold uppercase tracking-widest">Restricted Access</span>
                          </div>
                          <p className="text-[9px] text-my-muted uppercase tracking-widest leading-relaxed">
                             Authorize access to your <br /> analyst profile to <br /> archive research.
                          </p>
                       </motion.button>
                    ) : (
                      <p className="text-[9px] text-my-muted uppercase tracking-widest leading-relaxed px-4">
                        Research reports will appear here upon completion of an analysis session.
                      </p>
                    )}
                 </div>
              ) : (
                 <div className="flex flex-col gap-12">
                    {viewMode === 'chronological' ? (
                       Object.entries(dateGroups).map(([group, items], idx) => (
            <motion.div
              key={group}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.04 }}
              className="space-y-4"
            >
              <div className="flex items-center gap-3">
                 <span className="text-[8px] font-bold text-my-accent uppercase tracking-[0.2em]">{group}</span>
                 <div className="h-px flex-1 bg-my-border" />
              </div>
             {items.map((item, idx) => (
               <motion.div
                 key={item.id}
                 initial={{ opacity: 0, x: -8 }}
                 animate={{ opacity: 1, x: 0 }}
                 transition={{ delay: 0.05 + idx * 0.03 }}
               >
                 <ArchiveItem item={item} />
               </motion.div>
             ))}
            </motion.div>
                       ))
                    ) : (
                      Object.entries(topicGroups).map(([topic, items], groupIdx) => (
                        <motion.div
                          key={topic}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: groupIdx * 0.04 }}
                          className="space-y-4"
                        >
                          <div className="flex items-center gap-3">
                             <span className="text-[8px] font-bold text-my-accent uppercase tracking-[0.2em]">{topic}</span>
                             <div className="h-px flex-1 bg-my-border" />
                          </div>
                         {items.map((item, idx) => (
                           <motion.div
                             key={item.id}
                             initial={{ opacity: 0, x: -8 }}
                             animate={{ opacity: 1, x: 0 }}
                             transition={{ delay: 0.05 + idx * 0.03 }}
                           >
                             <ArchiveItem item={item} />
                           </motion.div>
                         ))}
                        </motion.div>
                      ))
                   )}
                </div>
             )}
          </div>

          {/* Profile Footer */}
          <div className="p-8 bg-my-sidebar border-t border-my-border relative">
             <button 
               onClick={() => setStatusOpen(true)}
               className="flex items-end justify-between mb-5 w-full text-left group hover:opacity-80 transition-opacity"
             >
                <h4 className={clsx(
                   "font-bold text-my-ink uppercase font-serif italic leading-none group-hover:text-my-accent transition-colors whitespace-nowrap",
                   rank && rank.length > 8 ? "text-[16px] tracking-[0.2em]" : "text-[20px] tracking-[0.3em]"
                )}>
                   {rank ? rank.replace(/[^\x00-\x7F]/g, "").trim() : 'ANALYST'}
                </h4>
                <div className="text-right flex-shrink-0 ml-4 leading-none">
                   <span className="text-[12px] font-black text-my-ink opacity-100 whitespace-nowrap leading-none">
                      {xp} / {(Math.floor(xp/100)+1)*100} Score
                   </span>
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




              {/* Student Developer Disclaimer - Compact & Visible */}
             <div className="mb-4 p-3 bg-my-bg/50 border border-my-border rounded-[4px] relative overflow-hidden">
                <div className="flex items-center gap-2 mb-1 text-my-accent">
                   <Fingerprint size={10} />
                   <span className="text-[8px] font-black uppercase tracking-widest">Dev Note</span>
                </div>
                <p className="text-[9px] text-my-ink leading-relaxed font-semibold italic">
                  I am a Student & built this using Gemini, Groq, and Ollama (free models). 
                  If limits are hit, results might be slower.
                </p>
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

function ClearAllButton() {
  const { clearArchive, archive, walkthroughCompleted } = useStore(useShallow((state) => ({
    clearArchive: state.clearArchive,
    archive: state.archive,
    walkthroughCompleted: state.walkthroughCompleted
  })));
  const [confirming, setConfirming] = useState(false);

  if (archive.length === 0) return null;

  return (
    <button 
      onClick={(e) => {
        e.stopPropagation();
        if (!walkthroughCompleted) return;
        if (confirming) {
          clearArchive();
          setConfirming(false);
        } else {
          setConfirming(true);
          setTimeout(() => setConfirming(false), 3000);
        }
      }}
      disabled={!walkthroughCompleted}
      className={clsx(
        "px-2 py-1 text-[8px] font-black uppercase tracking-[0.2em] transition-all border",
        !walkthroughCompleted && "opacity-30 cursor-not-allowed",
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
  const { setView, setCurrentReport, currentReport, setDeepResearch, resetDeepResearch, removeFromArchive, walkthroughCompleted } = useStore(useShallow((state) => ({
    setView: state.setView,
    setCurrentReport: state.setCurrentReport,
    currentReport: state.currentReport,
    setDeepResearch: state.setDeepResearch,
    resetDeepResearch: state.resetDeepResearch,
    removeFromArchive: state.removeFromArchive,
    walkthroughCompleted: state.walkthroughCompleted
  })));
  const isActive = currentReport?.id === item.id || currentReport?.id === item.report?.id;

  const safeText = (val: any) => {
    if (typeof val === 'string') return val;
    if (val === null || val === undefined) return "";
    return JSON.stringify(val);
  };

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
        if (!walkthroughCompleted) return;
        setView('research'); 
        setCurrentReport(item.report); 
        if (item.report.deep_research) {
          setDeepResearch({
            status: 'completed',
            thesis: item.report.deep_research,
            scores: item.report.deep_scores || null,
            stage: 4,
            progress: 'Decrypted from Archive',
            reasoningTimeline: []
          });
        } else {
          resetDeepResearch();
        }
      }}
      role="button"
      tabIndex={0}
      className={clsx(
        "w-full text-left group transition-all",
        walkthroughCompleted ? "cursor-pointer" : "cursor-not-allowed opacity-80"
      )}
    >
      <div className="flex items-start justify-between gap-3 mb-1.5">
          <h3 className={clsx(
            "text-[13px] font-serif font-bold italic transition-colors leading-tight",
            isActive ? "text-my-accent" : "text-my-ink group-hover:text-my-accent"
          )}>
            {safeText(item.report?.query_understood || item.query)}
          </h3>
          <div className="flex items-center gap-2 shrink-0 mt-1">
            {item.report?.deep_research && <Zap size={10} className="text-my-accent" />}
            <button 
              onClick={(e) => {
                e.stopPropagation();
                if (!walkthroughCompleted) return;
                removeFromArchive(item.id);
              }}
              disabled={!walkthroughCompleted}
              className={clsx(
                "opacity-0 group-hover:opacity-40 hover:!opacity-100 transition-opacity p-1 hover:text-red-500",
                !walkthroughCompleted && "hidden"
              )}
            >
              <Plus size={12} className="rotate-45" /> 
            </button>
          </div>
      </div>
      
      <p className="text-[10px] text-my-muted mb-3 line-clamp-2 leading-relaxed font-light italic opacity-80">
        {safeText(item.report?.summary?.bottom_line || item.query)}
      </p>
      
      <div className="flex justify-between items-center">
         <span className="text-[8px] text-my-muted font-bold uppercase tracking-widest opacity-40 group-hover:opacity-100 transition-opacity">
           {relativeTime} • {item.topic_cluster || 'Intelligence'}
         </span>
         {isActive && (
           <motion.div 
             layoutId="activeIndicator"
             className="w-1.5 h-1.5 bg-my-signal rounded-full shadow-signal" 
           />
         )}
      </div>
    </div>
  );
}
