import { useEffect } from 'react';
import clsx from 'clsx';

export default function Modal({ open, onClose, title, children, className }) {
  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className={clsx(
        'relative w-full max-w-md bg-surface-card rounded-xl shadow-elevated max-h-[90dvh] overflow-y-auto',
        className
      )}>
        {title && (
          <div className="flex items-center justify-between px-5 py-4 border-b border-border-subtle">
            <h3 className="font-headline font-semibold text-on-surface text-base">{title}</h3>
            <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-surface-variant transition-colors text-on-surface-muted">
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          </div>
        )}
        <div className="px-5 py-4">{children}</div>
      </div>
    </div>
  );
}
