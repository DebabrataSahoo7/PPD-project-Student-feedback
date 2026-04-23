import clsx from 'clsx';

export default function Input({ label, id, error, className, ...props }) {
  return (
    <div className="space-y-1.5">
      {label && (
        <label htmlFor={id} className="block text-sm font-medium text-on-surface-variant">
          {label}
        </label>
      )}
      <input
        id={id}
        className={clsx('field-input', error && 'border-red-300 focus:border-red-400 focus:ring-red-200', className)}
        {...props}
      />
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
