import React from 'react';
import clsx from 'clsx';
import { brandClasses } from '../../styles/brand';

export function SectionLabel({
  children,
  className,
  border = false,
}: {
  children: React.ReactNode;
  className?: string;
  border?: boolean;
}) {
  return (
    <h2
      className={clsx(
        brandClasses.sectionLabel,
        border && 'border-b border-my-border pb-1',
        className
      )}
    >
      {children}
    </h2>
  );
}
