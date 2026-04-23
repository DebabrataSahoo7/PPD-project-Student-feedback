import clsx from 'clsx';

/**
 * Floating Action Button — sits above the bottom nav.
 */
export default function FAB({ onClick, icon = 'add', label, className }) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        'fixed bottom-28 right-6 z-40 bg-primary text-white flex items-center gap-2 px-6 py-4 rounded-2xl font-headline font-bold shadow-lg shadow-primary/30 active:scale-95 transition-all',
        className
      )}
    >
      <span className="material-symbols-outlined">{icon}</span>
      {label && <span>{label}</span>}
    </button>
  );
}
