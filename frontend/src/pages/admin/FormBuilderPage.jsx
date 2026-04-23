// placeholder

import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../../lib/api.js';
import { copyText } from '../../lib/clipboard.js';
import GlassCard from '../../components/ui/GlassCard.jsx';
import Modal from '../../components/ui/Modal.jsx';
import Toggle from '../../components/ui/Toggle.jsx';
import { FullPageSpinner } from '../../components/ui/Spinner.jsx';

// ── Constants ─────────────────────────────────────────────────
const QUESTION_TYPES = [
  { type: 'short_text',    icon: 'short_text',              label: 'Short answer'    },
  { type: 'long_text',     icon: 'subject',                 label: 'Paragraph'       },
  { type: 'mcq',           icon: 'radio_button_checked',    label: 'Multiple choice' },
  { type: 'checkbox',      icon: 'check_box',               label: 'Checkboxes'      },
  { type: 'dropdown',      icon: 'arrow_drop_down_circle',  label: 'Dropdown'        },
  { type: 'rating',        icon: 'star',                    label: 'Rating'          },
  { type: 'linear_scale',  icon: 'linear_scale',            label: 'Linear scale'    },
  { type: 'grid',          icon: 'grid_view',               label: 'Grid'            },
  { type: 'date',          icon: 'calendar_today',          label: 'Date'            },
];

const DIMENSIONS = ['theory', 'delivery', 'practical', 'engagement', 'assessment'];

const DIM_COLORS = {
  theory:     'bg-amber-100 text-amber-800',
  delivery:   'bg-blue-100 text-blue-800',
  practical:  'bg-emerald-100 text-emerald-800',
  engagement: 'bg-violet-100 text-violet-800',
  assessment: 'bg-red-100 text-red-800',
};

const YEARS = ['2025-26', '2024-25', '2023-24'];

// ── Reusable icon button ──────────────────────────────────────
function IconBtn({ icon, onClick, title, className = '' }) {
  return (
    <button type="button" onClick={onClick} title={title}
      className={`w-10 h-10 flex items-center justify-center rounded-xl hover:bg-surface-variant transition-colors text-on-surface-variant flex-shrink-0 ${className}`}>
      <span className="material-symbols-outlined text-[22px]">{icon}</span>
    </button>
  );
}

