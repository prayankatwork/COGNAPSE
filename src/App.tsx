/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import clsx from 'clsx';
import { useStore } from './store';
import Sidebar from './components/Sidebar';
import MainContent from './components/MainContent';
import NeuralBackground from './components/NeuralBackground';
import LandingPage from './components/LandingPage';
import Documentation from './components/Documentation';
import Navbar from './components/Navbar';
import AuthPortal from './components/AuthPortal';
import OperativeStatus from './components/OperativeStatus';
import { useEffect, useRef, useState } from 'react';
import { PanelLeftOpen, Activity, Zap, Compass, ArrowRight, Lock as LockIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Notebook from './components/Notebook';
import SelectionCapture from './components/SelectionCapture';
import { dbService } from './services/dbService';
import IntelligenceFeed from './components/IntelligenceFeed';
import CreatorProfile from './components/CreatorProfile';
import NeuralWalkthrough from './components/NeuralWalkthrough';
import { lazy, Suspense } from 'react';

import { audioService } from './services/audioService';

export default function App() {
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

  const userId = user?.id;

  useEffect(() => {
    if (userId) {
      const syncUser = async () => {
        try {
          console.log('[Vault] Syncing for user:', userId);
          const [reports, stats, notes, settings, premiumStatus] = await Promise.all([
            dbService.getAllReports(userId),
            dbService.loadStats(userId),
            dbService.getNotes(userId),
            dbService.loadSettings(userId),
            dbService.loadPremium(userId)
          ]);
          console.log('[Vault] Reports fetched:', reports.length);

          if (premiumStatus) {
            const currentUser = useStore.getState().user;
            if (currentUser) {
              useStore.setState({
                user: {
                  ...currentUser,
                  ...premiumStatus
                }
              });
            }
          }

          if (settings && settings.subscribedCategories) {
            useStore.getState().setSubscribedCategories(settings.subscribedCategories);
          }
          
          if (settings && typeof settings.walkthroughCompleted !== 'undefined') {
            useStore.getState().setWalkthroughCompleted(settings.walkthroughCompleted);
          } else {
            // New user, trigger walkthrough
            useStore.getState().setWalkthroughCompleted(false);
          }

          if (stats) {
            setStats({
              xp: stats.xp,
              searchCount: stats.search_count,
              rank: stats.rank
            });
          }

          if (notes) {
            const sortedNotes = (notes as any[]).sort((a: any, b: any) => 
              new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
            );
            setNotes(sortedNotes);
          }

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
                summary_snippet: reportData?.archive_entry?.summary_snippet || reportData?.summary?.bottom_line || "",
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
  }, [userId, setStats, setNotes, setArchive]);

  // Determine Content Based on View
  const renderContent = () => {
    switch (currentView) {
      case 'landing':
        return <LandingPage />;
      case 'documentation':
        return <Documentation />;
      case 'creator':
        return <CreatorProfile />;
      case 'news':
        if (!user) {
           return (
             <div className="flex flex-col items-center justify-center text-center p-8 h-full">
                <div className="relative z-10 max-w-md">
                   <div className="w-20 h-20 bg-red-500/10 border border-red-500/30 rounded-2xl flex items-center justify-center text-red-500 mx-auto mb-8 animate-pulse">
                      <LockIcon size={32} />
                   </div>
                   <h1 className="text-2xl font-black text-my-ink uppercase tracking-[0.4em] mb-4">Access Restricted</h1>
                   <p className="text-xs text-my-muted uppercase tracking-[0.2em] leading-relaxed mb-10">
                      The Knowledge Hub requires an <br /> 
                      <span className="text-my-accent font-bold">Authorized Analyst Profile</span> <br /> 
                      to synchronize your global feed.
                   </p>
                   <button 
                     onClick={() => setAuthOpen(true)}
                     className="px-12 py-4 bg-my-ink text-my-bg dark:bg-my-accent dark:text-black text-[10px] font-black uppercase tracking-[0.3em] hover:scale-105 transition-all shadow-2xl"
                   >
                      Sign In to Access
                   </button>
                </div>
             </div>
           );
        }
        return <IntelligenceFeed onTriggerResearch={(q) => useStore.setState({ initialQuery: q })} />;
      case 'research':
      default:
        return (
          <div className="flex h-full overflow-hidden relative">
            <Sidebar />
            <main className="flex-1 flex flex-col h-full relative">
              <MainContent />
            </main>
          </div>
        );
    }
  };

  return (
    <div className={clsx(
      "min-h-screen bg-my-bg text-my-ink font-sans selection:bg-my-accent selection:text-white overflow-x-hidden relative pt-16",
      theme === 'dark' ? 'dark' : ''
    )}>
      <Navbar />
      
      <div className="h-[calc(100vh-64px)] relative">
         {renderContent()}
      </div>

      <AnimatePresence>
         {isAuthOpen && <AuthPortal onClose={() => setAuthOpen(false)} />}
         {isNotebookOpen && <Notebook onClose={() => setNotebookOpen(false)} />}
         {isStatusOpen && <OperativeStatus onClose={() => setStatusOpen(false)} />}
      </AnimatePresence>
      <NeuralWalkthrough />
      <SelectionCapture />
      <NeuralBackground />
    </div>
  );
}
