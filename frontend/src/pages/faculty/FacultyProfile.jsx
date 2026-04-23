import { useNavigate } from 'react-router-dom';
import useAuthStore from '../../store/authStore.js';
import PageLayout from '../../components/layout/PageLayout.jsx';
import GlassCard from '../../components/ui/GlassCard.jsx';
import PressButton from '../../components/ui/PressButton.jsx';

export default function FacultyProfile() {
  const navigate = useNavigate();
  const { user, clearAuth } = useAuthStore();

  const handleLogout = () => {
    clearAuth();
    navigate('/login');
  };

  return (
    <PageLayout title="Profile">
      <div className="max-w-xl mx-auto py-8 space-y-8">

        {/* Avatar + Name */}
        <section className="flex flex-col items-center justify-center gap-4">
          <div className="w-32 h-32 rounded-full overflow-hidden border border-white/50 shadow-lg bg-white/40 backdrop-blur-md flex items-center justify-center">
            <span className="material-symbols-outlined text-primary text-6xl">person</span>
          </div>
          <div className="text-center">
            <h2 className="text-3xl font-headline font-extrabold text-on-surface tracking-tight mb-1">
              {user?.name}
            </h2>
            <p className="text-sm font-medium text-on-surface-variant flex items-center justify-center gap-1">
              <span className="w-2 h-2 rounded-full bg-primary shadow-[0_0_8px_rgba(79,70,229,0.5)]" />
              Teacher
            </p>
          </div>
        </section>

        {/* Info Cards */}
        <section className="flex flex-col gap-4">
          <GlassCard className="p-6">
            <h3 className="font-headline font-bold text-on-surface-variant text-[10px] uppercase tracking-widest mb-4">
              Personal Details
            </h3>
            <div className="flex flex-col gap-6">
              <div>
                <p className="text-xs text-on-surface-muted mb-1 font-medium">Full Name</p>
                <p className="text-base font-semibold text-on-surface">{user?.name ?? 'Not available'}</p>
              </div>
              <div>
                <p className="text-xs text-on-surface-muted mb-1 font-medium">Email Address</p>
                <p className="text-base font-semibold text-on-surface break-all">{user?.email ?? 'Not available'}</p>
              </div>
            </div>
          </GlassCard>

          <GlassCard className="p-6">
            <h3 className="font-headline font-bold text-on-surface-variant text-[10px] uppercase tracking-widest mb-4">
              Account
            </h3>
            <div>
              <p className="text-xs text-on-surface-muted mb-1 font-medium">Role</p>
              <div className="inline-flex items-center justify-center px-3 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 mt-1">
                <span className="text-xs font-bold uppercase tracking-wider">Faculty</span>
              </div>
            </div>
          </GlassCard>
        </section>

        {/* Logout */}
        <section>
          <PressButton onClick={handleLogout}>
            <span className="flex items-center justify-center gap-2">
              <span className="material-symbols-outlined text-[20px]">logout</span>
              Logout
            </span>
          </PressButton>
        </section>
      </div>
    </PageLayout>
  );
}
