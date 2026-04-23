import clsx from 'clsx';

const VARIANTS = {
  primary:   'btn-primary',
  secondary: 'btn-secondary',
  ghost:     'btn-ghost',
  danger:    'btn-danger',
  dark:      'btn bg-slate-800 text-white hover:bg-slate-700 focus:ring-slate-400 active:scale-[0.98]',
};

export default function Button({
  children,
  variant = 'primary',
  className,
  loading = false,
  icon,
  full = false,
  type = 'button',
  ...props
}) {
  return (
    <button
      type={type}
      className={clsx(
        VARIANTS[variant] ?? VARIANTS.primary,
        full && 'w-full',
        className
      )}
      disabled={loading || props.disabled}
      {...props}
    >
      {loading ? (
        <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
      ) : (
        <>
          {icon && <span className="material-symbols-outlined text-[18px]">{icon}</span>}
          {children}
        </>
      )}
    </button>
  );
}
