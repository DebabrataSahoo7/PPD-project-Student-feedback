import { useNavigate } from 'react-router-dom';
import Badge from '../ui/Badge.jsx';

const STATUS_VARIANT = { published: 'published', draft: 'draft', closed: 'closed' };

export default function FormCard({ form, onCopy, onMore }) {
  const navigate = useNavigate();

  return (
    <div
      className="bg-surface-card border border-border rounded-2xl shadow-sm hover:shadow-md transition-shadow cursor-pointer"
      onClick={() => navigate(`/admin/forms/${form.id}`)}
    >
      {/* ── Top: icon + title — full width, no competition ── */}
      <div className="flex items-center gap-3 px-4 pt-4 pb-3">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
          form.mode === 'academic' ? 'bg-indigo-50 text-indigo-600' : 'bg-surface-variant text-on-surface-variant'
        }`}>
          <span className="material-symbols-outlined text-[18px]">
            {form.mode === 'academic' ? 'school' : 'description'}
          </span>
        </div>
        <h3 className="font-headline font-bold text-sm text-on-surface leading-snug flex-1 min-w-0">
          {form.title}
        </h3>
      </div>

      {/* ── Footer: responses · badge · actions ── */}
      <div
        className="border-t border-border-subtle px-4 py-2.5 flex items-center gap-2"
        onClick={e => e.stopPropagation()}
      >
        {/* Response count */}
        <div className="flex items-center gap-1 text-on-surface-muted flex-1 min-w-0">
          <span className="material-symbols-outlined text-[14px]">groups</span>
          <span className="text-xs font-semibold">{form.response_count ?? 0} responses</span>
        </div>

        {/* Date range if set */}
        {(form.starts_at || form.ends_at) && (
          <span className="text-[10px] font-semibold text-on-surface-muted hidden sm:block">
            {form.starts_at ? new Date(form.starts_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '—'}
            {' – '}
            {form.ends_at ? new Date(form.ends_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '—'}
          </span>
        )}

        {/* Status badge */}
        <Badge variant={STATUS_VARIANT[form.status] ?? 'default'}>{form.status}</Badge>

        {/* Copy + more actions */}
        <div className="flex items-center rounded-lg border border-border-subtle bg-surface overflow-hidden flex-shrink-0">
          {onCopy && (
            <button
              type="button"
              onClick={onCopy}
              className="w-7 h-7 flex items-center justify-center text-on-surface-muted hover:text-on-surface hover:bg-surface-variant transition-colors"
              aria-label="Copy share link"
            >
              <span className="material-symbols-outlined text-[16px]">content_copy</span>
            </button>
          )}
          {onMore && (
            <button
              type="button"
              onClick={onMore}
              className={`w-7 h-7 flex items-center justify-center text-on-surface-muted hover:text-on-surface hover:bg-surface-variant transition-colors ${onCopy ? 'border-l border-border-subtle' : ''}`}
              aria-label="More options"
            >
              <span className="material-symbols-outlined text-[16px]">more_vert</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
