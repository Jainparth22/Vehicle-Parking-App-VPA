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
