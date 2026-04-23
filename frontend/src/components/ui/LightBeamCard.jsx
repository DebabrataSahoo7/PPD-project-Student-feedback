import { clsx } from 'clsx';

/**
 * LightBeamCard — animated rotating border card.
 *
 * Technique: the outer wrapper IS the beam (conic-gradient background).
 * The inner div sits on top with 1.5px padding gap, creating the border effect.
 * No z-index tricks needed — the beam is literally the background of the wrapper.
 */
export default function LightBeamCard({
  children,
  onClick,
  disabled = false,
  className,
  gradientColors = ['#4F46E5', '#818CF8', '#4F46E5'],
}) {
  const gradient = `conic-gradient(
    from var(--lb-angle),
    transparent 0%,
    ${gradientColors[0]} 25%,
    ${gradientColors[1]} 50%,
    transparent 75%
  )`;

  return (
    <>
      <style>{`
        @property --lb-angle {
          syntax: "<angle>";
          initial-value: 0deg;
          inherits: false;
        }
        @keyframes lb-spin {
          to { --lb-angle: 360deg; }
        }
        .lb-outer {
          animation: lb-spin 2.4s linear infinite;
        }
        .lb-outer:hover  { transform: translateY(-2px); }
        .lb-outer:active { transform: scale(0.97); }
      `}</style>

      {/*
       * Outer button = the spinning beam background
       * Inner div    = white card surface with 1.5px gap (the "border" width)
       */}
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className={clsx(
          'lb-outer',
          'relative p-[1.5px] rounded-xl',
          'transition-transform duration-200',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
          'disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none',
          className,
        )}
        style={{ background: gradient }}
      >
        {/* Card surface */}
        <div className="relative w-full h-full rounded-[10px] bg-surface-card flex items-center justify-center">
          {children}
        </div>
      </button>
    </>
  );
}
