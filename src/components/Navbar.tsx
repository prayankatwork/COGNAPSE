import React from 'react';
import { useStore } from '../store';
import { 
  Compass, BookOpen, Activity, 
  Zap, Box, User, X, Moon, Sun,
  LayoutGrid, Terminal, ShieldCheck
} from 'lucide-react';
import clsx from 'clsx';
import { motion } from 'framer-motion';
import BrandLogo from './BrandLogo';

export default function Navbar() {
  const { 
    currentView, setView, user, logout, setAuthOpen,
    isNotebookOpen, setNotebookOpen,
    theme, toggleTheme
  } = useStore();

  const primaryLinks = [
    { id: 'landing', label: 'Home', icon: <Compass size={13} /> },
    { id: 'apps', label: 'Apps', icon: <LayoutGrid size={13} /> },
    { id: 'documentation', label: 'Manual', icon: <BookOpen size={13} /> },
  ];

  const secondaryLinks = [
    { id: 'games', label: 'Playground', icon: <Box size={13} /> },
    { id: 'creator', label: 'Architect', icon: <User size={13} /> },
  ];

  if (currentView === 'onboarding') return null;

  return (
    <nav className="fixed top-0 left-0 right-0 h-16 border-b border-my-border bg-my-bg/60 backdrop-blur-2xl z-[100] px-6 md:px-10 flex items-center justify-between transition-all">
      {/* Brand */}
      <button 
        onClick={() => setView('landing')}
        className="flex items-center gap-4 group active:scale-95 transition-transform"
      >
        <BrandLogo size={30} />
        <div className="flex flex-col items-start leading-none hidden md:flex">
          <span className="text-[12px] font-black uppercase tracking-[0.6em] text-my-ink group-hover:text-my-accent transition-colors">Cognapse</span>
          <span className="text-[7px] font-bold uppercase tracking-[0.4em] text-my-muted mt-0.5 opacity-60">Neural Intel OS</span>
        </div>
      </button>

      {/* Grouped Navigation Links */}
      <div className="flex items-center bg-my-sidebar/30 border border-my-border rounded-full px-2 py-1 gap-1">
         {primaryLinks.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                if (item.id === 'apps') {
                  useStore.getState().setActiveApp(null);
                  setView('apps');
                } else {
                  setView(item.id as any);
                }
              }}
              className={clsx(
                "relative px-4 py-1.5 flex items-center gap-2 transition-all rounded-full text-[9px] font-black uppercase tracking-[0.15em]",
                currentView === item.id 
                  ? "bg-my-ink text-my-bg dark:bg-my-accent dark:text-black shadow-lg" 
                  : "text-my-muted hover:text-my-ink"
              )}
            >
               <span className={clsx("transition-transform", currentView === item.id ? "scale-110" : "opacity-40 group-hover:opacity-100")}>
                  {item.icon}
               </span>
               <span className="hidden sm:block">{item.label}</span>
            </button>
         ))}
         
         <div className="h-4 w-px bg-my-border mx-1 hidden md:block" />

         {secondaryLinks.map((item) => (
            <button
              key={item.id}
              onClick={() => setView(item.id as any)}
              className={clsx(
                "relative px-4 py-1.5 flex items-center gap-2 transition-all rounded-full text-[9px] font-black uppercase tracking-[0.15em]",
                currentView === item.id 
                  ? "bg-my-ink text-my-bg dark:bg-my-accent dark:text-black shadow-lg" 
                  : "text-my-muted hover:text-my-ink hidden md:flex"
              )}
            >
               <span className={clsx("transition-transform", currentView === item.id ? "scale-110" : "opacity-40 group-hover:opacity-100")}>
                  {item.icon}
               </span>
               <span className="hidden sm:block">{item.label}</span>
            </button>
         ))}
      </div>

      {/* Utility Cluster */}
      <div className="flex items-center gap-4">
         {user ? (
            <div className="flex items-center gap-4">
               <div className="hidden lg:flex flex-col items-end">
                  <span className="text-[10px] font-black text-my-ink uppercase tracking-widest">{user.username}</span>
                  <span className="text-[7px] text-my-accent font-bold uppercase tracking-[0.3em] opacity-80 flex items-center gap-1">
                    <ShieldCheck size={8} /> Authorized
                  </span>
               </div>
               <button 
                 onClick={logout}
                 className="w-8 h-8 flex items-center justify-center rounded-full border border-my-border text-my-muted hover:text-red-500 hover:border-red-500/50 transition-all"
               >
                  <X size={14} />
               </button>
            </div>
         ) : (
            <button 
              onClick={() => setAuthOpen(true)}
              className="px-4 py-2 bg-my-ink text-my-bg dark:bg-my-accent dark:text-black text-[9px] font-black uppercase tracking-widest hover:opacity-90 transition-all flex items-center gap-2 rounded-[2px]"
            >
               <Terminal size={12} /> Sync Identity
            </button>
         )}

         <div className="flex items-center bg-my-sidebar/50 rounded-full border border-my-border p-1 gap-1">
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
  );
}
