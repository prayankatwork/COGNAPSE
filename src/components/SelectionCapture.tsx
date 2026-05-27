import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BookPlus, Check } from 'lucide-react';
import { useStore } from '../store';
import { toast } from '../utils/toast';

export default function SelectionCapture() {
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const [selectedText, setSelectedText] = useState('');
  const [isSaved, setIsSaved] = useState(false);
  const { addNote, currentReport } = useStore();
  const timerRef = useRef<any>(null);

  useEffect(() => {
    const handleSelection = () => {
      if (timerRef.current) clearTimeout(timerRef.current);

      timerRef.current = setTimeout(() => {
        const selection = window.getSelection();
        const text = selection?.toString().trim();

        if (text && text.length > 3) {
          const range = selection?.getRangeAt(0);
          const rect = range?.getBoundingClientRect();

          if (rect) {
            setSelectedText(text);
            setPosition({
              x: rect.left + rect.width / 2,
              y: rect.top + window.scrollY - 10
            });
            setIsSaved(false);
          }
        } else {
          setPosition(null);
        }
      }, 300);
    };

    document.addEventListener('selectionchange', handleSelection);
    return () => document.removeEventListener('selectionchange', handleSelection);
  }, []);

  const handleCapture = () => {
    if (!selectedText) return;

    addNote(selectedText, currentReport?.query_understood || 'Manual Selection');
    setIsSaved(true);
    toast.success('Note captured to Notebook');

    // Hide after success
    setTimeout(() => {
      setPosition(null);
      // Clear selection
      window.getSelection()?.removeAllRanges();
    }, 1500);
  };

  if (!position) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 10 }}
        style={{
          position: 'absolute',
          left: position.x,
          top: position.y,
          transform: 'translateX(-50%) translateY(-100%)',
          zIndex: 500
        }}
        className="pointer-events-auto"
      >
        <button
          onClick={handleCapture}
          className={`flex items-center gap-2 px-4 py-2 rounded-full shadow-2xl border transition-all ${isSaved
              ? 'bg-emerald-500 border-emerald-400 text-white'
              : 'bg-my-accent border-white/20 text-my-bg hover:bg-my-ink hover:text-white'
            }`}
        >
          {isSaved ? (
            <>
              <Check size={14} />
              <span className="text-[10px] font-bold uppercase tracking-widest">Captured to Vault</span>
            </>
          ) : (
            <>
              <BookPlus size={14} />
              <span className="text-[10px] font-bold uppercase tracking-widest">Save to Notebook</span>
            </>
          )}
        </button>
        {/* Triangle Pointer */}
        <div className={`w-3 h-3 rotate-45 mx-auto -mt-1.5 border-r border-b ${isSaved ? 'bg-emerald-500 border-emerald-400' : 'bg-my-accent border-white/20'
          }`} />
      </motion.div>
    </AnimatePresence>
  );
}
