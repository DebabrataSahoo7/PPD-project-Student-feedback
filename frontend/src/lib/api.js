import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api/v1',
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT on every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('sfc_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Global error normalisation + auto-logout on 401
api.interceptors.response.use(
  (res) => res,
  (err) => {
    const status  = err.response?.status;
    const message = err.response?.data?.message || 'Something went wrong';

    // Stale token — clear auth and redirect to login
    if (status === 401) {
      localStorage.removeItem('sfc_token');
      localStorage.removeItem('sfc_user');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }

    return Promise.reject({ ...err, message });
  }
);

export default api;
