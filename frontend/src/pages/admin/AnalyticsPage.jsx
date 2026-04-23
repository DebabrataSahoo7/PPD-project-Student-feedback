import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../../lib/api.js';
import PageLayout from '../../components/layout/PageLayout.jsx';
import GlassCard from '../../components/ui/GlassCard.jsx';
import COCard from '../../components/analytics/COCard.jsx';
import ProgressBar from '../../components/ui/ProgressBar.jsx';
import Button from '../../components/ui/Button.jsx';
import { FullPageSpinner } from '../../components/ui/Spinner.jsx';

export default function AnalyticsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [general,   setGeneral]   = useState(null);
  const [co,        setCO]        = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [computing, setComputing] = useState(false);

  const load = async () => {
    try {
      const [genRes] = await Promise.all([api.get(`/forms/${id}/analytics`)]);
      setGeneral(genRes.data);
      if (genRes.data.form_mode === 'academic') {
        api.get(`/forms/${id}/analytics/co`).then(r => setCO(r.data)).catch(() => setCO(null));
      } else {
        setCO(null);
      }
    } catch (err) {
      toast.error('Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, [id]);

  const handleCompute = async () => {
    setComputing(true);
    try {
      await api.post(`/forms/${id}/analytics/co/compute`, {});
      toast.success('CO attainment computed!');
      const r = await api.get(`/forms/${id}/analytics/co`);
      setCO(r.data);
    } catch (err) { toast.error(err.message); }
    finally { setComputing(false); }
  };

  if (loading) return <FullPageSpinner />;
  const isAcademicCOForm = general?.form_mode === 'academic';

  return (
    <PageLayout title="Analytics" showBack>
      <div className="page-container space-y-6">

        {/* Overview stats */}
        <GlassCard className="p-6">
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <p className="text-3xl font-extrabold font-headline text-on-surface">{general.total_responses}</p>
              <p className="text-[10px] text-on-surface-variant uppercase tracking-wider mt-1">Responses</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-extrabold font-headline text-primary">{general.invite_count}</p>
              <p className="text-[10px] text-on-surface-variant uppercase tracking-wider mt-1">Invited</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-extrabold font-headline text-on-surface">{general.response_rate}%</p>
              <p className="text-[10px] text-on-surface-variant uppercase tracking-wider mt-1">Rate</p>
            </div>
          </div>
        </GlassCard>

        {/* Per-question analytics */}
        {general.questions?.map(q => (
          <GlassCard key={q.question_id} className="p-5 space-y-3">
            <p className="font-bold text-on-surface text-sm">{q.question_text}</p>
            <span className="badge badge-draft">{q.type}</span>

            {q.type === 'grid' && q.rows?.map(row => (
              <div key={row.label} className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="font-semibold text-on-surface">{row.label}</span>
                  <span className="text-primary font-bold">{row.avg} / 5 ({row.percentage}%)</span>
                </div>
                <ProgressBar value={row.percentage} color={row.percentage >= 70 ? 'success' : row.percentage >= 50 ? 'primary' : 'danger'} />
                <div className="flex gap-1 mt-1">
                  {Object.entries(row.distribution || {}).map(([k, v]) => (
                    <div key={k} className="flex-1 text-center">
                      <div className="text-[9px] text-on-surface-variant">{k}</div>
                      <div className="text-[10px] font-bold text-on-surface">{v}</div>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {(q.type === 'rating' || q.type === 'linear_scale') && q.avg && (
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="font-semibold text-on-surface">Average</span>
                  <span className="text-primary font-bold">{q.avg} / 5</span>
                </div>
                <ProgressBar value={q.percentage} />
              </div>
            )}

            {q.text_responses?.length > 0 && (
              <div className="space-y-2 mt-2">
                {q.text_responses.slice(0, 3).map((t, i) => (
                  <p key={i} className="text-xs text-on-surface-variant bg-white/30 rounded-xl p-3 italic">"{t}"</p>
                ))}
              </div>
            )}
          </GlassCard>
        ))}

        {isAcademicCOForm && (
          <section className="space-y-4">
            <div className="flex items-center justify-between px-1">
              <div>
                <h3 className="font-headline font-bold text-lg text-on-surface">CO Attainment</h3>
                <p className="text-xs text-on-surface-variant mt-0.5">Available only for Academic CO Forms.</p>
              </div>
              <Button type="button" variant="ghost" loading={computing} onClick={handleCompute} className="py-2 px-4 text-xs">
                {co ? 'Recompute' : 'Compute'}
              </Button>
            </div>

            {!co ? (
              <GlassCard className="p-6 text-center">
                <span className="material-symbols-outlined text-on-surface-variant/40 text-4xl mb-3 block">analytics</span>
                <p className="text-sm text-on-surface-variant">Click "Compute" to calculate CO attainment from responses.</p>
              </GlassCard>
            ) : (
              <>
                {co.insights?.map((ins, i) => (
                  <div key={i} className={`flex gap-3 p-4 glass-card rounded-2xl border-l-4 ${ins.type === 'strong' ? 'border-emerald-500' : 'border-red-500'}`}>
                    <span className={`material-symbols-outlined ${ins.type === 'strong' ? 'text-emerald-600' : 'text-red-500'}`}>
                      {ins.type === 'strong' ? 'check_circle' : 'warning'}
                    </span>
                    <div>
                      <p className="text-sm font-bold text-on-surface capitalize">{ins.type}</p>
                      <p className="text-xs text-on-surface-variant">{ins.message}</p>
                    </div>
                  </div>
                ))}

                {co.subjects?.map(subj => (
                  <section key={subj.subject_id} className="space-y-3">
                    <div className="flex justify-between items-center px-1">
                      <h4 className="font-headline font-bold text-on-surface">{subj.subject_name}</h4>
                      <span className="text-[10px] font-bold text-primary uppercase">{subj.short_code}</span>
                    </div>
                    {subj.co_attainment.map(co => <COCard key={co.co_id} co={co} />)}
                  </section>
                ))}
              </>
            )}
          </section>
        )}
      </div>
    </PageLayout>
  );
}
