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

const STAGE_HINTS: Record<number, string> = {
  1: '▸ initializing research vector',
  2: '▸ aggregating intelligence sources',
  3: '▸ cross-referencing evidence',
  4: '▸ compiling dossier',
};

/* ─── Props ─── */

interface DeepResearchLoaderProps {
  stage: number;
  progress: string;
}

/* ─── Component ─── */

export default function DeepResearchLoader({ stage, progress }: DeepResearchLoaderProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 mt-8 animate-in fade-in duration-500">
      {/* ─── Animated Orbital Scanner ─── */}
      <div className="relative flex items-center justify-center w-28 h-28 mb-8">
        {/* Outer glow pulse */}
        <motion.div
          animate={{ scale: [1, 1.15, 1], opacity: [0.15, 0.08, 0.15] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute inset-0 bg-my-accent rounded-full blur-3xl"
        />

        {/* Orbit ring 1 — outer, slow clockwise */}
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
          className="absolute inset-0 border border-my-accent/20 rounded-full"
        >
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2">
            <div
              className="w-full h-full rounded-full bg-my-accent"
              style={{ boxShadow: '0 0 10px color-mix(in srgb, var(--accent) 90%, transparent)' }}
            />
            <div className="w-4 h-4 -top-1 -left-1 absolute rounded-full bg-my-accent/20 animate-ping" />
          </div>
        </motion.div>

        {/* Orbit ring 2 — middle, dashed, counter-clockwise */}
        <motion.div
          animate={{ rotate: -360 }}
          transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
          className="absolute inset-3 border border-dashed border-my-accent/15 rounded-full"
        >
          <div className="absolute top-1/2 -right-1.5 w-1.5 h-1.5">
            <div
              className="w-full h-full rounded-full bg-my-signal"
              style={{ boxShadow: '0 0 8px color-mix(in srgb, var(--signal) 80%, transparent)' }}
            />
          </div>
        </motion.div>

        {/* Orbit ring 3 — inner, faster */}
        <motion.div
          animate={{ rotate: 480 }}
          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
          className="absolute inset-6 border border-my-accent/10 rounded-full"
        >
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-1 h-1">
            <div
              className="w-full h-full rounded-full bg-my-success"
              style={{ boxShadow: '0 0 6px color-mix(in srgb, var(--success) 80%, transparent)' }}
            />
          </div>
        </motion.div>

        {/* Scanning line sweep */}
        <div className="absolute inset-0 overflow-hidden rounded-full">
          <motion.div
            initial={{ y: '-100%' }}
            animate={{ y: '100%' }}
            transition={{ duration: 1.8, repeat: Infinity, ease: 'linear' }}
            className="w-full h-[3px] bg-gradient-to-r from-transparent via-my-accent/80 to-transparent blur-[2px]"
          />
        </div>

        {/* Core icon */}
        <motion.div
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          className="relative z-10"
        >
          <Cpu className="w-10 h-10 text-my-accent" strokeWidth={1.5} />
        </motion.div>
      </div>

      {/* ─── Stage Indicator — Connected Dots ─── */}
      <div className="flex items-center gap-0 mb-8">
        {[1, 2, 3, 4].map((s) => (
          <div key={s} className="flex items-center">
            <div
              className={clsx(
                'w-2 h-2 rounded-full transition-all duration-700',
                s < stage && 'bg-my-success shadow-[0_0_6px_color-mix(in_srgb,var(--success)_60%,transparent)]',
                s === stage && 'bg-my-accent shadow-[0_0_8px_color-mix(in_srgb,var(--accent)_60%,transparent)]',
                s > stage && 'bg-my-border/50',
              )}
            />
            {s < 4 && (
              <div
                className={clsx(
                  'w-10 sm:w-16 h-px transition-all duration-700',
                  s < stage ? 'bg-my-success/60' : 'bg-my-border/30',
                )}
              />
            )}
          </div>
        ))}
      </div>

      {/* ─── Stage Label ─── */}
      <div className="type-section-label text-[10px] text-my-muted mb-2 text-center">
        STAGE {stage}/4 — {STAGE_LABELS[stage]}
      </div>

      {/* ─── Progress Text with Blinking Cursor ─── */}
      <div className="flex items-center justify-center mb-6">
        <p className="text-sm font-bold tracking-[0.2em] uppercase text-my-ink text-center">
          {progress}
        </p>
        <motion.span
          animate={{ opacity: [1, 0, 1] }}
          transition={{ duration: 0.8, repeat: Infinity }}
          className="inline-block w-[2px] h-3.5 bg-my-accent ml-1.5 shrink-0"
        />
      </div>

      {/* ─── Gradient Progress Bar ─── */}
      <div className="w-64">
        <div className="relative h-1.5 w-full bg-my-border/40 rounded-full overflow-hidden">
          <motion.div
            className="absolute inset-y-0 left-0 rounded-full"
            style={{ background: 'linear-gradient(90deg, var(--accent), var(--signal))' }}
            animate={{
              width: stage === 1 ? '22%' : stage === 2 ? '42%' : stage === 3 ? '65%' : '85%',
            }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
          />
          {/* Glow overlay */}
          <motion.div
            className="absolute inset-y-0 left-0 rounded-full blur-sm"
            style={{
              background:
                'linear-gradient(90deg, transparent, color-mix(in srgb, var(--accent) 30%, transparent), transparent)',
              width: stage === 1 ? '22%' : stage === 2 ? '42%' : stage === 3 ? '65%' : '85%',
            }}
          />
        </div>

        {/* ─── Status Hint — Mono Label ─── */}
        <motion.p
          animate={{ opacity: [0.3, 0.5, 0.3] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="type-mono-label text-[8px] text-my-muted/40 text-center mt-2.5 tracking-[0.3em]"
        >
          {STAGE_HINTS[stage] || '▸ processing'}
        </motion.p>
      </div>
    </div>
  );
}
