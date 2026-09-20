'use client';

/**
 * Magic UI — Aurora Text (dependency-free port).
 * Slow champagne/prism gradient sweep for display headings.
 */
export function AuroraText({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <span className={`aurora-text ${className}`}>{children}</span>;
}
