import { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../../lib/api.js';
import useAuthStore from '../../store/authStore.js';
import { FullPageSpinner } from '../../components/ui/Spinner.jsx';

// ── Helpers ───────────────────────────────────────────────────

function isAnswered(q, answers) {
  const v = answers[q.id];
  if (v === null || v === undefined || v === '') return false;
  if (Array.isArray(v) && v.length === 0) return false;
  if (typeof v === 'object' && !Array.isArray(v) && Object.keys(v).length === 0) return false;
  return true;
}

// ── Question renderers ────────────────────────────────────────

function RatingQuestion({ question, value, onChange }) {
  const max = question.scale_max || 5;
  return (
    <div className="flex gap-2 pt-1">
      {Array.from({ length: max }, (_, i) => i + 1).map((n) => (
        <button key={n} type="button" onClick={() => onChange(n)}
          className={`w-9 h-9 flex items-center justify-center rounded-lg font-bold text-xs transition-all active:scale-95 border ${
            value >= n ? 'bg-amber-50 text-amber-500 border-amber-300' : 'bg-surface-card border-border text-on-surface-muted hover:border-border'
          }`}>
          <span className={`material-symbols-outlined text-lg ${value >= n ? 'filled' : ''}`}>star</span>
        </button>
      ))}
    </div>
  );
}

function MCQQuestion({ question, value, onChange }) {
  return (
    <div className="space-y-2 pt-1">
      {question.options.map((opt) => {
        const selected = value === opt.id;
        return (
          <label key={opt.id}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border cursor-pointer transition-all ${
              selected ? 'bg-primary/5 border-primary' : 'bg-surface-card border-border hover:border-border'
            }`}>
            <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${selected ? 'border-primary' : 'border-border'}`}>
              {selected && <div className="w-2 h-2 rounded-full bg-primary" />}
            </div>
            <span className={`text-sm ${selected ? 'text-primary font-semibold' : 'text-on-surface'}`}>{opt.label}</span>
            <input type="radio" className="hidden" checked={selected} onChange={() => onChange(opt.id)} />
          </label>
        );
      })}
    </div>
  );
}

function CheckboxQuestion({ question, value = [], onChange }) {
  const toggle = (id) => onChange(value.includes(id) ? value.filter(v => v !== id) : [...value, id]);
  return (
    <div className="space-y-2 pt-1">
      {question.options.map((opt) => {
        const checked = value.includes(opt.id);
        return (
          <label key={opt.id}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border cursor-pointer transition-all ${checked ? 'bg-primary/5 border-primary' : 'bg-surface-card border-border hover:border-border'}`}>
            <div className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 ${checked ? 'border-primary bg-primary' : 'border-border'}`}>
              {checked && <span className="material-symbols-outlined text-white text-[12px]">check</span>}
            </div>
            <span className={`text-sm ${checked ? 'text-primary font-semibold' : 'text-on-surface'}`}>{opt.label}</span>
            <input type="checkbox" className="hidden" checked={checked} onChange={() => toggle(opt.id)} />
          </label>
        );
      })}
    </div>
  );
}

function TextQuestion({ question, value, onChange }) {
  return question.type === 'long_text' ? (
    <textarea className="field-input resize-none mt-1" placeholder="Your answer..." rows={3}
      value={value || ''} onChange={(e) => onChange(e.target.value)} />
  ) : (
    <input type="text" className="field-input mt-1" placeholder="Your answer..."
      value={value || ''} onChange={(e) => onChange(e.target.value)} />
  );
}

