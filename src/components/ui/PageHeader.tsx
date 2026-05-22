import React from 'react';
import clsx from 'clsx';
import { StatusDot, type StatusState } from './StatusDot';

export function PageHeader({
  icon,
  title,
  subtitle,
  status,
  statusState,
  statusLabel,
  actions,
  className,
  id,
}: {
  icon?: React.ReactNode;
  title: string;
  subtitle?: string;
  status?: React.ReactNode;
  statusState?: StatusState;
  statusLabel?: string;
  actions?: React.ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <header
      id={id}
      className={clsx(
        'px-6 py-6 md:px-12 md:py-10 border-b border-my-border bg-my-sidebar/50 backdrop-blur-md md:backdrop-blur-xl',
        className
      )}
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            {icon ? (
              <div className="p-2 bg-my-accent/10 rounded-[4px] text-my-accent">{icon}</div>
            ) : null}
            <h1 className="text-2xl font-serif font-bold italic text-my-ink tracking-tight">
              {title}
            </h1>
          </div>
          {(subtitle || status || statusLabel) && (
            <div className="flex items-center gap-4 flex-wrap">
              {subtitle ? (
                <p className="text-[11px] text-my-muted uppercase tracking-[0.2em] font-black">
                  {subtitle}
                </p>
              ) : null}
              {subtitle && (status || statusLabel) ? (
                <div className="w-1 h-1 rounded-full bg-my-border hidden sm:block" />
              ) : null}
              {status ?? (
                statusLabel ? (
                  <StatusDot state={statusState ?? 'idle'} label={statusLabel} />
                ) : null
              )}
            </div>
          )}
        </div>
        {actions ? (
          <div className="flex flex-wrap items-center gap-4">{actions}</div>
        ) : null}
      </div>
    </header>
  );
}
