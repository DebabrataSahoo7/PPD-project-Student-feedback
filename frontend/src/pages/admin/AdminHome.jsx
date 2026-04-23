import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../../lib/api.js';
import useAuthStore from '../../store/authStore.js';
import Badge from '../../components/ui/Badge.jsx';
import Modal from '../../components/ui/Modal.jsx';
import { FullPageSpinner } from '../../components/ui/Spinner.jsx';
import PageLayout from '../../components/layout/PageLayout.jsx';
import ActionSheet from '../../components/ui/ActionSheet.jsx';
import LightBeamCard from '../../components/ui/LightBeamCard.jsx';

const TEMPLATES = [
  {
    id: 'blank', icon: 'add', label: 'Blank Form',
    bg: 'bg-surface-variant', iconColor: 'text-on-surface-variant',
    mode: 'simple', title: 'Untitled Form', template: null,
  },
  {
    id: 'faculty_feedback', icon: 'school', label: 'Academic CO Form',
    bg: 'bg-indigo-50', iconColor: 'text-indigo-600',
    mode: 'academic', title: 'Student Feedback on Faculty', template: 'faculty_feedback',
  },
  {
    id: 'campus_facility', icon: 'domain', label: 'Campus Facility Survey',
    bg: 'bg-emerald-50', iconColor: 'text-emerald-600',
    mode: 'simple', title: 'Campus Facility Survey', template: 'campus_facility',
  },
];


const STATUS_VARIANT = { published: 'published', draft: 'draft', closed: 'closed' };

