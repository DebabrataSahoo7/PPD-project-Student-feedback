import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../lib/api.js';
import PageLayout from '../../components/layout/PageLayout.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import { FullPageSpinner } from '../../components/ui/Spinner.jsx';

export default function FacultyAnalyticsPage() {
  const navigate = useNavigate();
  const [forms,   setForms]   = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/forms?status=published').then(r => setForms(r.data.data)).finally(() => setLoading(false));
  }, []);

  if (loading) return <FullPageSpinner />;

  return (
    <PageLayout title="Analytics">
      <div className="space-y-3">
        {forms.length === 0 ? (
          <EmptyState icon="analytics" title="No published forms" description="Published forms linked to your subjects will appear here." />
        ) : forms.map(f => (
          <button key={f.id} type="button" onClick={() => navigate(`/admin/forms/${f.id}/analytics`)}
            className="w-full card p-4 flex items-center gap-3 hover:shadow-elevated active:scale-[0.99] transition-all text-left">
            <div className="w-9 h-9 rounded-lg bg-surface-variant text-on-surface-variant flex items-center justify-center flex-shrink-0">
              <span className="material-symbols-outlined text-[18px]">bar_chart</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-on-surface truncate">{f.title}</p>
              <p className="text-xs text-on-surface-muted mt-0.5">{f.response_count ?? 0} responses</p>
            </div>
            <span className="material-symbols-outlined text-on-surface-muted text-[20px]">chevron_right</span>
          </button>
        ))}
      </div>
    </PageLayout>
  );
}
