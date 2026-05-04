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

  // Auto-sync with Vault on mount if user is logged in (handles hard refresh)
  useEffect(() => {
    if (user) {
      const syncUser = async () => {
        try {
          console.log('[Vault] Syncing for user:', user.id);
          const [reports, stats, notes] = await Promise.all([
            dbService.getAllReports(user.id),
            dbService.loadStats(user.id),
            dbService.getNotes(user.id)
          ]);
          console.log('[Vault] Reports fetched:', reports.length);

          if (stats) {
            setStats({
              xp: stats.xp,
              searchCount: stats.search_count,
              rank: stats.rank
            });
          }

          if (notes) setNotes(notes);

          // Restore Intel Archive
          const dbArchiveEntries = (reports || [])
            .filter((r: any) => r && r.id && r.query)
            .map((r: any) => {
              const reportData = r.data || {};
              return {
                id: r.id,
                query: r.query,
                timestamp: r.timestamp || new Date().toISOString(),
                topic_cluster: reportData?.archive_entry?.topic_cluster || "General",
                tags: reportData?.archive_entry?.tags || [],
                summary_snippet: reportData?.archive_entry?.summary_snippet || "",
                report: reportData
              };
            });
          const sorted = dbArchiveEntries.sort((a: any, b: any) =>
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
          );
          setArchive(sorted);
          console.log('[Vault] Archive restored with', sorted.length, 'entries');
        } catch (err) {
          console.error("[Vault] Sync failed:", err);
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
        <Navbar />
        <NeuralBackground />
        <LandingPage />

        <AnimatePresence>
           {isAuthOpen && <AuthPortal onClose={() => setAuthOpen(false)} />}
           {isNotebookOpen && <Notebook onClose={() => setNotebookOpen(false)} />}
           {isStatusOpen && <OperativeStatus onClose={() => setStatusOpen(false)} />}
        </AnimatePresence>
        <SelectionCapture />
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
           {isNotebookOpen && <Notebook onClose={() => setNotebookOpen(false)} />}
           {isStatusOpen && <OperativeStatus onClose={() => setStatusOpen(false)} />}
        </AnimatePresence>
        <SelectionCapture />
      </div>
    );
  }

  if (currentView === 'creator') {
    return (
      <div className="pt-16 min-h-screen relative overflow-hidden">
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
           {isNotebookOpen && <Notebook onClose={() => setNotebookOpen(false)} />}
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
