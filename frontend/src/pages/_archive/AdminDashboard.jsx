import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../lib/api.js';
import PageLayout from '../../components/layout/PageLayout.jsx';
import GlassCard from '../../components/ui/GlassCard.jsx';
import FormCard from '../../components/forms/FormCard.jsx';
import { FullPageSpinner } from '../../components/ui/Spinner.jsx';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [stats,   setStats]   = useState({ total: 0, active: 0 });
  const [forms,   setForms]   = useState([]);
  const [notifs,  setNotifs]  = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/forms?page=1&limit=3'),
      api.get('/notifications'),
    ]).then(([formsRes, notifRes]) => {
      const data = formsRes.data.data;
      setForms(data);
      setStats({
        total:  formsRes.data.total,
        active: data.filter(f => f.status === 'published').length,
      });
      setNotifs(notifRes.data.data.slice(0, 3));
    }).catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <FullPageSpinner />;

  return (
    <PageLayout showLogo showNotif notifDot={notifs.some(n => !n.is_read)} avatarSrc={null}>
      <div className="page-container">

        {/* Welcome */}
        <section>
          <p className="section-label">Welcome back, Administrator</p>
          <h2 className="section-title">System Overview</h2>
        </section>

        {/* Stats */}
        <GlassCard className="p-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white/30 p-4 rounded-xl border border-white/20">
              <p className="text-on-surface-variant text-xs font-medium mb-1">Total Forms</p>
              <p className="text-3xl font-extrabold font-headline text-on-surface">{stats.total}</p>
            </div>
            <div className="bg-white/30 p-4 rounded-xl border border-white/20">
              <p className="text-on-surface-variant text-xs font-medium mb-1">Active</p>
              <p className="text-3xl font-extrabold font-headline text-primary">{stats.active}</p>
              <p className="text-[10px] text-on-surface-variant mt-1">Collecting responses</p>
            </div>
          </div>
        </GlassCard>

        {/* Quick Actions */}
        <section className="space-y-3">
          <button onClick={() => navigate('/admin')}
            className="w-full py-4 px-6 bg-primary text-white rounded-2xl font-bold font-headline shadow-primary active:scale-[0.98] transition-all flex items-center justify-center gap-2">
            <span className="material-symbols-outlined">add_circle</span>
            Create Form
          </button>
          <div className="flex gap-3">
            <button onClick={() => navigate('/admin/settings')} className="btn-ghost flex-1">
              <span className="material-symbols-outlined text-base">settings</span>
              Settings
            </button>
            <button onClick={() => navigate('/admin/forms')} className="btn-ghost flex-1">
              <span className="material-symbols-outlined text-base">description</span>
              All Forms
            </button>
          </div>
        </section>

        {/* Recent Forms */}
        <section className="space-y-4">
          <div className="flex justify-between items-center px-1">
            <h3 className="font-headline font-bold text-lg text-on-surface">Recent Forms</h3>
            <span onClick={() => navigate('/admin/forms')} className="text-[10px] font-bold text-primary uppercase tracking-widest cursor-pointer">View All</span>
          </div>
          {forms.length === 0 ? (
            <p className="text-center text-on-surface-variant/60 text-sm py-8">No forms yet. Create your first one!</p>
          ) : forms.map(f => <FormCard key={f.id} form={f} />)}
        </section>

        {/* Notifications */}
        {notifs.length > 0 && (
          <section className="space-y-4">
            <h3 className="font-headline font-bold text-lg text-on-surface px-1">Recent Notifications</h3>
            <GlassCard className="overflow-hidden divide-y divide-white/20">
              {notifs.map(n => (
                <div key={n.id} className={`p-5 flex gap-4 items-start ${n.is_read ? 'bg-transparent' : 'bg-white/20'}`}>
                  <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${n.is_read ? 'bg-transparent' : 'bg-primary shadow-[0_0_8px_rgba(79,70,229,0.5)]'}`} />
                  <div>
                    <p className="text-sm font-bold text-on-surface">{n.message}</p>
                    <p className={`text-[10px] font-bold uppercase tracking-widest mt-2.5 ${n.is_read ? 'text-on-surface-variant/60' : 'text-primary'}`}>
                      {new Date(n.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))}
            </GlassCard>
          </section>
        )}
      </div>
    </PageLayout>
  );
}
