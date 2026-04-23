import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, History, Search, Zap, Music, 
  Layers, Globe, Sun, Moon, Database,
  Cpu, FileText, LayoutGrid, Activity, 
  BookOpen, ChevronLeft, ChevronRight, 
  ArrowUpRight, ShieldCheck, Terminal,
  Library, Box, Fingerprint, Lock, Shield
} from 'lucide-react';
import { useStore } from '../store';
import clsx from 'clsx';

export default function Sidebar() {
  const { 
    isSidebarOpen, toggleSidebar, setView, archive, currentReport, 
    setCurrentReport, xp, rank, searchCount, user, setAuthOpen
  } = useStore();
  
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<'chronological' | 'topic'>('chronological');

  const filteredArchive = useMemo(() => {
    if (!archive) return [];
    return archive.filter(item => 
      (item.query || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.report?.query_understood || "").toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [archive, searchQuery]);

  const topicGroups = useMemo(() => {
    const groups: Record<string, typeof archive> = {};
    filteredArchive.forEach(item => {
      const topic = item.report?.query_understood?.split(' ')[0] || "General";
      if (!groups[topic]) groups[topic] = [];
      groups[topic].push(item);
    });
    return groups;
  }, [filteredArchive]);

  const dateGroups = useMemo(() => {
    const today = new Date();
    today.setHours(0,0,0,0);
    const groups: Record<string, typeof archive> = { Today: [], Earlier: [] };
    filteredArchive.forEach(item => {
      const d = new Date(item.timestamp || Date.now());
      if (d >= today) groups.Today.push(item);
      else groups.Earlier.push(item);
    });
    return groups;
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
          "fixed md:relative top-0 left-0 h-full bg-white border-r border-[#E2E8F0] flex flex-col z-50 transition-all duration-500 ease-in-out",
          isSidebarOpen ? "w-80" : "w-0 overflow-hidden border-none"
        )}
      >
        <div className="flex flex-col h-full w-80 relative overflow-hidden">
          {/* Blueprint Overlay */}
          <div className="absolute inset-0 opacity-[0.03] pointer-events-none -z-10" 
               style={{ backgroundImage: 'radial-gradient(#1A1A1A 1px, transparent 1px)', backgroundSize: '30px 30px' }} />

          {/* Tactical Header */}
          <div className="p-8 pb-6 border-b border-[#E2E8F0]">
             <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                   <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse" />
                   <h2 className="text-[10px] font-bold text-black uppercase tracking-[0.4em]">Intel Archive</h2>
                </div>
                <button onClick={toggleSidebar} className="p-1 text-[#CBD5E1] hover:text-black transition-colors">
                   <ChevronLeft size={18} />
                </button>
             </div>

             <button 
               onClick={() => { setView('research'); setCurrentReport(null); }}
               className="w-full py-4 bg-black text-white font-bold uppercase tracking-[0.3em] text-[10px] flex items-center justify-center gap-3 hover:bg-orange-500 transition-all shadow-xl group mb-8"
             >
               <Plus size={14} className="group-hover:rotate-90 transition-transform" /> New Research
             </button>

             <div className="flex items-center justify-between">
                <div className="flex gap-4">
                   <button onClick={() => setViewMode('chronological')} className={clsx("transition-colors p-1", viewMode === 'chronological' ? "text-orange-500" : "text-[#CBD5E1] hover:text-black")}>
                      <History size={16} />
                   </button>
                   <button onClick={() => setViewMode('topic')} className={clsx("transition-colors p-1", viewMode === 'topic' ? "text-orange-500" : "text-[#CBD5E1] hover:text-black")}>
                      <LayoutGrid size={16} />
                   </button>
                </div>
                <div className="relative flex-1 max-w-[150px]">
                   <Search size={12} className="absolute left-0 top-1/2 -translate-y-1/2 text-[#CBD5E1]" />
                   <input 
                     type="text"
                     placeholder="Filter..."
                     value={searchQuery}
                     onChange={(e) => setSearchQuery(e.target.value)}
                     className="w-full bg-transparent pl-6 pr-4 py-1 text-[9px] font-bold uppercase tracking-widest border-b border-[#E2E8F0] focus:outline-none focus:border-black transition-all text-black"
                   />
                </div>
             </div>
          </div>

          {/* Intelligence List */}
          <div className="flex-1 overflow-y-auto no-scrollbar px-8 py-8">
              {filteredArchive.length === 0 ? (
                 <div className="h-60 flex flex-col items-center justify-center text-center px-4">
                    <div className="opacity-20 text-[#64748B] flex flex-col items-center mb-6">
                       <Library size={48} className="mb-4" />
                       <span className="text-[9px] font-bold uppercase tracking-[0.3em]">No Evidence Found</span>
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
                             Authorize access to your <br /> operative profile to <br /> archive intelligence.
                          </p>
                       </motion.button>
                    )}
                 </div>
             ) : (
                <div className="space-y-10 pb-10">
                   {viewMode === 'chronological' ? (
                      Object.entries(dateGroups).map(([label, items]) => items.length > 0 && (
                         <div key={label} className="space-y-8">
                            <div className="flex items-center gap-3">
                               <span className="text-[8px] font-bold text-[#CBD5E1] uppercase tracking-[0.2em]">{label}</span>
                               <div className="h-px flex-1 bg-[#E2E8F0]" />
                            </div>
                            {items.map(item => <ArchiveItem key={item.id} item={item} />)}
                         </div>
                      ))
                   ) : (
                      Object.entries(topicGroups).map(([topic, items]) => (
                         <div key={topic} className="space-y-8">
                            <div className="flex items-center gap-3">
                               <span className="text-[8px] font-bold text-orange-500 uppercase tracking-[0.2em]">{topic}</span>
                               <div className="h-px flex-1 bg-[#E2E8F0]" />
                            </div>
                            {items.map(item => <ArchiveItem key={item.id} item={item} />)}
                         </div>
                      ))
                   )}
                </div>
             )}
          </div>

          {/* Forensic Dashboard Footer (FORCED LIGHT / BLACK TEXT) */}
          <div className="p-8 bg-[#F8FAFC] border-t border-[#E2E8F0] relative">
             <div className="flex items-center justify-between mb-5">
                <div className="flex flex-col">
                   <h4 className="text-[20px] font-bold text-black uppercase tracking-[0.3em] font-serif italic leading-none">
                      {rank ? rank.toString().split(' ').pop() : 'OPERATIVE'}
                   </h4>
                   <div className="flex items-center gap-2 mt-2">
                      <div className="w-1.5 h-1.5 bg-orange-500 rounded-full animate-pulse" />
                      <span className="text-[10px] font-bold text-[#64748B] uppercase tracking-widest">Active Intelligence Session</span>
                   </div>
                </div>
                <div className="text-right">
                   <span className="text-[12px] font-black text-black opacity-100">{xp} / {(Math.floor(xp/100)+1)*100} XP</span>
                </div>
             </div>

             {/* Advanced Progress Bar */}
             <div className="relative h-2 w-full bg-[#E2E8F0] rounded-none mb-8 group overflow-hidden">
                <div className="absolute inset-0 flex justify-between px-[1px]">
                   {[...Array(10)].map((_, i) => (
                      <div key={i} className="w-[1px] h-full bg-black/10 z-10" />
                   ))}
                </div>
                
                <motion.div 
                   initial={{ width: 0 }}
                   animate={{ width: `${(xp % 100)}%` }}
                   className="h-full bg-black relative transition-all duration-1000"
                >
                   <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full animate-[shimmer_2s_infinite]" />
                </motion.div>
             </div>

             <div className="flex items-center justify-between">
                <button 
                  onClick={() => setView('landing')}
                  className="text-[11px] font-bold text-[#A0AEC0] hover:text-black transition-all uppercase tracking-[0.2em] flex items-center gap-2 group"
                >
                   Exit Protocol <ArrowUpRight size={16} className="group-hover:-translate-y-0.5 group-hover:translate-x-0.5 transition-transform" />
                </button>
             </div>
          </div>
        </div>
      </aside>
    </>
  );
}

