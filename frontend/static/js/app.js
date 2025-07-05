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
    UserReserve,
    UserRelease,
    UserHistory,
    UserAnalytics,
  },

  setup() {
    const currentPage = ref('auth');
    const navPayload  = ref(null);       // extra data passed to a page
    const currentUser = ref(null);
    const toasts      = ref([]);
    const notifCount  = ref(0);

    // ── Navigation ───────────────────────────────────────
    function navigate(page, data = null) {
      currentPage.value = page;
      navPayload.value  = data;
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    // ── Auth helpers ─────────────────────────────────────
    function setUser(user) { currentUser.value = user; }

    async function logout() {
      try { await api.post('/auth/logout'); } catch(_) {}
      localStorage.removeItem('vpa_token');
      currentUser.value = null;