function GridQuestion({ question, value = {}, onChange }) {
  return (
    <div className="space-y-1 pt-1">
      {question.rows.map((row, idx) => (
        <div key={row.id}
          className={`flex items-center justify-between gap-3 py-2.5 ${idx > 0 ? 'border-t border-border-subtle' : ''}`}>
          <p className="text-sm font-medium text-on-surface flex-1 min-w-0 leading-snug">{row.label}</p>
          <div className="flex gap-1 flex-shrink-0">
            {Array.from({ length: (question.scale_max || 5) - (question.scale_min || 1) + 1 },
              (_, i) => i + (question.scale_min || 1)).map((n) => (
              <button key={n} type="button" onClick={() => onChange({ ...value, [row.id]: n })}
                className={`w-8 h-8 rounded-lg font-bold text-xs transition-all active:scale-95 border ${
                  value[row.id] === n ? 'bg-primary text-white border-primary' : 'bg-surface-card border-border text-on-surface-muted hover:border-border'
                }`}>
                {n}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function QuestionInput({ q, answers, setAnswer }) {
  const v = answers[q.id];
  if (q.type === 'rating')                               return <RatingQuestion   question={q} value={v} onChange={val => setAnswer(q.id, val)} />;
  if (q.type === 'mcq' || q.type === 'dropdown')        return <MCQQuestion      question={q} value={v} onChange={val => setAnswer(q.id, val)} />;
  if (q.type === 'checkbox')                             return <CheckboxQuestion question={q} value={v} onChange={val => setAnswer(q.id, val)} />;
  if (q.type === 'short_text' || q.type === 'long_text') return <TextQuestion    question={q} value={v} onChange={val => setAnswer(q.id, val)} />;
  if (q.type === 'grid')                                 return <GridQuestion     question={q} value={v} onChange={val => setAnswer(q.id, val)} />;
  if (q.type === 'date') return (
    <input type="date" className="field-input mt-1"
      value={v || ''} onChange={e => setAnswer(q.id, e.target.value)} />
  );
  if (q.type === 'linear_scale') return (
    <div className="flex gap-1.5 justify-between pt-1">
      {Array.from({ length: (q.scale_max || 10) - (q.scale_min || 1) + 1 },
        (_, i) => i + (q.scale_min || 1)).map(n => (
        <button key={n} type="button" onClick={() => setAnswer(q.id, n)}
          className={`flex-1 py-2 rounded-lg font-bold text-xs border transition-all active:scale-95 ${
            v === n ? 'bg-primary text-white border-primary' : 'bg-surface-card text-on-surface-variant border-border hover:border-border'
          }`}>
          {n}
        </button>
      ))}
    </div>
  );
  return null;
}

// ── One-at-a-time question card ───────────────────────────────

function SingleQuestionCard({ q, index, total, answers, setAnswer, onPrev, onNext, isLast, isPreview }) {
  const answered = isAnswered(q, answers);
  const goNext = () => {
    if (q.required && !answered) { toast.error('Please answer this question before continuing'); return; }
    onNext();
  };
  return (
    <div className="bg-surface-card rounded-xl border-l-4 border-primary shadow-sm p-5 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 flex-1">
          <span className="text-[10px] font-bold text-on-surface-variant/50 w-6 flex-shrink-0">{index + 1}</span>
          <p className="flex-1 text-sm font-medium text-on-surface leading-snug">{q.text}</p>
        </div>
        <span className="text-[10px] text-on-surface-variant/50 font-medium capitalize flex-shrink-0">{q.type.replace('_', ' ')}</span>
      </div>
      {q.required && !answered && (
        <p className="ml-8 text-[10px] text-red-500 font-medium flex items-center gap-1">
          <span className="material-symbols-outlined text-[12px]">error</span>Required
        </p>
      )}
      <div className="ml-8">
        <QuestionInput q={q} answers={answers} setAnswer={setAnswer} />
      </div>
      {!isPreview && (
        <div className="ml-8 flex items-center justify-between pt-2 border-t border-border-subtle">
          <button type="button" onClick={onPrev} disabled={index === 0}
            className="text-xs text-on-surface-variant hover:text-on-surface px-3 py-1.5 rounded-lg hover:bg-surface-variant transition-colors disabled:opacity-30 flex items-center gap-1">
            <span className="material-symbols-outlined text-sm">arrow_back</span>
            Back
          </button>
          <span className="text-[10px] text-on-surface-variant/50">{index + 1} / {total}</span>
          <button type="button" onClick={goNext}
            className="text-xs font-bold text-white bg-primary px-4 py-1.5 rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-1">
            {isLast ? 'Done' : 'Next'}
            <span className="material-symbols-outlined text-sm">arrow_forward</span>
          </button>
        </div>
      )}
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────

export default function FormFillPage() {
  const { shareToken } = useParams();
  const navigate       = useNavigate();
  const location       = useLocation();
  const { user }       = useAuthStore();

  const [form,       setForm]       = useState(null);
  const [answers,    setAnswers]    = useState({});
  const [loading,    setLoading]    = useState(true);
  const [submitting, setSubmitting] = useState(false);
  // 'all' | number (0-based question index for one-at-a-time)
  const [viewMode,   setViewMode]   = useState('all');

  const isPreview = new URLSearchParams(location.search).get('preview') === '1';

  useEffect(() => {
    api.get(`/public/forms/${shareToken}`).then(r => {
      setForm(r.data);
      setLoading(false);
    }).catch((err) => {
      if (err.response?.status === 403)      toast.error(err.response.data.message || 'Access Denied');
      else if (err.response?.status === 401) toast.error('Login required to access this form');
      else                                   toast.error('Form not found or unavailable');
      if (user?.role === 'admin')        navigate('/admin');
      else if (user?.role === 'faculty') navigate('/faculty');
      else                               navigate('/student');
    });
  }, [shareToken, user, navigate]);

  const setAnswer = (qId, val) => setAnswers(a => ({ ...a, [qId]: val }));

  const handleSubmit = async () => {
    const missing = form.questions.filter(q => q.required && !isAnswered(q, answers));
    if (missing.length > 0) {
      toast.error(`${missing.length} required question(s) unanswered`);
      return;
    }
    setSubmitting(true);
    try {
      const builtAnswers = form.questions.map(q => {
        const v = answers[q.id];
        const ans = { question_id: q.id, grid_values: [], selected_option_ids: [] };
        if (q.type === 'rating' || q.type === 'linear_scale') ans.numeric_value = v ?? null;
        else if (q.type === 'short_text' || q.type === 'long_text') ans.text_value = v ?? null;
        else if (q.type === 'date') ans.date_value = v ?? null;
        else if (q.type === 'mcq') ans.selected_option_ids = v ? [v] : [];
        else if (q.type === 'checkbox') ans.selected_option_ids = v ?? [];
        else if (q.type === 'grid') ans.grid_values = Object.entries(v ?? {}).map(([question_row_id, value]) => ({ question_row_id, value }));
        return ans;
      });
      await api.post(`/public/forms/${shareToken}/responses`, {
        respondent_name:  user?.name  ?? null,
        respondent_email: user?.email ?? null,
        answers: builtAnswers,
      });
      navigate(`/f/${shareToken}/success`);
    } catch (err) {
      toast.error(err.message || 'Submission failed');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <FullPageSpinner />;

  const questions     = form.questions;
  const total         = questions.length;
  const answeredCount = questions.filter(q => isAnswered(q, answers)).length;
  const progressPct   = total > 0 ? Math.round((answeredCount / total) * 100) : 0;
  const isOneAtATime  = typeof viewMode === 'number';
  const currentStep   = isOneAtATime ? viewMode : null;

  return (
    <div className="min-h-dvh bg-surface antialiased text-on-surface">

      {/* ── Top bar — mirrors FormBuilderPage ── */}
      <header className="sticky top-0 z-50 glass-nav border-b border-border/70 shadow-sm">
        <div className="max-w-4xl mx-auto px-4">
          {/* Row 1 */}
          <div className="flex items-center justify-between h-14 gap-3">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <button type="button" onClick={() => navigate(-1)}
                className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-surface-variant transition-colors text-on-surface-variant flex-shrink-0">
                <span className="material-symbols-outlined text-sm">arrow_back</span>
              </button>
              <p className="flex-1 font-semibold text-on-surface text-sm truncate min-w-0">{form.title}</p>
              {isPreview && (
                <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full flex-shrink-0 bg-amber-100 text-amber-700">
                  Preview
                </span>
              )}
            </div>

            <div className="flex items-center gap-1 flex-shrink-0">
              {/* Progress indicator */}
              <span className="text-[10px] text-on-surface-variant mr-2">{answeredCount}/{total}</span>

              {/* View mode toggle — 2 small icon buttons */}
              <button type="button"
                onClick={() => setViewMode('all')}
                title="All questions"
                className={`w-9 h-9 flex items-center justify-center rounded-full transition-colors ${
                  !isOneAtATime ? 'bg-primary/10 text-primary' : 'hover:bg-surface-variant text-on-surface-variant'
                }`}>
                <span className="material-symbols-outlined text-sm">list</span>
              </button>
              <button type="button"
                onClick={() => setViewMode(0)}
                title="One at a time"
                className={`w-9 h-9 flex items-center justify-center rounded-full transition-colors ${
                  isOneAtATime ? 'bg-primary/10 text-primary' : 'hover:bg-surface-variant text-on-surface-variant'
                }`}>
                <span className="material-symbols-outlined text-sm">looks_one</span>
              </button>

              {/* Submit button */}
              {!isPreview && (
                <button type="button" onClick={handleSubmit} disabled={submitting}
                  className="ml-1 bg-primary text-white text-xs font-bold px-5 py-2 rounded-full hover:bg-primary/90 active:scale-95 transition-all disabled:opacity-50 flex items-center gap-1.5">
                  {submitting
                    ? <span className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" />
                    : <span className="material-symbols-outlined text-sm">send</span>
                  }
                  Submit
                </button>
              )}
            </div>
          </div>

        </div>
        {/* Progress bar — full width */}
        <div className="h-1 bg-surface-variant">
          <div className="h-1 bg-primary transition-all duration-300" style={{ width: `${progressPct}%` }} />
        </div>
      </header>

      {/* ── Content ── */}
      <main className="max-w-4xl mx-auto px-4 py-6 space-y-3">

        {/* Form header card — mirrors FormBuilderPage header card */}
        <div className="bg-surface-card rounded-xl border-t-4 border-primary shadow-sm p-6">
          <h1 className="text-2xl font-headline font-bold text-on-surface">{form.title}</h1>
          {form.description && (
            <p className="text-sm text-on-surface-variant mt-3 leading-relaxed whitespace-pre-wrap">{form.description}</p>
          )}
          {form.mode === 'academic' && (
            <div className="flex items-center gap-2 mt-3">
              <span className="material-symbols-outlined text-primary text-sm">school</span>
              <span className="text-[10px] text-primary font-bold uppercase tracking-wider">Academic Form</span>
              {form.semester && (
                <span className="text-[10px] text-on-surface-variant">
                  — Sem {form.semester}{form.academic_year ? ` • ${form.academic_year}` : ''}
                </span>
              )}
            </div>
          )}
        </div>

        {/* ── ALL AT ONCE mode ── */}
        {!isOneAtATime && questions.map((q, idx) => (
          <div key={q.id}
            className={`bg-surface-card rounded-xl border-l-4 shadow-sm transition-all ${
              isAnswered(q, answers) ? 'border-emerald-400' : 'border-transparent'
            }`}>
            <div className="p-5">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-2 flex-1">
                  <span className="text-[10px] font-bold text-on-surface-variant/50 w-6 flex-shrink-0">{idx + 1}</span>
                  <p className="flex-1 text-sm font-medium text-on-surface leading-snug">{q.text}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {q.required && !isAnswered(q, answers) && (
                    <span className="text-[9px] font-bold text-red-500 uppercase tracking-wider">Required</span>
                  )}
                  {isAnswered(q, answers) && (
                    <span className="material-symbols-outlined text-emerald-500 text-sm">check_circle</span>
                  )}
                  <span className="text-[10px] text-on-surface-variant/50 font-medium capitalize">{q.type.replace('_', ' ')}</span>
                </div>
              </div>
              <div className="ml-8">
                <QuestionInput q={q} answers={answers} setAnswer={setAnswer} />
              </div>
            </div>
          </div>
        ))}

        {/* ── ONE AT A TIME mode ── */}
        {isOneAtATime && (
          <SingleQuestionCard
            key={questions[currentStep]?.id}
            q={questions[currentStep]}
            index={currentStep}
            total={total}
            answers={answers}
            setAnswer={setAnswer}
            isLast={currentStep === total - 1}
            isPreview={isPreview}
            onPrev={() => setViewMode(v => Math.max(0, v - 1))}
            onNext={() => {
              if (currentStep === total - 1) setViewMode('all');
              else setViewMode(v => v + 1);
            }}
          />
        )}

      </main>

      {/* ── Bottom submit bar (all mode only) ── */}
      {!isOneAtATime && !isPreview && (
        <div className="fixed bottom-0 left-0 right-0 bg-surface-card border-t border-border shadow-[0_-1px_8px_rgba(0,0,0,0.06)]">
          <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
            <span className="text-xs text-on-surface-variant">{answeredCount} of {total} answered</span>
            <button type="button" onClick={handleSubmit} disabled={submitting}
              className="bg-primary text-white text-sm font-bold px-8 py-2.5 rounded-full hover:bg-primary/90 active:scale-95 transition-all disabled:opacity-50 flex items-center gap-2">
              {submitting
                ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                : <><span className="material-symbols-outlined text-sm">send</span>Submit Response</>
              }
            </button>
          </div>
        </div>
      )}

      {/* spacer for bottom bar */}
      {!isOneAtATime && !isPreview && <div className="h-20" />}
    </div>
  );
}