function ArchiveItem({ item }: { item: any }) {
  const { setView, setCurrentReport, currentReport } = useStore();
  const isActive = currentReport?.id === item.report?.id;

  return (
    <button
      onClick={() => { setView('research'); setCurrentReport(item.report); }}
      className="w-full text-left group transition-all"
    >
      <div className="flex items-start justify-between gap-3 mb-1.5">
         <h3 className={clsx(
           "text-sm font-serif font-bold italic transition-colors leading-tight",
           isActive ? "text-orange-500" : "text-black group-hover:text-orange-500"
         )}>
           {item.report?.query_understood || item.query}
         </h3>
         {item.report?.deep_research && <Zap size={12} className="text-orange-500 shrink-0 mt-0.5" />}
      </div>
      
      <p className="text-[11px] text-[#718096] mb-3 line-clamp-2 leading-relaxed font-light italic opacity-80">
        {item.report?.summary?.bottom_line || item.query}
      </p>
      
      <div className="flex justify-between items-center opacity-40 group-hover:opacity-100 transition-opacity">
         <span className="text-[9px] text-[#A0AEC0] font-bold uppercase tracking-widest">
           {new Date(item.timestamp || Date.now()).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
         </span>
         {isActive && <div className="w-1 h-1 bg-orange-500 rounded-full shadow-[0_0_8px_rgba(249,115,22,0.4)]" />}
      </div>
    </button>
  );
}
