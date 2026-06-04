import React from 'react';
import clsx from 'clsx';

export type StatusState = 'live' | 'syncing' | 'error' | 'idle';

const dotClass: Record<StatusState, string> = {
  live: 'bg-green-500',
  syncing: 'bg-my-accent animate-pulse',
  error: 'bg-red-500',
  idle: 'bg-my-border',
};

export function StatusDot({
  state,
  label,
  className,
}: {
  state: StatusState;
  label?: string;
  className?: string;
}) {
  return (
    <div className={clsx('flex items-center gap-2', className)}>
      <div className={clsx('w-1.5 h-1.5 rounded-full shrink-0', dotClass[state])} />
      {label ? (
        <span
          className={clsx(
            'text-[9px] font-bold uppercase tracking-widest',
            state === 'error' ? 'ds-text-danger/80' : 'text-my-muted'
          )}
        >
          {label}
        </span>
      ) : null}
    </div>
  );
}
