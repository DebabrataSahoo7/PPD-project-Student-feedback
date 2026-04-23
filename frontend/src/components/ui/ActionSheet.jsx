import { useEffect } from 'react';

/**
 * iOS-style action sheet that slides up from the bottom.
 * @param {boolean} open - Whether the sheet is visible.
 * @param {function} onClose - Called when user taps the scrim or cancel.
 * @param {string} title - The title shown in the header of the sheet.
 * @param {string} subtitle - Optional subtitle (e.g. form name).
 * @param {Array}  actions - Array of { label, icon, variant, onClick } objects.
 *                           variant: 'default' | 'danger'
 */
export default function ActionSheet({ open, onClose, title, subtitle, actions = [] }) {
  // Prevent body scroll when open
  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  return (
    <>
      {/* Scrim */}
      <div
        className={`fixed inset-0 z-[60] bg-slate-900/40 transition-opacity duration-300 ${open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />

      {/* Sheet */}
      <div
        className={`fixed bottom-0 left-0 right-0 z-[70] transition-transform duration-300 ease-out ${open ? 'translate-y-0' : 'translate-y-full'}`}
      >
        <div className="bg-surface-card rounded-t-3xl shadow-2xl max-w-lg mx-auto">

          {/* Drag pill */}
          <div className="flex justify-center pt-3 pb-1">
            <div className="w-10 h-1 rounded-full bg-border" />
          </div>

          {/* Header */}
          {(title || subtitle) && (
            <div className="px-6 pt-3 pb-4 text-center border-b border-border-subtle">
              {title && <p className="text-xs font-semibold text-on-surface-muted uppercase tracking-wider mb-1">{title}</p>}
              {subtitle && <p className="font-semibold text-on-surface text-sm truncate">{subtitle}</p>}
            </div>
          )}

          {/* Actions */}
          <div className="px-4 pt-2 pb-2 space-y-1">
            {actions.map((action, i) => (
              <button
                key={i}
                onClick={() => { action.onClick(); onClose(); }}
                className={`w-full flex items-center gap-4 px-4 py-4 rounded-2xl transition-colors text-left font-semibold text-sm active:scale-[0.98]
                  ${action.variant === 'danger'
                    ? 'text-red-600 hover:bg-red-50'
                    : 'text-on-surface hover:bg-surface'
                  }`}
              >
                {action.icon && (
                  <span className={`material-symbols-outlined text-[20px] ${action.variant === 'danger' ? 'text-red-500' : 'text-on-surface-variant'}`}>
                    {action.icon}
                  </span>
                )}
                {action.label}
              </button>
            ))}
          </div>

          {/* Cancel — pb-24 clears the mobile bottom nav; md:pb-8 on desktop where the nav is hidden */}
          <div className="px-4 pt-1 pb-8 md:pb-8">
            <button
              onClick={onClose}
              className="w-full py-4 rounded-2xl bg-surface-variant text-on-surface-variant font-bold text-sm hover:bg-surface-variant active:scale-[0.98] transition-all"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
