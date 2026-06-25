import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

// Attach token and impersonation header from localStorage.
// Note: useAuthStore.getState() is used here (not the hook) because this
// interceptor runs outside any React component context.
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  // When impersonating, tell the backend which user to act as.
  // The admin's own token is still sent; the header triggers the
  // HandleImpersonation middleware to swap Auth::user() server-side.
  if (localStorage.getItem('isImpersonating') === 'true') {
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    if (user?.id) {
      config.headers['X-Impersonate-User-Id'] = String(user.id);
    }
  }

  return config;
});

// Handle 401 responses
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('isImpersonating');
      localStorage.removeItem('originalUser');
      localStorage.removeItem('impersonatedRole');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
