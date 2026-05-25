import React, { useState, useEffect, useCallback } from 'react';
import { useStore } from '../store';
import { useShallow } from 'zustand/react/shallow';
import { 
  User, X, Moon, Sun, Search,
  BookOpen, Command, ShieldCheck, ChevronDown, Activity, Globe as GlobeIcon, Zap, Crown,
  Menu
} from 'lucide-react';
import { useIsMobile } from '../hooks/useIsMobile';
import clsx from 'clsx';
import { motion, AnimatePresence } from 'framer-motion';
import BrandLogo from './BrandLogo';
import CommandPalette from './CommandPalette';
import PremiumExportModal from './PremiumExportModal';

export default function Navbar() {
  const { 
    currentView, setView, user, logout, setAuthOpen,
    isNotebookOpen, setNotebookOpen,
    theme, toggleTheme,    setStatusOpen,
    walkthroughCompleted
  } = useStore(useShallow((state) => ({
    currentView: state.currentView,
    setView: state.setView,
    user: state.user,
    logout: state.logout,
    setAuthOpen: state.setAuthOpen,
    isNotebookOpen: state.isNotebookOpen,
    setNotebookOpen: state.setNotebookOpen,
    theme: state.theme,
    toggleTheme: state.toggleTheme,
    setStatusOpen: state.setStatusOpen,
    walkthroughCompleted: state.walkthroughCompleted
  })));

  const [isCommandOpen, setIsCommandOpen] = useState(false);
  const [isPremiumModalOpen, setIsPremiumModalOpen] = useState(false);
  const handleCommandClose = useCallback(() => setIsCommandOpen(false), []);
  const [isHoveringLogo, setIsHoveringLogo] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const isMobile = useIsMobile();

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
        // Block command palette during training setup
        if (walkthroughCompleted) {
          setIsCommandOpen(prev => !prev);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [walkthroughCompleted]);

  if (currentView === 'onboarding') return null;

  return (
    <>
      <nav className={clsx(
        "fixed top-0 left-0 right-0 h-14 z-[100] px-6 flex items-center justify-between transition-all duration-300",
        scrolled ? "bg-my-bg/80 backdrop-blur-2xl border-b border-my-border/50 shadow-sm" : "bg-transparent"
      )}>
        {/* Left: Brand & Mobile Hamburger */}
        <div className="flex items-center w-1/3 relative">
          {/* Mobile hamburger — always visible on small screens */}
          <button
            onClick={() => walkthroughCompleted && setMobileMenuOpen(m => !m)}
            disabled={!walkthroughCompleted}
            className="mobile-only min-touch p-2 -ml-2 mr-2 text-my-muted hover:text-my-ink transition-colors"
            aria-label="Open navigation menu"
          >
            <Menu size={20} />
          </button>

          <div
            id="walkthrough-logo-anchor"
            className="flex items-center relative"
            onMouseEnter={() => walkthroughCompleted && setIsHoveringLogo(true)}
            onMouseLeave={() => walkthroughCompleted && setIsHoveringLogo(false)}
          >
          <button 
            onClick={() => walkthroughCompleted && setView('landing')}
            disabled={!walkthroughCompleted}
            className={clsx(
              "flex items-center gap-3 group transition-transform",
              walkthroughCompleted ? "active:scale-95 cursor-pointer" : "opacity-75 cursor-not-allowed"
            )}
          >
            <BrandLogo size={32} />
            <div className="flex flex-col items-start leading-none">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-black uppercase tracking-[0.4em] text-my-ink group-hover:text-my-accent transition-colors">Cognapse</span>
                {walkthroughCompleted ? (
                  <span className={clsx("text-[6px] font-bold uppercase tracking-widest px-1 py-0.5 rounded transition-all duration-300", isHoveringLogo ? "opacity-0" : "text-my-accent/70 border border-my-accent/30 animate-pulse")}>Hover</span>
                ) : (
                  <span className="text-[6px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded-[2px] text-my-signal border border-my-signal/20 bg-my-signal/5">Training</span>
                )}
              </div>
            </div>
          </button>

          <AnimatePresence>
            {isHoveringLogo && walkthroughCompleted && !isMobile && (
              <motion.div
                initial={{ opacity: 0, y: -10, scaleY: 0.95 }}
                animate={{ opacity: 1, y: 0, scaleY: 1 }}
                exit={{ opacity: 0, y: -10, scaleY: 0.95 }}
                transition={{ duration: 0.15 }}
                className="absolute top-full left-0 mt-3 bg-my-bg/95 backdrop-blur-xl border border-my-border rounded-[4px] shadow-2xl p-2 min-w-[180px] flex flex-col gap-1 origin-top z-50"
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
                      "flex items-center gap-3 px-3 py-2 rounded-[2px] text-left transition-colors group",
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
        </div>

        {/* Center: Command Bar */}
        <div className="hidden md:flex items-center justify-center w-1/3">
          <button 
            id="walkthrough-command-anchor"
            onClick={() => walkthroughCompleted && setIsCommandOpen(true)}
            disabled={!walkthroughCompleted}
            className={clsx(
              "group flex items-center justify-between w-full max-w-md px-4 py-1.5 rounded-[4px] transition-all border border-my-border/50",
              walkthroughCompleted 
                ? "bg-my-callout/20 hover:bg-my-callout/40 hover:border-my-accent/30 cursor-pointer" 
                : "bg-my-callout/5 opacity-40 cursor-not-allowed"
            )}
          >
            <div className="flex items-center gap-2 text-my-muted group-hover:text-my-ink transition-colors">
              <Search size={14} />
              <span className="text-[11px] font-semibold opacity-70">
                {walkthroughCompleted ? "Search or jump to module..." : "Lockout Active (Training)"}
              </span>
            </div>
            <div className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-black text-my-muted opacity-50 bg-my-bg border border-my-border">
              <Command size={10} /> K
            </div>
          </button>
        </div>

        {/* Right: Utility Cluster */}
        <div className="flex items-center justify-end w-1/3 gap-4">
          {!user?.premium && (
            <button
              onClick={() => walkthroughCompleted && setIsPremiumModalOpen(true)}
              disabled={!walkthroughCompleted}
              className={clsx(
                "hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-[2px] border transition-colors group",
                walkthroughCompleted 
                  ? "bg-my-accent/5 border-my-accent/20 hover:border-my-accent hover:bg-my-accent/10 cursor-pointer" 
                  : "bg-my-border opacity-30 cursor-not-allowed"
              )}
            >
               <div className="relative">
                 <Zap size={10} className="text-my-accent group-hover:scale-110 transition-transform relative z-10" />
                 <span className="absolute inset-0 rounded-full bg-my-accent/20 blur-sm animate-premium-glow" />
               </div>
               <span className="text-[8px] font-black text-my-ink uppercase tracking-widest">COGNAPSE Premium</span>
            </button>
          )}
          {user ? (
            <div className="flex items-center gap-4">
               <button 
                 id="walkthrough-profile-anchor"
                 onClick={() => walkthroughCompleted && setStatusOpen(true)}
                 disabled={!walkthroughCompleted}
                 className={clsx(
                   "hidden lg:flex flex-col items-end group",
                   walkthroughCompleted ? "cursor-pointer" : "cursor-not-allowed opacity-60"
                 )}
                >
                  <span className="text-[10px] font-black text-my-ink uppercase tracking-widest group-hover:text-my-accent transition-colors">{user.username}</span>
                  <span className={clsx(
                    "text-[7px] font-bold uppercase tracking-[0.3em] flex items-center gap-1 transition-opacity",
                    user.premium 
                      ? "text-my-signal dark:text-my-accent opacity-100 font-black" 
                      : "text-my-accent opacity-80 group-hover:opacity-100"
                  )}>
                    {user.premium ? (
                      <span className="relative inline-flex items-center gap-1">
                        <span className="absolute -inset-1 bg-my-accent/10 blur-sm rounded-full animate-premium-glow" />
                        <Crown size={8} className="text-my-signal dark:text-my-accent relative z-10 animate-premium-glow" /> 
                        <span className="relative z-10">Premium</span>
                      </span>
                    ) : (
                      <>
                        <ShieldCheck size={8} /> Authorized
                      </>
                    )}
                  </span>
               </button>
               <button 
                 onClick={() => walkthroughCompleted && logout()}
                 disabled={!walkthroughCompleted}
                 className={clsx(
                   "w-8 h-8 flex items-center justify-center rounded-full border border-my-border text-my-muted transition-all bg-my-bg",
                   walkthroughCompleted ? "hover:text-red-500 hover:border-red-500/50 cursor-pointer" : "opacity-30 cursor-not-allowed"
                 )}
                 title="Terminate Session"
               >
                  <X size={14} />
               </button>
            </div>
          ) : (
            <button 
              onClick={() => walkthroughCompleted && setAuthOpen(true)}
              disabled={!walkthroughCompleted}
              className={clsx(
                "px-3 py-2 md:px-4 md:py-2 text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-2 rounded-[2px]",
                walkthroughCompleted 
                  ? "bg-my-ink text-my-bg dark:bg-my-accent dark:text-black hover:opacity-90 cursor-pointer" 
                  : "bg-my-border text-my-muted opacity-40 cursor-not-allowed"
              )}
            >
               <User size={12} /> <span className="hidden sm:inline">Sync Identity</span>
            </button>
          )}

          <div className="flex items-center bg-my-bg rounded-[4px] border border-my-border p-1 gap-1 shadow-sm">
            <button 
              id="walkthrough-theme-anchor"
              onClick={toggleTheme}
              className="w-8 h-8 rounded-[2px] flex items-center justify-center text-my-muted hover:text-my-ink transition-colors cursor-pointer"
              title="Toggle Neural Mode"
            >
               {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
            </button>

            <button 
              id="walkthrough-notebook-anchor"
              onClick={() => setNotebookOpen(!isNotebookOpen)}
              className={clsx(
                "w-8 h-8 rounded-[2px] flex items-center justify-center transition-all cursor-pointer",
                isNotebookOpen 
                  ? "bg-my-accent text-white shadow-[0_0_15px_var(--my-accent)]" 
                  : "text-my-muted hover:text-my-ink"
              )}
              title="Tactical Notebook"
            >
               <BookOpen size={14} />
            </button>
          </div>
        </div>
      </nav>

      <CommandPalette isOpen={isCommandOpen} onClose={handleCommandClose} />
      <PremiumExportModal 
        isOpen={isPremiumModalOpen} 
        onClose={() => setIsPremiumModalOpen(false)} 
        researchId="navbar_upgrade" 
        query="Premium Upgrade" 
        onUnlockSuccess={() => setIsPremiumModalOpen(false)} 
      />

      {/* Mobile Navigation Bottom Sheet */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[300] bg-black/50"
              onClick={() => setMobileMenuOpen(false)}
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 z-[301] bg-my-bg border-t border-my-border rounded-t-2xl shadow-2xl safe-area-bottom max-h-[70vh] overflow-y-auto"
            >
              <div className="px-6 pt-4 pb-2 flex items-center justify-between">
                <span className="text-[9px] font-black uppercase tracking-[0.3em] text-my-muted">Navigate</span>
                <button onClick={() => setMobileMenuOpen(false)} className="min-touch p-2 text-my-muted hover:text-my-ink">
                  <X size={18} />
                </button>
              </div>
              <div className="flex flex-col gap-1 px-4 pb-8">
                {modules.map((mod) => (
                  <button
                    key={mod.id}
                    onClick={() => {
                      setView(mod.id as any);
                      setMobileMenuOpen(false);
                    }}
                    className={clsx(
                      "flex items-center gap-4 px-4 py-4 rounded-lg text-left transition-colors min-touch-h",
                      currentView === mod.id
                        ? "bg-my-accent/10 text-my-accent"
                        : "text-my-muted hover:bg-my-callout/50 hover:text-my-ink"
                    )}
                  >
                    <div className={currentView === mod.id ? 'text-my-accent' : 'text-my-muted'}>
                      {mod.icon}
                    </div>
                    <span className="text-sm font-bold">{mod.label}</span>
                  </button>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
