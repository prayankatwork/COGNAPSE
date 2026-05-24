/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import clsx from 'clsx';
import { useStore } from './store';
import Sidebar from './components/Sidebar';
import MainContent from './components/MainContent';
import NeuralBackground from './components/NeuralBackground';
import Documentation from './components/Documentation';
import Navbar from './components/Navbar';
import AuthPortal from './components/AuthPortal';
import OperativeStatus from './components/OperativeStatus';
import React, { useEffect, useRef, useState, Suspense } from 'react';
import { PanelLeftOpen, Activity, Zap, Compass, ArrowRight, Lock as LockIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useShallow } from 'zustand/react/shallow';

const lazyWithReload = (componentImport: () => Promise<any>) =>
  React.lazy(async () => {
    try {
      return await componentImport();
    } catch (error) {
      console.warn('Chunk loading failed, reloading page to fetch latest version...', error);
      window.location.reload();
      throw error;
    }
  });

const LandingPage = lazyWithReload(() => import('./components/LandingPage'));
const IntelligenceFeed = lazyWithReload(() => import('./components/IntelligenceFeed'));
import Notebook from './components/Notebook';
import SelectionCapture from './components/SelectionCapture';
import { dbService } from './services/dbService';
import CreatorProfile from './components/CreatorProfile';
import NeuralWalkthrough from './components/NeuralWalkthrough';
import SharedResearchPage from './components/SharedResearchPage';
import LegalPages from './components/LegalPages';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './services/firebase';
import { syncAuthSession } from './services/authSession';
import { reportsToArchiveEntries } from './utils/archiveEntries';
import DevDashboard from './components/DevDashboard';

import { audioService } from './services/audioService';

