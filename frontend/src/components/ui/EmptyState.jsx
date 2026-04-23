export default function EmptyState({ icon = 'inbox', title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center space-y-3">
      <div className="w-12 h-12 rounded-xl bg-surface-variant flex items-center justify-center">
        <span className="material-symbols-outlined text-on-surface-muted text-2xl">{icon}</span>
      </div>
      <div>
        <p className="font-semibold text-on-surface-variant text-sm">{title}</p>
        {description && <p className="text-on-surface-muted text-xs mt-1 max-w-[240px] mx-auto">{description}</p>}
      </div>
      {action}
    </div>
  );
}
