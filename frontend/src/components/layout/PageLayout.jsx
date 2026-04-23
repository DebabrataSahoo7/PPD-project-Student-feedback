import { useSyncPageMeta } from '../../contexts/PageMetaContext.jsx';

/**
 * PageLayout is now a pure content wrapper + AppShell TopBar syncer.
 *
 * - title / showBack → synced into the persistent TopBar via context
 * - wide             → switches to 4xl max-width for wide layouts
 * - Sub-pages (showBack=true) don't have a bottom nav, so no extra bottom padding
 */
export default function PageLayout({ children, title = '', showBack = false, wide = false }) {
  useSyncPageMeta(title, showBack);

  // Sub-pages have no bottom nav, so use regular bottom padding
  // Nav/home pages need pb-24 on mobile to clear the bottom nav bar
  const cls = wide
    ? 'page-content-wide'
    : showBack
    ? 'page-content-sub'
    : 'page-content';

  return <div className={cls}>{children}</div>;
}
