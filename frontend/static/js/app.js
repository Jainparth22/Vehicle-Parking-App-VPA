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
      navigate('auth');
      showToast('Logged out successfully', 'info');
    }

    // ── Toast helpers ────────────────────────────────────
    let _toastId = 0;
    function showToast(message, type = 'info') {
      const id = ++_toastId;
      toasts.value.push({ id, message, type });
      setTimeout(() => {
        toasts.value = toasts.value.filter(t => t.id !== id);
      }, 4000);
    }

    function dismissToast(id) {
      toasts.value = toasts.value.filter(t => t.id !== id);
    }

    // ── Notification count ───────────────────────────────
    async function fetchNotifCount() {
      if (!currentUser.value) return;
      try {
        const res = await api.get('/notifications');
        notifCount.value = res.data.filter(n => !n.is_read).length;
      } catch(_) {}
    }

    // ── Check stored token on load ───────────────────────
    onMounted(async () => {
      const token = localStorage.getItem('vpa_token');
      if (token) {
        try {
          const res = await api.get('/auth/me');
          currentUser.value = res.data.user;
          navigate(res.data.user.role === 'admin' ? 'admin-dashboard' : 'user-dashboard');
          fetchNotifCount();
          // Poll notifications every 30s
          setInterval(fetchNotifCount, 30000);
        } catch(_) {
          localStorage.removeItem('vpa_token');
          navigate('auth');
        }
      }
    });

    // ── Computed: which page component ───────────────────
    const pageMap = {
      'auth':              'AuthPage',
      'admin-dashboard':   'AdminDashboard',
      'admin-lot-detail':  'AdminLotDetail',
      'admin-create-lot':  'AdminCreateLot',
      'admin-edit-lot':    'AdminEditLot',
      'admin-users':       'AdminUsers',
      'admin-search':      'AdminSearch',
      'admin-analytics':   'AdminAnalytics',
      'user-dashboard':    'UserDashboard',
      'user-browse-lots':  'UserBrowseLots',
      'user-reserve':      'UserReserve',
      'user-release':      'UserRelease',
      'user-history':      'UserHistory',
      'user-analytics':    'UserAnalytics',
    };

    const activeComponent = computed(() => pageMap[currentPage.value] || 'AuthPage');

    // ── Toast icon helper ────────────────────────────────
    function toastIcon(type) {
      return { success: '✅', error: '❌', info: 'ℹ️', warning: '⚠️' }[type] || 'ℹ️';
    }

    // ── Provide to child components ───────────────────────
    provide('navigate',    navigate);
    provide('showToast',   showToast);
    provide('setUser',     setUser);
    provide('currentUser', currentUser);
    provide('navData',     navPayload);

    return {
      currentPage, navPayload, currentUser, toasts, notifCount,
      activeComponent, navigate, logout, showToast, dismissToast, toastIcon,
    };
  },

  template: `
    <div class="page-wrapper">

      <!-- ── Navbar (hidden on auth page) ── -->
      <nav class="vpa-navbar" v-if="currentUser">
        <button class="navbar-brand" @click="navigate(currentUser.role === 'admin' ? 'admin-dashboard' : 'user-dashboard')" style="background:none;border:none;cursor:pointer">
          <div class="brand-icon">🅿️</div>
          <span>VPA</span>
        </button>

        <div class="navbar-links">
          <!-- Admin nav -->
          <template v-if="currentUser.role === 'admin'">
            <button class="nav-link-btn" :class="{active: currentPage==='admin-dashboard'}" @click="navigate('admin-dashboard')">
              <i class="bi bi-speedometer2"></i> Dashboard
            </button>
            <button class="nav-link-btn" :class="{active: currentPage==='admin-create-lot'}" @click="navigate('admin-create-lot')">
              <i class="bi bi-plus-square"></i> Add Lot
            </button>
            <button class="nav-link-btn" :class="{active: currentPage==='admin-search'}" @click="navigate('admin-search')">
              <i class="bi bi-search"></i> Search
            </button>
            <button class="nav-link-btn" :class="{active: currentPage==='admin-analytics'}" @click="navigate('admin-analytics')">
              <i class="bi bi-bar-chart-line"></i> Analytics
            </button>
            <button class="nav-link-btn" :class="{active: currentPage==='admin-users'}" @click="navigate('admin-users')">
              <i class="bi bi-people"></i> Users
            </button>
          </template>

          <!-- User nav -->
          <template v-else>
            <button class="nav-link-btn" :class="{active: currentPage==='user-dashboard'}" @click="navigate('user-dashboard')">
              <i class="bi bi-house"></i> Home
            </button>
            <button class="nav-link-btn" :class="{active: currentPage==='user-browse-lots'}" @click="navigate('user-browse-lots')">
              <i class="bi bi-search"></i> Find Parking
            </button>
            <button class="nav-link-btn" :class="{active: currentPage==='user-history'}" @click="navigate('user-history')">
              <i class="bi bi-clock-history"></i> History
            </button>
            <button class="nav-link-btn" :class="{active: currentPage==='user-analytics'}" @click="navigate('user-analytics')">
              <i class="bi bi-bar-chart"></i> Summary
            </button>
          </template>

          <!-- Common -->
          <button class="nav-link-btn" style="position:relative" @click="navigate(currentUser.role==='admin'?'admin-dashboard':'user-dashboard')">
            <i class="bi bi-bell"></i>
            <span v-if="notifCount > 0" class="notification-badge">{{ notifCount }}</span>
          </button>
          <button class="nav-link-btn btn-danger-nav" @click="logout">
            <i class="bi bi-box-arrow-right"></i> Logout
          </button>
        </div>
      </nav>

      <!-- ── Page Content ── -->
      <main class="page-content" :class="{'container-fluid': currentUser}">
        <component
