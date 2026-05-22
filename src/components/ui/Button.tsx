import React from 'react';
import clsx from 'clsx';
import { buttonBase, buttonVariants, type ButtonVariant } from '../../styles/brand';

export function Button({
  children,
  variant = 'primary',
  className,
  icon,
  disabled,
  type = 'button',
  onClick,
}: {
  children: React.ReactNode;
  variant?: ButtonVariant;
  className?: string;
  icon?: React.ReactNode;
  disabled?: boolean;
  type?: 'button' | 'submit';
  onClick?: () => void;
}) {
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={clsx(buttonBase, buttonVariants[variant], className)}
    >
      {icon}
      {children}
    </button>
  );
}
