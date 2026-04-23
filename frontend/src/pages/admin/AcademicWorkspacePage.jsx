import { useEffect, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import api from '../../lib/api.js';
import PageLayout from '../../components/layout/PageLayout.jsx';
import Modal from '../../components/ui/Modal.jsx';
import { FullPageSpinner } from '../../components/ui/Spinner.jsx';

// ── Constants ─────────────────────────────────────────────────
const SEMESTERS = [1,2,3,4,5,6,7,8];
const DIMENSIONS = [
  { key: 'theory',     label: 'Theory',     color: 'bg-amber-100 text-amber-700'   },
  { key: 'delivery',   label: 'Delivery',   color: 'bg-blue-100 text-blue-700'     },
  { key: 'practical',  label: 'Practical',  color: 'bg-emerald-100 text-emerald-700' },
  { key: 'engagement', label: 'Engagement', color: 'bg-violet-100 text-violet-700' },
  { key: 'assessment', label: 'Assessment', color: 'bg-red-100 text-red-700'       },
];

// ── Context Selector ──────────────────────────────────────────
function ContextSelector({ programmes, branches, setBranches, ctx, setCtx }) {
  useEffect(() => {
    if (!ctx.programmeId) { setBranches([]); return; }
    api.get(`/programmes/${ctx.programmeId}/branches`).then(r => setBranches(r.data.data));
  }, [ctx.programmeId]);

  return (
    <div className="bg-surface-card border border-border rounded-lg p-4 space-y-3">
      <p className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Academic Context</p>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-on-surface-variant mb-1">Programme</label>
          <select className="field-input" value={ctx.programmeId}
            onChange={e => setCtx(c => ({ ...c, programmeId: e.target.value, branchId: '', semester: '' }))}>
            <option value="">Select...</option>
            {programmes.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-on-surface-variant mb-1">Branch</label>
          <select className="field-input" value={ctx.branchId}
            onChange={e => setCtx(c => ({ ...c, branchId: e.target.value, semester: '' }))}
            disabled={!ctx.programmeId}>
            <option value="">Select...</option>
            {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </div>
      </div>
      <div>
        <label className="block text-xs font-medium text-on-surface-variant mb-1.5">Semester</label>
        <div className="flex flex-wrap gap-1.5">
          {SEMESTERS.map(s => (
            <button key={s} type="button"
              onClick={() => setCtx(c => ({ ...c, semester: String(s) }))}
              disabled={!ctx.branchId}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all disabled:opacity-40 ${ctx.semester === String(s) ? 'bg-primary text-white' : 'bg-surface-variant text-on-surface-variant hover:bg-surface-variant'}`}>
              Sem {s}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Subjects Tab ──────────────────────────────────────────────
function SubjectsTab({ branchId, semester, allFaculty }) {
  const [subjects, setSubjects] = useState([]);
  const [loading,  setLoading]  = useState(false);
  const [modal,    setModal]    = useState(false);
  const [form,     setForm]     = useState({ name: '', short_code: '', order_index: 0 });
  const [saving,   setSaving]   = useState(false);

  const load = useCallback(() => {
    if (!branchId || !semester) return;
    setLoading(true);
    api.get(`/branches/${branchId}/subjects?semester=${semester}`)
      .then(r => setSubjects(r.data.data))
      .finally(() => setLoading(false));
  }, [branchId, semester]);

  useEffect(() => { load(); }, [load]);

  const handleAdd = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/subjects', { branch_id: branchId, semester: Number(semester), ...form, order_index: Number(form.order_index) });
      toast.success('Subject added');
      setModal(false);
      setForm({ name: '', short_code: '', order_index: 0 });
      load();
    } catch (err) { toast.error(err.message); }
    finally { setSaving(false); }
  };

  if (loading) return <div className="flex justify-center py-8"><span className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-3">
      {subjects.length === 0 ? (
        <div className="text-center py-10">
          <span className="material-symbols-outlined text-on-surface-muted text-4xl mb-2 block">menu_book</span>
          <p className="text-sm text-on-surface-variant">No subjects for Sem {semester}</p>
        </div>
      ) : subjects.map(s => (
        <div key={s.id} className="bg-surface-card border border-border rounded-lg p-4">
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded font-mono">{s.short_code}</span>
            <p className="text-sm font-semibold text-on-surface flex-1">{s.name}</p>
            <div className="flex items-center gap-2 text-xs text-on-surface-muted">
              <span>{s.co_count ?? 0} COs</span>
              <span>·</span>
              <span>{s.faculty?.length ?? 0} faculty</span>
            </div>
          </div>
        </div>
      ))}
      <button type="button" onClick={() => setModal(true)}
        className="w-full border-2 border-dashed border-border rounded-lg py-3 text-sm font-semibold text-on-surface-muted hover:border-primary/40 hover:text-primary transition-colors flex items-center justify-center gap-2">
        <span className="material-symbols-outlined text-[18px]">add</span>
        Add Subject
      </button>

      <Modal open={modal} onClose={() => setModal(false)} title="Add Subject">
        <form onSubmit={handleAdd} className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-on-surface-variant mb-1">Subject Name</label>
            <input className="field-input" placeholder="e.g., Machine Learning" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
          </div>
          <div>
            <label className="block text-sm font-medium text-on-surface-variant mb-1">Short Code</label>
            <input className="field-input" placeholder="e.g., ML" value={form.short_code} onChange={e => setForm(f => ({ ...f, short_code: e.target.value }))} required />
          </div>
          <button type="submit" disabled={saving} className="btn-primary w-full">
            {saving ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : null}
            Add Subject
          </button>
        </form>
      </Modal>
    </div>
  );
}

// ── Course Outcomes Tab ───────────────────────────────────────
function CourseOutcomesTab({ branchId, semester }) {
  const [subjects,    setSubjects]    = useState([]);
  const [activeSubj,  setActiveSubj]  = useState(null);
  const [cos,         setCOs]         = useState([]);
  const [loadingCOs,  setLoadingCOs]  = useState(false);
  const [modal,       setModal]       = useState(false);
  const [form,        setForm]        = useState({ co_code: '', description: '' });
  const [saving,      setSaving]      = useState(false);

  useEffect(() => {
    if (!branchId || !semester) return;
    api.get(`/branches/${branchId}/subjects?semester=${semester}`).then(r => {
      setSubjects(r.data.data);
      if (r.data.data.length > 0) setActiveSubj(r.data.data[0]);
    });
  }, [branchId, semester]);

  useEffect(() => {
    if (!activeSubj) return;
    setLoadingCOs(true);
    api.get(`/subjects/${activeSubj.id}/cos`).then(r => setCOs(r.data.data)).finally(() => setLoadingCOs(false));
  }, [activeSubj]);

  const handleAdd = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post(`/subjects/${activeSubj.id}/cos`, { ...form, order_index: cos.length + 1 });
      toast.success('CO added');
      setModal(false);
      setForm({ co_code: '', description: '' });
      const r = await api.get(`/subjects/${activeSubj.id}/cos`);
      setCOs(r.data.data);
    } catch (err) { toast.error(err.message); }
    finally { setSaving(false); }
  };

  const handleDelete = async (coId) => {
    if (!confirm('Delete this CO?')) return;
    try {
      await api.delete(`/cos/${coId}`);
      toast.success('CO deleted');
      const r = await api.get(`/subjects/${activeSubj.id}/cos`);
      setCOs(r.data.data);
    } catch (err) { toast.error(err.message); }
  };

  if (subjects.length === 0) return (
    <div className="text-center py-10">
      <p className="text-sm text-on-surface-variant">Add subjects first before defining COs.</p>
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Subject selector */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {subjects.map(s => (
          <button key={s.id} type="button" onClick={() => setActiveSubj(s)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${activeSubj?.id === s.id ? 'bg-primary text-white' : 'bg-surface-variant text-on-surface-variant hover:bg-surface-variant'}`}>
            {s.short_code}
          </button>
        ))}
      </div>

      {activeSubj && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">{activeSubj.name}</p>
          {loadingCOs ? (
            <div className="flex justify-center py-6"><span className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
          ) : cos.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-sm text-on-surface-muted">No COs defined yet</p>
            </div>
          ) : cos.map((co, i) => (
            <div key={co.id} className="bg-surface-card border border-border rounded-lg px-4 py-3 flex items-start gap-3">
              <span className="text-[10px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded font-mono flex-shrink-0 mt-0.5">{co.co_code.split('-').pop()}</span>
              <p className="text-sm text-on-surface-variant flex-1 leading-relaxed">{co.description}</p>
              <button type="button" onClick={() => handleDelete(co.id)}
                className="text-on-surface-muted hover:text-red-500 transition-colors flex-shrink-0">
                <span className="material-symbols-outlined text-[16px]">delete</span>
              </button>
            </div>
          ))}
          <button type="button" onClick={() => setModal(true)}
            className="w-full border-2 border-dashed border-border rounded-lg py-3 text-sm font-semibold text-on-surface-muted hover:border-primary/40 hover:text-primary transition-colors flex items-center justify-center gap-2">
            <span className="material-symbols-outlined text-[18px]">add</span>
            Add CO
          </button>
        </div>
      )}

      <Modal open={modal} onClose={() => setModal(false)} title={`Add CO — ${activeSubj?.name}`}>
        <form onSubmit={handleAdd} className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-on-surface-variant mb-1">CO Code</label>
            <input className="field-input font-mono" placeholder={`CO${cos.length + 1}`} value={form.co_code} onChange={e => setForm(f => ({ ...f, co_code: e.target.value }))} required />
          </div>
          <div>
            <label className="block text-sm font-medium text-on-surface-variant mb-1">Description</label>
            <textarea className="field-input resize-none" rows={3} placeholder="Describe what students will achieve..." value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} required />
          </div>
          <button type="submit" disabled={saving} className="btn-primary w-full">
            {saving ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : null}
            Add CO
          </button>
        </form>
      </Modal>
    </div>
  );
}

