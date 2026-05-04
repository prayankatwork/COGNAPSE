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

export default function App() {
  const hasOnboarded = useStore((state) => state.hasOnboarded);
  const isSidebarOpen = useStore((state) => state.isSidebarOpen);
  const toggleSidebar = useStore((state) => state.toggleSidebar);
  const currentView = useStore((state) => state.currentView);
  const theme = useStore((state) => state.theme);
  const isAuthOpen = useStore((state) => state.isAuthOpen);
  
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
