import { motion } from 'framer-motion';
import { Cpu } from 'lucide-react';
import clsx from 'clsx';

/* ─── Stage Metadata ─── */

const STAGE_LABELS: Record<number, string> = {
  1: 'Research Objective',
  2: 'Source Acquisition',
  3: 'Evidence Synthesis',
  4: 'Report Finalization',
};

/* ─── Props ─── */

interface DeepResearchLoaderProps {
  stage: number;
  progress: string;
}

/* ─── Component ─── */

export default function DeepResearchLoader({ stage, progress }: DeepResearchLoaderProps) {
  return (
    <div className="sticky top-0 left-0 right-0 z-20 bg-my-accent text-my-bg animate-in slide-in-from-top duration-500">
      <div className="max-w-4xl mx-auto px-8 py-2.5 flex items-center justify-between gap-4">
        {/* Left: Compact orbital icon + stage label */}
        <div className="flex items-center gap-3 min-w-0">
          {/* Compact orbital indicator */}
          <div className="relative w-7 h-7 shrink-0 flex items-center justify-center">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
              className="absolute inset-0 border border-my-bg/25 rounded-full"
            >
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1 h-1 rounded-full bg-my-bg/80" />
            </motion.div>
            <motion.div
              animate={{ rotate: -360 }}
              transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
              className="absolute inset-[3px] border border-dashed border-my-bg/15 rounded-full"
            />
            {/* Scanning line */}
            <div className="absolute inset-0 overflow-hidden rounded-full">
              <motion.div
                initial={{ y: '-100%' }}
                animate={{ y: '100%' }}
                transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
                className="w-full h-[2px] bg-gradient-to-r from-transparent via-my-bg/60 to-transparent blur-[1px]"
              />
            </div>
            <Cpu size={11} className="relative z-10 text-my-bg" strokeWidth={1.5} />
          </div>

          <div className="min-w-0">
            <div className="text-[9px] font-black uppercase tracking-[0.25em] text-my-bg/60">
              STAGE {stage}/4 — {STAGE_LABELS[stage]}
            </div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-[11px] font-bold tracking-wider uppercase truncate">
                {progress}
              </span>
              <motion.span
                animate={{ opacity: [1, 0, 1] }}
                transition={{ duration: 0.8, repeat: Infinity }}
                className="inline-block w-[1.5px] h-2.5 bg-my-bg shrink-0"
              />
            </div>
          </div>
        </div>

        {/* Right: Stage dots + mini progress bar */}
        <div className="flex items-center gap-3 shrink-0">
          {/* Stage dots */}
          <div className="flex items-center gap-1.5">
            {[1, 2, 3, 4].map((s) => (
              <div key={s} className="flex items-center gap-1.5">
                <div
                  className={clsx(
                    'w-1.5 h-1.5 rounded-full transition-all duration-500',
                    s <= stage
                      ? 'bg-my-bg shadow-[0_0_6px_rgba(255,255,255,0.3)]'
                      : 'bg-my-bg/30',
                  )}
                />
              </div>
            ))}
          </div>

          {/* Mini progress bar */}
          <div className="hidden sm:block w-16">
            <div className="h-1 w-full bg-my-bg/20 rounded-full overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-my-bg"
                animate={{
                  width: stage === 1 ? '22%' : stage === 2 ? '42%' : stage === 3 ? '65%' : '85%',
                }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
