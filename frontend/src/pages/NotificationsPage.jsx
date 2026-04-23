import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import api from '../lib/api.js';
import PageLayout from '../components/layout/PageLayout.jsx';
import GlassCard from '../components/ui/GlassCard.jsx';
import Button from '../components/ui/Button.jsx';
import EmptyState from '../components/ui/EmptyState.jsx';
import { FullPageSpinner } from '../components/ui/Spinner.jsx';

export default function NotificationsPage() {
  const [notifs,  setNotifs]  = useState([]);
  const [unread,  setUnread]  = useState(0);
  const [loading, setLoading] = useState(true);

  const load = () => api.get('/notifications').then(r => {
    setNotifs(r.data.data);
    setUnread(r.data.unread_count);
    setLoading(false);
  });
  useEffect(() => { load(); }, []);

  const markAll = async () => {
    await api.patch('/notifications/read-all', {});
    toast.success('All marked as read');
    load();
  };

  const markOne = async (id) => {
    await api.patch(`/notifications/${id}/read`, {});
    load();
  };

  return (
    <PageLayout title="Notifications" showBack
      actions={unread > 0 && (
        <button type="button" onClick={markAll} className="text-[10px] font-bold text-primary uppercase tracking-widest">
          Mark all read
        </button>
      )}>
      <div className="page-container space-y-3">
        {loading ? <FullPageSpinner /> : notifs.length === 0 ? (
          <EmptyState icon="notifications_none" title="No notifications" description="You're all caught up!" />
        ) : (
          notifs.map(n => (
            <GlassCard key={n.id} className={`p-5 flex gap-4 items-start cursor-pointer ${!n.is_read ? 'bg-white/30' : ''}`}
              onClick={() => !n.is_read && markOne(n.id)}>
              <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${n.is_read ? 'bg-transparent' : 'bg-primary shadow-[0_0_8px_rgba(79,70,229,0.5)]'}`} />
              <div className="flex-1">
                <p className={`text-sm ${n.is_read ? 'font-medium text-on-surface-variant' : 'font-bold text-on-surface'}`}>{n.message}</p>
                <p className={`text-[10px] font-bold uppercase tracking-widest mt-2 ${n.is_read ? 'text-on-surface-variant/50' : 'text-primary'}`}>
                  {new Date(n.created_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </GlassCard>
          ))
        )}
      </div>
    </PageLayout>
  );
}
