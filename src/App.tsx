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
import OperativeStatus from './components/OperativeStatus';
import { useEffect, useRef, useState } from 'react';
import { PanelLeftOpen, Activity, Zap, Compass, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Notebook from './components/Notebook';
import SelectionCapture from './components/SelectionCapture';
import { dbService } from './services/dbService';
import CreatorProfile from './components/CreatorProfile';
import CustomCursor from './components/CustomCursor';
import { lazy, Suspense } from 'react';

import { audioService } from './services/audioService';
const DecisionMatrixApp = lazy(() => import('./apps/DecisionMatrix/DecisionMatrixApp'));

export default function App() {
  const hasOnboarded = useStore((state) => state.hasOnboarded);
  const isSidebarOpen = useStore((state) => state.isSidebarOpen);
  const toggleSidebar = useStore((state) => state.toggleSidebar);
  const currentView = useStore((state) => state.currentView);
  const theme = useStore((state) => state.theme);
  const isAuthOpen = useStore((state) => state.isAuthOpen);
  const activeApp = useStore((state) => state.activeApp);
  const setActiveApp = useStore((state) => state.setActiveApp);
  
  const isLoading = useStore((state) => state.isLoading);
  const currentReport = useStore((state) => state.currentReport);
  const deepResearch = useStore((state) => state.deepResearch);
  
  // Sound Trigger: Normal Research
  const lastPlayedReportId = useRef<string | null>(null);
  useEffect(() => {
    if (!isLoading && currentReport && currentReport.id !== lastPlayedReportId.current) {
      const isDeep = !!currentReport.deep_research;
      if (!isDeep) {
        lastPlayedReportId.current = currentReport.id;
        audioService.playCompletionSound(false);
      }
    }
  }, [isLoading, currentReport]);

  // Sound Trigger: Deep Research Completion
  const prevDeepStatus = useRef<string>('idle');
  useEffect(() => {
    if (deepResearch.status === 'completed' && prevDeepStatus.current === 'running') {
      audioService.playCompletionSound(true);
    }
    prevDeepStatus.current = deepResearch.status;
  }, [deepResearch.status]);

  useEffect(() => {
    // Purge any persistent emojis from old sessions
    const state = useStore.getState() as any;
    if (state._hydrateCleanup) state._hydrateCleanup();
  }, []);

  const setAuthOpen = useStore((state) => state.setAuthOpen);
  const isNotebookOpen = useStore((state) => state.isNotebookOpen);
  const setNotebookOpen = useStore((state) => state.setNotebookOpen);
  const isStatusOpen = useStore((state) => state.isStatusOpen);
  const setStatusOpen = useStore((state) => state.setStatusOpen);
  const isDevOpen = useStore((state) => state.isDevOpen);
  const setDevOpen = useStore((state) => state.setDevOpen);

  // Global Dev Command
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'D') {
        e.preventDefault();
        setDevOpen(!isDevOpen);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isDevOpen, setDevOpen]);

  // Global Neural Blink Sync
  useEffect(() => {
    let blinkTimeout: ReturnType<typeof setTimeout>;
    let offTimeout: ReturnType<typeof setTimeout>;

    const triggerBlink = () => {
      const store = useStore.getState();
      if (typeof store.setBlinking === 'function') {
        store.setBlinking(true);
        offTimeout = setTimeout(() => {
          useStore.getState().setBlinking(false);
        }, 150);
      }
      blinkTimeout = setTimeout(triggerBlink, Math.random() * 5000 + 4000);
    };

    blinkTimeout = setTimeout(triggerBlink, 3000);
    return () => {
      clearTimeout(blinkTimeout);
      clearTimeout(offTimeout);
    };
  }, []);

  // Apply dark mode class to html element
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);
  
  const user = useStore(state => state.user);
  const setStats = useStore(state => state.setStats);
  const setArchive = useStore(state => state.setArchive);
  const setNotes = useStore(state => state.setNotes);

  // Auto-sync with Vault on mount if user is logged in
  useEffect(() => {
    if (user) {
      const syncUser = async () => {
        try {
          const [reports, stats, notes] = await Promise.all([
            dbService.getAllReports(user.id),
            dbService.loadStats(user.id),
            dbService.getNotes(user.id)
          ]);

          if (stats) {
            setStats({
              xp: stats.xp,
              searchCount: stats.search_count,
              rank: stats.rank,
              gameScores: stats.game_scores
            });
          }

          if (notes) setNotes(notes);

          if (reports && reports.length > 0) {
            const dbArchiveEntries = reports.map((r: any) => {
              if (r.data) r.data.id = r.id;
              return {
                id: r.id,
                query: r.query,
                timestamp: r.timestamp,
                topic_cluster: r.data?.archive_entry?.topic_cluster || "General",
                tags: r.data?.archive_entry?.tags || [],
                summary_snippet: r.data?.archive_entry?.summary_snippet || "",
                report: r.data
              };
            });

            // Use functional update to MERGE rather than overwrite
            setArchive((localArchive: any[]) => {
              const merged = [...localArchive];
              dbArchiveEntries.forEach((dbEntry: any) => {
                const existingIndex = merged.findIndex(e => e.id === dbEntry.id);
                if (existingIndex === -1) {
                  merged.push(dbEntry);
                } else {
                  // If DB has more data (deep research), use DB.
                  // If local has more data, keep local.
                  const localHasDeep = !!merged[existingIndex].report?.deep_research;
                  const dbHasDeep = !!dbEntry.report?.deep_research;
                  
                  if (dbHasDeep || !localHasDeep) {
                    merged[existingIndex] = dbEntry;
                  }
                }
              });
              // Sort by timestamp
              return merged.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
            });
          }
        } catch (err) {
          console.warn("Vault sync failed on mount. Using local state.", err);
        }
      };
      syncUser();
    }
  }, [user]);

  if (!hasOnboarded) {
    return <Onboarding />;
  }

  if (currentView === 'landing') {
    return (
      <div className="relative pt-16">
        <CustomCursor />
        <Navbar />
        <NeuralBackground />
        <LandingPage />

        <AnimatePresence>
           {isAuthOpen && <AuthPortal onClose={() => setAuthOpen(false)} />}
           {isStatusOpen && <OperativeStatus onClose={() => setStatusOpen(false)} />}
        </AnimatePresence>
      </div>
    );
  }

  if (currentView === 'documentation') {
    return (
      <div className="pt-16 min-h-screen">
        <CustomCursor />
        <Navbar />
        <Documentation />

        <AnimatePresence>
           {isAuthOpen && <AuthPortal onClose={() => setAuthOpen(false)} />}
           {isStatusOpen && <OperativeStatus onClose={() => setStatusOpen(false)} />}
        </AnimatePresence>
      </div>
    );
  }

  if (currentView === 'games') {
    return (
      <div className="pt-16 min-h-screen">
        <CustomCursor />
        <Navbar />
        <NeuralBackground />
        <GamesPage />

        <AnimatePresence>
           {isAuthOpen && <AuthPortal onClose={() => setAuthOpen(false)} />}
           {isStatusOpen && <OperativeStatus onClose={() => setStatusOpen(false)} />}
        </AnimatePresence>
      </div>
    );
  }

  if (currentView === 'creator') {
    return (
      <div className="pt-16 min-h-screen relative overflow-hidden">
        <CustomCursor />
        <Navbar />
        <NeuralBackground />
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="relative z-10"
        >
          <CreatorProfile />
        </motion.div>

        <AnimatePresence>
           {isAuthOpen && <AuthPortal onClose={() => setAuthOpen(false)} />}
           {isStatusOpen && <OperativeStatus onClose={() => setStatusOpen(false)} />}
        </AnimatePresence>
      </div>
    );
  }

  if (currentView === 'apps') {
    return (
      <div className={clsx(
        "flex h-screen bg-my-bg text-my-ink font-sans selection:bg-my-accent selection:text-white overflow-hidden relative pt-16",
        theme === 'dark' ? 'dark' : ''
      )}>
        <CustomCursor />
        <Navbar />
        <NeuralBackground />
        
        <div className="flex-1 flex flex-col h-full relative">
          {activeApp === null ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 relative overflow-hidden">
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center mb-16 z-10"
              >
                <h2 className="text-4xl md:text-6xl font-serif font-bold italic text-my-ink mb-4">Select Workspace.</h2>
                <p className="text-[11px] text-my-muted uppercase tracking-[0.4em]">Choose your investigative trajectory.</p>
              </motion.div>

              <div className="flex flex-col md:flex-row gap-8 w-full max-w-5xl z-10">
                {/* Research App Card */}
                <motion.button
                  whileHover={{ scale: 1.02, translateY: -10 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setActiveApp('research')}
                  className="flex-1 group relative overflow-hidden bg-my-callout/40 border border-my-border backdrop-blur-2xl p-12 text-left transition-all hover:border-my-accent/50"
                >
                  <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                    <Activity size={120} />
                  </div>
                  <div className="relative z-10">
                    <div className="w-12 h-12 bg-my-accent/10 rounded-full flex items-center justify-center mb-8 group-hover:bg-my-accent group-hover:text-white transition-colors">
                      <Compass size={24} />
                    </div>
                    <h3 className="text-3xl font-serif font-bold text-my-ink mb-4 italic">Research Core.</h3>
                    <p className="text-sm text-my-muted leading-relaxed mb-8">Deep intelligence synthesis, academic-grade verification, and evidence-based investigation of any complex topic.</p>
                    <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.2em] text-my-accent">
                      Initialize Protocol <ArrowRight size={14} className="group-hover:translate-x-2 transition-transform" />
                    </div>
                  </div>
                </motion.button>

                {/* Decision App Card */}
                <motion.button
                  whileHover={{ scale: 1.02, translateY: -10 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setActiveApp('decide')}
                  className="flex-1 group relative overflow-hidden bg-my-callout/40 border border-my-border backdrop-blur-2xl p-12 text-left transition-all hover:border-my-accent/50"
                >
                  <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                    <Zap size={120} />
                  </div>
                  <div className="relative z-10">
                    <div className="w-12 h-12 bg-my-accent/10 rounded-full flex items-center justify-center mb-8 group-hover:bg-my-accent group-hover:text-white transition-colors">
                      <Zap size={24} />
                    </div>
                    <h3 className="text-3xl font-serif font-bold text-my-ink mb-4 italic">Decision Matrix.</h3>
                    <p className="text-sm text-my-muted leading-relaxed mb-8">Simulate parallel realities, explore second-order consequences, and optimize strategic outcomes for complex personal or professional choices.</p>
                    <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.2em] text-my-accent">
                      Access Simulator <ArrowRight size={14} className="group-hover:translate-x-2 transition-transform" />
                    </div>
                  </div>
                </motion.button>
              </div>
            </div>
          ) : activeApp === 'research' ? (
            <div className="flex-1 flex h-full overflow-hidden">
               <Sidebar />
               <main className="flex-1 flex flex-col h-full relative">
                 <MainContent />
               </main>
            </div>
          ) : (
            <Suspense fallback={
              <div className="flex-1 flex items-center justify-center">
                <div className="w-12 h-12 rounded-full border-2 border-t-my-accent border-my-border animate-spin" />
              </div>
            }>
              <DecisionMatrixApp />
            </Suspense>
          )}
        </div>

        <AnimatePresence>
           {isAuthOpen && <AuthPortal onClose={() => setAuthOpen(false)} />}
           {isStatusOpen && <OperativeStatus onClose={() => setStatusOpen(false)} />}
        </AnimatePresence>
        <SelectionCapture />
      </div>
    );
  }

  return (
    <div className={clsx(
      "flex h-screen bg-my-bg text-my-ink font-sans selection:bg-my-accent selection:text-white overflow-hidden relative pt-16",
      theme === 'dark' ? 'dark' : ''
    )}>
      <CustomCursor />
      <Navbar />
      <NeuralBackground />
      
      <Sidebar />
      
      <main className="flex-1 flex flex-col h-full relative">
        <MainContent />
      </main>

      <AnimatePresence>
         {isAuthOpen && <AuthPortal onClose={() => setAuthOpen(false)} />}
         {isNotebookOpen && <Notebook onClose={() => setNotebookOpen(false)} />}
         {isStatusOpen && <OperativeStatus onClose={() => setStatusOpen(false)} />}
      </AnimatePresence>
      <SelectionCapture />
    </div>
  );
}
