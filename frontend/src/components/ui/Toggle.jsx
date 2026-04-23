export default function Toggle({ checked, onChange, label, description, icon }) {
  return (
    <div className="flex items-center justify-between py-3">
      <div className="flex items-center gap-3">
        {icon && (
          <div className="w-8 h-8 rounded-lg bg-surface-variant flex items-center justify-center">
            <span className="material-symbols-outlined text-on-surface-variant text-[18px]">{icon}</span>
          </div>
        )}
        <div>
          <p className="text-sm font-medium text-on-surface-variant">{label}</p>
          {description && <p className="text-xs text-on-surface-muted mt-0.5">{description}</p>}
        </div>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`w-10 h-6 rounded-full relative transition-colors ${checked ? 'bg-primary' : 'bg-surface-variant'}`}
      >
        <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow-sm transition-all ${checked ? 'right-1' : 'left-1'}`} />
      </button>
    </div>
  );
}