export default function AdminHome() {
  const navigate = useNavigate();
  const { user }  = useAuthStore();
  const [forms,      setForms]      = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [creating,   setCreating]   = useState(null);
  const [modal,      setModal]      = useState(false);
  const [pendingTpl, setPendingTpl] = useState(null);
  const [programmes, setProgrammes] = useState([]);
  const [branches,   setBranches]   = useState([]);
  const [ctx, setCtx] = useState({ programme_id: '', branch_id: '', semester: 5, academic_year: '2025-26' });

  // Action Sheet state
  const [activeForm, setActiveForm] = useState(null);
  const [deleting,   setDeleting]   = useState(false);
  const longPressTimer = useRef(null);

  useEffect(() => {
    api.get('/forms?page=1&limit=8').then(r => setForms(r.data.data)).finally(() => setLoading(false));
    api.get('/programmes').then(r => setProgrammes(r.data.data));
  }, []);

  useEffect(() => {
    if (!ctx.programme_id) { setBranches([]); return; }
    api.get(`/programmes/${ctx.programme_id}/branches`).then(r => setBranches(r.data.data));
  }, [ctx.programme_id]);

  const createAndGo = async (tpl, academicCtx = null) => {
    setCreating(tpl.id);
    try {
      const payload = { title: tpl.title, mode: tpl.mode, is_anonymous: false, allow_multiple_responses: false };
      if (tpl.mode === 'academic' && academicCtx) {
        payload.programme_id  = academicCtx.programme_id;
        payload.branch_id     = academicCtx.branch_id;
        payload.semester      = Number(academicCtx.semester);
        payload.academic_year = academicCtx.academic_year;
      }
      const { data } = await api.post('/forms', payload);
      if (tpl.template) await api.post(`/forms/${data.id}/apply-template`, { template: tpl.template });
      navigate(`/admin/forms/${data.id}/builder`);
    } catch (err) { toast.error(err.message); }
    finally { setCreating(null); }
  };

  const handleTemplate = (tpl) => {
    if (tpl.mode === 'academic') {
      setPendingTpl(tpl);
      setCtx({ programme_id: '', branch_id: '', semester: 5, academic_year: '2025-26' });
      setModal(true);
    } else {
      createAndGo(tpl);
    }
  };

  const handleAcademicConfirm = async (e) => {
    e.preventDefault();
    if (!ctx.programme_id || !ctx.branch_id) { toast.error('Select programme and branch'); return; }
    setModal(false);
    await createAndGo(pendingTpl, ctx);
  };

  // Long-press for mobile
  const handleTouchStart = (form) => {
    longPressTimer.current = setTimeout(() => setActiveForm(form), 500);
  };
  const handleTouchEnd = () => clearTimeout(longPressTimer.current);

  // Right-click for desktop
  const handleContextMenu = (e, form) => {
    e.preventDefault();
    setActiveForm(form);
  };

  const handleDelete = async () => {
    if (!activeForm || deleting) return;
    setDeleting(true);
    try {
      await api.delete(`/forms/${activeForm.id}`);
      setForms(prev => prev.filter(f => f.id !== activeForm.id));
      toast.success('Form deleted');
      setActiveForm(null);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not delete form');
    } finally {
      setDeleting(false);
    }
  };

  const actionSheetActions = activeForm ? [
    { label: 'Edit Form',  icon: 'edit',   variant: 'default', onClick: () => navigate(`/admin/forms/${activeForm.id}/builder`) },
    { label: deleting ? 'Deleting…' : 'Delete Form', icon: 'delete', variant: 'danger', onClick: handleDelete },
  ] : [];

  return (
    <PageLayout title="Home">
      <div className="space-y-6">

        {/* Greeting */}
        <div>
          <p className="text-xs md:text-sm text-on-surface-variant font-semibold uppercase tracking-wider">Welcome back</p>
          <h1 className="text-2xl md:text-3xl font-bold text-on-surface font-headline mt-0.5">
            {user?.name?.split(' ')[0] ?? 'Admin'}
          </h1>
        </div>

        {/* New form */}
        <section>
          <div className="flex items-center justify-between mb-3 px-1">
            <p className="text-xs md:text-sm font-semibold text-on-surface uppercase tracking-wider">Start a new form</p>
            <button type="button" className="text-xs md:text-sm font-semibold text-on-surface-variant hover:text-primary transition-colors flex items-center gap-1 group">
              Template gallery
              <span className="material-symbols-outlined text-[16px] group-hover:translate-y-0.5 transition-transform">unfold_more</span>
            </button>
          </div>
          {/* Cards + label below — same pattern as Google Forms */}
          <div className="flex gap-3 md:gap-5 overflow-x-auto pb-1 snap-x snap-mandatory hide-scrollbar -mx-4 px-4 md:mx-0 md:px-0">
            {TEMPLATES.map(tpl => (
              <div key={tpl.id} className="flex-none flex flex-col items-center gap-2 w-[120px] md:w-[180px] snap-start">

                {tpl.id === 'blank' ? (
                  /* ── Blank Form: light-beam animated card ── */
                  <LightBeamCard
                    onClick={() => handleTemplate(tpl)}
                    disabled={creating === tpl.id}
                    className="w-full aspect-[4/3]"
                  >
                    {creating === tpl.id
                      ? <span className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                      : <span className={`material-symbols-outlined text-[36px] md:text-[52px] ${tpl.iconColor}`}>{tpl.icon}</span>
                    }
                  </LightBeamCard>
                ) : (
                  /* ── Other templates: flat card, icon only ── */
                  <button
                    type="button"
                    onClick={() => handleTemplate(tpl)}
                    disabled={creating === tpl.id}
                    className="w-full aspect-[4/3] card flex items-center justify-center
                               hover:shadow-elevated hover:border-primary/20
                               active:scale-[0.98] transition-all disabled:opacity-60"
                  >
                    {creating === tpl.id
                      ? <span className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                      : <span className={`material-symbols-outlined text-[36px] md:text-[52px] ${tpl.iconColor}`}>{tpl.icon}</span>
                    }
                  </button>
                )}

                {/* Label sits below the card, not inside */}
                <span className="text-[12px] md:text-sm font-semibold text-on-surface text-center leading-tight px-1">
                  {tpl.label}
                </span>
              </div>
            ))}
          </div>
        </section>



        {/* Recent forms */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-xs md:text-sm font-semibold text-on-surface-variant uppercase tracking-wider">Recent forms</p>
              <p className="text-[10px] md:text-xs text-on-surface-muted mt-0.5">Right-click or hold to manage</p>
            </div>
            <button type="button" onClick={() => navigate('/admin/forms')} className="text-xs font-semibold text-primary hover:underline">
              See all
            </button>
          </div>

          {loading ? (
            <div className="flex justify-center py-8"><span className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
          ) : forms.length === 0 ? (
            <div className="card p-8 text-center">
              <span className="material-symbols-outlined text-on-surface-muted text-4xl mb-2 block">description</span>
              <p className="text-sm text-on-surface-variant">No forms yet — create one above</p>
            </div>
          ) : (
            <div className="space-y-2">
              {forms.map(f => (
                <button key={f.id} type="button"
                  onClick={() => navigate(`/admin/forms/${f.id}/builder`)}
                  onContextMenu={(e) => handleContextMenu(e, f)}
                  onTouchStart={() => handleTouchStart(f)}
                  onTouchEnd={handleTouchEnd}
                  onTouchMove={handleTouchEnd}
                  className="w-full card p-4 flex items-center gap-3 hover:shadow-elevated active:scale-[0.99] transition-all text-left select-none">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${f.mode === 'academic' ? 'bg-indigo-50 text-indigo-600' : 'bg-surface-variant text-on-surface-variant'}`}>
                    <span className="material-symbols-outlined text-[18px]">{f.mode === 'academic' ? 'school' : 'description'}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-on-surface truncate">{f.title}</p>
                    <p className="text-xs text-on-surface-muted mt-0.5">{f.response_count ?? 0} responses</p>
                  </div>
                  <Badge variant={STATUS_VARIANT[f.status] ?? 'default'}>{f.status}</Badge>
                </button>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Academic context modal */}
      <Modal open={modal} onClose={() => setModal(false)} title={`Set up ${pendingTpl?.label}`}>
        <form onSubmit={handleAcademicConfirm} className="space-y-4">
          <p className="text-sm text-on-surface-variant">Select the academic context for this form.</p>
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-on-surface-variant">Programme</label>
            <select className="field-input" value={ctx.programme_id}
              onChange={e => setCtx(c => ({ ...c, programme_id: e.target.value, branch_id: '' }))} required>
              <option value="">Select programme</option>
              {programmes.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-on-surface-variant">Branch</label>
            <select className="field-input" value={ctx.branch_id}
              onChange={e => setCtx(c => ({ ...c, branch_id: e.target.value }))}
              disabled={!ctx.programme_id} required>
              <option value="">Select branch</option>
              {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-on-surface-variant">Semester</label>
            <div className="flex flex-wrap gap-2">
              {[1,2,3,4,5,6,7,8].map(s => (
                <button key={s} type="button" onClick={() => setCtx(c => ({ ...c, semester: s }))}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${ctx.semester === s ? 'bg-primary text-white' : 'bg-surface-variant text-on-surface-variant hover:bg-surface-variant'}`}>
                  Sem {s}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-on-surface-variant">Academic Year</label>
            <select className="field-input" value={ctx.academic_year}
              onChange={e => setCtx(c => ({ ...c, academic_year: e.target.value }))}>
              {['2025-26','2024-25','2023-24'].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <button type="submit" className="btn-primary w-full">
            <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
            Start Building
          </button>
        </form>
      </Modal>

      {/* Action Sheet */}
      <ActionSheet
        open={!!activeForm}
        onClose={() => setActiveForm(null)}
        title="Form Actions"
        subtitle={activeForm?.title}
        actions={actionSheetActions}
      />
    </PageLayout>
  );
}
