import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import clsx from 'clsx';
import useAuthStore from '../../store/authStore.js';

const ADMIN_TABS = [
  { to: '/admin',           icon: 'home',      label: 'Home'      },
  { to: '/admin/analytics', icon: 'bar_chart', label: 'Analytics' },
  { to: '/admin/settings',  icon: 'settings',  label: 'Settings'  },
];

const FACULTY_TABS = [
  { to: '/faculty',         icon: 'dashboard', label: 'Home'    },
  { to: '/faculty/history', icon: 'history',   label: 'History' },
  { to: '/faculty/profile', icon: 'person',    label: 'Profile' },
];

const STUDENT_TABS = [
  { to: '/student',         icon: 'home',   label: 'Home'    },
  { to: '/student/profile', icon: 'person', label: 'Profile' },
];

export default function BottomNav() {
  const { user }   = useAuthStore();
  const location   = useLocation();
  
  const tabs = 
    user?.role === 'student' ? STUDENT_TABS :
    user?.role === 'faculty' ? FACULTY_TABS : 
    ADMIN_TABS;

  return (
    // hidden on desktop — replaced by SideNav
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-border/50 glass-nav shadow-[0_-1px_8px_rgba(0,0,0,0.04)]">
      <div className="flex justify-around items-center max-w-2xl mx-auto h-14 px-2">
        {tabs.map((tab) => {
          const isActive =
            location.pathname === tab.to ||
            (tab.to !== '/admin' && tab.to !== '/faculty' && tab.to !== '/student' && location.pathname.startsWith(tab.to));

          return (
            <NavLink
              key={tab.to}
              to={tab.to}
              className={clsx(
                'flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-colors',
                isActive ? 'text-primary' : 'text-on-surface-variant hover:text-on-surface'
              )}
            >
              <span className={clsx('material-symbols-outlined text-[20px]', isActive && 'filled')}>
                {tab.icon}
              </span>
              <span className={clsx('text-[9px] font-semibold', isActive ? 'text-primary' : 'text-on-surface-variant')}>
                {tab.label}
              </span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
