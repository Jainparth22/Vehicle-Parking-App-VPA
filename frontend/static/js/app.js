/* ======================================================
   app.js — Vue 3 main application (CDN, no build step)
   ====================================================== */

const { createApp, ref, computed, provide, onMounted } = Vue;

// ── Axios instance with auth header ───────────────────────
const api = axios.create({ baseURL: '/api' });
api.interceptors.request.use(config => {
  const token = localStorage.getItem('vpa_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
api.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('vpa_token');
      // Reload triggers auth page
      window.location.reload();
    }
    return Promise.reject(err);
  }
);

// ── Root App ───────────────────────────────────────────────
const VPA = {
  components: {
    AuthPage,
    AdminDashboard,
    AdminLotDetail,
    AdminCreateLot,
    AdminEditLot,
    AdminUsers,
    AdminSearch,
    AdminAnalytics,
    UserDashboard,
    UserBrowseLots,
