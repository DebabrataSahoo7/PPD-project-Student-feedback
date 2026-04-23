import { useState } from 'react';

/**
 * PressButton — a tactile "physical press" button.
 *
 * Colors come from CSS variables so dark mode just flips the vars.
 * No hardcoded hex values here.
 *
 * Props:
 *   type        — button type (default: 'button')
 *   onClick     — click handler
 *   disabled    — disabled state
 *   loading     — shows spinner + "loading" text
 *   loadingText — text while loading (default: 'Please wait...')
 *   full        — full width (default: true)
 *   className   — extra classes
 *   children    — button label
 */
export default function PressButton({
  type       = 'button',
  onClick,
  disabled   = false,
  loading    = false,
  loadingText = 'Please wait...',
  full       = true,
  className  = '',
  children,
}) {
  const [pressed, setPressed] = useState(false);

  const isDown = pressed && !disabled && !loading;

  const press   = () => { if (!disabled && !loading) setPressed(true); };
  const release = () => setPressed(false);

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`
        ${full ? 'w-full' : ''}
        h-14 rounded-[10px] text-base font-bold text-white
        transition-all duration-100 ease-out
        disabled:opacity-60 disabled:cursor-not-allowed
        ${className}
      `}
      style={{
        background:  'var(--color-accent)',
        boxShadow:   isDown
          ? '0 4px 0 var(--color-accent-shadow), 0 8px 10px var(--color-accent-glow)'
          : '0 8px 0 var(--color-accent-shadow), 0 14px 20px var(--color-accent-glow)',
        transform:   isDown ? 'translateY(4px)' : 'translateY(0)',
      }}
      onMouseDown={press}
      onMouseUp={release}
      onMouseLeave={release}
      onTouchStart={press}
      onTouchEnd={release}
      onTouchCancel={release}
    >
      {loading ? (
        <span className="flex items-center justify-center gap-2">
          <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          {loadingText}
        </span>
      ) : children}
    </button>
  );
}
