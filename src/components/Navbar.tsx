import React, { useState, useEffect, useCallback } from 'react';
import { useStore } from '../store';
import { 
  User, X, Moon, Sun, Search,
  BookOpen, Command, ShieldCheck, ChevronDown, Activity, Globe as GlobeIcon
} from 'lucide-react';
import clsx from 'clsx';
import { motion, AnimatePresence } from 'framer-motion';
import BrandLogo from './BrandLogo';
import CommandPalette from './CommandPalette';

export default function Navbar() {
  const { 
    currentView, setView, user, logout, setAuthOpen,
    isNotebookOpen, setNotebookOpen,
    theme, toggleTheme, setStatusOpen
  } = useStore();

  const [isCommandOpen, setIsCommandOpen] = useState(false);
  const handleCommandClose = useCallback(() => setIsCommandOpen(false), []);
  const [isHoveringLogo, setIsHoveringLogo] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const modules = [
    { id: 'landing', label: 'Home', icon: <Search size={14} /> },
    { id: 'news', label: 'Intelligence Hub', icon: <GlobeIcon size={14} /> },
    { id: 'research', label: 'Research', icon: <Activity size={14} /> },
    { id: 'documentation', label: 'Manual', icon: <BookOpen size={14} /> },
    { id: 'creator', label: 'Architect', icon: <User size={14} /> },
  ];

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 2);
    window.addEventListener('scroll', handleScroll);
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsCommandOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  if (currentView === 'onboarding') return null;

  return (
    <>
      <nav className={clsx(
        "fixed top-0 left-0 right-0 h-14 z-[100] px-6 flex items-center justify-between transition-all duration-300",
        scrolled ? "bg-my-bg/80 backdrop-blur-2xl border-b border-my-border/50 shadow-sm" : "bg-transparent"
      )}>
        {/* Left: Brand & Rollup Modules */}
        <div 
          id="walkthrough-logo-anchor"
          className="flex items-center w-1/3 relative"
          onMouseEnter={() => setIsHoveringLogo(true)}
          onMouseLeave={() => setIsHoveringLogo(false)}
        >
          <button 
            onClick={() => setView('landing')}
            className="flex items-center gap-3 group active:scale-95 transition-transform"
          >
            <BrandLogo size={32} />
            <div className="flex flex-col items-start leading-none">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-black uppercase tracking-[0.4em] text-my-ink group-hover:text-my-accent transition-colors">Cognapse</span>
                <span className={clsx("text-[6px] font-bold uppercase tracking-widest px-1 py-0.5 rounded transition-all duration-300", isHoveringLogo ? "opacity-0" : "text-my-accent/70 border border-my-accent/30 animate-pulse")}>Hover</span>
              </div>
            </div>
          </button>

          <AnimatePresence>
            {isHoveringLogo && (
              <motion.div
                initial={{ opacity: 0, y: -10, scaleY: 0.95 }}
                animate={{ opacity: 1, y: 0, scaleY: 1 }}
                exit={{ opacity: 0, y: -10, scaleY: 0.95 }}
                transition={{ duration: 0.15 }}
                className="absolute top-full left-0 mt-3 bg-my-bg/95 backdrop-blur-xl border border-my-border rounded-xl shadow-[0_20px_40px_rgba(0,0,0,0.3)] p-2 min-w-[180px] flex flex-col gap-1 origin-top z-50"
              >
                <div className="px-2 py-1.5 text-[8px] font-black uppercase tracking-[0.3em] text-my-muted opacity-60">
                  System Modules
                </div>
                {modules.map((mod) => (
                  <button
                    key={mod.id}
                    onClick={() => {
                      setView(mod.id as any);
                      setIsHoveringLogo(false);
                    }}
                    className={clsx(
                      "flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors group",
                      currentView === mod.id ? "bg-my-accent/10 text-my-accent" : "hover:bg-my-callout/50 text-my-muted"
                    )}
                  >
                    <div className={clsx("transition-transform", currentView === mod.id ? "scale-110" : "group-hover:scale-110 group-hover:text-my-ink")}>
                      {mod.icon}
                    </div>
                    <span className={clsx("text-[11px] font-bold tracking-wide", currentView === mod.id ? "text-my-accent" : "group-hover:text-my-ink")}>
                      {mod.label}
                    </span>
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Center: Command Bar */}
        <div className="hidden md:flex items-center justify-center w-1/3">
          <button 
            id="walkthrough-command-anchor"
            onClick={() => setIsCommandOpen(true)}
            className="group flex items-center justify-between w-full max-w-md px-4 py-1.5 bg-my-callout/20 hover:bg-my-callout/40 border border-my-border/50 hover:border-my-accent/30 rounded-full transition-all"
          >
            <div className="flex items-center gap-2 text-my-muted group-hover:text-my-ink transition-colors">
              <Search size={14} />
              <span className="text-[11px] font-semibold opacity-70">Search or jump to module...</span>
            </div>
            <div className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-black text-my-muted opacity-50 bg-my-bg border border-my-border">
              <Command size={10} /> K
            </div>
          </button>
        </div>

        {/* Right: Utility Cluster */}
        <div className="flex items-center justify-end w-1/3 gap-4">
          {user ? (
            <div className="flex items-center gap-4">
               <button 
                 id="walkthrough-profile-anchor"
                 onClick={() => setStatusOpen(true)}
                 className="hidden lg:flex flex-col items-end group cursor-pointer"
                >
                  <span className="text-[10px] font-black text-my-ink uppercase tracking-widest group-hover:text-my-accent transition-colors">{user.username}</span>
                  <span className="text-[7px] text-my-accent font-bold uppercase tracking-[0.3em] opacity-80 flex items-center gap-1 group-hover:opacity-100 transition-opacity">
                    <ShieldCheck size={8} /> Authorized
                  </span>
               </button>
               <button 
                 onClick={logout}
                 className="w-8 h-8 flex items-center justify-center rounded-full border border-my-border text-my-muted hover:text-red-500 hover:border-red-500/50 transition-all bg-my-bg"
                 title="Terminate Session"
               >
                  <X size={14} />
               </button>
            </div>
          ) : (
            <button 
              onClick={() => setAuthOpen(true)}
              className="px-3 py-2 md:px-4 md:py-2 bg-my-ink text-my-bg dark:bg-my-accent dark:text-black text-[9px] font-black uppercase tracking-widest hover:opacity-90 transition-all flex items-center gap-2 rounded-[2px]"
            >
               <User size={12} /> <span className="hidden sm:inline">Sync Identity</span>
            </button>
          )}

          <div className="flex items-center bg-my-bg rounded-full border border-my-border p-1 gap-1 shadow-sm">
            <button 
              onClick={toggleTheme}
              className="w-8 h-8 rounded-full flex items-center justify-center text-my-muted hover:text-my-ink transition-colors"
              title="Toggle Neural Mode"
            >
               {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
            </button>

            <button 
              onClick={() => setNotebookOpen(!isNotebookOpen)}
              className={clsx(
                "w-8 h-8 rounded-full flex items-center justify-center transition-all",
                isNotebookOpen ? "bg-my-accent text-white shadow-[0_0_15px_var(--my-accent)]" : "text-my-muted hover:text-my-ink"
              )}
              title="Tactical Notebook"
            >
               <BookOpen size={14} />
            </button>
          </div>
        </div>
      </nav>

      <CommandPalette isOpen={isCommandOpen} onClose={handleCommandClose} />
    </>
  );
}
