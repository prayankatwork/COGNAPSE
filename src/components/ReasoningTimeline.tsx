import React, { useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, CheckCircle2, AlertTriangle, RotateCcw, 
  ArrowRight, Zap, Shield, Cpu, Database
} from 'lucide-react';
import clsx from 'clsx';

export interface TimelineStep {
  id: string;
  stage: string;
  action: string;
  insight: string;
  status: 'confirmed' | 'discarded' | 'pivoted';
  timestamp: string;
}

interface ReasoningTimelineProps {
  steps: TimelineStep[];
  isRunning?: boolean;
}

function getStepIcon(status: string) {
  switch (status) {
    case 'confirmed': return <CheckCircle2 size={12} className="text-green-500" />;
    case 'pivoted': return <RotateCcw size={12} className="text-amber-500" />;
    case 'discarded': return <AlertTriangle size={12} className="text-red-500" />;
    default: return <Cpu size={12} className="text-my-accent animate-pulse" />;
  }
}

function getStageIcon(stage: string) {
  const lower = stage.toLowerCase();
  if (lower.includes('retrieval') || lower.includes('source') || lower.includes('search')) {
    return <Search size={10} />;
  }
  if (lower.includes('synthesis') || lower.includes('final') || lower.includes('structur')) {
    return <Zap size={10} />;
  }
  if (lower.includes('verif') || lower.includes('valid') || lower.includes('bias') || lower.includes('contradict')) {
    return <Shield size={10} />;
  }
  return <Database size={10} />;
}

export default function ReasoningTimeline({ steps, isRunning = false }: ReasoningTimelineProps) {
  const [isExpanded, setIsExpanded] = React.useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to latest step
  useEffect(() => {
    if (isRunning && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [steps.length, isRunning]);

  if (!steps || steps.length === 0) {
    if (!isRunning) return null;
    return (
      <div className="border border-my-border bg-my-callout/50 p-4">
        <div className="flex items-center gap-2 mb-3">
          <Cpu size={12} className="text-my-accent animate-pulse" />
          <span className="text-[9px] font-bold uppercase tracking-widest text-my-muted animate-pulse">
            Initializing Reasoning Pipeline...
          </span>
        </div>
        <div className="flex gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-my-accent animate-bounce" style={{ animationDelay: '0ms' }} />
          <div className="w-1.5 h-1.5 rounded-full bg-my-accent animate-bounce" style={{ animationDelay: '150ms' }} />
          <div className="w-1.5 h-1.5 rounded-full bg-my-accent animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
    );
  }

  return (
    <div className="border border-my-border bg-my-callout/50">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Cpu size={14} className="text-my-accent" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-my-ink">
            Reasoning Trace
          </span>
          <span className="text-[8px] font-mono text-my-muted">
            {steps.length} steps
          </span>
          {isRunning && (
            <span className="flex gap-1 ml-2">
              <span className="w-1 h-1 rounded-full bg-my-accent animate-pulse" />
            </span>
          )}
        </div>
        <motion.div
          animate={{ rotate: isExpanded ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ArrowRight size={14} className="text-my-muted" />
        </motion.div>
      </button>

      {/* Timeline */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 max-h-80 overflow-y-auto no-scrollbar">
              {steps.map((step, idx) => (
                <motion.div
                  key={step.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05, duration: 0.2 }}
                  className="relative flex gap-3 pb-4 last:pb-0"
                >
                  {/* Timeline line */}
                  {idx < steps.length - 1 && (
                    <div className={clsx(
                      'absolute left-[11px] top-6 bottom-0 w-px',
                      step.status === 'confirmed' ? 'bg-green-500/30' :
                      step.status === 'pivoted' ? 'bg-amber-500/30' : 'bg-red-500/30'
                    )} />
                  )}

                  {/* Status icon */}
                  <div className="relative z-10 mt-0.5 shrink-0">
                    {getStepIcon(step.status)}
                  </div>

                  {/* Content */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-[8px] font-bold uppercase tracking-widest text-my-muted">
                        {step.stage}
                      </span>
                      <span className="text-[7px] font-mono text-my-muted/60">
                        {new Date(step.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-[10px] font-semibold text-my-ink mb-0.5">
                      {step.action}
                    </p>
                    <p className={clsx(
                      'text-[9px] leading-relaxed',
                      step.status === 'confirmed' ? 'text-green-700 dark:text-green-300' :
                      step.status === 'pivoted' ? 'text-amber-700 dark:text-amber-300' :
                      'text-red-700 dark:text-red-300'
                    )}>
                      {step.insight}
                    </p>

                    {/* Status badge */}
                    <span className={clsx(
                      'inline-block mt-1 text-[7px] font-bold uppercase tracking-wider px-1 py-0.5',
                      step.status === 'confirmed' ? 'text-green-600 dark:text-green-400 bg-green-500/10' :
                      step.status === 'pivoted' ? 'text-amber-600 dark:text-amber-400 bg-amber-500/10' :
                      'text-red-600 dark:text-red-400 bg-red-500/10'
                    )}>
                      {step.status === 'confirmed' ? 'Verified' : step.status === 'pivoted' ? 'Flagged' : 'Discarded'}
                    </span>
                  </div>
                </motion.div>
              ))}
              <div ref={bottomRef} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
