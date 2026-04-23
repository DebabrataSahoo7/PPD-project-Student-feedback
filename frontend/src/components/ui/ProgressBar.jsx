import clsx from 'clsx';

const COLORS = {
  primary: 'bg-primary',
  success: 'bg-emerald-500',
  danger:  'bg-red-500',
  warning: 'bg-amber-500',
};

export default function ProgressBar({ value = 0, color = 'primary', className }) {
  const pct = Math.min(100, Math.max(0, value));
  return (
    <div className={clsx('progress-bar-track', className)}>
      <div className={clsx('h-full rounded-full transition-all', COLORS[color])} style={{ width: `${pct}%` }} />
    </div>
  );
}
