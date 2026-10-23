import axios from 'axios';
import { AUTH_ENDPOINTS } from './endPoints';

// One axios instance for the whole app: always sends the httpOnly session
// cookies and transparently renews an expired access token once.
const client = axios.create({
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
  timeout: 20000,
});

let refreshing = null;
let onSessionExpired = () => {};

export const setSessionExpiredHandler = (handler) => {
  onSessionExpired = handler;
};

const NO_RETRY = [AUTH_ENDPOINTS.REFRESH, AUTH_ENDPOINTS.SIGN_IN, AUTH_ENDPOINTS.SIGN_UP, AUTH_ENDPOINTS.LOGOUT];

client.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    const status = error.response?.status;
    if (status !== 401 || !original || original._retried || NO_RETRY.some((url) => original.url?.startsWith(url))) {
      return Promise.reject(error);
    }
    original._retried = true;
    try {
      refreshing = refreshing || client.post(AUTH_ENDPOINTS.REFRESH);
      await refreshing;
    } catch (refreshError) {
      onSessionExpired();
      return Promise.reject(error);
    } finally {
      refreshing = null;
    }
    return client(original);
  }
);

// Human-readable message from any API error.
export const getErrorMessage = (error, fallback = 'Something went wrong. Please try again.') => {
  if (!error) return fallback;
  if (typeof error === 'string') return error;
  const data = error.response?.data ?? error.data ?? error;
  if (typeof data === 'string' && data.trim()) return data;
  if (data?.message && typeof data.message === 'string') return data.message;
  if (error.code === 'ECONNABORTED') return 'The server took too long to respond.';
  if (error.request && !error.response) return 'Cannot reach the server. Check your connection.';
  return fallback;
};

export default client;
