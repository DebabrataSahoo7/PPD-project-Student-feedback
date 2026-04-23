import { createContext, useContext, useState, useCallback } from 'react';

const LayoutContext = createContext(null);

export function LayoutProvider({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const toggleSidebar = useCallback(() => setSidebarOpen(v => !v), []);
  const closeSidebar  = useCallback(() => setSidebarOpen(false), []);

  return (
    <LayoutContext.Provider value={{ sidebarOpen, toggleSidebar, closeSidebar }}>
      {children}
    </LayoutContext.Provider>
  );
}

export function useLayout() {
  const ctx = useContext(LayoutContext);
  if (!ctx) throw new Error('useLayout must be used within LayoutProvider');
  return ctx;
}
