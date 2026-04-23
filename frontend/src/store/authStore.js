import { create } from 'zustand';

const useAuthStore = create((set) => ({
  user:  JSON.parse(localStorage.getItem('sfc_user') || 'null'),
  token: localStorage.getItem('sfc_token') || null,

  setAuth: (token, user) => {
    localStorage.setItem('sfc_token', token);
    localStorage.setItem('sfc_user', JSON.stringify(user));
    set({ token, user });
  },

  clearAuth: () => {
    localStorage.removeItem('sfc_token');
    localStorage.removeItem('sfc_user');
    set({ token: null, user: null });
  },
}));

export default useAuthStore;
