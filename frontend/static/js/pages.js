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
