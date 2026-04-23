import { useEffect, useRef, useState, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useLayout } from './LayoutContext.jsx';
import useAuthStore from '../../store/authStore.js';
import api from '../../lib/api.js';

/** Shared press-down style for all icon buttons in the TopBar */
function NavIconButton({ onClick, ariaLabel, children, className = '' }) {
  const [pressed, setPressed] = useState(false);
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      onMouseDown={() => setPressed(true)}
      onMouseUp={() => setPressed(false)}
      onMouseLeave={() => setPressed(false)}
      onTouchStart={() => setPressed(true)}
      onTouchEnd={() => setPressed(false)}
      onTouchCancel={() => setPressed(false)}
      className={`flex items-center justify-center transition-all duration-100 ease-out select-none ${className}`}
      style={{
        transform: pressed ? 'translateY(2px) scale(0.92)' : 'translateY(0) scale(1)',
      }}
    >
      {children}
    </button>
  );
}

export default function TopBar({
  showBrand = false,
  showHamburger = false,
  showBack = false,
  title,
  centerSlot = null,
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const { sidebarOpen, toggleSidebar } = useLayout();
  const { user, clearAuth } = useAuthStore();
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const profileMenuRef = useRef(null);
  const pollRef = useRef(null);

  const userInitial = user?.name?.trim()?.charAt(0)?.toUpperCase() ?? 'U';

  // ── Poll unread count every 30s ───────────────────────────
  const fetchUnread = useCallback(() => {
    if (!user) return;
    api.get('/notifications?unread=true')
      .then(r => setUnreadCount(r.data.unread_count ?? 0))
      .catch(() => {});
  }, [user]);

  useEffect(() => {
    fetchUnread();
    pollRef.current = setInterval(fetchUnread, 30_000);
    return () => clearInterval(pollRef.current);
  }, [fetchUnread]);

  // Reset unread badge when user visits notifications page
  useEffect(() => {
    if (location.pathname === '/notifications') {
      setUnreadCount(0);
    }
  }, [location.pathname]);

  useEffect(() => {
    setProfileMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!profileMenuOpen) return undefined;
    const handlePointerDown = (e) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target)) {
        setProfileMenuOpen(false);
      }
    };
    const handleKeyDown = (e) => { if (e.key === 'Escape') setProfileMenuOpen(false); };
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [profileMenuOpen]);

  const handleLogout = () => {
    setProfileMenuOpen(false);
    clearAuth();
    navigate('/login');
  };

  const goToNotifications = () => {
    if (location.pathname !== '/notifications') navigate('/notifications');
  };

  return (
    <header className="sticky top-0 z-50 w-full glass-nav border-b border-border shadow-[0_1px_4px_rgba(0,0,0,0.04)]">
      <div className="flex items-center h-14 px-4 gap-2">

        {/* ── Left: hamburger / back / brand ── */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {showHamburger && !showBack && (
            <NavIconButton
              onClick={toggleSidebar}
              ariaLabel={sidebarOpen ? 'Close menu' : 'Open menu'}
              className="hidden md:flex w-10 h-10 rounded-xl hover:bg-surface-variant text-on-surface-variant"
            >
              <span
                className="material-symbols-outlined text-[22px] transition-transform duration-300"
                style={{ transform: sidebarOpen ? 'rotate(90deg)' : 'rotate(0deg)' }}
              >
                {sidebarOpen ? 'close' : 'menu'}
              </span>
            </NavIconButton>
          )}

          {showBack && (
            <NavIconButton
              onClick={() => navigate(-1)}
              ariaLabel="Go back"
              className="w-10 h-10 rounded-xl hover:bg-surface-variant text-on-surface-variant"
            >
              <span className="material-symbols-outlined text-[20px]">arrow_back</span>
            </NavIconButton>
          )}

          {showBrand && !centerSlot && (
            <span
              className="text-xl tracking-tight text-primary select-none"
              style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700 }}
            >
              FormBit
            </span>
          )}
        </div>

        {/* ── Centre: search slot or page title ── */}
        <div className="flex-1 min-w-0 flex items-center justify-center">
          {centerSlot ? (
            centerSlot
          ) : (
            !showBrand && title && (
              <h1 className="font-headline font-bold text-on-surface text-base truncate">
                {title}
              </h1>
            )
          )}
        </div>

        {/* ── Right: bell (always) + profile (home only) ── */}
        <div className="flex items-center gap-1 flex-shrink-0 relative" ref={profileMenuRef}>

          {/* Notification bell — visible on every page */}
          <NavIconButton
            onClick={goToNotifications}
            ariaLabel={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
            className="relative w-10 h-10 rounded-xl hover:bg-surface-variant text-on-surface-variant"
          >
            <span className="material-symbols-outlined text-[22px]">notifications</span>
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center leading-none">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </NavIconButton>

          {/* Profile avatar — home pages only */}
          {showBrand && (
            <NavIconButton
              onClick={() => setProfileMenuOpen((open) => !open)}
              ariaLabel="Profile"
              className={`w-9 h-9 rounded-full border-2 overflow-hidden ${
                profileMenuOpen
                  ? 'border-primary shadow-[0_0_0_3px_rgba(79,70,229,0.12)]'
                  : 'border-primary/30 hover:border-primary'
              } bg-primary/10`}
            >
              <span className="text-primary text-sm font-bold">{userInitial}</span>
            </NavIconButton>
          )}

          {/* Profile dropdown */}
          {profileMenuOpen && (
            <div
              className="absolute right-0 top-[calc(100%+0.75rem)] z-50 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-lg border border-border bg-surface-card text-on-surface shadow-elevated"
              role="menu"
            >
              <div className="py-1.5">
                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full px-4 py-3 flex items-center gap-3 text-left text-on-surface hover:bg-surface-variant transition-colors"
                  role="menuitem"
                >
                  <span className="w-9 h-9 rounded-lg bg-red-50 text-red-500 border border-red-100 flex items-center justify-center flex-shrink-0">
                    <span className="material-symbols-outlined text-[20px]">logout</span>
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-red-600">Sign Out</p>
                    <p className="text-xs text-on-surface-muted mt-0.5">Clear session and return to login</p>
                  </div>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
