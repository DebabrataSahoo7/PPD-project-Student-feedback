import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../../lib/api.js';
import PageLayout from '../../components/layout/PageLayout.jsx';
import GlassCard from '../../components/ui/GlassCard.jsx';
import Button from '../../components/ui/Button.jsx';
import Toggle from '../../components/ui/Toggle.jsx';
import Input from '../../components/ui/Input.jsx';

const SEMESTERS = [1, 2, 3, 4, 5, 6, 7, 8];
const YEARS = ['2025-26', '2024-25', '2023-24'];

export default function CreateFormPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [programmes, setProgrammes] = useState([]);
  const [branches,   setBranches]   = useState([]);
  const [loading,    setLoading]    = useState(false);

  const [form, setForm] = useState({
    title:                    searchParams.get('title') || '',
    description:              '',
    mode:                     searchParams.get('mode') || 'simple',
    programme_id:             '',
    branch_id:                '',
    semester:                 '',
    academic_year:            '2025-26',
    is_anonymous:             false,
    allow_multiple_responses: false,
    starts_at:                '',
    ends_at:                  '',
  });

  // Completion score for sidebar
  const steps = [
    form.mode,
    form.mode === 'simple' || (form.programme_id && form.branch_id && form.semester && form.academic_year),
    form.title,
    true, // quick start always counts
    true, // settings always counts
  ];
  const strength = Math.round((steps.filter(Boolean).length / steps.length) * 100);

  useEffect(() => {
    api.get('/programmes').then(r => setProgrammes(r.data.data));
  }, []);

  useEffect(() => {
    if (!form.programme_id) { setBranches([]); return; }
    api.get(`/programmes/${form.programme_id}/branches`).then(r => setBranches(r.data.data));
  }, [form.programme_id]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return; // prevent double-submit
    setLoading(true);
    try {
      const payload = {
        title:                    form.title,
        mode:                     form.mode,
        is_anonymous:             form.is_anonymous,
        allow_multiple_responses: form.allow_multiple_responses,
      };
      // Only include optional fields if they have values
      if (form.description) payload.description = form.description;
      if (form.starts_at)   payload.starts_at   = new Date(form.starts_at).toISOString();
      if (form.ends_at)     payload.ends_at     = new Date(form.ends_at).toISOString();

      if (form.mode === 'academic') {
        payload.programme_id  = form.programme_id;
        payload.branch_id     = form.branch_id;
        payload.semester      = Number(form.semester);
        payload.academic_year = form.academic_year;
      }
      const { data } = await api.post('/forms', payload);
      toast.success('Form created!');
      navigate(`/admin/forms`);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const selectedProgramme = programmes.find(p => p.id === form.programme_id);
  const selectedBranch    = branches.find(b => b.id === form.branch_id);
  const contextLabel = form.mode === 'academic' && selectedProgramme && selectedBranch && form.semester
    ? `${selectedProgramme.name} • ${selectedBranch.name} • Sem ${form.semester} • ${form.academic_year}`
    : null;

  return (
    <PageLayout title="Create Form" showBack bottomNav={false}>
      <form onSubmit={handleSubmit} className="pt-8 pb-32 px-4 max-w-screen-xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

          {/* ── Left column ── */}
          <div className="lg:col-span-8 space-y-8">

            {/* Step 1: Form Type */}
            <section className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <span className="section-label">Step 01</span>
                  <h2 className="font-headline font-extrabold text-2xl text-on-surface tracking-tight">Form Type</h2>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {['academic', 'simple'].map((m) => (
                  <div key={m} onClick={() => set('mode', m)}
                    className={`relative p-6 rounded-2xl glass-card flex flex-col gap-4 cursor-pointer transition-all ${form.mode === m ? 'border-2 border-primary' : ''}`}>
                    <div className="flex justify-between items-start">
                      <div className={`p-3 rounded-xl ${form.mode === m ? 'bg-primary/10 text-primary' : 'bg-white/30 text-on-surface-variant'}`}>
                        <span className="material-symbols-outlined">{m === 'academic' ? 'school' : 'description'}</span>
                      </div>
                      {form.mode === m && (
                        <div className="h-5 w-5 rounded-full bg-primary flex items-center justify-center">
                          <span className="material-symbols-outlined text-[14px] text-white">check</span>
                        </div>
                      )}
                    </div>
                    <div>
                      <h3 className="font-bold text-lg text-on-surface capitalize">{m} Form</h3>
                      <p className="text-sm text-on-surface-variant/70 mt-1">
                        {m === 'academic' ? 'For course/semester-based feedback' : 'General surveys not tied to academics'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Step 2: Academic Context */}
            {form.mode === 'academic' && (
              <GlassCard className="p-8 space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="section-label">Step 02</span>
                    <h2 className="font-headline font-extrabold text-2xl text-on-surface tracking-tight">Academic Context</h2>
                  </div>
                  {contextLabel && (
                    <div className="px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 hidden md:flex items-center gap-2">
                      <span className="text-xs font-bold text-primary">{contextLabel}</span>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Programme */}
                  <div className="space-y-2">
                    <label className="label-caps">Programme</label>
                    <div className="relative">
                      <select className="w-full bg-white/40 border border-white/40 rounded-xl px-4 py-3 appearance-none focus:ring-2 focus:ring-primary/20 focus:outline-none text-sm text-on-surface"
                        value={form.programme_id} onChange={e => { set('programme_id', e.target.value); set('branch_id', ''); }} required>
                        <option value="">Select programme</option>
                        {programmes.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                      <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none">expand_more</span>
                    </div>
                  </div>

                  {/* Branch */}
                  <div className="space-y-2">
                    <label className="label-caps">Branch</label>
                    <div className="relative">
                      <select className="w-full bg-white/40 border border-white/40 rounded-xl px-4 py-3 appearance-none focus:ring-2 focus:ring-primary/20 focus:outline-none text-sm text-on-surface"
                        value={form.branch_id} onChange={e => set('branch_id', e.target.value)} required disabled={!form.programme_id}>
                        <option value="">Select branch</option>
                        {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                      </select>
                      <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none">expand_more</span>
                    </div>
                  </div>
                </div>

                {/* Semester */}
                <div className="space-y-2">
                  <label className="label-caps">Semester</label>
                  <div className="flex flex-wrap gap-2">
                    {SEMESTERS.map(s => (
                      <button key={s} type="button" onClick={() => set('semester', s)}
                        className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${form.semester === s ? 'bg-primary text-white border border-primary shadow-lg shadow-primary/25 font-bold' : 'bg-white/40 border border-white/40 text-on-surface hover:border-primary/50'}`}>
                        Sem {s}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Academic Year */}
                <div className="space-y-2">
                  <label className="label-caps">Academic Year</label>
                  <div className="relative w-full md:w-1/2">
                    <select className="w-full bg-white/40 border border-white/40 rounded-xl px-4 py-3 appearance-none focus:ring-2 focus:ring-primary/20 focus:outline-none text-sm text-on-surface"
                      value={form.academic_year} onChange={e => set('academic_year', e.target.value)} required>
                      {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                    <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none">calendar_month</span>
                  </div>
                </div>
              </GlassCard>
            )}

            {/* Step 3: Form Details */}
            <section className="space-y-6">
              <div>
                <span className="section-label">Step {form.mode === 'academic' ? '03' : '02'}</span>
                <h2 className="font-headline font-extrabold text-2xl text-on-surface tracking-tight">Form Details</h2>
              </div>
              <Input label="Form Title" placeholder="e.g., Mid-Term Faculty Assessment" value={form.title} onChange={e => set('title', e.target.value)} required />
              <div className="space-y-2">
                <label className="label-caps">Description (Optional)</label>
                <textarea className="glass-input resize-none" rows={4} placeholder="Provide context or instructions for respondents..."
                  value={form.description} onChange={e => set('description', e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="label-caps">Start Date</label>
                  <input type="datetime-local" className="glass-input" value={form.starts_at} onChange={e => set('starts_at', e.target.value)} />
                </div>
                <div className="space-y-2">
                  <label className="label-caps">End Date</label>
                  <input type="datetime-local" className="glass-input" value={form.ends_at} onChange={e => set('ends_at', e.target.value)} />
                </div>
              </div>
            </section>

            {/* Step 4: Quick Start */}
            <section className="space-y-6">
              <div>
                <span className="section-label">Step {form.mode === 'academic' ? '04' : '03'}</span>
                <h2 className="font-headline font-extrabold text-2xl text-on-surface tracking-tight">Quick Start</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                  { icon: 'article',   label: 'Faculty Feedback',          sub: '12 Questions • 5m', title: 'Faculty Feedback Form' },
                  { icon: 'analytics', label: 'Course Outcome Evaluation', sub: '8 Questions • 3m',  title: 'Course Outcome Evaluation' },
                  { icon: 'quiz',      label: 'General Survey',            sub: 'Blank Canvas',       title: '' },
                ].map(t => (
                  <div key={t.label}
                    onClick={() => t.title && set('title', t.title)}
                    className={`p-5 rounded-2xl glass-card hover:shadow-xl hover:shadow-primary/5 transition-all cursor-pointer group ${form.title === t.title && t.title ? 'border-2 border-primary' : ''}`}>
                    <span className="material-symbols-outlined text-primary mb-3 block group-hover:scale-110 transition-transform">{t.icon}</span>
                    <h4 className="font-bold text-sm text-on-surface">{t.label}</h4>
                    <p className="text-xs text-on-surface-variant/70 mt-1">{t.sub}</p>
                  </div>
                ))}
              </div>
            </section>

            {/* Step 5: Settings */}
            <section className="space-y-4 pb-12">
              <div>
                <span className="section-label">Step {form.mode === 'academic' ? '05' : '04'}</span>
                <h2 className="font-headline font-extrabold text-2xl text-on-surface tracking-tight">Settings</h2>
              </div>
              <div className="glass-card rounded-3xl p-3 space-y-2">
                <Toggle checked={form.is_anonymous} onChange={v => set('is_anonymous', v)} icon="visibility_off" label="Anonymous Responses" description="Hide respondent identities" />
                <Toggle checked={form.allow_multiple_responses} onChange={v => set('allow_multiple_responses', v)} icon="repeat" label="Allow Multiple Responses" description="Students can submit more than once" />
              </div>
            </section>
          </div>

          {/* ── Right sidebar (desktop only) ── */}
          <aside className="lg:col-span-4 space-y-6 hidden lg:block">
            <div className="sticky top-24 space-y-6">
              {/* Form Strength */}
              <GlassCard className="rounded-[2rem] p-8">
                <h4 className="font-headline font-extrabold text-xl mb-6 text-on-surface">Form Strength</h4>
                <div className="space-y-6">
                  <div className="flex items-end justify-between">
                    <span className="text-4xl font-extrabold text-primary font-headline">{strength}%</span>
                    <span className="text-xs font-bold text-on-surface-variant/60 tracking-widest uppercase mb-1">
                      {strength >= 80 ? 'Optimized' : strength >= 50 ? 'Good' : 'Incomplete'}
                    </span>
                  </div>
                  <div className="h-2 w-full bg-white/50 rounded-full overflow-hidden border border-white/30">
                    <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${strength}%` }} />
                  </div>
                  <ul className="space-y-4 pt-4">
                    {[
                      { done: !!form.mode,  label: 'Form type selected' },
                      { done: form.mode === 'simple' || !!(form.programme_id && form.branch_id && form.semester), label: 'Context defined' },
                      { done: !!form.title, label: 'Title added' },
                    ].map(item => (
                      <li key={item.label} className="flex items-center gap-3 text-xs font-bold text-on-surface/80">
                        <span className={`material-symbols-outlined text-sm ${item.done ? 'text-emerald-500 filled' : 'text-on-surface-variant/30'}`}>
                          {item.done ? 'check_circle' : 'circle'}
                        </span>
                        {item.label}
                      </li>
                    ))}
                  </ul>
                </div>
              </GlassCard>

              {/* Pro Tip */}
              <div className="bg-primary text-white rounded-[2rem] p-8 overflow-hidden relative group shadow-lg shadow-primary/20">
                <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:scale-110 transition-transform duration-700">
                  <span className="material-symbols-outlined text-[120px]">lightbulb</span>
                </div>
                <h4 className="font-headline font-bold text-lg mb-2 relative z-10">Pro Tip</h4>
                <p className="text-sm text-white/80 leading-relaxed relative z-10 font-medium">
                  Academic forms with clear semester context see 40% higher response rates from students.
                </p>
              </div>
            </div>
          </aside>
        </div>

        {/* Mobile submit button */}
        <div className="fixed bottom-24 left-0 w-full p-4 flex justify-center z-40 lg:hidden">
          <Button type="submit" full loading={loading} className="max-w-sm shadow-xl shadow-primary/30">
            Create Form
            <span className="material-symbols-outlined">arrow_forward</span>
          </Button>
        </div>

        {/* Desktop submit */}
        <div className="hidden lg:flex justify-end mt-8">
          <Button type="submit" loading={loading} className="px-12">Create Form</Button>
        </div>
      </form>
    </PageLayout>
  );
}
