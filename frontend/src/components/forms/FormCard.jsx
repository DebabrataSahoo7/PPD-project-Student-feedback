import { useNavigate } from 'react-router-dom';
import Badge from '../ui/Badge.jsx';

const STATUS_VARIANT = { published: 'published', draft: 'draft', closed: 'closed' };

export default function FormCard({ form, onCopy, onMore }) {
  const navigate = useNavigate();

  return (
    <div 
      className="bg-surface-card border border-border rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow cursor-pointer relative"
      onClick={() => navigate(`/admin/forms/${form.id}`)}
    >
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${form.mode === 'academic' ? 'bg-indigo-50 text-indigo-600' : 'bg-surface-variant text-on-surface-variant'}`}>
            <span className="material-symbols-outlined text-[20px]">{form.mode === 'academic' ? 'school' : 'description'}</span>
          </div>
          <div>
            <h3 className="font-headline font-bold text-base text-on-surface leading-tight mb-0.5">{form.title}</h3>
            {form.subtitle && <p className="text-on-surface-variant text-xs font-medium">{form.subtitle}</p>}
          </div>
        </div>
        
        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          <Badge variant={STATUS_VARIANT[form.status] ?? 'default'}>{form.status}</Badge>
          
          <div className="flex items-center bg-surface rounded-lg ml-2 border border-border-subtle">
            {onCopy && (
              <button
                onClick={onCopy}
                className="w-8 h-8 flex items-center justify-center text-on-surface-muted hover:text-on-surface hover:bg-surface-variant transition-colors rounded-l-lg"
              >
                <span className="material-symbols-outlined text-[18px]">content_copy</span>
              </button>
            )}
            {onMore && (
              <button
                onClick={onMore}
                className={`w-8 h-8 flex items-center justify-center text-on-surface-muted hover:text-on-surface hover:bg-surface-variant transition-colors ${onCopy ? 'rounded-r-lg border-l border-border' : 'rounded-lg'}`}
              >
                <span className="material-symbols-outlined text-[18px]">more_vert</span>
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="pt-4 mt-2 border-t border-border-subtle flex justify-between items-center text-on-surface-variant">
        <div className="flex items-center gap-1.5">
          <span className="material-symbols-outlined text-[16px]">groups</span>
          <span className="text-xs font-semibold">{form.response_count ?? 0} responses</span>
        </div>
        {(form.starts_at || form.ends_at) && (
          <div className="flex items-center gap-1.5 opacity-80">
            <span className="material-symbols-outlined text-[16px]">calendar_today</span>
            <span className="text-[11px] font-semibold tracking-tight">
              {form.starts_at ? new Date(form.starts_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '—'}
              {' – '}
              {form.ends_at ? new Date(form.ends_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '—'}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
