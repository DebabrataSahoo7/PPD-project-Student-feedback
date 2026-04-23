import { clsx } from 'clsx';

/**
 * LightBeamCard
 *
 * Adapted from LightBeamButton for a LIGHT-THEMED card surface.
 * Uses CSS @property + conic-gradient to simulate a rotating light-beam
 * border. Hardware-accelerated, no framer-motion needed.
 *
 * Props
 * ─────────────────────────────────────────────────────────────────────
 * children        ReactNode   Card content (icon + label)
 * onClick         () => void  Click handler
 * disabled        boolean     Disabled state
 * className       string      Extra classes for the outer wrapper
 * gradientColors  [string, string, string]
 *                             Three gradient stops for the beam.
 *                             Defaults to the app's primary color family.
 */
export default function LightBeamCard({
  children,
  onClick,
  disabled = false,
  className,
  gradientColors = ['#4F46E5', '#818CF8', '#4F46E5'], // indigo → lighter indigo
}) {
  const gradient = `conic-gradient(
    from var(--lb-angle),
    transparent 0%,
    ${gradientColors[0]} 30%,
    ${gradientColors[1]} 50%,
    transparent 70%,
    transparent 100%
  )`;

  return (
    <>
      {/* ── @property declaration — injected once per page ── */}
      <style>{`
        @property --lb-angle {
          syntax: "<angle>";
          initial-value: 0deg;
          inherits: false;
        }

        @keyframes lb-spin {
          from { --lb-angle: 0deg; }
          to   { --lb-angle: 360deg; }
        }

        /* Always spinning — visible on desktop hover AND mobile/touch */
        .lb-beam {
          animation: lb-spin 2.4s linear infinite;
        }

        .lb-wrapper:hover  { transform: translateY(-2px); }
        .lb-wrapper:active { transform: scale(0.97); }
      `}</style>

      {/*
       * Structure (same layering trick as the original):
       *
       * ┌── lb-wrapper (button, clip context) ─────────────────┐
       * │  lb-beam    ← rotating conic gradient (z = 0)        │
       * │  lb-inner   ← white fill punches out beam interior    │
       * │  lb-content ← actual card content sits above (z = 10) │
       * └──────────────────────────────────────────────────────-┘
       *
       * The 1px gap between lb-beam and lb-inner creates the
       * animated border without painting on the surface area.
       */}
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className={clsx(
          'lb-wrapper',
          'relative isolate',          /* sizing comes from className prop */
          'rounded-xl overflow-hidden',
          'transition-all duration-200',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
          'disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none',
          className,
        )}
      >
        {/* Rotating beam border */}
        <div
          className="lb-beam absolute inset-0 -z-10 rounded-xl"
          style={{ background: gradient }}
          aria-hidden
        />

        {/* White card surface — 1px inset to expose the beam as border */}
        <div
          className="lb-inner absolute inset-[1px] -z-10 rounded-[10px] bg-surface-card"
          aria-hidden
        />

        {/* Hover: soft radial glow from the top centre */}
        <div
          className="lb-glow absolute inset-0 -z-10 rounded-xl opacity-0
                     group-hover:opacity-100 transition-opacity duration-500"
          style={{
            background: 'radial-gradient(circle at 50% 0%, rgba(79,70,229,0.10) 0%, transparent 70%)',
          }}
          aria-hidden
        />

        {/* Actual content */}
        <div className="relative z-10 flex flex-col items-center justify-center gap-3 w-full h-full p-4">
          {children}
        </div>
      </button>
    </>
  );
}
