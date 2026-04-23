import { useEffect, useState } from 'react';
import api from '../../lib/api.js';
import PageLayout from '../../components/layout/PageLayout.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import { FullPageSpinner } from '../../components/ui/Spinner.jsx';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  Legend,
} from 'recharts';

// ── Colour palette tied to attainment levels ──────────────────
const LEVEL = {
  level_3: { label: 'Level 3', color: '#10b981', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  level_2: { label: 'Level 2', color: '#6366f1', bg: 'bg-indigo-50',  text: 'text-indigo-700',  border: 'border-indigo-200'  },
  level_1: { label: 'Level 1', color: '#f59e0b', bg: 'bg-amber-50',   text: 'text-amber-700',   border: 'border-amber-200'   },
  not_met: { label: 'Not Met', color: '#ef4444', bg: 'bg-red-50',     text: 'text-red-700',     border: 'border-red-200'     },
};

const DIMENSION_LABELS = {
  theory:      'Theory',
  delivery:    'Delivery',
  practical:   'Practical',
  engagement:  'Engagement',
  assessment:  'Assessment',
};

// ── Tiny stat card ────────────────────────────────────────────
function StatCard({ label, value, sub, accent = false }) {
  return (
    <div className="card p-4 flex flex-col gap-1">
      <p className={`text-2xl font-bold font-headline ${accent ? 'text-primary' : 'text-on-surface'}`}>{value}</p>
      <p className="text-xs font-semibold text-on-surface-variant">{label}</p>
      {sub && <p className="text-[10px] text-on-surface-muted">{sub}</p>}
    </div>
  );
}

// ── Custom tooltip for bar chart ──────────────────────────────
function CoTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const d = payload[0];
  return (
    <div className="bg-surface-card border border-border rounded-lg px-3 py-2 shadow-elevated text-xs">
      <p className="font-semibold text-on-surface mb-0.5">{d.payload.co_code}</p>
      <p className="text-on-surface-variant">{d.value?.toFixed(1)}%</p>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────
export default function FacultyHistoryPage() {
  const [forms,     setForms]     = useState([]);
  const [selected,  setSelected]  = useState(null);
  const [data,      setData]      = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [coLoading, setCoLoading] = useState(false);

  // Load all forms (published + closed = history)
  useEffect(() => {
    api.get('/forms')
      .then(r => {
        const all = r.data.data ?? [];
        setForms(all);
        if (all.length > 0) setSelected(all[0].id);
      })
      .finally(() => setLoading(false));
  }, []);

  // Load CO analytics when form changes
  useEffect(() => {
    if (!selected) return;
    setCoLoading(true);
    setData(null);
    api.get(`/forms/${selected}/analytics/co`)
      .then(r => setData(r.data))
      .catch(() => setData(null))
      .finally(() => setCoLoading(false));
  }, [selected]);

  if (loading) return <FullPageSpinner />;

  const selectedForm = forms.find(f => f.id === selected);
  const subjects     = data?.subjects ?? [];
  const insights     = data?.insights ?? [];

  // ── Radar data: aggregate dimension scores across all subjects ──
  const dimMap = {};
  subjects.forEach(subj => {
    (subj.dimension_breakdown ?? []).forEach(d => {
      if (!dimMap[d.dimension]) dimMap[d.dimension] = { total: 0, count: 0 };
      dimMap[d.dimension].total += d.percentage;
      dimMap[d.dimension].count += 1;
    });
  });
  const radarData = Object.entries(dimMap).map(([dim, v]) => ({
    dimension: DIMENSION_LABELS[dim] ?? dim,
    value: Math.round(v.total / v.count),
  }));

  // ── Subject comparison bar data ──
  const subjectBarData = subjects.map(s => ({
    name: s.short_code,
    fullName: s.subject_name,
    value: Math.round(s.overall_percentage ?? 0),
    level: s.overall_level ?? 'not_met',
  }));

  return (
    <PageLayout title="History">
      <div className="space-y-6 pb-8">

        {/* ── Form selector ── */}
        {forms.length === 0 ? (
          <EmptyState icon="history" title="No forms yet" description="Forms you have access to will appear here." />
        ) : (
          <section>
            <p className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-2">Select Form</p>
            <div className="flex gap-2 overflow-x-auto pb-1 hide-scrollbar">
              {forms.map(f => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setSelected(f.id)}
                  className={`flex-shrink-0 flex flex-col items-start px-4 py-2.5 rounded-xl text-left transition-all border ${
                    selected === f.id
                      ? 'bg-primary text-white border-primary shadow-md'
                      : 'bg-surface-card border-border text-on-surface-variant hover:border-primary/40'
                  }`}
                >
                  <span className="text-sm font-semibold leading-tight truncate max-w-[180px]">{f.title}</span>
                  <span className={`text-[10px] mt-0.5 font-medium ${selected === f.id ? 'text-white/70' : 'text-on-surface-muted'}`}>
                    {f.response_count ?? 0} responses · {f.status}
                  </span>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* ── Loading state ── */}
        {coLoading && (
          <div className="flex justify-center py-12">
            <span className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {/* ── No data state ── */}
        {!coLoading && selected && !data && (
          <EmptyState icon="analytics" title="No CO data" description="CO attainment hasn't been computed for this form yet." />
        )}

        {/* ── Dashboard ── */}
        {!coLoading && data && (
          <>
            {/* ── Summary stats ── */}
            <div className="grid grid-cols-3 gap-3">
              <StatCard label="Responses"  value={data.total_responses} />
              <StatCard label="Subjects"   value={subjects.length} accent />
              <StatCard
                label="Avg Attainment"
                value={`${Math.round(subjects.reduce((s, x) => s + (x.overall_percentage ?? 0), 0) / (subjects.length || 1))}%`}
                accent
              />
            </div>

            {/* ── Insights ── */}
            {insights.length > 0 && (
              <section>
                <p className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-2">Insights</p>
                <div className="space-y-2">
                  {insights.map((ins, i) => (
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

            {/* ── Subject comparison bar chart ── */}
            {subjectBarData.length > 1 && (
              <section>
                <p className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-3">Subject Comparison</p>
                <div className="card p-4">
                  <ResponsiveContainer width="100%" height={180}>
                    <BarChart data={subjectBarData} barSize={32} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                      <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--color-on-surface-muted)' }} axisLine={false} tickLine={false} />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: 'var(--color-on-surface-muted)' }} axisLine={false} tickLine={false} />
                      <Tooltip content={<CoTooltip />} cursor={{ fill: 'var(--color-surface-variant)', radius: 6 }} />
                      <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                        {subjectBarData.map((entry, i) => (
                          <Cell key={i} fill={LEVEL[entry.level]?.color ?? '#6366f1'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                  {/* Legend */}
                  <div className="flex flex-wrap gap-2 mt-3 justify-center">
                    {Object.entries(LEVEL).map(([k, v]) => (
                      <span key={k} className="flex items-center gap-1 text-[10px] font-semibold text-on-surface-variant">
                        <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: v.color }} />
                        {v.label}
                      </span>
                    ))}
                  </div>
                </div>
              </section>
            )}

            {/* ── Dimension radar chart ── */}
            {radarData.length >= 3 && (
              <section>
                <p className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-3">Dimension Breakdown</p>
                <div className="card p-4">
                  <ResponsiveContainer width="100%" height={220}>
                    <RadarChart data={radarData} margin={{ top: 10, right: 20, bottom: 10, left: 20 }}>
                      <PolarGrid stroke="var(--color-border)" />
                      <PolarAngleAxis dataKey="dimension" tick={{ fontSize: 11, fill: 'var(--color-on-surface-variant)' }} />
                      <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fontSize: 9, fill: 'var(--color-on-surface-muted)' }} tickCount={4} />
                      <Radar
                        name="Attainment"
                        dataKey="value"
                        stroke="#6366f1"
                        fill="#6366f1"
                        fillOpacity={0.18}
                        strokeWidth={2}
                        dot={{ r: 3, fill: '#6366f1' }}
                      />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </section>
            )}

            {/* ── Per-subject CO breakdown ── */}
            {subjects.map(subj => {
              const coBarData = subj.co_attainment.map(co => ({
                co_code: co.co_code.split('-').pop(),
                fullCode: co.co_code,
                description: co.description,
                value: Math.round(co.percentage ?? 0),
                level: co.level ?? 'not_met',
              }));

              return (
                <section key={subj.subject_id}>
                  {/* Subject header */}
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="text-sm font-bold text-on-surface">{subj.subject_name}</p>
                      <p className="text-[10px] text-on-surface-muted font-mono mt-0.5">{subj.short_code}</p>
                    </div>
                    <div className={`px-2.5 py-1 rounded-full text-[11px] font-bold border ${LEVEL[subj.overall_level]?.bg} ${LEVEL[subj.overall_level]?.text} ${LEVEL[subj.overall_level]?.border}`}>
                      {LEVEL[subj.overall_level]?.label ?? 'N/A'} · {Math.round(subj.overall_percentage ?? 0)}%
                    </div>
                  </div>

                  {/* CO bar chart */}
                  <div className="card p-4">
                    <ResponsiveContainer width="100%" height={Math.max(160, coBarData.length * 44)}>
                      <BarChart
                        data={coBarData}
                        layout="vertical"
                        barSize={20}
                        margin={{ top: 0, right: 40, left: 8, bottom: 0 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" horizontal={false} />
                        <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10, fill: 'var(--color-on-surface-muted)' }} axisLine={false} tickLine={false} unit="%" />
                        <YAxis type="category" dataKey="co_code" tick={{ fontSize: 11, fill: 'var(--color-on-surface-variant)', fontWeight: 600 }} axisLine={false} tickLine={false} width={36} />
                        <Tooltip content={<CoTooltip />} cursor={{ fill: 'var(--color-surface-variant)' }} />
                        <Bar dataKey="value" radius={[0, 6, 6, 0]} label={{ position: 'right', fontSize: 10, fill: 'var(--color-on-surface-muted)', formatter: v => `${v}%` }}>
                          {coBarData.map((entry, i) => (
                            <Cell key={i} fill={LEVEL[entry.level]?.color ?? '#6366f1'} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>

                    {/* CO descriptions */}
                    <div className="mt-4 space-y-2 border-t border-border-subtle pt-3">
                      {subj.co_attainment.map(co => {
                        const cfg = LEVEL[co.level] ?? LEVEL.not_met;
                        return (
                          <div key={co.co_id} className="flex items-start gap-2">
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded flex-shrink-0 mt-0.5 ${cfg.bg} ${cfg.text}`}>
                              {co.co_code.split('-').pop()}
                            </span>
                            <p className="text-xs text-on-surface-variant leading-snug">{co.description}</p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </section>
              );
            })}
          </>
        )}
      </div>
    </PageLayout>
  );
}
