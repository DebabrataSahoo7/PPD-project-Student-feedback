import clsx from 'clsx';

export default function GlassCard({ children, className, onClick, ...props }) {
  return (
    <div
      className={clsx(
        'card',
        onClick && 'cursor-pointer hover:shadow-elevated active:scale-[0.99] transition-all',
        className
      )}
      onClick={onClick}
      {...props}
    >
      {children}
    </div>
  );
}