// ── Dimension Mapping Tab ─────────────────────────────────────
function DimensionMappingTab({ branchId, semester }) {
  const [subjects,   setSubjects]   = useState([]);
  const [activeSubj, setActiveSubj] = useState(null);
  const [cos,        setCOs]        = useState([]);
  const [mapping,    setMapping]    = useState({});
  const [saving,     setSaving]     = useState(false);

  useEffect(() => {
    if (!branchId || !semester) return;
    api.get(`/branches/${branchId}/subjects?semester=${semester}`).then(r => {
      setSubjects(r.data.data);
      if (r.data.data.length > 0) setActiveSubj(r.data.data[0]);
    });
  }, [branchId, semester]);

  useEffect(() => {
    if (!activeSubj) return;
    Promise.all([
      api.get(`/subjects/${activeSubj.id}/cos`),
      api.get(`/subjects/${activeSubj.id}/dimension-mapping`),
    ]).then(([cosRes, mapRes]) => {
      setCOs(cosRes.data.data);
      const m = {};
      mapRes.data.mappings.forEach(mp => { m[mp.dimension] = mp.co_id; });
      setMapping(m);
    });
  }, [activeSubj]);

  const handleSave = async () => {
    const mappings = Object.entries(mapping).filter(([, v]) => v).map(([dimension, co_id]) => ({ dimension, co_id }));
    if (!mappings.length) { toast.error('Map at least one dimension'); return; }
    setSaving(true);
    try {
      await api.post(`/subjects/${activeSubj.id}/dimension-mapping`, { mappings });
      toast.success('Mappings saved');
    } catch (err) { toast.error(err.message); }
    finally { setSaving(false); }
  };

  if (subjects.length === 0) return (
    <div className="text-center py-10"><p className="text-sm text-on-surface-variant">Add subjects and COs first.</p></div>
  );

  return (
    <div className="space-y-4">
      {/* Subject selector */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {subjects.map(s => (
          <button key={s.id} type="button" onClick={() => setActiveSubj(s)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${activeSubj?.id === s.id ? 'bg-primary text-white' : 'bg-surface-variant text-on-surface-variant hover:bg-surface-variant'}`}>
            {s.short_code}
          </button>
        ))}
      </div>

      {activeSubj && (
        <>
          {cos.length === 0 ? (
            <div className="text-center py-6"><p className="text-sm text-on-surface-muted">No COs defined for {activeSubj.name}. Add COs first.</p></div>
          ) : (
            <div className="space-y-2">
              {DIMENSIONS.map(dim => (
                <div key={dim.key} className="bg-surface-card border border-border rounded-lg px-4 py-3 flex items-center gap-3">
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-lg flex-shrink-0 w-24 text-center ${dim.color}`}>{dim.label}</span>
                  <select className="field-input flex-1 text-sm"
                    value={mapping[dim.key] || ''}
                    onChange={e => setMapping(m => ({ ...m, [dim.key]: e.target.value || undefined }))}>
                    <option value="">Not mapped</option>
                    {cos.map(co => <option key={co.id} value={co.id}>{co.co_code.split('-').pop()}: {co.description.slice(0, 45)}{co.description.length > 45 ? '…' : ''}</option>)}
                  </select>
                </div>
              ))}
              <button type="button" onClick={handleSave} disabled={saving}
                className="btn-primary w-full mt-2">
                {saving ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : null}
                Save Mappings
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── Faculty Tab ───────────────────────────────────────────────
function FacultyTab({ branchId, semester, allFaculty }) {
  const [subjects,   setSubjects]   = useState([]);
  const [loading,    setLoading]    = useState(false);
  const [modal,      setModal]      = useState(false);
  const [activeSubj, setActiveSubj] = useState(null);
  const [selFaculty, setSelFaculty] = useState('');
  const [saving,     setSaving]     = useState(false);

  const load = useCallback(() => {
    if (!branchId || !semester) return;
    setLoading(true);
    api.get(`/branches/${branchId}/subjects?semester=${semester}`)
      .then(r => setSubjects(r.data.data))
      .finally(() => setLoading(false));
  }, [branchId, semester]);

  useEffect(() => { load(); }, [load]);

  const handleAssign = async () => {
    if (!selFaculty) { toast.error('Select a faculty member'); return; }
    setSaving(true);
    try {
      await api.post(`/subjects/${activeSubj.id}/faculty`, { faculty_id: selFaculty });
      toast.success('Faculty assigned');
      setModal(false);
      load();
    } catch (err) { toast.error(err.message); }
    finally { setSaving(false); }
  };

  const handleUnassign = async (subjectId, facultyId, name) => {
    if (!confirm(`Remove ${name}?`)) return;
    try {
      await api.delete(`/subjects/${subjectId}/faculty/${facultyId}`);
      toast.success('Removed');
      load();
    } catch (err) { toast.error(err.message); }
  };

  if (loading) return <div className="flex justify-center py-8"><span className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-3">
      {subjects.length === 0 ? (
        <div className="text-center py-10"><p className="text-sm text-on-surface-variant">No subjects found.</p></div>
      ) : subjects.map(s => (
        <div key={s.id} className="bg-surface-card border border-border rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded font-mono">{s.short_code}</span>
              <p className="text-sm font-semibold text-on-surface">{s.name}</p>
            </div>
            <button type="button" onClick={() => { setActiveSubj(s); setSelFaculty(''); setModal(true); }}
              className="text-xs font-semibold text-primary hover:underline flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px]">add</span>
              Assign
            </button>
          </div>
          {s.faculty?.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {s.faculty.map(f => (
                <div key={f.id} className="flex items-center gap-1.5 bg-surface-variant rounded-lg px-2.5 py-1">
                  <span className="text-xs font-medium text-on-surface-variant">{f.name}</span>
                  <button type="button" onClick={() => handleUnassign(s.id, f.id, f.name)}
                    className="text-on-surface-muted hover:text-red-500 transition-colors">
                    <span className="material-symbols-outlined text-[12px]">close</span>
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-on-surface-muted italic">No faculty assigned</p>
          )}
        </div>
      ))}

      <Modal open={modal} onClose={() => setModal(false)} title={`Assign Faculty — ${activeSubj?.name}`}>
        <div className="space-y-3">
          <select className="field-input" value={selFaculty} onChange={e => setSelFaculty(e.target.value)}>
            <option value="">Choose faculty...</option>
            {allFaculty.filter(f => !activeSubj?.faculty?.find(af => af.id === f.id)).map(f => (
              <option key={f.id} value={f.id}>{f.name} — {f.email}</option>
            ))}
          </select>
          <button type="button" onClick={handleAssign} disabled={saving || !selFaculty} className="btn-primary w-full">
            {saving ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : null}
            Assign
          </button>
        </div>
      </Modal>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────
const TABS = [
  { key: 'subjects',  label: 'Subjects',         icon: 'menu_book'    },
  { key: 'cos',       label: 'Course Outcomes',   icon: 'assignment'   },
  { key: 'mapping',   label: 'Dim. Mapping',      icon: 'schema'       },
  { key: 'faculty',   label: 'Faculty',           icon: 'group'        },
];

export default function AcademicWorkspacePage() {
  const [programmes, setProgrammes] = useState([]);
  const [branches,   setBranches]   = useState([]);
  const [allFaculty, setAllFaculty] = useState([]);
  const [ctx, setCtx] = useState({ programmeId: '', branchId: '', semester: '' });
  const [tab, setTab] = useState('subjects');

  useEffect(() => {
    api.get('/programmes').then(r => setProgrammes(r.data.data));
    api.get('/users?role=faculty').then(r => setAllFaculty(r.data.data));
  }, []);

  const ready = ctx.branchId && ctx.semester;

  return (
    <PageLayout title="Academic Workspace" showBack>
      <div className="space-y-4">
        <ContextSelector
          programmes={programmes} branches={branches} setBranches={setBranches}
          ctx={ctx} setCtx={setCtx}
        />

        {!ready ? (
          <div className="text-center py-12">
            <span className="material-symbols-outlined text-on-surface-muted text-5xl mb-3 block">school</span>
            <p className="text-sm font-semibold text-on-surface-variant">Select programme, branch, and semester</p>
            <p className="text-xs text-on-surface-muted mt-1">Then manage subjects, COs, mappings, and faculty in one place</p>
          </div>
        ) : (
          <>
            {/* Tabs */}
            <div className="bg-surface-card border border-border rounded-lg overflow-hidden">
              <div className="flex border-b border-border-subtle">
                {TABS.map(t => (
                  <button key={t.key} type="button" onClick={() => setTab(t.key)}
                    className={`flex-1 flex flex-col items-center gap-0.5 py-3 text-[10px] font-semibold transition-colors border-b-2 ${tab === t.key ? 'border-primary text-primary' : 'border-transparent text-on-surface-muted hover:text-on-surface-variant'}`}>
                    <span className="material-symbols-outlined text-[18px]">{t.icon}</span>
                    {t.label}
                  </button>
                ))}
              </div>
              <div className="p-4">
                {tab === 'subjects' && <SubjectsTab branchId={ctx.branchId} semester={ctx.semester} allFaculty={allFaculty} />}
                {tab === 'cos'      && <CourseOutcomesTab branchId={ctx.branchId} semester={ctx.semester} />}
                {tab === 'mapping'  && <DimensionMappingTab branchId={ctx.branchId} semester={ctx.semester} />}
                {tab === 'faculty'  && <FacultyTab branchId={ctx.branchId} semester={ctx.semester} allFaculty={allFaculty} />}
              </div>
            </div>
          </>
        )}
      </div>
    </PageLayout>
  );
}
