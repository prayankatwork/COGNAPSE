import React from 'react';
import clsx from 'clsx';
import { surfaceCard } from '../../styles/brand';

export function Card({
  children,
  className,
  interactive = false,
  onClick,
}: {
  children: React.ReactNode;
  className?: string;
  interactive?: boolean;
  onClick?: () => void;
}) {
  const Comp = onClick ? 'button' : 'div';
  return (
    <Comp
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={clsx(
        surfaceCard,
        interactive && 'hover:border-my-accent/50 hover:shadow-accent text-left w-full',
        className
      )}
    >
      {children}
    </Comp>
  );
}
