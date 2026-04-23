/**
 * SearchInput — reusable inline search field.
 * Designed to live inside TopBar (fills the center slot) or standalone.
 */
export default function SearchInput({ value, onChange, placeholder = 'Search...', className = '' }) {
  return (
    <div className={`relative w-full max-w-[42rem] ${className}`}>
      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 material-symbols-outlined text-on-surface-muted text-[18px] pointer-events-none">
        search
      </span>
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        style={{ backgroundColor: '#f0f4f9' }}
        className="h-10 w-full border border-border-subtle rounded-full pl-10 pr-10 text-sm text-on-surface placeholder:text-on-surface-muted focus:outline-none focus:ring-2 focus:ring-primary/15 focus:border-primary/40 focus:bg-surface-card transition-all"
      />
      {value && (
        <button type="button" onClick={() => onChange('')}
          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-on-surface-muted hover:text-on-surface transition-colors">
          <span className="material-symbols-outlined text-[16px]">close</span>
        </button>
      )}
    </div>
  );
}
