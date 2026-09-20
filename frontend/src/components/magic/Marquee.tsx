'use client';

/**
 * Magic UI — Marquee (dependency-free port).
 * Seamless CSS loop, edge-faded, pauses on hover.
 */
export function Marquee({
  items,
  className = '',
}: {
  items: string[];
  className?: string;
}) {
  if (items.length === 0) return null;
  const row = [...items, ...items];
  return (
    <div className={`marquee ${className}`}>
      <div className="marquee-track">
        {row.map((t, i) => (
          <span key={i} className="marquee-item">
            <span className="marquee-star">✦</span>
            {t}
          </span>
        ))}
      </div>
    </div>
  );
}
