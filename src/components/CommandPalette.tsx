import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '../store';
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

  const handleArchiveClick = (entry: any) => {
    setCurrentReport(entry.report);
    pushToStack(entry.report);
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
          className="relative w-full max-w-2xl bg-my-bg border border-my-border rounded-[4px] shadow-2xl overflow-hidden flex flex-col"
        >
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
            <button onClick={onClose} className="p-1 ml-2 text-my-muted hover:text-my-ink transition-colors bg-my-callout rounded-md">
              <span className="text-[10px] font-bold px-1 text-my-muted">ESC</span>
            </button>
          </div>
          
          <div className="p-2 max-h-[60vh] overflow-y-auto">
            {filteredArchive.length > 0 ? (
              <div>
                <div className="px-3 py-2 text-[10px] font-black uppercase tracking-widest text-my-muted flex items-center gap-2">
                  <History size={12} /> Research Archives
                </div>
                {filteredArchive.map((entry) => (
                  <button
                    key={entry.id}
                    onClick={() => handleArchiveClick(entry)}
                    className="w-full flex flex-col gap-1 md:px-3 md:py-3 px-4 py-4 rounded-[2px] hover:bg-my-callout/40 transition-colors text-left group border border-transparent hover:border-my-border/50"
                  >
                    <div className="flex items-center gap-3 w-full">
                      <div className="text-my-muted group-hover:text-my-accent transition-colors">
                        <FileText size={16} />
                      </div>
                      <span className="flex-1 text-sm font-bold text-my-ink truncate">{entry.query}</span>
                      <div className="text-my-muted opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 text-[10px] uppercase tracking-widest">
                        Load <ChevronRight size={12} />
                      </div>
                    </div>
                    {entry.summary_snippet && (
                      <p className="text-[11px] text-my-muted line-clamp-1 pl-7 opacity-70">
                        {entry.summary_snippet}
                      </p>
                    )}
                  </button>
                ))}
              </div>
            ) : (
              query && (
                <div className="py-10 flex flex-col items-center justify-center text-center">
                  <div className="w-12 h-12 bg-my-callout rounded-full flex items-center justify-center text-my-muted mb-3">
                    <Search size={20} />
                  </div>
                  <h3 className="text-sm font-bold text-my-ink mb-1">No matches found</h3>
                  <p className="text-xs text-my-muted">We couldn't find anything matching "{query}"</p>
                </div>
              )
            )}
            
            {!query && filteredArchive.length === 0 && (
               <div className="py-10 flex flex-col items-center justify-center text-center opacity-50">
                  <History size={24} className="mb-2 text-my-muted" />
                  <p className="text-[11px] font-mono text-my-muted">Archive is empty.</p>
               </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
