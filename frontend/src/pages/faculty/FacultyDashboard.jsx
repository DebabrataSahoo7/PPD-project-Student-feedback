import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../lib/api.js';
import useAuthStore from '../../store/authStore.js';
import PageLayout from '../../components/layout/PageLayout.jsx';
import ProgressBar from '../../components/ui/ProgressBar.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import { FullPageSpinner } from '../../components/ui/Spinner.jsx';

const LEVEL_CONFIG = {
  level_3: { label: 'Level 3', color: 'text-emerald-600', bg: 'bg-emerald-50', bar: 'success' },
  level_2: { label: 'Level 2', color: 'text-blue-600',    bg: 'bg-blue-50',    bar: 'primary' },
  level_1: { label: 'Level 1', color: 'text-amber-600',   bg: 'bg-amber-50',   bar: 'warning' },
  not_met:  { label: 'Not Met', color: 'text-red-600',    bg: 'bg-red-50',     bar: 'danger'  },
};

export default function FacultyDashboard() {
  const navigate = useNavigate();
  const { user }  = useAuthStore();
  const [forms,     setForms]     = useState([]);
  const [selected,  setSelected]  = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [coLoading, setCoLoading] = useState(false);

  useEffect(() => {
    api.get('/forms?status=published').then(r => {
      const data = r.data.data;
      setForms(data);
      if (data.length > 0) setSelected(data[0].id);
    }).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selected) return;
    setCoLoading(true);
    setAnalytics(null);
    api.get(`/forms/${selected}/analytics/co`)
      .then(r => setAnalytics(r.data))
      .catch(() => setAnalytics(null))
      .finally(() => setCoLoading(false));
  }, [selected]);

  if (loading) return <FullPageSpinner />;

  const subjects = analytics?.subjects ?? [];

  return (
    <PageLayout title="Home">
      <div className="space-y-5">

        {/* Greeting */}
        <div>
          <p className="text-xs text-on-surface-variant font-semibold uppercase tracking-wider">Welcome back</p>
          <h1 className="text-2xl font-bold text-on-surface font-headline mt-0.5">
            <span className="text-primary">
              {(() => {
                const raw = user?.name ?? 'Faculty';
                const stripped = raw.replace(/^(Mr\.|Mrs\.|Ms\.|Dr\.|Prof\.)\s*/i, '');
                return stripped.split(' ')[0] || raw;
              })()}
            </span>
          </h1>
        </div>

        {/* Form selector */}
        {forms.length === 0 ? (
          <EmptyState icon="description" title="No active forms" description="No published forms are linked to your subjects yet." />
        ) : (
          <section>
            <p className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-2">Active Forms</p>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {forms.map(f => (
                <button key={f.id} type="button" onClick={() => setSelected(f.id)}
                  className={`flex-shrink-0 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${selected === f.id ? 'bg-primary text-white shadow-primary' : 'bg-surface-card border border-border text-on-surface-variant hover:border-primary/40'}`}>
                  {f.title}
                </button>
              ))}
            </div>
          </section>
        )}

        {/* Stats */}
        {analytics && (
          <div className="grid grid-cols-2 gap-3">
            <div className="card p-4">
              <p className="text-2xl font-bold text-on-surface font-headline">{analytics.total_responses}</p>
              <p className="text-xs text-on-surface-muted mt-0.5">Total Responses</p>
            </div>
            <div className="card p-4">
              <p className="text-2xl font-bold text-on-surface font-headline">{subjects.length}</p>
              <p className="text-xs text-on-surface-muted mt-0.5">Subjects</p>
            </div>
          </div>
        )}

        {/* Insights */}
        {analytics?.insights?.length > 0 && (
          <section>
            <p className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-2">Insights</p>
            <div className="space-y-2">
              {analytics.insights.map((ins, i) => (
                <div key={i} className={`card p-3 flex gap-3 items-start border-l-4 ${ins.type === 'strong' ? 'border-emerald-400' : 'border-red-400'}`}>
                  <span className={`material-symbols-outlined text-[18px] flex-shrink-0 ${ins.type === 'strong' ? 'text-emerald-500' : 'text-red-500'}`}>
                    {ins.type === 'strong' ? 'check_circle' : 'warning'}
                  </span>
                  <p className="text-xs text-on-surface-variant leading-relaxed">{ins.message}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* CO Attainment */}
        {coLoading ? (
          <div className="flex justify-center py-8"><span className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
        ) : subjects.map(subj => (
          <section key={subj.subject_id}>
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-semibold text-on-surface-variant">{subj.subject_name}</p>
              <span className="text-xs text-on-surface-muted font-mono">{subj.short_code}</span>
            </div>
            <div className="space-y-2">
              {subj.co_attainment.map(co => {
                const cfg = LEVEL_CONFIG[co.level] ?? LEVEL_CONFIG.not_met;
                return (
                  <div key={co.co_id} className="card p-4">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex-1">
                        <p className="text-xs font-semibold text-on-surface-variant leading-snug">{co.co_code.split('-').pop()}: {co.description}</p>
                        {co.contributing_dimensions?.length > 0 && (
                          <div className="flex gap-1 mt-1.5 flex-wrap">
                            {co.contributing_dimensions.map(d => (
                              <span key={d} className="text-[10px] bg-surface-variant text-on-surface-variant px-1.5 py-0.5 rounded font-medium">{d}</span>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className={`text-lg font-bold font-headline ${cfg.color}`}>{co.percentage?.toFixed(1)}%</p>
                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${cfg.bg} ${cfg.color}`}>{cfg.label}</span>
                      </div>
                    </div>
                    <ProgressBar value={co.percentage} color={cfg.bar} />
                  </div>
                );
              })}
            </div>
          </section>
        ))}

        {selected && !coLoading && !analytics && (
          <div className="card p-8 text-center">
            <span className="material-symbols-outlined text-on-surface-muted text-4xl mb-2 block">analytics</span>
            <p className="text-sm text-on-surface-variant">CO attainment not computed yet for this form.</p>
          </div>
        )}
      </div>
    </PageLayout>
  );
}
