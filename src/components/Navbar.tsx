import React from 'react';
import { useStore } from '../store';
import { 
  Compass, BookOpen, Activity, 
  Zap, Box, User, X, Moon, Sun
} from 'lucide-react';
import clsx from 'clsx';
import { motion } from 'framer-motion';
import BrandLogo from './BrandLogo';

export default function Navbar() {
  const { 
    currentView, setView, user, logout, setAuthOpen,
    isNotebookOpen, setNotebookOpen,
    isStatusOpen, setStatusOpen,
    theme, toggleTheme
  } = useStore();

  const navItems = [
    { id: 'landing', label: 'Home', icon: <Compass size={14} /> },
    { id: 'research', label: 'Research', icon: <Activity size={14} /> },
    { id: 'documentation', label: 'Manual', icon: <BookOpen size={14} /> },
    { id: 'games', label: 'Playground', icon: <Box size={14} /> },
    { id: 'creator', label: 'The Architect', icon: <User size={14} /> },
  ];

  if (currentView === 'onboarding') return null;

  return (
    <nav className="fixed top-0 left-0 right-0 h-16 border-b border-my-border bg-my-bg/70 backdrop-blur-xl z-[100] px-6 md:px-10 flex items-center justify-between transition-all">
      {/* Brand */}
      <button 
        onClick={() => setView('landing')}
        className="flex items-center gap-4 group transition-all active:scale-95"
      >
        <BrandLogo size={32} />
        <div className="flex flex-col items-start leading-none">
          <span className="text-[14px] font-black uppercase tracking-[0.6em] text-my-ink group-hover:text-my-accent transition-colors">Cognapse</span>
          <span className="text-[7px] font-bold uppercase tracking-[0.4em] text-my-muted mt-1 opacity-60">Neural Intel Core</span>
        </div>
      </button>

      {/* Navigation Links */}
      <div className="flex items-center gap-1 md:gap-4">
         {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setView(item.id as any)}
              className={clsx(
                "relative px-4 py-2 flex items-center gap-2 transition-all group text-[10px] font-bold uppercase tracking-widest",
                currentView === item.id 
                  ? "text-my-accent" 
                  : "text-my-ink hover:text-my-accent"
              )}
            >
               <span className={clsx("transition-transform group-hover:scale-110", currentView === item.id ? "scale-110" : "opacity-40 group-hover:opacity-100")}>
                  {item.icon}
               </span>
               <span className="hidden sm:block">{item.label}</span>
               
               {currentView === item.id && (
                 <motion.div 
                   layoutId="nav-underline"
                   className="absolute bottom-[-20px] left-0 right-0 h-0.5 bg-my-accent"
                 />
               )}
            </button>
         ))}
      </div>

      {/* Tactical Status */}
      <div className="hidden lg:flex items-center gap-6">
         {user ? (
            <div className="flex items-center gap-4">
               <div className="flex flex-col items-end">
                  <span className="text-[10px] font-black text-my-ink uppercase tracking-widest">{user.username}</span>
                  <span className="text-[8px] text-my-accent font-bold uppercase tracking-widest opacity-80">Active Operative</span>
               </div>
               <button 
                 onClick={logout}
                 className="p-2 text-my-muted hover:text-red-500 transition-colors"
                 title="Deauthorize Session"
               >
                  <X size={14} />
               </button>
            </div>
         ) : (
            <button 
              onClick={() => setAuthOpen(true)}
              className="px-5 py-2 border border-my-border text-my-ink text-[10px] font-bold uppercase tracking-widest hover:bg-my-accent hover:text-white hover:border-my-accent transition-all flex items-center gap-2"
            >
               <User size={12} /> Authorize Access
            </button>
         )}

         <button 
           onClick={toggleTheme}
           className="p-2 border border-my-border text-my-ink hover:border-my-accent hover:text-my-accent transition-all flex items-center justify-center"
           title="Toggle Theme"
         >
            {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
         </button>

         <button 
           onClick={() => setNotebookOpen(!isNotebookOpen)}
           className={clsx(
             "p-2 border transition-all flex items-center gap-2",
             isNotebookOpen ? "bg-my-accent text-white border-my-accent" : "border-my-border text-my-ink hover:border-my-accent"
           )}
           title="Toggle Investigative Notebook"
         >
            <BookOpen size={14} />
         </button>


      </div>

    </nav>
  );
}
