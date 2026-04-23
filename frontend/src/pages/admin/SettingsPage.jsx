import { useNavigate } from 'react-router-dom';
import useAuthStore from '../../store/authStore.js';
import PageLayout from '../../components/layout/PageLayout.jsx';

const SECTIONS = [
  {
    label: 'Academic',
    items: [
      { icon: 'account_balance', label: 'Programmes & Branches', sub: 'Manage academic programmes and branches', to: '/admin/settings/programmes', color: 'bg-indigo-50 text-indigo-600' },
      { icon: 'school',          label: 'Academic Workspace',    sub: 'Subjects, COs, dimension mapping & faculty — all in one place', to: '/admin/settings/academic-workspace', color: 'bg-primary/10 text-primary' },
    ],
  },
  {
    label: 'Users',
    items: [
      { icon: 'upload_file',     label: 'Import Users',   sub: 'Bulk import students and faculty from CSV', to: '/admin/settings/students/import', color: 'bg-emerald-50 text-emerald-600' },
      { icon: 'manage_accounts', label: 'Manage Users',   sub: 'View and manage all registered users',      to: '/admin/settings/users',           color: 'bg-blue-50 text-blue-600' },
    ],
  },
  {
    label: 'System',
    items: [
      { icon: 'notifications', label: 'Notifications', sub: 'View system alerts and milestones', to: '/admin/notifications', color: 'bg-surface-variant text-on-surface-variant' },
    ],
  },
];

export default function SettingsPage() {
  const navigate  = useNavigate();
  const clearAuth = useAuthStore(s => s.clearAuth);

  return (
    <PageLayout title="Settings">
      <div className="space-y-6">
        {SECTIONS.map(section => (
          <section key={section.label}>
            <p className="text-xs font-semibold text-on-surface-muted uppercase tracking-wider mb-2 px-1">{section.label}</p>
            <div className="card divide-y divide-border-subtle">
              {section.items.map(item => (
                <button key={item.to} type="button" onClick={() => navigate(item.to)}
                  className="w-full flex items-center gap-4 px-4 py-3.5 hover:bg-surface transition-colors text-left group">
                  <div className={`w-9 h-9 rounded-lg ${item.color} flex items-center justify-center flex-shrink-0`}>
                    <span className="material-symbols-outlined text-[18px]">{item.icon}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-on-surface">{item.label}</p>
                    <p className="text-xs text-on-surface-muted mt-0.5">{item.sub}</p>
                  </div>
                  <span className="material-symbols-outlined text-on-surface-muted text-[20px] group-hover:translate-x-0.5 transition-transform">chevron_right</span>
                </button>
              ))}
            </div>
          </section>
        ))}

        {/* Sign out */}
        <div className="card divide-y divide-border-subtle">
          <button type="button" onClick={() => { clearAuth(); navigate('/login'); }}
            className="w-full flex items-center gap-4 px-4 py-3.5 hover:bg-red-50 transition-colors text-left group">
            <div className="w-9 h-9 rounded-lg bg-red-50 text-red-500 flex items-center justify-center flex-shrink-0">
              <span className="material-symbols-outlined text-[18px]">logout</span>
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-red-600">Sign Out</p>
              <p className="text-xs text-on-surface-muted mt-0.5">Clear session and return to login</p>
            </div>
          </button>
        </div>
      </div>
    </PageLayout>
  );
}
