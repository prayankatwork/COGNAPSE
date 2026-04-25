import React, { useEffect, useState } from 'react';
import { useStore, ReasoningStep } from '../store';
import { Play, SkipForward, CheckCircle2, XCircle, AlertCircle, Cpu } from 'lucide-react';
import clsx from 'clsx';

export default function ThoughtReplayEngine() {
  const deepResearchState = useStore((state) => state.deepResearch);
  const reasoningTimeline = deepResearchState?.reasoningTimeline || [];
  const [activeIndex, setActiveIndex] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    let interval: any;
    if (isPlaying && activeIndex < reasoningTimeline.length - 1) {
      interval = setInterval(() => {
        setActiveIndex(prev => prev + 1);
      }, 1200);
    } else if (activeIndex >= reasoningTimeline.length - 1) {
      setIsPlaying(false);
    }
    return () => clearInterval(interval);
  }, [isPlaying, activeIndex, reasoningTimeline.length]);

  const currentSteps = reasoningTimeline.slice(0, activeIndex + 1);

  if (reasoningTimeline.length === 0) {
    return (
      <div className="mt-8 p-6 border border-dashed border-my-border bg-black/5 rounded-[4px] font-mono">
        <div className="flex items-center gap-3 opacity-50">
          <Cpu className="text-my-muted" size={18} />
          <h3 className="text-xs font-bold uppercase tracking-[0.3em] text-my-muted">
            Cognition Replay Engine: Standby
          </h3>
        </div>
        <p className="mt-4 text-[10px] text-my-muted leading-relaxed uppercase tracking-widest">
          Traceability data not found for this session. Initiate a new investigative cycle to capture reasoning forensics.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-8 p-6 border border-my-border bg-my-callout shadow-sm overflow-hidden font-mono">
      <div className="flex items-center justify-between mb-8 pb-4 border-b border-my-border">
        <div className="flex items-center gap-3">
          <Cpu className="text-my-accent animate-pulse" size={18} />
          <h3 className="text-xs font-bold uppercase tracking-[0.3em] text-my-ink">
            Cognition Replay Engine
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              if (activeIndex >= reasoningTimeline.length - 1) setActiveIndex(-1);
              setIsPlaying(!isPlaying);
            }}
            className="p-2 hover:bg-black/5 rounded-full transition-colors text-my-accent"
          >
            <Play size={16} className={clsx(isPlaying && "fill-current")} />
          </button>
          <button
            onClick={() => setActiveIndex(reasoningTimeline.length - 1)}
            className="p-2 hover:bg-black/5 rounded-full transition-colors text-my-muted"
          >
            <SkipForward size={16} />
          </button>
        </div>
      </div>

      <div className="space-y-6 max-h-[400px] overflow-y-auto pr-4 scrollbar-hide">
        {currentSteps.length === 0 && (
          <div className="text-[10px] text-my-muted italic animate-pulse">
            Ready for sequence playback. Press play to begin forensic reconstruction...
          </div>
        )}
        
        {currentSteps.map((step, idx) => (
          <div 
            key={step.id} 
            className="animate-in fade-in slide-in-from-left-4 duration-500 flex gap-4"
          >
            <div className="flex flex-col items-center gap-1 mt-1">
              <div className={clsx(
                "w-2 h-2 rounded-full",
                step.status === 'confirmed' ? "bg-green-500 shadow-[0_0_4px_#22c55e]" :
                step.status === 'discarded' ? "bg-red-500 shadow-[0_0_4px_#ef4444]" :
                "bg-amber-500 shadow-[0_0_4px_#f59e0b]"
              )} />
              {idx < currentSteps.length - 1 && <div className="w-[1px] h-full bg-my-border" />}
            </div>
            
            <div className="flex-1 pb-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[9px] font-black uppercase text-my-accent tracking-widest">
                  {step.stage}
                </span>
                <span className="text-[8px] text-my-muted">
                  {new Date(step.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </span>
              </div>
              <div className="text-[11px] font-bold text-my-ink mb-1 leading-tight">
                {step.action}
              </div>
              <div className="text-[10px] text-my-muted leading-relaxed italic border-l-2 border-my-accent/30 pl-3 py-1 bg-black/[0.02]">
                "{step.insight}"
              </div>
              <div className="mt-2 flex items-center gap-2">
                {step.status === 'confirmed' && <CheckCircle2 size={10} className="text-green-500" />}
                {step.status === 'discarded' && <XCircle size={10} className="text-red-500" />}
                {step.status === 'pivoted' && <AlertCircle size={10} className="text-amber-500" />}
                <span className="text-[8px] uppercase tracking-tighter font-black opacity-50">
                  Status: {step.status}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
