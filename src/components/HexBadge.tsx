import type { ReactNode } from 'react';

type HexBadgeProps = {
  children?: ReactNode;
  label: string;
  variant?: 'forest' | 'brass' | 'muted' | 'outline';
  onClick?: () => void;
  className?: string;
};

export function HexBadge({ children, label, variant = 'outline', onClick, className = '' }: HexBadgeProps) {
  const contents = <>
    <svg viewBox="0 0 40 44" aria-hidden="true"><path d="M20 1 39 11.5v21L20 43 1 32.5v-21Z" /></svg>
    <span className="hex-badge-content">{children}</span>
  </>;
  const classes = `hex-badge hex-badge--${variant} ${className}`;
  return onClick
    ? <button type="button" className={classes} aria-label={label} title={label} onClick={onClick}>{contents}</button>
    : <span className={classes} role="img" aria-label={label}>{contents}</span>;
}
