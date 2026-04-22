import axios from 'axios';

const API_BASE = '/api';

const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('aquasentinel_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 responses
api.interceptors.response.use(
  (res) => res,
  (err) => {
    // Only redirect if it's a 401 AND it's not a login attempt
    if (err.response?.status === 401 && !err.config.url.includes('/auth/login')) {
      localStorage.removeItem('aquasentinel_token');
      localStorage.removeItem('aquasentinel_user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

// Auth
export const login = (data) => api.post('/auth/login', data);
export const register = (data) => api.post('/auth/register', data);
export const getMe = () => api.get('/auth/me');

// Live AIS Data (AISStream)
export const fetchLiveData = () => api.get('/live-data');

// Vessels (DB)
export const getVessels = () => api.get('/vessels');
export const getVessel = (id) => api.get(`/vessels/${id}`);

// Anomalies
export const getAnomalies = () => api.get('/anomalies');

// Spills
export const getSpills = () => api.get('/spills');

// Alerts
export const getAlerts = () => api.get('/alerts');
export const acknowledgeAlert = (id) => api.post(`/alerts/${id}/acknowledge`);

// Stats
export const getStats = () => api.get('/stats');

// Detection (Phase 12: Interactive)
export const detectAnomalies = () => api.post('/detect/anomalies');
export const runSatelliteAnalysis = (data) => api.post('/detect/satellite', data);

// Legacy Detection (kept for compatibility)
export const runDetection = () => api.post('/detect');

// SOS
export const triggerSOS = (data) => api.post('/sos', data);

// Report
export const downloadReport = (spillId) =>
  api.get(`/report/${spillId}`, { responseType: 'blob' });

// Settings
export const getSettings = () => api.get('/settings');
export const updateSettings = (data) => api.post('/settings', data);
export const testSmtpConnection = (data) => api.post('/settings/test_smtp', data);

export default api;
