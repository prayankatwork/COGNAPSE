import React, { useState, useEffect } from 'react';
import { useStore } from '../store';
import { 
  Compass, BookOpen, Activity, 
  Box, User, X, Moon, Sun, Terminal, ShieldCheck, Zap
} from 'lucide-react';
import clsx from 'clsx';
import { motion, AnimatePresence } from 'framer-motion';
import BrandLogo from './BrandLogo';

export default function Navbar() {
  const { 
    currentView, setView, user, logout, setAuthOpen,
    isNotebookOpen, setNotebookOpen,
    theme, toggleTheme
  } = useStore();

  const [isNavExpanded, setIsNavExpanded] = useState(false);
  const [pulseMessage, setPulseMessage] = useState("NEURAL SYNC: 98%");

  const primaryLinks = [
    { id: 'landing', label: 'Home', icon: <Compass size={14} /> },
    { id: 'research', label: 'Research', icon: <Activity size={14} /> },
    { id: 'documentation', label: 'Manual', icon: <BookOpen size={14} /> },
    { id: 'games', label: 'Playground', icon: <Box size={14} /> },
    { id: 'creator', label: 'Architect', icon: <User size={14} /> },
    { id: 'decide', label: 'Matrix', icon: <Zap size={14} /> }, // 6th link as mentioned in description
  ];

  useEffect(() => {
    const messages = [
      "NEURAL LINK ESTABLISHED",
      "AWAITING DIRECTIVE...",
      "SYSTEM STABLE",
      "INTELLIGENCE PROTOCOL ACTIVE"
    ];
    let i = 0;
    const interval = setInterval(() => {
      i = (i + 1) % messages.length;
      setPulseMessage(messages[i]);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  if (currentView === 'onboarding') return null;

  return (
    <nav className="fixed top-0 left-0 right-0 h-12 z-[100] px-6 flex items-center justify-between pointer-events-none transition-all bg-transparent backdrop-blur-[2px]">
      
      {/* Neural Scanline Top Edge */}
      <motion.div 
        className="absolute top-0 h-[1px] bg-my-accent w-1/4 shadow-[0_0_8px_var(--my-accent)] z-[-1]" 
        animate={{ left: ['-25%', '100%'] }} 
        transition={{ duration: 4, repeat: Infinity, ease: 'linear' }} 
      />

      {/* Brand & Nav - Left */}
      <div 
        className="flex items-center gap-4 pointer-events-auto h-full"
        onMouseEnter={() => setIsNavExpanded(true)}
        onMouseLeave={() => setIsNavExpanded(false)}
      >
        <button 
          onClick={() => setView('landing')}
          className="flex items-center gap-3 group active:scale-95 transition-transform"
        >
          <BrandLogo size={24} />
          <div className="flex flex-col items-start leading-none">
            <span className="text-[11px] font-black uppercase tracking-[0.5em] text-my-ink dark:text-white group-hover:text-my-accent transition-colors">Cognapse</span>
          </div>
        </button>

        <AnimatePresence>
          {isNavExpanded && (
            <motion.div
              initial={{ opacity: 0, x: -20, width: 0 }}
              animate={{ opacity: 1, x: 0, width: 'auto' }}
              exit={{ opacity: 0, x: -20, width: 0 }}
              className="flex items-center gap-1.5 overflow-hidden ml-2 bg-white/5 dark:bg-black/20 backdrop-blur-xl rounded-full px-3 py-1.5 border border-my-border/50"
            >
              {primaryLinks.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setView(item.id as any)}
                  className={clsx(
                    "px-4 py-1.5 flex items-center gap-2 transition-all rounded-full text-[9px] font-black uppercase tracking-[0.1em] whitespace-nowrap",
                    currentView === item.id 
                      ? "bg-my-ink text-my-bg dark:bg-my-accent dark:text-black shadow-[0_0_15px_rgba(0,0,0,0.1)] dark:shadow-[0_0_15px_var(--my-accent)]" 
                      : "text-my-muted hover:text-my-ink dark:hover:text-white"
                  )}
                >
                  <span className={clsx(currentView === item.id ? "" : "opacity-60")}>{item.icon}</span>
                  <span>{item.label}</span>
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* The Neural Conduit (Center) */}
      <div className="absolute left-1/2 -translate-x-1/2 flex items-center pointer-events-auto w-[400px]">
        <div className="group relative flex items-center bg-my-bg/30 dark:bg-[#050508]/40 backdrop-blur-xl border border-my-border/40 hover:border-my-accent/50 rounded-full h-8 w-full px-4 transition-all cursor-text overflow-hidden justify-center shadow-inner">
           <AnimatePresence mode="wait">
             <motion.span
               key={pulseMessage}
               initial={{ opacity: 0, y: 5 }}
               animate={{ opacity: 1, y: 0 }}
               exit={{ opacity: 0, y: -5 }}
               className="text-[9px] font-mono font-bold tracking-[0.2em] text-my-ink/70 dark:text-my-muted uppercase group-hover:opacity-0 transition-opacity absolute"
             >
               {pulseMessage}
             </motion.span>
           </AnimatePresence>
           <span className="text-[9px] font-mono tracking-[0.2em] text-my-accent uppercase opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-2">
             <Terminal size={10} /> [INPUT DIRECTIVE]
           </span>
        </div>
      </div>

      {/* Utility Cluster - Right (Ghost UI) */}
      <div className="flex items-center gap-4 pointer-events-auto">
         {user ? (
            <div className="flex items-center gap-3">
               <div className="flex flex-col items-end">
                 <span className="text-[9px] font-mono text-my-ink dark:text-white uppercase tracking-widest hidden sm:block">{user.username}</span>
                 <span className="text-[6px] text-my-accent font-bold uppercase tracking-[0.4em] opacity-80 flex items-center gap-1 mt-0.5">
                   <ShieldCheck size={6} /> Authorized
                 </span>
               </div>
               <button 
                 onClick={logout}
                 className="w-7 h-7 flex items-center justify-center rounded-full bg-transparent border border-my-border/30 text-my-muted hover:text-red-500 hover:border-red-500/50 transition-all"
               >
                  <X size={12} />
               </button>
            </div>
         ) : (
            <button 
              onClick={() => setAuthOpen(true)}
              className="h-7 px-4 bg-transparent border border-my-border/50 text-my-ink dark:text-white text-[9px] font-black uppercase tracking-widest hover:bg-my-ink hover:text-my-bg dark:hover:bg-my-accent dark:hover:text-black transition-all flex items-center gap-2 rounded-full"
            >
               <Terminal size={12} /> Sync
            </button>
         )}

         <div className="flex items-center bg-transparent rounded-full border border-my-border/30 p-1 gap-1">
            <button 
              onClick={toggleTheme}
              className="w-6 h-6 rounded-full flex items-center justify-center text-my-muted hover:text-my-ink dark:hover:text-white transition-colors"
              title="Toggle Neural Mode"
            >
               {theme === 'dark' ? <Sun size={12} /> : <Moon size={12} />}
            </button>

            <button 
              onClick={() => setNotebookOpen(!isNotebookOpen)}
              className={clsx(
                "w-6 h-6 rounded-full flex items-center justify-center transition-all",
                isNotebookOpen ? "bg-my-accent text-white shadow-[0_0_10px_var(--my-accent)]" : "text-my-muted hover:text-my-ink dark:hover:text-white"
              )}
              title="Tactical Notebook"
            >
               <BookOpen size={12} />
            </button>
         </div>
      </div>
    </nav>
  );
}
