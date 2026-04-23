import { NavLink, useLocation } from 'react-router-dom';
import useAuthStore from '../../store/authStore.js';
import { useLayout } from './LayoutContext.jsx';

const ADMIN_TABS = [
  { to: '/admin', icon: 'home', label: 'Home' },
  { to: '/admin/analytics', icon: 'bar_chart', label: 'Analytics' },
  { to: '/admin/settings', icon: 'settings', label: 'Settings' },
];

const FACULTY_TABS = [
  { to: '/faculty',         icon: 'dashboard', label: 'Home'    },
  { to: '/faculty/history', icon: 'history',   label: 'History' },
  { to: '/faculty/profile', icon: 'person',    label: 'Profile' },
];

const STUDENT_TABS = [
  { to: '/student', icon: 'home', label: 'Home' },
  { to: '/student/profile', icon: 'person', label: 'Profile' },
];

export default function SideNav() {
  const { user } = useAuthStore();
  const location = useLocation();
  const { sidebarOpen, closeSidebar } = useLayout();
  const tabs =
    user?.role === 'student' ? STUDENT_TABS :
    user?.role === 'faculty' ? FACULTY_TABS :
    ADMIN_TABS;

  return (
    <>
      {/*
       * NO scrim on desktop — a heavy dark overlay is a mobile pattern.
       * On desktop the sidebar slides in without dimming the page.
       * Only render a light scrim on mobile (sm:block) if needed.
       */}

      {/* ── Sidebar panel — desktop only ───────────────── */}
      <aside
        className={`
          hidden md:flex fixed top-14 left-0 bottom-0 w-56 z-40
          bg-surface-card
          flex-col py-4 px-3
          transition-transform duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
        style={{
          borderRight: '1px solid var(--color-border)',
          boxShadow: sidebarOpen
            ? '4px 0 12px rgba(0,0,0,0.06)'
            : 'none',
        }}
      >
        <nav className="space-y-1 flex-1">
          {tabs.map((tab) => {
            const isActive =
              location.pathname === tab.to ||
              (tab.to !== '/admin' && tab.to !== '/faculty' && location.pathname.startsWith(tab.to));

            return (
              <NavLink
                key={tab.to}
                to={tab.to}
                onClick={closeSidebar}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-colors
                  ${isActive
                    ? 'bg-primary/10 text-primary'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-800'
                  }`}
              >
                <span className={`material-symbols-outlined text-[20px] ${isActive ? 'filled' : ''}`}>
                  {tab.icon}
                </span>
                {tab.label}
              </NavLink>
            );
          })}
        </nav>

        {/* ── User footer ─────────────────────────────────── */}
        <div className="border-t border-slate-100 pt-3 px-3 py-2">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-primary text-xs font-bold">
                {user?.name?.trim()?.charAt(0)?.toUpperCase() ?? 'U'}
              </span>
            </div>
            <p className="text-xs font-semibold text-slate-800 truncate">{user?.name ?? 'User'}</p>
          </div>
        </div>
      </aside>
    </>
  );
}