// ── Question Card (inline editing) ───────────────────────────
function QuestionCard({ q, index, subjects, isAcademic, onDelete, onUpdate }) {
  const [editing, setEditing] = useState(false);
  const [text,    setText]    = useState(q.text);
  const [type,    setType]    = useState(q.type);
  const [dim,     setDim]     = useState(q.dimension || '');
  const [req,     setReq]     = useState(q.required);
  const [opts,    setOpts]    = useState(q.options?.map(o => o.label) || ['Option 1']);
  const [rows,    setRows]    = useState(q.rows || []);
  const [saving,  setSaving]  = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      const payload = { text, type, required: req, order_index: index };
      if (type === 'grid' && dim) payload.dimension = dim;
      if (['mcq','checkbox','dropdown'].includes(type)) {
        payload.options = opts.filter(Boolean).map((l, i) => ({ label: l, order_index: i }));
      }
      if (type === 'grid') {
        payload.rows = rows.map((r, i) => ({ label: r.label, subject_id: r.subject_id || null, order_index: i }));
      }
      await api.put(`/questions/${q.id}`, payload);
      onUpdate();
      setEditing(false);
      toast.success('Saved');
    } catch (err) { toast.error(err.message); }
    finally { setSaving(false); }
  };

  const cancel = () => {
    setText(q.text); setType(q.type); setDim(q.dimension || '');
    setReq(q.required); setOpts(q.options?.map(o => o.label) || ['Option 1']);
    setRows(q.rows || []); setEditing(false);
  };

  return (
    <div className={`bg-surface-card rounded-xl border-l-4 shadow-sm transition-all ${editing ? 'border-primary shadow-md' : 'border-transparent hover:border-primary/30 cursor-pointer'}`}
      onClick={() => !editing && setEditing(true)}>
      <div className="p-5">
        {/* Header row */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2 flex-1">
            <span className="text-[10px] font-bold text-on-surface-variant/50 w-6 flex-shrink-0">{index + 1}</span>
            {editing ? (
              <input autoFocus
                className="flex-1 text-sm font-medium text-on-surface bg-transparent border-b-2 border-primary/30 focus:border-primary outline-none pb-0.5 transition-colors"
                value={text} onChange={e => setText(e.target.value)} placeholder="Question text"
                onClick={e => e.stopPropagation()} />
            ) : (
              <p className="flex-1 text-sm font-medium text-on-surface leading-snug">
                {text || <span className="text-on-surface-variant/40 italic">Untitled question</span>}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0" onClick={e => e.stopPropagation()}>
            {editing ? (
              <select value={type} onChange={e => { setType(e.target.value); setOpts(['Option 1']); setRows([]); }}
                className="text-xs bg-surface-card border border-border rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary/30 text-on-surface">
                {QUESTION_TYPES.map(qt => <option key={qt.type} value={qt.type}>{qt.label}</option>)}
              </select>
            ) : (
              <span className="text-[10px] text-on-surface-variant/50 font-medium capitalize">{type.replace('_', ' ')}</span>
            )}
          </div>
        </div>

        {/* Dimension badge / selector */}
        {(q.type === 'grid' || type === 'grid') && (
          <div className="ml-8 mb-3" onClick={e => e.stopPropagation()}>
            {editing ? (
              <select value={dim} onChange={e => setDim(e.target.value)}
                className="text-xs bg-surface-card border border-border rounded-full px-3 py-1 focus:outline-none focus:ring-1 focus:ring-primary/30 text-on-surface">
                <option value="">No dimension</option>
                {DIMENSIONS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            ) : dim ? (
              <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${DIM_COLORS[dim] || 'bg-surface-variant text-on-surface-variant'}`}>
                {dim}
              </span>
            ) : null}
          </div>
        )}

        {/* Options editor */}
        {editing && ['mcq','checkbox','dropdown'].includes(type) && (
          <div className="ml-8 space-y-2 mb-3" onClick={e => e.stopPropagation()}>
            {opts.map((o, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="material-symbols-outlined text-on-surface-variant/30 text-sm">
                  {type === 'checkbox' ? 'check_box_outline_blank' : 'radio_button_unchecked'}
                </span>
                <input className="flex-1 text-sm bg-transparent border-b border-border focus:border-primary outline-none pb-0.5"
                  value={o} onChange={e => { const n = [...opts]; n[i] = e.target.value; setOpts(n); }}
                  placeholder={`Option ${i + 1}`} />
                {opts.length > 1 && (
                  <button type="button" onClick={() => setOpts(opts.filter((_, j) => j !== i))}
                    className="text-on-surface-variant/30 hover:text-error transition-colors">
                    <span className="material-symbols-outlined text-sm">close</span>
                  </button>
                )}
              </div>
            ))}
            <button type="button" onClick={() => setOpts([...opts, ''])}
              className="text-xs font-bold text-primary flex items-center gap-1 mt-1">
              <span className="material-symbols-outlined text-sm">add</span> Add option
            </button>
          </div>
        )}

        {/* Grid rows editor */}
        {editing && type === 'grid' && (
          <div className="ml-8 space-y-2 mb-3" onClick={e => e.stopPropagation()}>
            <p className="text-[10px] font-bold text-on-surface-variant/50 uppercase tracking-wider">Subject rows</p>
            {rows.map((r, i) => (
              <div key={i} className="flex items-center gap-2">
                {subjects.length > 0 ? (
                  <select className="flex-1 text-xs bg-surface-card border border-border rounded-lg px-2 py-1.5 focus:outline-none text-on-surface"
                    value={r.subject_id || ''}
                    onChange={e => {
                      const sub = subjects.find(s => s.id === e.target.value);
                      const nr = [...rows]; nr[i] = { ...nr[i], subject_id: e.target.value, label: sub?.name || nr[i].label };
                      setRows(nr);
                    }}>
                    <option value="">Custom label</option>
                    {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                ) : (
                  <input className="flex-1 text-sm bg-transparent border-b border-border focus:border-primary outline-none pb-0.5"
                    value={r.label} onChange={e => { const nr = [...rows]; nr[i].label = e.target.value; setRows(nr); }}
                    placeholder={`Row ${i + 1}`} />
                )}
                {rows.length > 1 && (
                  <button type="button" onClick={() => setRows(rows.filter((_, j) => j !== i))}
                    className="text-on-surface-variant/30 hover:text-error transition-colors">
                    <span className="material-symbols-outlined text-sm">close</span>
                  </button>
                )}
              </div>
            ))}
            <button type="button" onClick={() => setRows([...rows, { label: '', subject_id: null, order_index: rows.length }])}
              className="text-xs font-bold text-primary flex items-center gap-1 mt-1">
              <span className="material-symbols-outlined text-sm">add</span> Add row
            </button>
          </div>
        )}

        {/* Non-editing preview for grid rows */}
        {!editing && type === 'grid' && q.rows?.length > 0 && (
          <div className="ml-8 flex flex-wrap gap-1.5">
            {q.rows.slice(0, 4).map(r => (
              <span key={r.id} className="text-[10px] bg-surface-variant text-on-surface-variant px-2 py-0.5 rounded-full">{r.label}</span>
            ))}
            {q.rows.length > 4 && <span className="text-[10px] text-on-surface-variant/50">+{q.rows.length - 4} more</span>}
          </div>
        )}

        {/* Footer actions (editing mode) */}
        {editing && (
          <div className="flex items-center justify-between pt-3 mt-3 border-t border-border-subtle" onClick={e => e.stopPropagation()}>
            <label className="flex items-center gap-2 text-xs font-medium text-on-surface cursor-pointer">
              <button type="button" onClick={() => setReq(!req)}
                className={`w-9 h-5 rounded-full relative transition-all ${req ? 'bg-primary' : 'bg-surface-variant'}`}>
                <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-all ${req ? 'right-0.5' : 'left-0.5'}`} />
              </button>
              Required
            </label>
            <div className="flex items-center gap-2">
              <button type="button" onClick={cancel}
                className="text-xs text-on-surface-variant hover:text-on-surface px-3 py-1.5 rounded-lg hover:bg-surface-variant transition-colors">
                Cancel
              </button>
              <button type="button" onClick={save} disabled={saving}
                className="text-xs font-bold text-white bg-primary px-4 py-1.5 rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-1">
                {saving && <span className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" />}
                Save
              </button>
              <button type="button" onClick={() => { onDelete(q.id); setEditing(false); }}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-on-surface-variant/30 hover:text-error hover:bg-red-50 transition-colors">
                <span className="material-symbols-outlined text-sm">delete</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Settings Tab ─────────────────────────────────────────────
function SettingsTab({ form, subjects, programmes, branches, setBranches, onUpdate }) {
  const [saving,  setSaving]  = useState(false);
  const isAcademicCOForm = form.mode === 'academic';
  const [ctx, setCtx] = useState({
    programme_id:             form.programme_id  || '',
    branch_id:                form.branch_id     || '',
    semester:                 form.semester      || 5,
    academic_year:            form.academic_year || '2025-26',
    is_anonymous:             form.is_anonymous,
    allow_multiple_responses: form.allow_multiple_responses,
    starts_at:                form.starts_at ? form.starts_at.slice(0, 16) : '',
    ends_at:                  form.ends_at   ? form.ends_at.slice(0, 16)   : '',
  });

  useEffect(() => {
    if (!ctx.programme_id) { setBranches([]); return; }
    api.get(`/programmes/${ctx.programme_id}/branches`).then(r => setBranches(r.data.data));
  }, [ctx.programme_id]);

  const save = async () => {
    setSaving(true);
    try {
      const payload = {
        is_anonymous:             ctx.is_anonymous,
        allow_multiple_responses: ctx.allow_multiple_responses,
      };
      if (ctx.starts_at) payload.starts_at = new Date(ctx.starts_at).toISOString();
      if (ctx.ends_at)   payload.ends_at   = new Date(ctx.ends_at).toISOString();
      if (isAcademicCOForm) {
        payload.programme_id  = ctx.programme_id;
        payload.branch_id     = ctx.branch_id;
        payload.semester      = Number(ctx.semester);
        payload.academic_year = ctx.academic_year;
      }
      await api.put(`/forms/${form.id}`, payload);
      toast.success('Settings saved');
      onUpdate();
    } catch (err) { toast.error(err.message); }
    finally { setSaving(false); }
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">

      {/* Academic context */}
      {isAcademicCOForm && (
        <div className="bg-surface-card rounded-xl border border-border p-5 space-y-4">
          <h3 className="font-semibold text-on-surface text-sm">Academic CO Context</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Programme</label>
              <select className="w-full text-sm bg-surface-card border border-border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/20 text-on-surface"
                value={ctx.programme_id} onChange={e => setCtx(c => ({ ...c, programme_id: e.target.value, branch_id: '' }))}>
                <option value="">Select programme</option>
                {programmes.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Branch</label>
              <select className="w-full text-sm bg-surface-card border border-border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/20 text-on-surface"
                value={ctx.branch_id} onChange={e => setCtx(c => ({ ...c, branch_id: e.target.value }))} disabled={!ctx.programme_id}>
                <option value="">Select branch</option>
                {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Semester</label>
              <div className="flex flex-wrap gap-1.5">
                {[1,2,3,4,5,6,7,8].map(s => (
                  <button key={s} type="button" onClick={() => setCtx(c => ({ ...c, semester: s }))}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${ctx.semester === s ? 'bg-primary text-white' : 'bg-surface-variant text-on-surface hover:bg-surface-variant'}`}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Academic Year</label>
              <select className="w-full text-sm bg-surface-card border border-border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/20 text-on-surface"
                value={ctx.academic_year} onChange={e => setCtx(c => ({ ...c, academic_year: e.target.value }))}>
                {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Response settings */}
      <div className="bg-surface-card rounded-xl border border-border divide-y divide-border-subtle">
        <div className="flex items-center justify-between p-4">
          <div>
            <p className="text-sm font-medium text-on-surface">Anonymous responses</p>
            <p className="text-xs text-on-surface-variant mt-0.5">
              {isAcademicCOForm ? 'Student identity will not be stored' : 'Respondent identity will not be stored'}
            </p>
          </div>
          <button type="button" onClick={() => setCtx(c => ({ ...c, is_anonymous: !c.is_anonymous }))}
            className={`w-10 h-6 rounded-full relative transition-all ${ctx.is_anonymous ? 'bg-primary' : 'bg-surface-variant'}`}>
            <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow-sm transition-all ${ctx.is_anonymous ? 'right-1' : 'left-1'}`} />
          </button>
        </div>
        <div className="flex items-center justify-between p-4">
          <div>
            <p className="text-sm font-medium text-on-surface">Allow multiple responses</p>
            <p className="text-xs text-on-surface-variant mt-0.5">
              {isAcademicCOForm ? 'Students can submit more than once' : 'Respondents can submit more than once'}
            </p>
          </div>
          <button type="button" onClick={() => setCtx(c => ({ ...c, allow_multiple_responses: !c.allow_multiple_responses }))}
            className={`w-10 h-6 rounded-full relative transition-all ${ctx.allow_multiple_responses ? 'bg-primary' : 'bg-surface-variant'}`}>
            <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow-sm transition-all ${ctx.allow_multiple_responses ? 'right-1' : 'left-1'}`} />
          </button>
        </div>
      </div>

      {/* Date range */}
      <div className="bg-surface-card rounded-xl border border-border p-5 space-y-4">
        <h3 className="font-semibold text-on-surface text-sm">Availability window</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Opens</label>
            <input type="datetime-local" className="w-full text-sm bg-surface-card border border-border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/20 text-on-surface"
              value={ctx.starts_at} onChange={e => setCtx(c => ({ ...c, starts_at: e.target.value }))} />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Closes</label>
            <input type="datetime-local" className="w-full text-sm bg-surface-card border border-border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/20 text-on-surface"
              value={ctx.ends_at} onChange={e => setCtx(c => ({ ...c, ends_at: e.target.value }))} />
          </div>
        </div>
      </div>

      <button type="button" onClick={save} disabled={saving}
        className="w-full bg-primary text-white py-3 rounded-xl font-bold text-sm hover:bg-primary/90 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2">
        {saving && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
        Save Settings
      </button>
    </div>
  );
}

// ── Responses Tab ─────────────────────────────────────────────
function ResponsesTab({ formId }) {
  const navigate = useNavigate();
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/forms/${formId}/analytics`).then(r => setData(r.data)).finally(() => setLoading(false));
  }, [formId]);

  if (loading) return <div className="flex justify-center py-12"><FullPageSpinner /></div>;

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Responses', value: data?.total_responses ?? 0 },
          { label: 'Invited',   value: data?.invite_count    ?? 0 },
          { label: 'Rate',      value: `${data?.response_rate ?? 0}%` },
        ].map(s => (
          <div key={s.label} className="bg-surface-card rounded-xl border border-border p-4 text-center">
            <p className="text-2xl font-extrabold font-headline text-primary">{s.value}</p>
            <p className="text-[10px] text-on-surface-variant uppercase tracking-wider mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {data?.total_responses === 0 ? (
        <div className="bg-surface-card rounded-xl border border-border p-12 text-center">
          <span className="material-symbols-outlined text-on-surface-variant/30 text-5xl mb-3 block">inbox</span>
          <p className="text-sm text-on-surface-variant">No responses yet.</p>
          <p className="text-xs text-on-surface-variant/60 mt-1">Publish the form and share the link to start collecting.</p>
        </div>
      ) : (
        <button type="button" onClick={() => navigate(`/admin/forms/${formId}/analytics`)}
          className="w-full bg-surface-card rounded-xl border border-border p-4 flex items-center justify-between hover:bg-surface transition-colors">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-primary">bar_chart</span>
            <span className="font-semibold text-on-surface text-sm">View full analytics</span>
          </div>
          <span className="material-symbols-outlined text-on-surface-variant">chevron_right</span>
        </button>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────
export default function FormBuilderPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [form,       setForm]       = useState(null);
  const [subjects,   setSubjects]   = useState([]);
  const [programmes, setProgrammes] = useState([]);
  const [branches,   setBranches]   = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [tab,        setTab]        = useState('questions'); // questions | responses | settings
  const [adding,     setAdding]     = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [saveStatus, setSaveStatus] = useState(''); // '' | 'saving' | 'saved'
  const [showPublishedModal, setShowPublishedModal] = useState(false);
  const [showMoreMenu,       setShowMoreMenu]       = useState(false);
  const bottomRef  = useRef(null);
  const saveTimer  = useRef(null);

  const autoSave = useCallback((patch) => {
    setSaveStatus('saving');
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      try {
        await api.put(`/forms/${id}`, patch);
        setForm(f => ({ ...f, ...patch }));
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus(''), 2000);
      } catch {
        setSaveStatus('');
        toast.error('Auto-save failed');
      }
    }, 800);
  }, [id]);

  const load = async () => {
    const { data } = await api.get(`/forms/${id}`);
    setForm(data);
    if (data.mode === 'academic' && data.branch_id) {
      const s = await api.get(`/branches/${data.branch_id}/subjects?semester=${data.semester}`);
      setSubjects(s.data.data);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
    api.get('/programmes').then(r => setProgrammes(r.data.data));
  }, [id]);

  const addQuestion = async (type) => {
    setAdding(true);
    try {
      const payload = {
        text:        '',
        type,
        required:    true,
        order_index: form.questions?.length ?? 0,
        scale_min:   1,
        scale_max:   5,
        rows:        type === 'grid' ? subjects.map((s, i) => ({ label: s.name, subject_id: s.id, order_index: i })) : [],
        options:     ['mcq','checkbox','dropdown'].includes(type) ? [{ label: 'Option 1', order_index: 0 }] : [],
      };
      await api.post(`/forms/${id}/questions`, payload);
      await load();
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    } catch (err) { toast.error(err.message); }
    finally { setAdding(false); }
  };

  const deleteQuestion = async (qId) => {
    try { await api.delete(`/questions/${qId}`); load(); }
    catch (err) { toast.error(err.message); }
  };

  const handlePublish = async () => {
    setPublishing(true);
    try {
      const { data } = await api.post(`/forms/${id}/publish`, {});
      const shareLink = `${window.location.origin}/f/${data.share_link.split('/f/')[1]}`;
      const copied = await copyText(shareLink);
      toast.success(copied ? 'Published! Share link copied to clipboard.' : 'Published! Share link is ready to share.');
      load();
    } catch (err) { toast.error(err.message); }
    finally { setPublishing(false); }
  };

  const handleClose = async () => {
    try {
      await api.post(`/forms/${id}/close`, {});
      toast.success('Form closed — no longer accepting responses.');
      setShowPublishedModal(false);
      load();
    } catch (err) { toast.error(err.message); }
  };

  const handleDelete = async () => {
    if (!window.confirm('Delete this form permanently? This cannot be undone.')) return;
    try {
      await api.delete(`/forms/${id}`);
      toast.success('Form deleted.');
      navigate('/admin');
    } catch (err) { toast.error(err.message); }
  };

  const handleCopyLink = async () => {
    const copied = await copyText(`${window.location.origin}/f/${form.share_token}`);
    if (copied) toast.success('Link copied!');
    else toast.error('Could not copy link');
  };

  if (loading) return <FullPageSpinner />;

  const isAcademic = form.mode === 'academic';
  const isPublished = form.status === 'published';
  const isClosed = form.status === 'closed';

  return (
    <div className="min-h-dvh bg-surface antialiased text-on-surface">

      {/* ── Top bar (Google Forms style) ── */}
      <header className="sticky top-0 z-50 glass-nav border-b border-border/70 shadow-sm">
        {/* Row 1: back + title + actions */}
        <div className="flex items-center h-14 px-3 gap-1.5">

          {/* LEFT: back + title + save status */}
          <div className="flex items-center gap-1.5 flex-1 min-w-0">
            <IconBtn icon="arrow_back" onClick={() => navigate('/admin')} title="Back" />
            <input
              className="font-semibold text-on-surface text-sm bg-transparent outline-none border-b-2 border-transparent focus:border-primary/40 pb-0.5 transition-colors min-w-0 truncate flex-1"
              value={form.title}
              placeholder="Untitled Form"
              onChange={(e) => {
                setForm(f => ({ ...f, title: e.target.value }));
                autoSave({ title: e.target.value.trim() || 'Untitled Form' });
              }}
            />
            {saveStatus && (
              <span className={`text-[10px] font-medium hidden sm:flex items-center gap-1 flex-shrink-0 ${
                saveStatus === 'saving' ? 'text-on-surface-muted' : 'text-emerald-600'
              }`}>
                {saveStatus === 'saving'
                  ? <><span className="w-2.5 h-2.5 border border-on-surface-muted border-t-transparent rounded-full animate-spin" />Saving...</>
                  : <><span className="material-symbols-outlined text-[14px]">check_circle</span>Saved</>
                }
              </span>
            )}
          </div>

          {/* RIGHT: icon actions + status button + more */}
          <div className="flex items-center gap-0.5 flex-shrink-0">
            <IconBtn icon="visibility" onClick={() => window.open(`/f/${form.share_token}?preview=1`, '_blank')} title="Preview" />
            <IconBtn icon="link" onClick={handleCopyLink} title="Copy link" className="hidden sm:flex" />

            {/* Publish (draft) */}
            {!isPublished && !isClosed && (
              <button type="button" onClick={handlePublish} disabled={publishing}
                className="ml-1 bg-primary text-white text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-primary/90 active:scale-95 transition-all disabled:opacity-50 flex items-center gap-1">
                {publishing
                  ? <span className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" />
                  : <span className="material-symbols-outlined text-sm">publish</span>
                }
                <span className="hidden sm:inline">Publish</span>
              </button>
            )}

            {/* Published */}
            {isPublished && (
              <button type="button" onClick={() => setShowPublishedModal(true)}
                className="ml-1 flex items-center gap-1 border border-emerald-600 text-emerald-700 text-xs font-bold px-2.5 py-1.5 rounded-lg hover:bg-emerald-50 active:scale-95 transition-all">
                <span className="hidden sm:inline">Published</span>
                <span className="material-symbols-outlined text-sm">tune</span>
              </button>
            )}

            {/* Closed */}
            {isClosed && (
              <span className="ml-1 flex items-center gap-1 border border-red-300 text-red-600 text-xs font-bold px-2.5 py-1.5 rounded-lg bg-red-50">
                <span className="material-symbols-outlined text-sm">stop_circle</span>
                <span className="hidden sm:inline">Closed</span>
              </span>
            )}

            {/* ⋮ More menu */}
            <div className="relative">
              <IconBtn icon="more_vert" onClick={() => setShowMoreMenu(m => !m)} title="More options" />
              {showMoreMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowMoreMenu(false)} />
                  <div className="absolute right-0 top-10 z-50 bg-surface-card rounded-xl shadow-elevated border border-border py-1 w-48 text-sm">
                    {isPublished && (
                      <button type="button" onClick={() => { setShowMoreMenu(false); handleClose(); }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-surface text-red-600 transition-colors">
                        <span className="material-symbols-outlined text-sm">stop_circle</span>
                        Close form
                      </button>
                    )}
                    <button type="button" onClick={() => { setShowMoreMenu(false); handleDelete(); }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-surface text-red-600 transition-colors">
                      <span className="material-symbols-outlined text-sm">delete</span>
                      Delete form
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Row 2: tabs — centred */}
        <div className="flex justify-center border-t border-border/50">
          {['questions', 'responses', 'settings'].map(t => (
            <button key={t} type="button" onClick={() => setTab(t)}
              className={`px-6 sm:px-10 py-3 text-xs sm:text-sm font-medium capitalize transition-colors border-b-2 ${
                tab === t
                  ? 'border-primary text-primary'
                  : 'border-transparent text-on-surface-variant hover:text-on-surface hover:border-border'
              }`}>
              {t}
            </button>
          ))}
        </div>
      </header>

      {/* ── Content ── */}
      <main className="max-w-4xl mx-auto px-3 sm:px-4 py-4 sm:py-6">

        {/* QUESTIONS TAB */}
        {tab === 'questions' && (
          <div className="space-y-3">
            {/* Form header card */}
            <div className="bg-surface-card rounded-xl border-t-4 border-primary shadow-sm p-6">
              <input
                className="w-full text-2xl font-headline font-bold text-on-surface bg-transparent outline-none border-b-2 border-transparent focus:border-primary/30 pb-1 transition-colors"
                value={form.title}
                placeholder="Form title"
                onChange={(e) => {
                  setForm(f => ({ ...f, title: e.target.value }));
                  autoSave({ title: e.target.value.trim() || 'Untitled Form' });
                }}
              />
              <textarea
                className="w-full text-sm text-on-surface-variant bg-transparent outline-none border-b border-transparent focus:border-primary/20 pb-0.5 mt-3 transition-colors resize-none overflow-hidden"
                value={form.description || ''}
                placeholder="Form description (optional)"
                rows={1}
                onChange={(e) => {
                  e.target.style.height = 'auto';
                  e.target.style.height = e.target.scrollHeight + 'px';
                  setForm(f => ({ ...f, description: e.target.value }));
                  autoSave({ description: e.target.value || null });
                }}
                onFocus={(e) => {
                  e.target.style.height = 'auto';
                  e.target.style.height = e.target.scrollHeight + 'px';
                }}
              />
              {isAcademic && (
                <div className="flex items-center gap-2 mt-3">
                  <span className="material-symbols-outlined text-primary text-sm">school</span>
                  <span className="text-[10px] text-primary font-bold uppercase tracking-wider">Academic CO Form</span>
                  {form.branch_id && form.semester && (
                    <span className="text-[10px] text-on-surface-variant">
                      — Sem {form.semester} • {form.academic_year}
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Question cards */}
            {form.questions?.length === 0 ? (
              <div className="bg-surface-card rounded-xl border border-dashed border-border p-12 text-center">
                <span className="material-symbols-outlined text-on-surface-variant/30 text-5xl mb-3 block">quiz</span>
                <p className="text-sm text-on-surface-variant font-medium">No questions yet</p>
                <p className="text-xs text-on-surface-variant/60 mt-1">Add a question using the buttons below</p>
              </div>
            ) : (
              form.questions.map((q, i) => (
                <QuestionCard key={q.id} q={q} index={i} subjects={subjects} isAcademic={isAcademic}
                  onDelete={deleteQuestion} onUpdate={load} />
              ))
            )}

            <div ref={bottomRef} />

            {/* Add question bar */}
            <div className="bg-surface-card rounded-xl border border-border p-4">
              <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mb-3">Add question</p>
              <div className="flex flex-wrap gap-2">
                {QUESTION_TYPES.map(qt => (
                  <button key={qt.type} type="button" onClick={() => addQuestion(qt.type)} disabled={adding}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-surface border border-border hover:bg-primary/5 hover:border-primary/30 transition-all text-xs font-medium text-on-surface active:scale-95 disabled:opacity-50">
                    <span className="material-symbols-outlined text-primary text-sm">{qt.icon}</span>
                    {qt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* RESPONSES TAB */}
        {tab === 'responses' && <ResponsesTab formId={id} />}

        {/* SETTINGS TAB */}
        {tab === 'settings' && (
          <SettingsTab form={form} subjects={subjects} programmes={programmes}
            branches={branches} setBranches={setBranches} onUpdate={load} />
        )}
      </main>

      {/* ── Published options modal ── */}
      {showPublishedModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setShowPublishedModal(false)} />
          <div className="relative bg-surface-card rounded-2xl shadow-elevated w-full max-w-sm p-6 space-y-5">
            <h2 className="text-base font-bold text-on-surface">Published options</h2>

            {/* Accepting responses toggle */}
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-on-surface">Accepting responses</p>
                <p className="text-xs text-on-surface-variant mt-0.5">Turn off to stop collecting new responses</p>
              </div>
              <button type="button" onClick={handleClose}
                className="w-11 h-6 rounded-full relative transition-all bg-emerald-500 flex-shrink-0 mt-0.5">
                <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-white shadow-sm" />
              </button>
            </div>

            {/* Copy link */}
            <div className="pt-3 border-t border-border-subtle">
              <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mb-2">Share link</p>
              <div className="flex items-center gap-2 bg-surface rounded-lg px-3 py-2">
                <span className="text-xs text-on-surface-variant flex-1 truncate">{window.location.origin}/f/{form.share_token}</span>
                <button type="button"
                  onClick={handleCopyLink}
                  className="text-primary text-xs font-bold flex-shrink-0 flex items-center gap-1">
                  <span className="material-symbols-outlined text-sm">content_copy</span>
                  Copy
                </button>
              </div>
            </div>

            <div className="flex justify-end pt-1">
              <button type="button" onClick={() => setShowPublishedModal(false)}
                className="text-sm font-bold text-primary px-4 py-2 rounded-lg hover:bg-primary/5 transition-colors">
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
