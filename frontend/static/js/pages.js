/* ======================================================
   pages.js — Vue 3 page components (CDN, no build step)
   ====================================================== */

// ── Auth Page ──────────────────────────────────────────────
const AuthPage = {
  setup() {
    const { ref, inject } = Vue;
    const navigate = inject('navigate');
    const showToast = inject('showToast');
    const setUser  = inject('setUser');

    const tab       = ref('login');
    const loading   = ref(false);
    const loginForm = ref({ email: '', password: '' });
    const regForm   = ref({ email: '', password: '', full_name: '', address: '', pin_code: '' });

    async function handleLogin() {
      if (!loginForm.value.email || !loginForm.value.password) {
        showToast('Please fill in all fields', 'error'); return;
      }
      loading.value = true;
      try {
        const res = await api.post('/auth/login', loginForm.value);
        localStorage.setItem('vpa_token', res.data.token);
        setUser(res.data.user);
        showToast(`Welcome back, ${res.data.user.full_name || res.data.user.email}!`, 'success');
        navigate(res.data.user.role === 'admin' ? 'admin-dashboard' : 'user-dashboard');
      } catch(e) {
        showToast(e.response?.data?.error || 'Login failed', 'error');
      } finally { loading.value = false; }
    }

    async function handleRegister() {
      if (!regForm.value.email || !regForm.value.password || !regForm.value.full_name) {
        showToast('Email, password, and full name are required', 'error'); return;
      }
      loading.value = true;
      try {
        const res = await api.post('/auth/register', regForm.value);
        localStorage.setItem('vpa_token', res.data.token);
        setUser(res.data.user);
        showToast('Registration successful! Welcome! 🎉', 'success');
        navigate('user-dashboard');
      } catch(e) {
        showToast(e.response?.data?.error || 'Registration failed', 'error');
      } finally { loading.value = false; }
    }

    return { tab, loading, loginForm, regForm, handleLogin, handleRegister };
  },
  template: `
    <div class="auth-page">
      <div class="auth-card">
        <div class="auth-logo">
          <div class="logo-icon">🅿️</div>
          <h2 style="margin-bottom:0.25rem">Vehicle Parking App</h2>
          <p class="text-muted text-sm">Smart parking management</p>
        </div>

        <div class="auth-tabs">
          <button class="auth-tab" :class="{ active: tab === 'login' }" @click="tab='login'">Login</button>
          <button class="auth-tab" :class="{ active: tab === 'register' }" @click="tab='register'">Register</button>
        </div>

        <!-- LOGIN -->
        <form v-if="tab === 'login'" @submit.prevent="handleLogin">
          <div class="form-group">
            <label class="form-label">Email Address</label>
            <input v-model="loginForm.email" type="email" class="form-control" placeholder="admin@parkingapp.com" required/>
          </div>
          <div class="form-group">
            <label class="form-label">Password</label>
            <input v-model="loginForm.password" type="password" class="form-control" placeholder="Enter password" required/>
          </div>
          <button type="submit" class="btn-vpa w-100" style="justify-content:center;padding:0.75rem" :disabled="loading">
            <span v-if="loading" class="loader-ring" style="width:16px;height:16px;border-width:2px"></span>
            <span v-else>🔐 Sign In</span>
          </button>
          <p class="text-center mt-2 text-sm text-muted">No registration needed for Admin</p>
        </form>

        <!-- REGISTER -->
        <form v-else @submit.prevent="handleRegister">
          <div class="form-group">
            <label class="form-label">Full Name</label>
            <input v-model="regForm.full_name" type="text" class="form-control" placeholder="Your full name" required/>
          </div>
          <div class="form-group">
            <label class="form-label">Email ID (Username)</label>
            <input v-model="regForm.email" type="email" class="form-control" placeholder="you@email.com" required/>
          </div>
          <div class="form-group">
            <label class="form-label">Password</label>
            <input v-model="regForm.password" type="password" class="form-control" placeholder="Min 6 characters" required/>
          </div>
          <div class="grid-2">
            <div class="form-group">
              <label class="form-label">Address</label>
              <input v-model="regForm.address" type="text" class="form-control" placeholder="Street address"/>
            </div>
            <div class="form-group">
              <label class="form-label">Pin Code</label>
              <input v-model="regForm.pin_code" type="text" class="form-control" placeholder="6-digit PIN" maxlength="6"/>
            </div>
          </div>
          <button type="submit" class="btn-vpa w-100" style="justify-content:center;padding:0.75rem" :disabled="loading">
            <span v-if="loading" class="loader-ring" style="width:16px;height:16px;border-width:2px"></span>
            <span v-else>🚀 Create Account</span>
          </button>
          <p class="text-center mt-2 text-sm text-muted">Admin login? Use the Login tab.</p>
        </form>
      </div>
    </div>
  `
};

