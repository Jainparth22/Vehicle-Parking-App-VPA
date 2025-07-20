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
                  <td>#{{ r.spot_number }}</td>
                  <td>{{ r.vehicle_number || '—' }}</td>
                  <td class="text-sm text-muted">{{ formatTime(r.parking_timestamp) }}</td>
                  <td>
                    <span v-if="r.is_active" class="badge-vpa badge-active">Active</span>
                    <span v-else class="badge-vpa badge-completed">Done</span>
                  </td>
                  <td class="fw-600">{{ r.is_active ? '₹'+r.current_cost.toFixed(2)+' live' : '₹'+r.parking_cost.toFixed(2) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </template>
    </div>
  `,
  methods: {
    formatTime(ts) {
      if (!ts) return '—';
      return new Date(ts).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' });
    }
  }
};

// ── Admin — Lot Detail (Spots Grid) ───────────────────────
const AdminLotDetail = {
  props: ['navData'],
  setup(props) {
    const { ref, onMounted, inject } = Vue;
    const navigate  = inject('navigate');
    const showToast = inject('showToast');
    const lot       = ref(null);
    const selected  = ref(null);  // selected spot reservation
    const loading   = ref(true);

    async function load() {
      const id = props.navData?.id;
      if (!id) { navigate('admin-dashboard'); return; }
      try {
        const res = await api.get(`/admin/lots/${id}`);
        lot.value = res.data;
      } catch(e) {
        showToast('Failed to load lot details', 'error');
      } finally { loading.value = false; }
    }

    function clickSpot(spot) {
      if (spot.status === 'O' && spot.active_reservation) {
        selected.value = spot.active_reservation;
      }
    }

    onMounted(load);
    return { lot, loading, selected, navigate, clickSpot };
  },
  template: `
    <div>
      <div class="flex-gap mb-4">
        <button class="btn-vpa-outline btn-sm-vpa" @click="navigate('admin-dashboard')">
          <i class="bi bi-arrow-left"></i> Back
        </button>
        <h2 v-if="lot">{{ lot.prime_location_name }}</h2>
      </div>

      <div v-if="loading" class="page-loader"><div class="loader-ring" style="width:40px;height:40px;border-width:3px"></div></div>

      <template v-else-if="lot">
        <div class="glass-card-flat mb-4">
          <div class="grid-4">
            <div><p class="stat-label">Address</p><p class="fw-600">{{ lot.address }}</p></div>
            <div><p class="stat-label">Pin Code</p><p class="fw-600">{{ lot.pin_code }}</p></div>
            <div><p class="stat-label">Price</p><p class="fw-600 text-warning">₹{{ lot.price_per_hour }}/hr</p></div>
            <div><p class="stat-label">Capacity</p><p class="fw-600">{{ lot.number_of_spots }} spots</p></div>
          </div>
        </div>

        <div class="glass-card-flat mb-4">
          <div class="flex-between mb-3">
            <h3>Spot Map</h3>
            <div class="flex-gap text-sm">
              <span style="color:var(--success)"><i class="bi bi-square-fill"></i> Available</span>
              <span style="color:var(--highlight)"><i class="bi bi-square-fill"></i> Occupied (click for details)</span>
            </div>
          </div>
          <div class="spots-grid">
            <div v-for="spot in lot.spots" :key="spot.id"
              class="spot-cell"
              :class="spot.status === 'A' ? 'available' : 'occupied clickable'"
              @click="clickSpot(spot)"
              :title="spot.status === 'O' ? 'Click to see reservation details' : 'Available'">
              {{ spot.spot_number }}
            </div>
          </div>
        </div>

        <!-- Spot Detail Modal -->
        <div v-if="selected" class="modal-overlay" @click.self="selected=null">
          <div class="modal-box">
            <div class="modal-header">
              <h3>🚗 Occupied Spot Details</h3>
              <button class="modal-close" @click="selected=null">✕</button>
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem">
              <div><p class="stat-label">Spot #</p><p class="fw-600">{{ selected.spot_number }}</p></div>
              <div><p class="stat-label">Vehicle</p><p class="fw-600">{{ selected.vehicle_number || '—' }}</p></div>
              <div><p class="stat-label">Customer</p><p class="fw-600">{{ selected.user_email }}</p></div>
              <div><p class="stat-label">Name</p><p class="fw-600">{{ selected.user_name || '—' }}</p></div>
              <div><p class="stat-label">Parked At</p><p class="fw-600">{{ new Date(selected.parking_timestamp).toLocaleString('en-IN') }}</p></div>
              <div><p class="stat-label">Running Cost</p><p class="fw-600 text-warning">₹{{ selected.current_cost.toFixed(2) }}</p></div>
            </div>
          </div>
        </div>

        <div class="flex-gap">
          <button class="btn-vpa" @click="navigate('admin-edit-lot', {id: lot.id})">
            <i class="bi bi-pencil"></i> Edit This Lot
          </button>
        </div>
      </template>
    </div>
  `
};

// ── Admin — Create Lot ─────────────────────────────────────
const AdminCreateLot = {
  setup() {
    const { ref, inject } = Vue;
    const navigate  = inject('navigate');
    const showToast = inject('showToast');
    const loading   = ref(false);
    const form = ref({
      prime_location_name: '', address: '', pin_code: '',
      price_per_hour: '', number_of_spots: ''
    });

    async function submit() {
      loading.value = true;
      try {
        await api.post('/admin/lots', form.value);
        showToast('Parking lot created successfully! 🏢', 'success');
        navigate('admin-dashboard');
      } catch(e) {
        showToast(e.response?.data?.error || 'Failed to create lot', 'error');
      } finally { loading.value = false; }
    }

    return { form, loading, navigate, submit };
  },
  template: `
    <div style="max-width:600px;margin:0 auto">
      <div class="flex-gap mb-4">
        <button class="btn-vpa-outline btn-sm-vpa" @click="navigate('admin-dashboard')">
          <i class="bi bi-arrow-left"></i> Back
        </button>
        <h2>Create Parking Lot</h2>
      </div>
      <div class="glass-card-flat">
        <form @submit.prevent="submit">
          <div class="form-group">
            <label class="form-label">Prime Location Name *</label>
            <input v-model="form.prime_location_name" class="form-control" placeholder="e.g. Downtown Central Parking" required/>
          </div>
          <div class="form-group">
            <label class="form-label">Address *</label>
            <input v-model="form.address" class="form-control" placeholder="Full street address" required/>
          </div>
          <div class="grid-2">
            <div class="form-group">
              <label class="form-label">PIN Code *</label>
              <input v-model="form.pin_code" class="form-control" placeholder="6-digit PIN" maxlength="6" required/>
            </div>
            <div class="form-group">
              <label class="form-label">Price per Hour (₹) *</label>
              <input v-model="form.price_per_hour" type="number" step="0.5" min="1" class="form-control" placeholder="e.g. 50" required/>
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">Maximum Number of Spots *</label>
            <input v-model="form.number_of_spots" type="number" min="1" max="1000" class="form-control" placeholder="e.g. 50" required/>
            <p class="text-xs text-muted mt-1">Spots will be auto-created from 1 to max</p>
          </div>
          <div class="flex-gap" style="margin-top:1.5rem">
            <button type="submit" class="btn-vpa" :disabled="loading">
              <span v-if="loading" class="loader-ring" style="width:14px;height:14px;border-width:2px"></span>
              <span v-else><i class="bi bi-plus-lg"></i> Create Lot</span>
            </button>
            <button type="button" class="btn-vpa-outline" @click="navigate('admin-dashboard')">Cancel</button>
          </div>
        </form>
      </div>
    </div>
  `
};

// ── Admin — Edit Lot ───────────────────────────────────────
const AdminEditLot = {
  props: ['navData'],
  setup(props) {
    const { ref, onMounted, inject } = Vue;
    const navigate  = inject('navigate');
    const showToast = inject('showToast');
    const loading   = ref(false);
    const fetching  = ref(true);
    const form = ref({
      prime_location_name: '', address: '', pin_code: '',
      price_per_hour: '', number_of_spots: ''
    });
    const lotId = props.navData?.id;

    onMounted(async () => {
      if (!lotId) { navigate('admin-dashboard'); return; }
      try {
        const res = await api.get(`/admin/lots/${lotId}`);
        const l = res.data;
        form.value = {
          prime_location_name: l.prime_location_name,
          address: l.address, pin_code: l.pin_code,
          price_per_hour: l.price_per_hour,
          number_of_spots: l.number_of_spots
        };
      } catch(e) {
        showToast('Failed to load lot', 'error');
      } finally { fetching.value = false; }
    });

    async function submit() {
      loading.value = true;
      try {
        await api.put(`/admin/lots/${lotId}`, form.value);
        showToast('Parking lot updated! ✅', 'success');
        navigate('admin-dashboard');
      } catch(e) {
        showToast(e.response?.data?.error || 'Update failed', 'error');
      } finally { loading.value = false; }
    }

    return { form, loading, fetching, navigate, submit };
  },
  template: `
    <div style="max-width:600px;margin:0 auto">
      <div class="flex-gap mb-4">
        <button class="btn-vpa-outline btn-sm-vpa" @click="navigate('admin-dashboard')"><i class="bi bi-arrow-left"></i> Back</button>
        <h2>Edit Parking Lot</h2>
      </div>
      <div v-if="fetching" class="page-loader"><div class="loader-ring" style="width:40px;height:40px;border-width:3px"></div></div>
      <div v-else class="glass-card-flat">
        <form @submit.prevent="submit">
          <div class="form-group">
            <label class="form-label">Prime Location Name</label>
            <input v-model="form.prime_location_name" class="form-control" required/>
          </div>
          <div class="form-group">
            <label class="form-label">Address</label>
            <input v-model="form.address" class="form-control" required/>
          </div>
          <div class="grid-2">
            <div class="form-group">
              <label class="form-label">PIN Code</label>
              <input v-model="form.pin_code" class="form-control" maxlength="6" required/>
            </div>
            <div class="form-group">
              <label class="form-label">Price per Hour (₹)</label>
              <input v-model="form.price_per_hour" type="number" step="0.5" min="1" class="form-control" required/>
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">Number of Spots</label>
            <input v-model="form.number_of_spots" type="number" min="1" max="1000" class="form-control" required/>
          </div>
          <div class="flex-gap mt-3">
            <button type="submit" class="btn-vpa" :disabled="loading">
              <span v-if="loading" class="loader-ring" style="width:14px;height:14px;border-width:2px"></span>
              <span v-else><i class="bi bi-check-lg"></i> Save Changes</span>
            </button>
            <button type="button" class="btn-vpa-outline" @click="navigate('admin-dashboard')">Cancel</button>
          </div>
        </form>
      </div>
    </div>
  `
};

// ── Admin — Users ──────────────────────────────────────────
const AdminUsers = {
  setup() {
    const { ref, onMounted, inject } = Vue;
    const navigate  = inject('navigate');
    const showToast = inject('showToast');
    const users     = ref([]);
    const loading   = ref(true);

    onMounted(async () => {
      try {
        const res = await api.get('/admin/users');
        users.value = res.data;
      } catch(e) {
        showToast('Failed to load users', 'error');
      } finally { loading.value = false; }
    });

    return { users, loading, navigate };
  },
  template: `
    <div>
      <div class="flex-gap mb-4">
        <button class="btn-vpa-outline btn-sm-vpa" @click="navigate('admin-dashboard')"><i class="bi bi-arrow-left"></i> Back</button>
        <h2>Registered Users ({{ users.length }})</h2>
      </div>
      <div v-if="loading" class="page-loader"><div class="loader-ring" style="width:40px;height:40px;border-width:3px"></div></div>
      <div v-else-if="!users.length" class="empty-state glass-card-flat">
        <div class="empty-icon">👤</div><h3>No users registered yet</h3>
      </div>
      <div v-else class="glass-card-flat scroll-x">
        <table class="vpa-table">
          <thead>
            <tr><th>#</th><th>Email</th><th>Full Name</th><th>Address</th><th>PIN</th><th>Joined</th><th>Last Login</th></tr>
          </thead>
          <tbody>
            <tr v-for="(u, i) in users" :key="u.id">
              <td class="text-muted">{{ i+1 }}</td>
              <td><strong>{{ u.email }}</strong></td>
              <td>{{ u.full_name || '—' }}</td>
              <td class="text-muted text-sm">{{ u.address || '—' }}</td>
              <td class="text-muted">{{ u.pin_code || '—' }}</td>
              <td class="text-sm text-muted">{{ u.created_at ? new Date(u.created_at).toLocaleDateString('en-IN') : '—' }}</td>
              <td class="text-sm text-muted">{{ u.last_login ? new Date(u.last_login).toLocaleDateString('en-IN') : 'Never' }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  `
};

// ── Admin — Search ─────────────────────────────────────────
const AdminSearch = {
  setup() {
    const { ref, inject } = Vue;
    const navigate  = inject('navigate');
    const showToast = inject('showToast');
    const query     = ref('');
    const type      = ref('all');
    const results   = ref([]);
    const loading   = ref(false);
    const searched  = ref(false);

    async function doSearch() {
      if (!query.value.trim()) { showToast('Enter a search query', 'error'); return; }
      loading.value = true; searched.value = true;
      try {
        const res = await api.get('/admin/search', { params: { q: query.value, type: type.value } });
        results.value = res.data;
      } catch(e) {
        showToast('Search failed', 'error');
      } finally { loading.value = false; }
    }

    return { query, type, results, loading, searched, doSearch, navigate };
  },
  template: `
    <div>
      <div class="flex-gap mb-4">
        <button class="btn-vpa-outline btn-sm-vpa" @click="navigate('admin-dashboard')"><i class="bi bi-arrow-left"></i> Back</button>
        <h2>Search</h2>
      </div>
      <div class="glass-card-flat mb-4">
        <div class="grid-2">
          <div class="form-group">
            <label class="form-label">Search by</label>
            <select v-model="type" class="form-control">
              <option value="all">All</option>
              <option value="spot">Spot/Lot</option>
              <option value="user">User</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Search Query</label>
            <input v-model="query" class="form-control" placeholder="Location name, PIN code, email…" @keyup.enter="doSearch"/>
          </div>
        </div>
        <button class="btn-vpa" @click="doSearch" :disabled="loading">
          <span v-if="loading" class="loader-ring" style="width:14px;height:14px;border-width:2px"></span>
          <span v-else><i class="bi bi-search"></i> Search</span>
        </button>
      </div>
      <div v-if="searched && !results.length" class="empty-state glass-card-flat">
        <div class="empty-icon">🔍</div><h3>No results found</h3>
      </div>
      <div v-if="results.length" class="glass-card-flat scroll-x">
        <p class="text-sm text-muted mb-2">{{ results.length }} result(s)</p>
        <table class="vpa-table">
          <thead><tr><th>Type</th><th>Details</th><th>Status/Info</th></tr></thead>
          <tbody>
            <tr v-for="r in results" :key="r.id">
              <td><span class="badge-vpa" :class="r.type==='user'?'badge-active':'badge-available'">{{ r.type || 'spot' }}</span></td>
              <td>
                <div v-if="r.type==='user'"><strong>{{ r.email }}</strong><br><span class="text-muted text-xs">{{ r.full_name }}</span></div>
                <div v-else><strong>Spot #{{ r.spot_number }}</strong><br><span class="text-muted text-xs">Lot: {{ r.lot_id }}</span></div>
              </td>
              <td>
                <span v-if="r.type==='user'" class="text-muted text-sm">{{ r.address || '—' }}, {{ r.pin_code || '—' }}</span>
                <span v-else class="badge-vpa" :class="r.status==='A'?'badge-available':'badge-occupied'">{{ r.status==='A'?'Available':'Occupied' }}</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  `
};

// ── Admin — Analytics & Charts ─────────────────────────────
const AdminAnalytics = {
  setup() {
    const { ref, onMounted, inject } = Vue;
    const navigate  = inject('navigate');
    const showToast = inject('showToast');
    const data      = ref(null);
    const loading   = ref(true);

    async function load() {
      try {
        const res = await api.get('/admin/analytics');
        data.value = res.data;
      } catch(e) {
        showToast('Failed to load analytics', 'error');
      } finally { loading.value = false; }
    }

    onMounted(load);

    return { data, loading, navigate };
  },
  mounted() {
    this.unwatchData = this.$watch('data', (val) => {
      if (val) this.$nextTick(() => this.renderCharts());
    });
  },
  beforeUnmount() {
    this._charts?.forEach(c => c.destroy());
  },
  methods: {
    renderCharts() {
      this._charts = this._charts || [];
      this._charts.forEach(c => c.destroy());
      this._charts = [];

      const d = this.data;
      const names  = Object.keys(d.lot_data);
      const revs   = names.map(n => d.lot_data[n].revenue);
      const books  = names.map(n => d.lot_data[n].bookings);
      const avail  = names.map(n => d.lot_data[n].available);
      const occ    = names.map(n => d.lot_data[n].occupied);
      const days   = d.daily_counts.map(x => x.date);
      const counts = d.daily_counts.map(x => x.count);

      const opts = {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { labels: { color: '#eaeaea', font: { family: 'Inter', size: 11 } } } },
        scales: { x: { ticks: { color: '#9a9ab0' }, grid: { color: 'rgba(255,255,255,0.05)' } },
                  y: { ticks: { color: '#9a9ab0' }, grid: { color: 'rgba(255,255,255,0.05)' } } }
      };

      if (this.$refs.revenueChart) {
        this._charts.push(new Chart(this.$refs.revenueChart, {
          type: 'bar', data: {
            labels: names,
            datasets: [{ label: 'Revenue (₹)', data: revs, backgroundColor: 'rgba(233,69,96,0.7)', borderColor: 'var(--highlight)', borderWidth: 1, borderRadius: 6 }]
          }, options: { ...opts }
        }));
      }
      if (this.$refs.dailyChart) {
        this._charts.push(new Chart(this.$refs.dailyChart, {
          type: 'line', data: {
            labels: days,
            datasets: [{ label: 'Daily Bookings', data: counts, borderColor: 'var(--success)', backgroundColor: 'rgba(6,214,160,0.15)', fill: true, tension: 0.4, pointBackgroundColor: 'var(--success)' }]
          }, options: { ...opts }
        }));
      }
      if (this.$refs.occupancyChart) {
        this._charts.push(new Chart(this.$refs.occupancyChart, {
          type: 'bar', data: {
            labels: names,
            datasets: [
              { label: 'Available', data: avail, backgroundColor: 'rgba(6,214,160,0.7)', borderRadius: 6 },
              { label: 'Occupied',  data: occ,   backgroundColor: 'rgba(233,69,96,0.7)',  borderRadius: 6 }
            ]
          }, options: { ...opts, scales: { ...opts.scales, x: { ...opts.scales.x, stacked: true }, y: { ...opts.scales.y, stacked: true } } }
        }));
      }
    }
  },
  template: `
    <div>
      <div class="flex-gap mb-4">
        <button class="btn-vpa-outline btn-sm-vpa" @click="navigate('admin-dashboard')"><i class="bi bi-arrow-left"></i> Back</button>
        <h2>Analytics & Charts</h2>
      </div>
      <div v-if="loading" class="page-loader"><div class="loader-ring" style="width:40px;height:40px;border-width:3px"></div></div>
      <div v-else-if="data">
        <div class="grid-2 mb-4">
          <div class="glass-card-flat">
            <h3 class="mb-3">Revenue per Parking Lot</h3>
            <div class="chart-wrapper"><canvas ref="revenueChart"></canvas></div>
          </div>
          <div class="glass-card-flat">
            <h3 class="mb-3">Daily Bookings (Last 7 Days)</h3>
            <div class="chart-wrapper"><canvas ref="dailyChart"></canvas></div>
          </div>
        </div>
        <div class="glass-card-flat">
          <h3 class="mb-3">Occupancy by Lot</h3>
          <div class="chart-wrapper" style="height:320px"><canvas ref="occupancyChart"></canvas></div>
        </div>
      </div>
    </div>
  `
};

// ── User Dashboard ─────────────────────────────────────────
const UserDashboard = {
  setup() {
    const { ref, onMounted, inject } = Vue;
    const navigate  = inject('navigate');
    const showToast = inject('showToast');
    const currentUser = inject('currentUser');
    const data      = ref(null);
    const loading   = ref(true);
    const releasing = ref(null);

    async function load() {
      try {
        const res = await api.get('/user/dashboard');
        data.value = res.data;
      } catch(e) {
        showToast('Failed to load dashboard', 'error');
      } finally { loading.value = false; }
    }

    async function confirmRelease(res_id) {
      navigate('user-release', { reservation_id: res_id });
    }

    onMounted(load);
    return { data, loading, releasing, navigate, confirmRelease, currentUser };
  },
  template: `
    <div>
      <div class="flex-between mb-4">
        <div>
          <h1 style="margin-bottom:0.2rem">My Dashboard</h1>
          <p class="text-muted text-sm">Welcome, {{ data?.user?.full_name || data?.user?.email }} 👋</p>
        </div>
        <div class="flex-gap flex-wrap">
          <button class="btn-vpa" @click="navigate('user-browse-lots')">
            <i class="bi bi-search"></i> Find Parking
          </button>
          <button class="btn-vpa-outline" @click="navigate('user-analytics')">
            <i class="bi bi-bar-chart"></i> My Stats
          </button>
        </div>
      </div>

      <div v-if="loading" class="page-loader"><div class="loader-ring" style="width:40px;height:40px;border-width:3px"></div></div>

      <template v-else-if="data">
        <!-- Stats -->
        <div class="grid-4 mb-4">
          <div class="stat-card accent-blue">
            <p class="stat-label">Total Bookings</p>
            <p class="stat-number">{{ data.total_reservations }}</p>
            <i class="bi bi-calendar-check stat-icon"></i>
          </div>
          <div class="stat-card accent-yellow">
            <p class="stat-label">Active Now</p>
            <p class="stat-number" style="color:var(--warning)">{{ data.total_active }}</p>
            <i class="bi bi-car-front stat-icon"></i>
          </div>
          <div class="stat-card accent-red">
            <p class="stat-label">Total Spent</p>
            <p class="stat-number" style="color:var(--highlight)">₹{{ data.total_spent.toFixed(0) }}</p>
            <i class="bi bi-currency-rupee stat-icon"></i>
          </div>
          <div class="stat-card accent-green">
            <p class="stat-label">Lots Available</p>
            <p class="stat-number" style="color:var(--success)">{{ data.available_lots.length }}</p>
            <i class="bi bi-building stat-icon"></i>
          </div>
        </div>

        <!-- Active Reservations -->
        <div class="glass-card-flat mb-4" v-if="data.active_reservations.length">
          <h3 class="mb-3">🚗 Active Reservations</h3>
          <div style="display:grid;gap:1rem">
            <div v-for="r in data.active_reservations" :key="r.id"
              style="background:rgba(255,209,102,0.07);border:1px solid rgba(255,209,102,0.2);border-radius:10px;padding:1rem">
              <div class="flex-between flex-wrap" style="gap:0.75rem">
                <div>
                  <p class="fw-bold">{{ r.lot_name }}</p>
                  <p class="text-sm text-muted"><i class="bi bi-geo-alt"></i> {{ r.lot_address }}</p>
                  <p class="text-sm mt-1">Spot <strong>#{{ r.spot_number }}</strong>
                    <span v-if="r.vehicle_number"> · 🚘 {{ r.vehicle_number }}</span>
                  </p>
                  <p class="text-xs text-muted mt-1">Parked: {{ new Date(r.parking_timestamp).toLocaleString('en-IN') }}</p>
                </div>
                <div style="text-align:right">
                  <p class="text-warning fw-bold" style="font-size:1.4rem">₹{{ r.current_cost.toFixed(2) }}</p>
                  <p class="text-xs text-muted">running cost</p>
                  <button class="btn-vpa mt-2" @click="confirmRelease(r.id)">
                    <i class="bi bi-sign-stop"></i> Release Spot
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Recent History -->
        <div class="glass-card-flat mb-4">
          <div class="flex-between mb-3">
            <h3>Recent Parking History</h3>
            <button class="btn-vpa-outline btn-sm-vpa" @click="navigate('user-history')">View All</button>
          </div>
          <div v-if="!data.recent_completed.length" class="empty-state" style="padding:1.5rem">
            <p class="text-muted text-sm">No completed reservations yet</p>
          </div>
          <div class="scroll-x" v-else>
            <table class="vpa-table">
              <thead><tr><th>ID</th><th>Lot</th><th>Spot</th><th>Vehicle</th><th>Duration</th><th>Cost</th></tr></thead>
              <tbody>
                <tr v-for="r in data.recent_completed" :key="r.id">
                  <td class="text-muted">#{{ r.id }}</td>
                  <td><strong>{{ r.lot_name }}</strong></td>
                  <td>#{{ r.spot_number }}</td>
                  <td>{{ r.vehicle_number || '—' }}</td>
                  <td class="text-sm text-muted">{{ calcDuration(r.parking_timestamp, r.leaving_timestamp) }}</td>
                  <td class="fw-bold text-success">₹{{ r.parking_cost.toFixed(2) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Available Lots Quick View -->
        <div>
          <div class="flex-between mb-3">
            <h3>Available Parking Lots Nearby</h3>
            <button class="btn-vpa-outline btn-sm-vpa" @click="navigate('user-browse-lots')">Browse All</button>
          </div>
          <div v-if="!data.available_lots.length" class="empty-state glass-card-flat">
            <div class="empty-icon">🅿️</div><h3>No lots available right now</h3>
          </div>
          <div class="grid-lots" v-else>
            <div v-for="lot in data.available_lots.slice(0,6)" :key="lot.id" class="lot-card">
              <div class="lot-card-header">
                <div class="flex-between">
                  <div>
                    <div class="lot-name">{{ lot.prime_location_name }}</div>
                    <div class="lot-address"><i class="bi bi-geo-alt"></i> {{ lot.pin_code }}</div>
                  </div>
                  <span class="price-tag">₹{{ lot.price_per_hour }}/hr</span>
                </div>
              </div>
              <div class="lot-card-body">
                <div class="flex-between mb-2">
                  <span class="badge-vpa badge-available"><i class="bi bi-check-circle"></i> {{ lot.available_spots }} free</span>
                  <span class="badge-vpa badge-occupied">{{ lot.occupied_spots }} taken</span>
                </div>
                <button class="btn-vpa btn-sm-vpa w-100" style="justify-content:center" @click="navigate('user-reserve', {lot_id: lot.id})">
                  <i class="bi bi-bookmark-plus"></i> Book Spot
                </button>
              </div>
            </div>
          </div>
        </div>
      </template>
    </div>
  `,
  methods: {
    calcDuration(start, end) {
      if (!start || !end) return '—';
      const hrs = (new Date(end) - new Date(start)) / 3600000;
      if (hrs < 1) return `${Math.round(hrs*60)} min`;
      return `${hrs.toFixed(1)} hr`;
    }
  }
};

// ── User — Browse Lots ─────────────────────────────────────
const UserBrowseLots = {
  setup() {
    const { ref, onMounted, inject } = Vue;
    const navigate  = inject('navigate');
    const showToast = inject('showToast');
    const query     = ref('');
    const lots      = ref([]);
    const allLots   = ref([]);
    const loading   = ref(true);
    const searching = ref(false);

    async function loadAll() {
      try {
        const res = await api.get('/user/lots');
        allLots.value = res.data;
        lots.value = res.data;
      } catch(e) {
        showToast('Failed to load lots', 'error');
      } finally { loading.value = false; }
    }

    async function search() {
      if (!query.value.trim()) { lots.value = allLots.value; return; }
      searching.value = true;
      try {
        const res = await api.get('/user/lots/search', { params: { q: query.value } });
        lots.value = res.data;
      } catch(e) {
        showToast('Search failed', 'error');
      } finally { searching.value = false; }
    }

    function clearSearch() { query.value = ''; lots.value = allLots.value; }

    onMounted(loadAll);
    return { query, lots, loading, searching, navigate, search, clearSearch };
  },
  template: `
    <div>
      <div class="flex-gap mb-4">
        <button class="btn-vpa-outline btn-sm-vpa" @click="navigate('user-dashboard')"><i class="bi bi-arrow-left"></i> Back</button>
        <h2>Find Parking</h2>
      </div>
      <div class="glass-card-flat mb-4">
        <div class="flex-gap">
          <input v-model="query" class="form-control" placeholder="Search by location name, address, or PIN code…" @keyup.enter="search" style="flex:1"/>
          <button class="btn-vpa" @click="search" :disabled="searching">
            <span v-if="searching" class="loader-ring" style="width:14px;height:14px;border-width:2px"></span>
            <span v-else><i class="bi bi-search"></i> Search</span>
          </button>
          <button v-if="query" class="btn-vpa-outline" @click="clearSearch">Clear</button>
        </div>
      </div>
      <div v-if="loading" class="page-loader"><div class="loader-ring" style="width:40px;height:40px;border-width:3px"></div></div>
      <div v-else-if="!lots.length" class="empty-state glass-card-flat">
        <div class="empty-icon">🔍</div><h3>No parking lots found</h3>
        <p>Try a different location or PIN code</p>
      </div>
      <div v-else>
        <p class="text-sm text-muted mb-3">{{ lots.length }} lot(s) found</p>
        <div class="grid-lots">
          <div v-for="lot in lots" :key="lot.id" class="lot-card">
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
                <span class="badge-vpa badge-occupied">{{ lot.occupied_spots }} taken</span>
                <span class="text-xs text-muted">PIN: {{ lot.pin_code }}</span>
              </div>
              <div style="background:rgba(255,255,255,0.05);border-radius:4px;height:4px;margin-bottom:0.75rem">
                <div :style="{width:(lot.available_spots/lot.number_of_spots*100)+'%',background:'linear-gradient(90deg,var(--success),#04a87a)',height:'100%',borderRadius:'4px'}"></div>
              </div>
              <button v-if="lot.available_spots > 0" class="btn-vpa btn-sm-vpa w-100" style="justify-content:center" @click="navigate('user-reserve', {lot_id: lot.id})">
                <i class="bi bi-bookmark-plus"></i> Book a Spot
              </button>
              <p v-else class="text-center text-danger text-sm">No spots available</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
};

// ── User — Reserve Confirmation ────────────────────────────
const UserReserve = {
  props: ['navData'],
  setup(props) {
    const { ref, onMounted, inject } = Vue;
    const navigate  = inject('navigate');
    const showToast = inject('showToast');
    const lot       = ref(null);
    const loading   = ref(true);
    const booking   = ref(false);
    const form      = ref({ vehicle_number: '' });
    const lotId     = props.navData?.lot_id;

    onMounted(async () => {
      if (!lotId) { navigate('user-browse-lots'); return; }
      try {
        const res = await api.get(`/user/lots/${lotId}`);
        lot.value = res.data;
      } catch(e) {
        showToast('Failed to load lot details', 'error');
      } finally { loading.value = false; }
    });

    async function reserve() {
      booking.value = true;
      try {
        const res = await api.post(`/user/reserve/${lotId}`, form.value);
        showToast(res.data.message, 'success');
        navigate('user-dashboard');
      } catch(e) {
        showToast(e.response?.data?.error || 'Booking failed', 'error');
      } finally { booking.value = false; }
    }

    return { lot, loading, booking, form, navigate, reserve };
  },
  template: `
    <div style="max-width:500px;margin:0 auto">
      <div class="flex-gap mb-4">
        <button class="btn-vpa-outline btn-sm-vpa" @click="navigate('user-browse-lots')"><i class="bi bi-arrow-left"></i> Back</button>
        <h2>Book Parking Spot</h2>
      </div>
      <div v-if="loading" class="page-loader"><div class="loader-ring" style="width:40px;height:40px;border-width:3px"></div></div>
      <template v-else-if="lot">
        <div class="glass-card-flat mb-3" style="background:rgba(6,214,160,0.07);border-color:rgba(6,214,160,0.2)">
          <h3 class="mb-1" style="color:var(--success)">{{ lot.prime_location_name }}</h3>
          <p class="text-muted text-sm"><i class="bi bi-geo-alt"></i> {{ lot.address }}</p>
          <div class="flex-gap mt-2">
            <span class="price-tag">₹{{ lot.price_per_hour }}/hr</span>
            <span class="badge-vpa badge-available"><i class="bi bi-check-circle"></i> {{ lot.available_spots }} spots available</span>
          </div>
        </div>
        <div class="glass-card-flat">
          <h3 class="mb-3">Booking Details</h3>
          <div class="form-group">
            <label class="form-label">Spot ID (Auto-assigned)</label>
            <input class="form-control" value="Auto — first available spot" disabled style="opacity:0.5"/>
          </div>
          <div class="form-group">
            <label class="form-label">Lot</label>
            <input class="form-control" :value="lot.prime_location_name" disabled style="opacity:0.5"/>
          </div>
          <div class="form-group">
            <label class="form-label">Vehicle Number (Optional)</label>
            <input v-model="form.vehicle_number" class="form-control" placeholder="e.g. MH 12 AB 1234" maxlength="20" style="text-transform:uppercase"/>
          </div>
          <p class="text-xs text-muted mb-3">Parking timestamp will be recorded when you confirm</p>
          <div class="flex-gap">
            <button class="btn-success" @click="reserve" :disabled="booking">
              <span v-if="booking" class="loader-ring" style="width:14px;height:14px;border-width:2px"></span>
              <span v-else><i class="bi bi-bookmark-check"></i> Reserve Now</span>
            </button>
            <button class="btn-vpa-outline" @click="navigate('user-browse-lots')">Cancel</button>
          </div>
        </div>
      </template>
    </div>
  `
};

// ── User — Release Spot Confirmation ──────────────────────
const UserRelease = {
  props: ['navData'],
  setup(props) {
    const { ref, onMounted, inject } = Vue;
    const navigate  = inject('navigate');
    const showToast = inject('showToast');
    const res       = ref(null);
    const loading   = ref(true);
    const releasing = ref(false);
    const resId     = props.navData?.reservation_id;

    onMounted(async () => {
      if (!resId) { navigate('user-dashboard'); return; }
      try {
        const resp = await api.get(`/user/reservations/${resId}`);
        res.value = resp.data;
      } catch(e) {
        showToast('Failed to load reservation', 'error');
        navigate('user-dashboard');
      } finally { loading.value = false; }
    });

    async function release() {
      releasing.value = true;
      try {
        const resp = await api.put(`/user/reservations/${resId}/release`);
        showToast(`Spot released! Final cost: ₹${resp.data.reservation.parking_cost.toFixed(2)} 🎉`, 'success');
        navigate('user-dashboard');
      } catch(e) {
        showToast(e.response?.data?.error || 'Release failed', 'error');
      } finally { releasing.value = false; }
    }

    function calcDuration(start) {
      if (!start) return '—';
      const hrs = (Date.now() - new Date(start)) / 3600000;
      return hrs < 1 ? `${Math.round(hrs*60)} min` : `${hrs.toFixed(1)} hr`;
    }

    return { res, loading, releasing, navigate, release, calcDuration };
  },
  template: `
    <div style="max-width:500px;margin:0 auto">
      <div class="flex-gap mb-4">
        <button class="btn-vpa-outline btn-sm-vpa" @click="navigate('user-dashboard')"><i class="bi bi-arrow-left"></i> Back</button>
        <h2>Release Parking Spot</h2>
      </div>
      <div v-if="loading" class="page-loader"><div class="loader-ring" style="width:40px;height:40px;border-width:3px"></div></div>
      <template v-else-if="res">
        <div class="glass-card-flat mb-3" style="background:rgba(233,69,96,0.07);border-color:rgba(233,69,96,0.2)">
          <h3 class="mb-1" style="color:var(--highlight)">{{ res.lot_name }}</h3>
          <p class="text-muted text-sm"><i class="bi bi-geo-alt"></i> {{ res.lot_address }}</p>
        </div>
        <div class="glass-card-flat mb-3">
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem">
            <div><p class="stat-label">Spot #</p><p class="fw-bold" style="font-size:1.3rem">{{ res.spot_number }}</p></div>
            <div><p class="stat-label">Vehicle</p><p class="fw-bold">{{ res.vehicle_number || '—' }}</p></div>
            <div><p class="stat-label">Parking Time</p><p class="fw-600">{{ new Date(res.parking_timestamp).toLocaleString('en-IN') }}</p></div>
            <div><p class="stat-label">Duration So Far</p><p class="fw-600 text-warning">{{ calcDuration(res.parking_timestamp) }}</p></div>
            <div><p class="stat-label">Rate</p><p class="fw-600">₹{{ res.price_per_hour }}/hr</p></div>
            <div><p class="stat-label">Estimated Cost</p><p class="fw-bold text-warning" style="font-size:1.3rem">₹{{ res.current_cost.toFixed(2) }}</p></div>
          </div>
          <hr class="divider"/>
          <p class="text-xs text-muted">Final cost calculated when spot is released</p>
        </div>
        <div class="flex-gap">
          <button class="btn-vpa" @click="release" :disabled="releasing">
            <span v-if="releasing" class="loader-ring" style="width:14px;height:14px;border-width:2px"></span>
            <span v-else><i class="bi bi-sign-stop-fill"></i> Confirm Release</span>
          </button>
          <button class="btn-vpa-outline" @click="navigate('user-dashboard')">Cancel</button>
        </div>
      </template>
    </div>
  `
};

// ── User — History ─────────────────────────────────────────
const UserHistory = {
  setup() {
    const { ref, onMounted, inject } = Vue;
    const navigate  = inject('navigate');
    const showToast = inject('showToast');
    const reservations = ref([]);
    const filter    = ref('all');
    const loading   = ref(true);
    const exporting = ref(false);
    const jobId     = ref(null);
    const jobStatus = ref('');

    async function load() {
      try {
        const res = await api.get('/user/reservations', { params: { status: filter.value } });
        reservations.value = res.data;
      } catch(e) {
        showToast('Failed to load history', 'error');
      } finally { loading.value = false; }
    }

    async function triggerExport() {
      exporting.value = true; jobStatus.value = 'pending';
      try {
        const res = await api.post('/user/export-csv');
        jobId.value = res.data.job_id;
        showToast('Export started — you\'ll be notified when ready', 'info');
        pollJob();
      } catch(e) {
        showToast('Export failed', 'error');
        exporting.value = false;
