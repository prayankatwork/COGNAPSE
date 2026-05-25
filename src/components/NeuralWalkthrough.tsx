import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '../store';
import { 
  Search, Cpu, Globe, Zap, 
  ShieldCheck, ArrowRight, X, 
  ChevronRight, ChevronLeft, Sparkles,
  Command, Database, Target, Brain,
  TrendingUp, Landmark, Shield, AlertTriangle,
  BookOpen
} from 'lucide-react';
import clsx from 'clsx';
import { audioService } from '../services/audioService';

interface WalkthroughStep {
  title: string;
  description: string;
  anchorId?: string;
  icon: React.ReactNode;
  actionLabel?: string;
  onEnter?: () => void;
  id: string;
  isActionGated?: boolean;
}

export default function NeuralWalkthrough() {
  const { 
    walkthroughCompleted, setWalkthroughCompleted, 
    setView, setStatusOpen, updateGamification,
    subscribedCategories, toggleCategory, currentReport,
    deepResearch
  } = useStore();
  
  const [currentStepIdx, setCurrentStepIdx] = useState(0);
  const [spotlightRect, setSpotlightRect] = useState<{ top: number, left: number, width: number, height: number } | null>(null);
  
  // Track if this is a replay to skip category selection
  const [isReplay, setIsReplay] = useState(false);

  useEffect(() => {
    if (!walkthroughCompleted) {
      setCurrentStepIdx(0);
      if (subscribedCategories.length >= 2) {
        setIsReplay(true);
      } else {
        setIsReplay(false);
      }
      audioService.playWalkthroughTick();
    }
  }, [walkthroughCompleted]);

  const steps: WalkthroughStep[] = useMemo(() => {
    const allSteps: WalkthroughStep[] = [
      {
        id: 'welcome',
        title: "Welcome to COGNAPSE",
        description: "Authorized Analyst detected. This protocol will introduce you to the COGNAPSE research engine.",
        icon: <Sparkles className="text-my-accent" size={32} />,
        actionLabel: "Initialize System"
      },
      {
        id: 'ai-acknowledgement',
        title: "AI Acknowledgment",
        description: "Before we begin, please understand that COGNAPSE uses artificial intelligence to generate research. AI outputs may contain errors, hallucinations, or outdated information. Confidence, consensus, and credibility scores are model self-assessments, not guarantees of factual accuracy. You are responsible for independently verifying critical claims. Proceeding indicates your acceptance of these limitations.",
        icon: <AlertTriangle className="text-amber-400" size={32} />,
        actionLabel: "I Understand & Proceed"
      },
      {
        id: 'categories',
        title: "Analysis Setup",
        description: "Select at least two research domains to synchronize with your global feed.",
        icon: <Target className="text-my-accent" size={32} />,
        actionLabel: "Confirm Domains"
      },
      {
        id: 'hub',
        title: "Knowledge Hub",
        description: "Your global event monitor. Track real-time developments across Tech, Finance, and Geopolitics based on your setup.",
        anchorId: "walkthrough-hub-anchor",
        icon: <Globe className="text-blue-400" size={24} />,
        onEnter: () => {
          if (useStore.getState().currentView !== 'news') setView('news');
        }
      },
      {
        id: 'theme',
        title: "Neural Mode",
        description: "Toggle between Light and Dark themes using the switch in the top bar. Choose what's comfortable for your eyes.",
        anchorId: "walkthrough-theme-anchor",
        icon: <Zap className="text-amber-400" size={24} />
      },
      {
        id: 'command',
        title: "Command Center",
        description: "Activate the command bar (Ctrl+K) to navigate between analysis modules or recall archived reports instantly.",
        anchorId: "walkthrough-command-anchor",
        icon: <Command className="text-my-accent" size={24} />
      },
      {
        id: 'research',
        title: "Core Analysis",
        description: "Perform your first live research query now. Type a topic and press Enter to begin the analysis.",
        anchorId: "walkthrough-search-anchor",
        icon: <Search className="text-my-ink" size={24} />,
        onEnter: () => {
          if (useStore.getState().currentView !== 'research') setView('research');
          // Purge existing data to force fresh setup
          useStore.getState().setCurrentReport(null);
          useStore.getState().resetDeepResearch();
        },
        isActionGated: true
      },
      {
        id: 'deep',
        title: "Deep Analysis Protocol",
        description: "Activate the Deep Analysis toggle to generate comprehensive, professional research reports.",
        anchorId: "walkthrough-deep-research-anchor",
        icon: <Cpu className="text-emerald-400" size={24} />,
        onEnter: () => {
          // Ensure deep research is reset if they somehow triggered it earlier
          useStore.getState().resetDeepResearch();
        },
        isActionGated: true
      },
      {
        id: 'archive',
        title: "Research Archive",
        description: "Review every analysis in your private archive. Track your research evolution and history.",
        anchorId: "walkthrough-sidebar-anchor",
        icon: <Database className="text-my-muted" size={24} />,
        onEnter: () => {
            if (useStore.getState().currentView !== 'research') setView('research');
            if (!useStore.getState().isSidebarOpen) useStore.getState().toggleSidebar();
        }
      },
      {
        id: 'notebook',
        title: "Tactical Notebook",
        description: "Open the notebook to jot down thoughts, findings, or questions while you research. Your notes are saved automatically.",
        anchorId: "walkthrough-notebook-anchor",
        icon: <BookOpen className="text-violet-400" size={24} />
      },
      {
        id: 'status',
        title: "Analyst Profile",
        description: "Earn Score for every analysis. Unlock professional tiers and expand your system access as you master the platform.",
        anchorId: "walkthrough-profile-anchor",
        icon: <ShieldCheck className="text-my-accent" size={24} />
      },
      {
        id: 'complete',
        title: "Setup Completed",
        description: "System calibration successful. You have been awarded +100 Score for completing the onboarding protocol.",
        icon: <Zap className="text-my-accent" size={32} />,
        actionLabel: "Enter Workspace"
      }
    ];

    if (isReplay) {
      return allSteps.filter(s => s.id !== 'categories');
    }
    
    return allSteps;
  }, [setView, isReplay]);

  const currentStep = steps[currentStepIdx];

  // Action Gate Listeners
  useEffect(() => {
    if (walkthroughCompleted || !currentStep) return;

    if (currentStep.id === 'research' && currentReport) {
      // Auto-advance when research is performed
      handleNext();
    }

    if (currentStep.id === 'deep' && deepResearch.status === 'running') {
      // Auto-advance when deep research starts
      handleNext();
    }
  }, [currentReport, deepResearch.status]);

  useEffect(() => {
    if (walkthroughCompleted || !currentStep) return;

    if (currentStep.onEnter) {
      currentStep.onEnter();
    }

    audioService.speakProtocol(currentStep.title);
    audioService.playNeuralHum(true);

    const updateSpotlight = () => {
      if (currentStep.anchorId) {
        const el = document.getElementById(currentStep.anchorId);
        if (el) {
          const rect = el.getBoundingClientRect();
          setSpotlightRect({
            top: rect.top - 10,
            left: rect.left - 10,
            width: rect.width + 20,
            height: rect.height + 20
          });
          return;
        }
      }
      setSpotlightRect(null);
    };

    const timer = setTimeout(updateSpotlight, 300);
    window.addEventListener('resize', updateSpotlight);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', updateSpotlight);
    };
  }, [currentStepIdx, walkthroughCompleted, currentStep]);

  if (walkthroughCompleted) return null;

  const handleNext = () => {
    audioService.playWalkthroughTick();
    if (currentStepIdx < steps.length - 1) {
      setCurrentStepIdx(prev => prev + 1);
    } else {
      updateGamification({ xpAcquired: 100 });
      setWalkthroughCompleted(true);
    }
  };

  const handlePrev = () => {
    audioService.playWalkthroughTick();
    if (currentStepIdx > 0) {
      setCurrentStepIdx(prev => prev - 1);
    }
  };

  const handleSkip = () => {
    setWalkthroughCompleted(true);
  };

  const categoryOptions = [
    { id: 'TECH', label: 'Technology', icon: <Cpu size={20} /> },
    { id: 'FINANCE', label: 'Finance', icon: <Landmark size={20} /> },
    { id: 'GEOPOLITICS', label: 'Geopolitics', icon: <Shield size={20} /> }
  ];

  return (
    <div className="fixed inset-0 z-[1000] pointer-events-none overflow-hidden">
      <AnimatePresence mode="wait">
        <motion.div 
          key={`overlay-${spotlightRect ? 'focused' : 'intro'}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 z-0"
        >
          {spotlightRect ? (
            <>
              <div className="absolute top-0 left-0 right-0 bg-black/30 pointer-events-auto" style={{ height: spotlightRect.top }} />
              <div className="absolute bottom-0 left-0 right-0 bg-black/30 pointer-events-auto" style={{ top: spotlightRect.top + spotlightRect.height }} />
              <div className="absolute left-0 bg-black/30 pointer-events-auto" style={{ top: spotlightRect.top, height: spotlightRect.height, width: spotlightRect.left }} />
              <div className="absolute right-0 bg-black/30 pointer-events-auto" style={{ top: spotlightRect.top, height: spotlightRect.height, left: spotlightRect.left + spotlightRect.width }} />
            </>
          ) : (
            <div className="absolute inset-0 bg-black/30 pointer-events-auto" />
          )}
        </motion.div>
      </AnimatePresence>

      <AnimatePresence>
        {spotlightRect && (
          <motion.svg 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-[1001] pointer-events-none"
          >
             <motion.path 
               d={`M ${spotlightRect.left} ${spotlightRect.top} L ${spotlightRect.left + 20} ${spotlightRect.top - 20}`}
               stroke="#f97316"
               strokeWidth="2"
               initial={{ pathLength: 0 }}
               animate={{ pathLength: 1 }}
               className="opacity-50"
             />
             <motion.path 
               d={`M ${spotlightRect.left + spotlightRect.width} ${spotlightRect.top + spotlightRect.height} L ${spotlightRect.left + spotlightRect.width - 20} ${spotlightRect.top + spotlightRect.height + 20}`}
               stroke="#f97316"
               strokeWidth="2"
               initial={{ pathLength: 0 }}
               animate={{ pathLength: 1 }}
               className="opacity-50"
             />
          </motion.svg>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {spotlightRect && (
          <motion.div
            key={`spotlight-${currentStepIdx}`}
            initial={{ opacity: 0, scale: 0.9, filter: "brightness(2) blur(10px)" }}
            animate={{ opacity: 1, scale: 1, filter: "brightness(1) blur(0px)" }}
            exit={{ opacity: 0, scale: 1.1, filter: "brightness(0) blur(20px)" }}
            className="absolute border-2 border-my-accent rounded-[4px] shadow-signal pointer-events-none z-[1001]"
            style={{
              top: spotlightRect.top,
              left: spotlightRect.left,
              width: spotlightRect.width,
              height: spotlightRect.height
            }}
          >
             <motion.div 
               animate={{ opacity: [0.2, 0.4, 0.2], scale: [1, 1.05, 1] }}
               transition={{ duration: 2, repeat: Infinity }}
               className="absolute -inset-4 bg-my-accent/5 rounded-[4px] border border-my-accent/10"
             />
          </motion.div>
        )}
      </AnimatePresence>

      <div className={clsx(
        "absolute inset-0 flex items-center justify-center z-[1002] transition-all duration-1000",
        spotlightRect ? (
          spotlightRect.top < 400 ? "items-end pb-32" : "items-start pt-32"
        ) : ""
      )}>
         <motion.div 
           key={`card-${currentStep?.id}`}
           initial={{ opacity: 0, x: -20, filter: "blur(10px)" }}
           animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
           transition={{ type: "spring", damping: 20 }}
           className={clsx(
             "pointer-events-auto w-full max-w-md bg-my-bg/95 backdrop-blur-3xl border border-my-border rounded-[4px] p-8 shadow-2xl relative overflow-hidden",
             spotlightRect && spotlightRect.left < 500 ? "md:ml-[300px]" : ""
           )}
         >
            <div className="absolute top-0 right-0 p-4 opacity-[0.03] text-[8px] font-mono select-none pointer-events-none uppercase tracking-tighter leading-none whitespace-pre">
               {`SYNC_ACTIVE\nNODE_CALIBRATED\nTHROUGHPUT_HIGH\nFORENSIC_CLEARANCE_AUTH`}
            </div>

            <div className="flex items-center gap-4 mb-6">
               <div className="p-3 bg-my-accent/10 rounded-[4px]">
                  {currentStep?.icon}
               </div>
               <div>
                  <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-my-accent mb-1">System Setup</h3>
                  <h2 className="text-xl font-serif font-bold italic text-my-ink leading-tight">{currentStep?.title}</h2>
               </div>
            </div>

            <p className="text-sm text-my-muted leading-relaxed mb-8 font-medium">
               {currentStep?.description}
            </p>

            {currentStep?.id === 'categories' && (
              <div className="flex flex-col gap-3 mb-10">
                 {categoryOptions.map(cat => (
                   <button 
                     key={cat.id}
                     onClick={() => { toggleCategory(cat.id); audioService.playWalkthroughTick(); }}
                     className={clsx(
                       "flex items-center justify-between p-4 border transition-all",
                       subscribedCategories.includes(cat.id) 
                         ? "border-my-accent bg-my-accent/5 text-my-ink" 
                         : "border-my-border hover:border-my-accent/30 text-my-muted"
                     )}
                   >
                      <div className="flex items-center gap-4">
                         {cat.icon}
                         <span className="text-[10px] font-black uppercase tracking-widest">{cat.label}</span>
                      </div>
                      {subscribedCategories.includes(cat.id) && <Zap size={14} className="text-my-accent" />}
                   </button>
                 ))}
                 <p className="text-[9px] text-my-accent font-bold italic">
                   Requirement: Select {Math.max(0, 2 - subscribedCategories.length)} more vector(s)
                 </p>
              </div>
            )}

            <div className="flex items-center justify-between">
               <button 
                 onClick={handleSkip}
                 className="text-[10px] font-bold text-my-muted hover:text-my-ink uppercase tracking-widest transition-colors"
               >
                  Skip
               </button>

               <div className="flex items-center gap-3">
                  {currentStepIdx > 0 && (
                    <button 
                      onClick={handlePrev}
                      className="p-3 text-my-muted hover:text-my-ink transition-colors"
                    >
                       <ChevronLeft size={20} />
                    </button>
                  )}
                  
                  {!currentStep?.isActionGated ? (
                    <button 
                      onClick={handleNext}
                      disabled={currentStep?.id === 'categories' && subscribedCategories.length < 2}
                      className="group px-8 py-3 bg-my-ink text-white dark:bg-my-accent dark:text-black text-[10px] font-black uppercase tracking-[0.3em] flex items-center gap-3 hover:scale-105 active:scale-95 transition-all shadow-xl disabled:opacity-30 disabled:pointer-events-none"
                    >
                       {currentStep?.actionLabel || (currentStepIdx === steps.length - 1 ? "Initialize" : "Proceed")}
                       <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
                    </button>
                  ) : (
                    <div className="px-8 py-3 bg-my-accent/10 border border-my-accent/30 text-my-accent text-[8px] font-black uppercase tracking-[0.2em] animate-pulse">
                       Awaiting Analyst Action...
                    </div>
                  )}
               </div>
            </div>

            <div className="absolute bottom-0 left-0 right-0 h-1 bg-my-border">
               <motion.div 
                 className="h-full bg-my-accent"
                 initial={{ width: 0 }}
                 animate={{ width: `${((currentStepIdx + 1) / steps.length) * 100}%` }}
               />
            </div>
         </motion.div>
      </div>
    </div>
  );
}
