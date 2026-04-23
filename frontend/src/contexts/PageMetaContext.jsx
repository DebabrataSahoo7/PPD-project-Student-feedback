import { createContext, useContext, useState, useEffect } from 'react';

const PageMetaContext = createContext(null);

export function PageMetaProvider({ children }) {
  const [meta, setMeta] = useState({ title: '', showBack: false, centerSlot: null });
  return (
    <PageMetaContext.Provider value={{ meta, setMeta }}>
      {children}
    </PageMetaContext.Provider>
  );
}

export function usePageMeta() {
  return useContext(PageMetaContext);
}

/** Sync title + back state into the persistent TopBar. */
export function useSyncPageMeta(title, showBack) {
  const ctx = useContext(PageMetaContext);
  useEffect(() => {
    if (!ctx) return;
    ctx.setMeta(m => ({ ...m, title, showBack }));
    return () => ctx.setMeta({ title: '', showBack: false, centerSlot: null });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, showBack]);
}

/** Inject an arbitrary React node into the TopBar center slot. */
export function useTopBarCenter(node) {
  const ctx = useContext(PageMetaContext);
  useEffect(() => {
    if (!ctx) return;
    ctx.setMeta(m => ({ ...m, centerSlot: node }));
    return () => ctx.setMeta(m => ({ ...m, centerSlot: null }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [node]);
}