// ── Admin Dashboard ────────────────────────────────────────
const AdminDashboard = {
  setup() {
    const { ref, onMounted, inject } = Vue;
    const navigate   = inject('navigate');
    const showToast  = inject('showToast');
    const navData    = inject('navData');
    const stats      = ref(null);
    const loading    = ref(true);

    async function load() {
      try {
        const res = await api.get('/admin/dashboard');
        stats.value = res.data;
      } catch(e) {
        showToast('Failed to load dashboard', 'error');
      } finally { loading.value = false; }
    }

    async function deleteLot(lot) {
      if (!confirm(`Delete "${lot.prime_location_name}"? This cannot be undone.`)) return;
      try {
        await api.delete(`/admin/lots/${lot.id}`);
        showToast(`"${lot.prime_location_name}" deleted`, 'success');
        load();
      } catch(e) {
        showToast(e.response?.data?.error || 'Delete failed', 'error');
      }
    }

    onMounted(load);

    return { stats, loading, navigate, deleteLot };
  },
  template: `
    <div>
      <div class="flex-between mb-4">
        <div>
          <h1 style="margin-bottom:0.2rem">Admin Dashboard</h1>
          <p class="text-muted text-sm">Welcome back, Admin 👋</p>
        </div>
        <div class="flex-gap flex-wrap">
          <button class="btn-vpa" @click="navigate('admin-create-lot')">
            <i class="bi bi-plus-lg"></i> Add Parking Lot
          </button>
          <button class="btn-vpa-outline" @click="navigate('admin-analytics')">
            <i class="bi bi-bar-chart"></i> Analytics
          </button>
        </div>
      </div>

      <div v-if="loading" class="page-loader">
        <div class="loader-ring" style="width:40px;height:40px;border-width:3px"></div>
        <p class="text-muted">Loading dashboard…</p>
      </div>

      <template v-else-if="stats">
        <!-- Stat Cards -->
        <div class="grid-4 mb-4">
          <div class="stat-card accent-blue">
            <p class="stat-label">Total Lots</p>
            <p class="stat-number">{{ stats.total_lots }}</p>
            <i class="bi bi-building stat-icon"></i>
          </div>
          <div class="stat-card accent-green">
            <p class="stat-label">Available Spots</p>
            <p class="stat-number" style="color:var(--success)">{{ stats.available_spots }}</p>
            <i class="bi bi-p-circle stat-icon"></i>
          </div>
          <div class="stat-card accent-red">
            <p class="stat-label">Occupied Spots</p>
            <p class="stat-number" style="color:var(--highlight)">{{ stats.occupied_spots }}</p>
            <i class="bi bi-car-front stat-icon"></i>
          </div>
          <div class="stat-card accent-yellow">
            <p class="stat-label">Total Revenue</p>
            <p class="stat-number" style="color:var(--warning)">₹{{ stats.total_revenue.toFixed(0) }}</p>
            <i class="bi bi-currency-rupee stat-icon"></i>
          </div>
        </div>

        <div class="grid-2 mb-4">
          <div class="glass-card-flat">
            <p class="stat-label mb-2">Occupancy Rate</p>
            <p style="font-size:1.5rem;font-weight:700">{{ stats.occupancy_rate }}%</p>
            <div style="background:rgba(255,255,255,0.08);border-radius:4px;height:6px;margin-top:0.75rem">
              <div :style="{width: stats.occupancy_rate+'%', background:'linear-gradient(90deg,var(--highlight),var(--highlight-soft))', height:'100%', borderRadius:'4px', transition:'width 1s ease'}"></div>
            </div>
          </div>
          <div class="glass-card-flat">
            <div class="flex-between">
              <div>
                <p class="stat-label mb-1">Active Reservations</p>
                <p style="font-size:1.5rem;font-weight:700;color:var(--warning)">{{ stats.active_reservations }}</p>
              </div>
              <div style="text-align:right">
                <p class="stat-label mb-1">Total Users</p>
                <p style="font-size:1.5rem;font-weight:700">{{ stats.total_users }}</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Parking Lots Grid -->
        <div class="flex-between mb-3">
          <h2>Parking Lots</h2>
          <div class="flex-gap">
            <button class="btn-vpa-outline btn-sm-vpa" @click="navigate('admin-search')">
              <i class="bi bi-search"></i> Search Spots
            </button>
            <button class="btn-vpa-outline btn-sm-vpa" @click="navigate('admin-users')">
              <i class="bi bi-people"></i> View Users
            </button>
          </div>
        </div>

        <div v-if="!stats.lots.length" class="empty-state glass-card-flat">
          <div class="empty-icon">🏗️</div>
          <h3>No parking lots yet</h3>
          <p>Create your first parking lot to get started</p>
          <button class="btn-vpa mt-2" @click="navigate('admin-create-lot')">Add First Lot</button>
        </div>

        <div class="grid-lots mb-4" v-else>
          <div v-for="lot in stats.lots" :key="lot.id" class="lot-card">
            <div class="lot-card-header">
              <div class="flex-between">
                <div>
                  <div class="lot-name">{{ lot.prime_location_name }}</div>
                  <div class="lot-address"><i class="bi bi-geo-alt"></i> {{ lot.address }}</div>
                </div>
                <span class="price-tag">₹{{ lot.price_per_hour }}/hr</span>
              </div>
            </div>
            <div class="lot-card-body">
              <div class="flex-between mb-2">
                <span class="badge-vpa badge-available"><i class="bi bi-check-circle"></i> {{ lot.available_spots }} free</span>
                <span class="badge-vpa badge-occupied"><i class="bi bi-x-circle"></i> {{ lot.occupied_spots }} taken</span>
                <span class="text-xs text-muted">PIN: {{ lot.pin_code }}</span>
              </div>
              <div style="background:rgba(255,255,255,0.05);border-radius:4px;height:5px;margin-bottom:0.75rem">
                <div :style="{width: (lot.occupied_spots/lot.number_of_spots*100)+'%', background:'linear-gradient(90deg,var(--highlight),var(--highlight-soft))', height:'100%', borderRadius:'4px'}"></div>
              </div>
              <div class="flex-gap flex-wrap">
                <button class="btn-vpa-outline btn-sm-vpa" @click="navigate('admin-lot-detail', {id:lot.id})">
                  <i class="bi bi-eye"></i> View Spots
                </button>
                <button class="btn-vpa-outline btn-sm-vpa" @click="navigate('admin-edit-lot', {id:lot.id})">
                  <i class="bi bi-pencil"></i> Edit
                </button>
                <button class="btn-sm-vpa" style="background:rgba(233,69,96,0.15);border:1px solid rgba(233,69,96,0.3);color:var(--highlight);border-radius:6px;cursor:pointer;padding:0.35rem 0.8rem;font-size:0.78rem;font-family:Inter" @click="deleteLot(lot)">
                  <i class="bi bi-trash"></i> Delete
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Recent Activity -->
        <div class="glass-card-flat">
          <h3 class="mb-3">Recent Reservations</h3>
          <div v-if="!stats.recent_reservations.length" class="empty-state" style="padding:1.5rem">
            <p class="text-muted">No reservations yet</p>
          </div>
          <div class="scroll-x" v-else>
            <table class="vpa-table">
              <thead>
                <tr><th>User</th><th>Lot</th><th>Spot</th><th>Vehicle</th><th>Time In</th><th>Status</th><th>Cost</th></tr>
              </thead>
              <tbody>
                <tr v-for="r in stats.recent_reservations" :key="r.id">
                  <td>{{ r.user_email }}</td>
                  <td>{{ r.lot_name }}</td>