export default function App() {
  const [shareRoute, setShareRoute] = useState<string | null>(() => {
    const match = window.location.pathname.match(/^\/share\/([^/]+)/);
    return match?.[1] || null;
  });
  const [legalPage, setLegalPage] = useState<'privacy' | 'terms' | 'ai-disclaimer' | null>(() => {
    const path = window.location.pathname.replace(/\/$/, '');
    if (path === '/privacy') return 'privacy';
    if (path === '/terms') return 'terms';
    if (path === '/ai-disclaimer') return 'ai-disclaimer';
    return null;
  });
  const {
    currentView,
    theme,
    isAuthOpen,
    isLoading,
    currentReport,
    deepResearch,
  } = useStore(useShallow((state) => ({
    currentView: state.currentView,
    theme: state.theme,
    isAuthOpen: state.isAuthOpen,
    isLoading: state.isLoading,
    currentReport: state.currentReport,
    deepResearch: state.deepResearch,
  })));

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
    const state = useStore.getState() as any;
    if (state._hydrateCleanup) state._hydrateCleanup();
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) return;
      const current = useStore.getState().user;
      if (current?.id === firebaseUser.uid) {
        await syncAuthSession(current);
        return;
      }
      const username =
        firebaseUser.email?.replace(/@cognapse\.vault$/i, '') || 'operative';
      await syncAuthSession({ id: firebaseUser.uid, username });
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const onPop = () => {
      const path = window.location.pathname.replace(/\/$/, '');
      if (path === '/privacy') setLegalPage('privacy');
      else if (path === '/terms') setLegalPage('terms');
      else if (path === '/ai-disclaimer') setLegalPage('ai-disclaimer');
      else setLegalPage(null);
      const shareMatch = path.match(/^\/share\/([^/]+)/);
      setShareRoute(shareMatch?.[1] || null);
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const {
    setAuthOpen,
    isNotebookOpen,
    setNotebookOpen,
    isStatusOpen,
    setStatusOpen,
    isDevOpen,
    setDevOpen,
  } = useStore(useShallow((state) => ({
    setAuthOpen: state.setAuthOpen,
    isNotebookOpen: state.isNotebookOpen,
    setNotebookOpen: state.setNotebookOpen,
    isStatusOpen: state.isStatusOpen,
    setStatusOpen: state.setStatusOpen,
    isDevOpen: state.isDevOpen,
    setDevOpen: state.setDevOpen,
  })));

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

  const { user, setStats, setArchive, setNotes } = useStore(useShallow((state) => ({
    user: state.user,
    setStats: state.setStats,
    setArchive: state.setArchive,
    setNotes: state.setNotes,
  })));

  const userId = user?.id;

  const vaultSyncGen = useRef(0);

  useEffect(() => {
    if (!userId) return;
    const syncId = ++vaultSyncGen.current;

    const syncUser = async () => {
      try {
        const [reports, stats, notes, settings, premiumStatus] = await Promise.all([
          dbService.getAllReports(userId),
          dbService.loadStats(userId),
          dbService.getNotes(userId),
          dbService.loadSettings(userId),
          dbService.loadPremium(userId),
        ]);
        if (syncId !== vaultSyncGen.current) return;

        if (premiumStatus) {
          const currentUser = useStore.getState().user;
          if (currentUser) {
            useStore.setState({ user: { ...currentUser, ...premiumStatus } });
          }
        }

        if (settings?.subscribedCategories) {
          useStore.getState().setSubscribedCategories(settings.subscribedCategories);
        }

        if (settings && typeof settings.walkthroughCompleted !== 'undefined') {
          useStore.getState().setWalkthroughCompleted(settings.walkthroughCompleted);
        } else {
          useStore.getState().setWalkthroughCompleted(false);
        }

        if (stats) {
          setStats({
            xp: stats.xp,
            searchCount: stats.search_count,
            rank: stats.rank,
          });
        }

        if (notes) {
          const sortedNotes = (notes as any[]).sort(
            (a: any, b: any) =>
              new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
          );
          setNotes(sortedNotes);
        }

        setArchive(reportsToArchiveEntries(reports || []));
      } catch (err) {
        console.error('[Vault] Sync failed:', err);
      }
    };
    syncUser();
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
                <div className="w-20 h-20 bg-red-500/10 border border-red-500/30 rounded-[4px] flex items-center justify-center text-red-500 mx-auto mb-8 animate-pulse">
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

  const handleLegalNav = (e: React.MouseEvent<HTMLAnchorElement>, hash: string) => {
    e.preventDefault();
    setLegalPage(null); // Clear standalone legal page if open
    useStore.getState().setView('documentation');
    window.location.hash = hash;
  };

  const isDashboard = currentView === 'research' || currentView === 'news';

  return (
    <div className={clsx(
      "bg-my-bg text-my-ink font-sans selection:bg-my-accent selection:text-white overflow-x-hidden relative pt-16 flex flex-col",
      theme === 'dark' ? 'dark' : '',
      isDashboard && !legalPage && !shareRoute ? "h-screen overflow-hidden" : "min-h-screen"
    )}>
      {!shareRoute && !legalPage && <Navbar />}

      <div className={clsx(
        "relative",
        isDashboard && !legalPage && !shareRoute ? "flex-1 overflow-hidden" : "flex-1"
      )}>
        {legalPage ? (
          <LegalPages
            page={legalPage}
            onBack={() => {
              setLegalPage(null);
              window.history.pushState({}, '', '/');
            }}
          />
        ) : shareRoute ? (
          <SharedResearchPage shareId={shareRoute} />
        ) : (
          <Suspense fallback={<div className="h-full flex items-center justify-center bg-my-bg text-my-muted text-[10px] tracking-[0.3em] uppercase animate-pulse">Loading Subsystems...</div>}>
            {renderContent()}
          </Suspense>
        )}
      </div>

      {!shareRoute && !legalPage && (
        <footer className="border-t border-my-border px-6 py-4 flex flex-wrap gap-4 justify-center text-[9px] font-bold uppercase tracking-[0.25em] text-my-muted">
          <a href="/policies" onClick={(e) => handleLegalNav(e, 'legal-overview')} className="hover:text-my-accent">Privacy & Policies</a>
        </footer>
      )}

      <AnimatePresence>
        {isAuthOpen && <AuthPortal onClose={() => setAuthOpen(false)} />}
        {isNotebookOpen && <Notebook onClose={() => setNotebookOpen(false)} />}
        {isStatusOpen && <OperativeStatus onClose={() => setStatusOpen(false)} />}
      </AnimatePresence>
      <DevDashboard />
      {!shareRoute && !legalPage && <NeuralWalkthrough />}
      {!shareRoute && !legalPage && <SelectionCapture />}
      <NeuralBackground />
    </div>
  );
}
