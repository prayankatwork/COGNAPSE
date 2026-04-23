/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import clsx from 'clsx';
import { useStore } from './store';
import Sidebar from './components/Sidebar';
import MainContent from './components/MainContent';
import Onboarding from './components/Onboarding';
import NeuralBackground from './components/NeuralBackground';
import LandingPage from './components/LandingPage';
import Documentation from './components/Documentation';
import GamesPage from './components/GamesPage';
import Navbar from './components/Navbar';
import AuthPortal from './components/AuthPortal';
import { useEffect } from 'react';
import { PanelLeftOpen } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Notebook from './components/Notebook';
import SelectionCapture from './components/SelectionCapture';

export default function App() {
  const hasOnboarded = useStore((state) => state.hasOnboarded);
  const isSidebarOpen = useStore((state) => state.isSidebarOpen);
  const toggleSidebar = useStore((state) => state.toggleSidebar);
  const currentView = useStore((state) => state.currentView);
  const theme = useStore((state) => state.theme);
  const isAuthOpen = useStore((state) => state.isAuthOpen);
  const setAuthOpen = useStore((state) => state.setAuthOpen);
  const isNotebookOpen = useStore((state) => state.isNotebookOpen);
  const setNotebookOpen = useStore((state) => state.setNotebookOpen);

  // Apply dark mode class to html element
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  if (!hasOnboarded) {
    return <Onboarding />;
  }

  if (currentView === 'landing') {
    return (
      <div className="relative pt-16">
        <Navbar />
        <NeuralBackground />
        <LandingPage />

        <AnimatePresence>
           {isAuthOpen && <AuthPortal onClose={() => setAuthOpen(false)} />}
        </AnimatePresence>
      </div>
    );
  }

  if (currentView === 'documentation') {
    return (
      <div className="pt-16 min-h-screen">
        <Navbar />
        <Documentation />

        <AnimatePresence>
           {isAuthOpen && <AuthPortal onClose={() => setAuthOpen(false)} />}
        </AnimatePresence>
      </div>
    );
  }

  if (currentView === 'games') {
    return (
      <div className="pt-16 min-h-screen">
        <Navbar />
        <NeuralBackground />
        <GamesPage />

        <AnimatePresence>
           {isAuthOpen && <AuthPortal onClose={() => setAuthOpen(false)} />}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <div className={clsx(
      "flex h-screen bg-my-bg text-my-ink font-sans selection:bg-my-accent selection:text-white overflow-hidden relative pt-16",
      theme === 'dark' ? 'dark' : ''
    )}>
      <Navbar />
      <NeuralBackground />
      
      {/* Sidebar Component */}
      <Sidebar />
      
      {/* Floating Toggle Button (Appears when sidebar is closed) */}
      <AnimatePresence>
        {!isSidebarOpen && (
          <motion.button
            initial={{ x: -100, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -100, opacity: 0 }}
            onClick={toggleSidebar}
            className="fixed left-0 top-1/2 -translate-y-1/2 z-[60] bg-my-ink dark:bg-white text-white dark:text-my-ink p-3 shadow-2xl hover:bg-my-accent hover:text-white transition-all group border-r border-t border-b border-my-border"
            title="Open Intelligence Vault"
          >
            <PanelLeftOpen size={20} className="group-hover:scale-110 transition-transform" />
          </motion.button>
        )}
      </AnimatePresence>

      <main 
        className={clsx(
          "flex-1 flex flex-col h-full transition-all duration-500 ease-in-out relative",
          isSidebarOpen ? "ml-0" : "ml-0" 
        )}
      >
        <MainContent />
      </main>

      <AnimatePresence>
         {isAuthOpen && <AuthPortal onClose={() => setAuthOpen(false)} />}
         {isNotebookOpen && <Notebook onClose={() => setNotebookOpen(false)} />}
      </AnimatePresence>
      <SelectionCapture />
    </div>
  );
}
