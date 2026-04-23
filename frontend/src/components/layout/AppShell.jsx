import { Outlet, useLocation } from 'react-router-dom';
import { PageMetaProvider, usePageMeta } from '../../contexts/PageMetaContext.jsx';
import TopBar from './TopBar.jsx';
import SideNav from './SideNav.jsx';
import BottomNav from './BottomNav.jsx';

/**
 * Route classification:
 *
 *  HOME  → brand logo + hamburger (desktop)
 *  NAV   → hamburger + page title, bottom nav visible (analytics, settings, etc.)
 *  SUB   → ← back + page title, no nav chrome (form builder, all-forms list, etc.)
 *
 * /admin/forms is intentionally SUB — it's a drill-down, not a tab.
 */

const HOME_ROUTES = new Set(['/admin', '/faculty', '/student']);

const NAV_TITLES = {
  '/admin/analytics':   'Analytics',
  '/admin/settings':    'Settings',
  '/faculty/forms':     'Forms',
  '/faculty/history':   'History',
  '/faculty/analytics': 'Analytics',
  '/faculty/profile':   'Profile',
  '/student/profile':   'Profile',
};

function ShellInner() {
  const location = useLocation();
  const { meta }  = usePageMeta();

  const isHome = HOME_ROUTES.has(location.pathname);
  const navTitle = NAV_TITLES[location.pathname];
  const isNav  = !!navTitle;
  const isSub  = !isHome && !isNav;

  const showNavChrome = isHome || isNav;

  return (
    <div className="min-h-dvh flex flex-col bg-surface">
      <TopBar
        showBrand={isHome}
        showHamburger={isHome || isNav}
        showBack={isSub}
        title={isNav ? navTitle : isSub ? meta.title : undefined}
        centerSlot={meta.centerSlot}  // injected by pages (e.g. FormsListPage search)
      />
      <div className="flex flex-1 min-h-0">
        {showNavChrome && <SideNav />}
        <main className="flex-1 min-w-0">
          <Outlet />
        </main>
      </div>
      {showNavChrome && <BottomNav />}
    </div>
  );
}

export default function AppShell() {
  return (
    <PageMetaProvider>
      <ShellInner />
    </PageMetaProvider>
  );
}
