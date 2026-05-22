import React from 'react';
import clsx from 'clsx';
import { brandClasses } from '../../styles/brand';

export function Panel({
  children,
  className,
  padding = true,
}: {
  children: React.ReactNode;
  className?: string;
  padding?: boolean;
}) {
  return (
    <section
      className={clsx(
        padding ? brandClasses.panel : brandClasses.panelFlush,
        className
      )}
    >
      {children}
    </section>
  );
}
