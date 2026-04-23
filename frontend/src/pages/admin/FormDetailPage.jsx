import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../../lib/api.js';
import { copyText } from '../../lib/clipboard.js';
import PageLayout from '../../components/layout/PageLayout.jsx';
import GlassCard from '../../components/ui/GlassCard.jsx';
import Badge from '../../components/ui/Badge.jsx';
import Button from '../../components/ui/Button.jsx';
import { FullPageSpinner } from '../../components/ui/Spinner.jsx';

const STATUS_VARIANT = { published: 'published', draft: 'draft', closed: 'closed' };

export default function FormDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [form,    setForm]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [acting,  setActing]  = useState(false);

  const load = () => api.get(`/forms/${id}`).then(r => { setForm(r.data); setLoading(false); });
  useEffect(() => { load(); }, [id]);

  const handlePublish = async () => {
    setActing(true);
    try {
      await api.post(`/forms/${id}/publish`, {});
      toast.success('Form published!');
      load();
    } catch (err) { toast.error(err.message); }
    finally { setActing(false); }
  };

  const handleClose = async () => {
    setActing(true);
    try {
      await api.post(`/forms/${id}/close`, {});
      toast.success('Form closed');
      load();
    } catch (err) { toast.error(err.message); }
    finally { setActing(false); }
  };

  const handleDelete = async () => {
    if (!confirm('Delete this draft form?')) return;
    setActing(true);
    try {
      await api.delete(`/forms/${id}`);
      toast.success('Form deleted');
      navigate('/admin/forms');
    } catch (err) { toast.error(err.message); }
    finally { setActing(false); }
  };

  const copyLink = async () => {
    const link = `${window.location.origin}/f/${form.share_token}`;
    const copied = await copyText(link);
    if (copied) toast.success('Share link copied!');
    else toast.error('Could not copy link');
  };

  if (loading) return <FullPageSpinner />;

  return (
    <PageLayout title={form.title} showBack>
      <div className="page-container space-y-6">

        {/* Status + Actions */}
        <GlassCard className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <Badge variant={STATUS_VARIANT[form.status]}>{form.status}</Badge>
            <div className="flex gap-2">
              {form.status === 'published' && (
                <button onClick={copyLink} className="w-9 h-9 flex items-center justify-center rounded-full bg-white/40 border border-white/20 hover:bg-white/60 transition-colors">
                  <span className="material-symbols-outlined text-sm text-on-surface-variant">content_copy</span>
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="label-caps mb-1">Mode</p>
              <p className="font-semibold text-on-surface capitalize">{form.mode}</p>
            </div>
            <div>
              <p className="label-caps mb-1">Responses</p>
              <p className="font-semibold text-on-surface">{form.questions?.length ?? 0} questions</p>
            </div>
            {form.starts_at && (
              <div>
                <p className="label-caps mb-1">Opens</p>
                <p className="font-semibold text-on-surface">{new Date(form.starts_at).toLocaleDateString()}</p>
              </div>
            )}
            {form.ends_at && (
              <div>
                <p className="label-caps mb-1">Closes</p>
                <p className="font-semibold text-on-surface">{new Date(form.ends_at).toLocaleDateString()}</p>
              </div>
            )}
          </div>

          {form.description && (
            <p className="text-sm text-on-surface-variant leading-relaxed">{form.description}</p>
          )}
        </GlassCard>

        {/* Questions preview */}
        {form.questions?.length > 0 && (
          <section className="space-y-3">
            <h3 className="font-headline font-bold text-lg text-on-surface px-1">Questions ({form.questions.length})</h3>
            {form.questions.map((q, i) => (
              <GlassCard key={q.id} className="p-4">
                <div className="flex items-start gap-3">
                  <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-1 rounded-lg mt-0.5">{i + 1}</span>
                  <div className="flex-1">
                    <p className="font-semibold text-on-surface text-sm">{q.text}</p>
                    <div className="flex gap-2 mt-1 flex-wrap">
                      <span className="text-[10px] text-on-surface-variant/60 font-bold uppercase">{q.type}</span>
                      {q.dimension && <span className="text-[10px] text-primary font-bold uppercase">{q.dimension}</span>}
                      {q.required && <span className="text-[10px] text-error font-bold uppercase">required</span>}
                    </div>
                    {q.rows?.length > 0 && (
                      <p className="text-[10px] text-on-surface-variant/60 mt-1">{q.rows.length} rows</p>
                    )}
                  </div>
                </div>
              </GlassCard>
            ))}
          </section>
        )}

        {/* Action buttons */}
        <div className="space-y-3 pt-2">
          <Button type="button" full onClick={() => navigate(`/admin/forms/${id}/builder`)} variant="ghost" icon="edit">
            Edit Questions
          </Button>

          {form.status === 'draft' && (
            <Button type="button" full onClick={handlePublish} loading={acting} icon="publish">
              Publish Form
            </Button>
          )}
          {form.status === 'published' && (
            <>
              <Button type="button" full onClick={() => navigate(`/admin/forms/${id}/analytics`)} variant="ghost" icon="bar_chart">
                View Analytics
              </Button>
              <Button type="button" full onClick={handleClose} loading={acting} variant="ghost" icon="lock">
                Close Form
              </Button>
            </>
          )}
          {form.status === 'draft' && (
            <Button type="button" full onClick={handleDelete} loading={acting} variant="danger" icon="delete">
              Delete Form
            </Button>
          )}
        </div>
      </div>
    </PageLayout>
  );
}
