import React from 'react';
import { useStore } from '../store';
import { Book, Trash2, X, Clock, FileText, Search } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';

export default function Notebook({ onClose }: { onClose: () => void }) {
  const { notes, removeNote, clearNotebook, user } = useStore();

  return (
    <motion.div
      initial={{ opacity: 0, x: 300 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 300 }}
      className="fixed top-0 right-0 bottom-0 w-full max-w-md bg-white dark:bg-[#0A0F1A] border-l border-my-border shadow-2xl z-[400] flex flex-col"
    >
      <div className="p-8 border-b border-my-border flex items-center justify-between bg-my-sidebar/30">
        <div className="flex items-center gap-3">
          <Book size={20} className="text-my-accent" />
          <h2 className="text-sm font-bold uppercase tracking-[0.3em] text-my-ink dark:text-white">Investigative Notebook</h2>
        </div>
        <button onClick={onClose} className="p-2 text-my-muted hover:text-my-ink transition-colors">
          <X size={20} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
        {!user && (
          <div className="mb-8 p-4 bg-orange-500/10 border border-orange-500/20 rounded-[4px] text-[10px] font-bold uppercase tracking-widest text-orange-600 dark:text-orange-400">
            Guest Session: Notes are temporary and not synced to the vault.
          </div>
        )}

        <div className="flex items-center justify-between mb-8">
          <span className="text-[10px] font-bold uppercase tracking-widest text-my-muted">Notes: {notes.length}</span>
          {notes.length > 0 && (
            <button 
              onClick={() => {
                if (window.confirm("Purge all investigative notes? This cannot be undone.")) {
                  clearNotebook();
                }
              }}
              className="text-[10px] font-bold uppercase tracking-widest text-red-500 hover:opacity-70 transition-opacity flex items-center gap-2"
            >
              <Trash2 size={12} /> Clear Notebook
            </button>
          )}
        </div>

        {notes.length === 0 ? (
          <div className="h-60 flex flex-col items-center justify-center text-center opacity-30 grayscale">
            <FileText size={48} className="mb-4 text-my-muted" />
            <p className="text-[10px] font-bold uppercase tracking-widest leading-relaxed">No intelligence captured yet.<br />Highlight text in reports to save notes.</p>
          </div>
        ) : (
          <div className="space-y-6">
            <AnimatePresence>
              {notes.map((note) => (
                <motion.div
                  key={note.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="p-6 border border-my-border bg-white dark:bg-my-accent/5 group relative hover:border-my-accent transition-all"
                >
                  <button 
                    onClick={() => removeNote(note.id)}
                    className="absolute top-4 right-4 p-1.5 text-my-muted hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                    title="Remove Note"
                  >
                    <Trash2 size={14} />
                  </button>

                  <div className="flex items-center gap-2 mb-4 text-my-accent">
                    <Search size={10} />
                    <span className="text-[9px] font-bold uppercase tracking-widest opacity-60 truncate max-w-[200px]">
                      Source: {note.source_query}
                    </span>
                  </div>

                  <p className="text-[13px] leading-relaxed text-my-ink dark:text-white/80 whitespace-pre-wrap font-medium">
                    {note.content}
                  </p>

                  <div className="mt-6 pt-4 border-t border-my-border/50 flex items-center gap-2 text-my-muted">
                    <Clock size={10} />
                    <span className="text-[8px] font-mono uppercase tracking-widest">
                      {new Date(note.timestamp).toLocaleString()}
                    </span>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      <div className="p-8 border-t border-my-border bg-my-sidebar/10">
        <p className="text-[9px] text-my-muted uppercase tracking-[0.2em] leading-relaxed">
          The COGNAPSE Notebook protocol ensures that critical evidence is preserved across investigative sessions. Highlight any report content to capture it.
        </p>
      </div>
    </motion.div>
  );
}
