import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../../store/authStore.js';
import PageLayout from '../../components/layout/PageLayout.jsx';

export default function StudentHome() {
  const navigate = useNavigate();
  const { user }  = useAuthStore();
  const [token, setToken] = useState('');

  const handleOpen = (e) => {
    e.preventDefault();
    const t = token.trim();
    if (!t) return;
    const extracted = t.includes('/f/') ? t.split('/f/').pop().split('/')[0] : t;
    navigate(`/f/${extracted}`);
  };

  return (
    <PageLayout title="Home">
      {/* Centered, max-width constrained, comfortable on all screen sizes */}
      <div className="max-w-lg mx-auto py-6 px-4 space-y-6">

        {/* Greeting */}
        <div>
          <p className="text-xs text-on-surface-muted font-medium uppercase tracking-wider">Welcome back</p>
          <h1 className="text-2xl font-bold text-on-surface font-headline mt-0.5">
            {user?.name?.split(' ')[0] ?? 'Student'}
          </h1>
          {user?.registration_number && (
            <p className="text-xs text-on-surface-muted mt-0.5 font-mono">{user.registration_number}</p>
          )}
        </div>

        {/* Open form card */}
        <div className="bg-surface-card border border-border rounded-xl p-5 shadow-card">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
              <span className="material-symbols-outlined text-primary text-xl">link</span>
            </div>
            <div>
              <p className="font-semibold text-on-surface text-sm">Open a Feedback Form</p>
              <p className="text-xs text-on-surface-muted mt-0.5">Paste the share link from your faculty</p>
            </div>
          </div>
          <form onSubmit={handleOpen} className="flex gap-2">
            <input
              className="field-input flex-1"
              placeholder="Paste share link or token..."
              value={token}
              onChange={e => setToken(e.target.value)}
              aria-label="Form share link or token"
            />
            <button type="submit" className="btn-primary px-4 flex-shrink-0 rounded-lg">
              <span className="material-symbols-outlined text-[18px]">open_in_new</span>
            </button>
          </form>
        </div>

        {/* Info cards */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-surface-card border border-border rounded-xl p-4 shadow-card">
            <span className="material-symbols-outlined text-indigo-500 text-2xl mb-2 block">assignment</span>
            <p className="text-xs font-semibold text-on-surface-variant leading-snug">
              Forms are shared via link by your faculty or admin
            </p>
          </div>
          <div className="bg-surface-card border border-border rounded-xl p-4 shadow-card">
            <span className="material-symbols-outlined text-emerald-500 text-2xl mb-2 block">verified_user</span>
            <p className="text-xs font-semibold text-on-surface-variant leading-snug">
              Academic forms require login — you're signed in
            </p>
          </div>
        </div>

        {/* How it works */}
        <div className="bg-surface-card border border-border rounded-xl p-5 shadow-card">
          <p className="text-xs font-bold text-on-surface-muted uppercase tracking-wider mb-3">How it works</p>
          <div className="space-y-3">
            {[
              { icon: 'share', text: 'Your faculty shares a form link with you' },
              { icon: 'content_paste', text: 'Paste the link above and open the form' },
              { icon: 'rate_review', text: 'Fill in your feedback and submit' },
            ].map((step, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="material-symbols-outlined text-primary text-[14px]">{step.icon}</span>
                </div>
                <p className="text-sm text-on-surface-variant leading-snug">{step.text}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </PageLayout>
  );
}
