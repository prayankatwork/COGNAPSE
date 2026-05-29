import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '../store';
import type { COGNAPSE_Output } from '../types';
import { Search, X, History, FileText, ChevronRight } from 'lucide-react';

export default function CommandPalette({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
  const { setView, archive, setCurrentReport, pushToStack } = useStore();
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (!isOpen && query !== '') {
      setQuery('');
    }
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const searchLower = query.toLowerCase();

  const filteredArchive = archive.filter(entry => 
    entry.query.toLowerCase().includes(searchLower) ||
    entry.topic_cluster?.toLowerCase().includes(searchLower) ||
    entry.summary_snippet?.toLowerCase().includes(searchLower) ||
    entry.tags?.some(tag => tag.toLowerCase().includes(searchLower))
  );

  const handleArchiveClick = (entry: { report: unknown; query: string; topic_cluster?: string; summary_snippet?: string; tags?: string[]; id: string }) => {
    setCurrentReport(entry.report as COGNAPSE_Output);
    pushToStack(entry.report as COGNAPSE_Output);
    setView('research');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[200] flex items-start justify-center pt-[15vh]">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-my-bg/80 backdrop-blur-sm"
        />
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: -20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -20 }}
          className="relative w-full max-w-2xl bg-my-bg border border-my-border rounded-[8px] shadow-2xl overflow-hidden flex flex-col"
        >
          {/* Header with accent bar */}
          <div className="h-[3px] w-full bg-gradient-to-r from-my-accent/40 via-my-accent to-my-accent/40" />
          <div className="flex items-center px-4 py-3 border-b border-my-border gap-3">
            <Search size={18} className="text-my-muted" />
            <input 
              autoFocus
              type="text" 
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search your research history..." 
              className="flex-1 bg-transparent border-none outline-none text-my-ink placeholder:text-my-muted/50 text-sm font-medium"
            />
            {query && (
              <button onClick={() => setQuery('')} className="p-1 text-my-muted hover:text-my-ink transition-colors">
                <X size={14} />
              </button>
            )}
            <div className="flex items-center gap-1">
              <kbd className="hidden md:inline-flex px-1.5 py-0.5 text-[8px] font-bold text-my-muted bg-my-callout border border-my-border rounded-[2px] uppercase tracking-wider">Ctrl+K</kbd>
              <button onClick={onClose} className="p-1 ml-1 text-my-muted hover:text-my-ink transition-colors bg-my-callout rounded-[4px]">
                <span className="text-[10px] font-bold px-1 text-my-muted">ESC</span>
              </button>
            </div>
          </div>
          
          <div className="p-2 max-h-[60vh] overflow-y-auto custom-scrollbar">
            {filteredArchive.length > 0 ? (
              <div>
                <div className="px-3 py-2 text-[10px] font-black uppercase tracking-widest text-my-muted flex items-center gap-2">
                  <History size={12} /> Research Archives
                </div>
                {filteredArchive.map((entry) => (
                  <motion.button
                    key={entry.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    onClick={() => handleArchiveClick(entry)}
                    className="w-full flex flex-col gap-1 md:px-3 md:py-3 px-4 py-4 rounded-[4px] hover:bg-my-accent/5 transition-colors text-left group border border-transparent hover:border-my-accent/20"
                  >
                    <div className="flex items-center gap-3 w-full">
                      <div className="text-my-muted group-hover:text-my-accent transition-colors p-1 bg-my-callout rounded-[4px] group-hover:bg-my-accent/10">
                        <FileText size={14} />
                      </div>
                      <span className="flex-1 text-sm font-bold text-my-ink truncate">{entry.query}</span>
                      <div className="text-my-muted opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 text-[10px] uppercase tracking-widest">
                        Load <ChevronRight size={12} />
                      </div>
                    </div>
                    {entry.summary_snippet && (
                      <p className="text-[11px] text-my-muted line-clamp-1 pl-9 opacity-60">
                        {entry.summary_snippet}
                      </p>
                    )}
                  </motion.button>
                ))}
              </div>
            ) : (
              query && (
                <div className="py-10 flex flex-col items-center justify-center text-center">
                  <div className="w-12 h-12 bg-my-callout rounded-[6px] flex items-center justify-center text-my-muted mb-3 border border-my-border">
                    <Search size={20} />
                  </div>
                  <h3 className="text-sm font-bold text-my-ink mb-1">No matches found</h3>
                  <p className="text-xs text-my-muted">We couldn't find anything matching "{query}"</p>
                </div>
              )
            )}
            
            {!query && filteredArchive.length === 0 && (
               <div className="py-10 flex flex-col items-center justify-center text-center">
                  <div className="w-12 h-12 rounded-[6px] bg-my-callout/50 border border-my-border flex items-center justify-center text-my-muted opacity-40 mb-3">
                    <History size={20} />
                  </div>
                  <p className="text-[11px] font-mono text-my-muted opacity-60">No research archive available.</p>
                  <p className="text-[9px] text-my-muted opacity-30 mt-1">Completed research sessions will appear here.</p>
               </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
