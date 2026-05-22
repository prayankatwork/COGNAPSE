import React from 'react';
import clsx from 'clsx';
import { brandClasses } from '../../styles/brand';

export function MetaLabel({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <span className={clsx(brandClasses.meta, className)}>{children}</span>;
}
