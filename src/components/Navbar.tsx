import React from 'react';
import { useStore } from '../store';
import { AnimatePresence } from 'framer-motion';
import { 
  Compass, BookOpen, Activity, 
  Terminal, Shield, Zap, ChevronRight, Box, User, X 
} from 'lucide-react';
import clsx from 'clsx';
import { motion } from 'framer-motion';

export default function Navbar() {
  const { 
    currentView, setView, user, logout, setAuthOpen,
    isNotebookOpen, setNotebookOpen 
  } = useStore();

  const navItems = [
    { id: 'landing', label: 'Home', icon: <Compass size={14} /> },
    { id: 'research', label: 'Research', icon: <Activity size={14} /> },
    { id: 'documentation', label: 'Manual', icon: <BookOpen size={14} /> },
    { id: 'games', label: 'Playground', icon: <Box size={14} /> },
  ];

  if (currentView === 'onboarding') return null;

  return (
    <nav className="fixed top-0 left-0 right-0 h-16 border-b border-my-border bg-my-bg/70 backdrop-blur-xl z-[100] px-6 md:px-10 flex items-center justify-between transition-all">
      {/* Brand */}
      <button 
        onClick={() => setView('landing')}
        className="flex items-center gap-3 group transition-transform active:scale-95"
      >
        <div className="w-8 h-8 bg-my-ink dark:bg-white flex items-center justify-center text-white dark:text-my-ink rounded-none shadow-lg group-hover:bg-my-accent transition-colors">
           <Terminal size={16} />
        </div>
        <span className="text-[12px] font-black uppercase tracking-[0.5em] text-my-ink dark:text-white">Cognapse</span>
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
                 <span className="text-[8px] text-my-accent font-bold uppercase tracking-widest">Active Operative</span>
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
           onClick={() => setNotebookOpen(!isNotebookOpen)}
           className={clsx(
             "p-2 border transition-all flex items-center gap-2",
             isNotebookOpen ? "bg-my-accent text-white border-my-accent" : "border-my-border text-my-ink hover:border-my-accent"
           )}
           title="Toggle Investigative Notebook"
         >
            <BookOpen size={14} />
         </button>

         <button 
           onClick={() => setView('research')}
           className="px-5 py-2 bg-my-accent text-white text-[10px] font-bold uppercase tracking-widest hover:bg-my-ink transition-all flex items-center gap-2 shadow-lg"
         >
            Initialize <Zap size={12} />
         </button>
      </div>

    </nav>
  );
}
