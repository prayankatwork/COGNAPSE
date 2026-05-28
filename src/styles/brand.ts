/**
 * COGNAPSE brand class recipes — keep in sync with brand/tokens.json and src/index.css
 */
export const brandClasses = {
  panel: 'border border-my-border bg-my-callout/90 backdrop-blur-md md:backdrop-blur-xl rounded-[6px] p-4',
  panelFlush: 'border border-my-border bg-my-callout/30 backdrop-blur-md md:backdrop-blur-xl rounded-[6px]',
  /* Use type-section-label class for prominent panel headers */
  sectionLabel:
    'text-[10px] font-black uppercase tracking-[0.3em] text-my-muted',
  /* Use type-label for form/meta labels */
  controlLabel:
    'text-xs font-black uppercase tracking-widest text-my-muted',
  meta: 'text-xs font-bold uppercase tracking-widest text-my-muted',
  synthesis: 'text-sm leading-[1.7] text-my-syn',
  displayTitle: 'type-page-title text-my-ink',
  reportTitle: 'type-page-title text-[32px] md:text-[40px] text-my-ink',
  bodyCopy: 'text-base leading-body text-my-syn max-w-[65ch]',
  bodyCaption: 'text-sm leading-caption text-my-muted',
  hairline: 'border-b border-my-border',
  readingProse: 'text-base leading-body text-my-syn space-y-[1.25em]',
  signalGlow: 'shadow-[0_0_20px_rgba(var(--signal-rgb),0.15)]',
  accentGlow: 'shadow-[0_0_20px_rgba(var(--accent-rgb),0.12)]',

  /* Readability-optimised paragraph */
  para: 'mb-[1.25em] leading-body text-my-syn',
} as const;

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'signal' | 'danger';

export const buttonVariants: Record<ButtonVariant, string> = {
  primary:
    'bg-my-ink text-white dark:bg-my-accent dark:text-black border border-transparent hover:opacity-90',
  secondary:
    'bg-transparent border border-my-border text-my-ink hover:border-my-accent/50',
  ghost:
    'bg-transparent border border-transparent text-my-muted hover:text-my-accent',
  signal:
    'bg-my-signal text-white border border-my-signal/80 hover:opacity-90',
  danger:
    'bg-transparent border border-red-500/30 text-red-500 hover:bg-red-500/10',
};

export const buttonBase =
  'inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-black uppercase tracking-widest transition-all disabled:opacity-50 disabled:cursor-not-allowed rounded-[4px] leading-none';

/** Chart / canvas fills — read from CSS variables at runtime when possible */
export const chartColors = {
  signal: 'var(--signal)',
  accent: 'var(--accent)',
  ink: 'var(--ink)',
  muted: 'var(--muted)',
};

/** Semantic status chips — use instead of amber/orange Tailwind */
export const semanticClasses = {
  conflict:
    'text-my-conflict-text bg-my-conflict-bg border-my-conflict-border',
  warning:
    'text-my-conflict-text bg-my-conflict-bg border-my-conflict-border',
  success: 'text-green-600 dark:text-green-400 bg-green-500/10 border-green-500/20',
  signal: 'text-my-signal bg-my-signal/10 border-my-signal/20',
  premium: 'text-my-signal dark:text-my-accent',
} as const;

export const surfaceCard =
  'border border-my-border bg-my-sidebar/30 backdrop-blur-md md:backdrop-blur-xl rounded-[6px] transition-all';

export const navHeight = 'h-14';
