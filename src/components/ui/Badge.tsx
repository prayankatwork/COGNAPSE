import React from 'react';
import clsx from 'clsx';
import { semanticClasses } from '../../styles/brand';

type BadgeVariant = 'default' | 'accent' | 'signal' | 'conflict' | 'success' | 'premium';

const variants: Record<BadgeVariant, string> = {
  default: 'text-my-muted bg-my-callout border-my-border',
  accent: 'text-my-accent bg-my-accent/10 border-my-accent/30',
  signal: semanticClasses.signal,
  conflict: semanticClasses.conflict,
  success: semanticClasses.success,
  premium: 'text-my-signal dark:text-my-accent bg-my-signal/10 dark:bg-my-accent/10 border-my-signal/20 dark:border-my-accent/30',
};

export function Badge({
  children,
  variant = 'default',
  className,
}: {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
}) {
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1 px-1.5 py-0.5 text-[8px] font-black uppercase tracking-widest border rounded-[4px]',
        variants[variant],
        className
      )}
    >
      {children}
    </span>
  );
}
