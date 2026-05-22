/**
 * COGNAPSE brand class recipes — keep in sync with brand/tokens.json and src/index.css
 */
export const brandClasses = {
  panel: 'border border-my-border bg-my-callout rounded-[4px] p-4',
  panelFlush: 'border border-my-border bg-my-callout/30 rounded-[4px]',
  sectionLabel:
    'text-[10px] font-black uppercase tracking-[0.3em] text-my-muted',
  controlLabel:
    'text-[9px] font-black uppercase tracking-widest text-my-muted',
  meta: 'text-[9px] font-bold uppercase tracking-widest text-my-muted',
  synthesis: 'text-sm leading-relaxed text-my-syn',
  displayTitle: 'font-serif font-bold italic tracking-tight text-my-ink',
  reportTitle: 'font-serif text-[32px] leading-[1.1] text-my-ink',
  hairline: 'border-b border-my-border',
  signalGlow: 'shadow-[0_0_20px_rgba(var(--signal-rgb),0.15)]',
  accentGlow: 'shadow-[0_0_20px_rgba(var(--accent-rgb),0.12)]',
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
  'inline-flex items-center justify-center gap-2 px-4 py-2 text-[9px] font-black uppercase tracking-widest transition-all disabled:opacity-50 disabled:cursor-not-allowed rounded-[2px]';

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
  'border border-my-border bg-my-sidebar/30 rounded-[4px] transition-colors';

export const navHeight = 'h-14';
