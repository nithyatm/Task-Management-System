// ============================================================
// TaskFlow Pro - API Helper
// ============================================================
const API_BASE = '/api';

const getToken = () => localStorage.getItem('tf_token');
const getUser = () => JSON.parse(localStorage.getItem('tf_user') || 'null');

const authHeaders = () => ({
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${getToken()}`
});

const api = {
  async request(method, path, data = null) {
    const opts = { method, headers: authHeaders() };
    if (data) opts.body = JSON.stringify(data);
    const res = await fetch(API_BASE + path, opts);
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.message || 'Request failed');
    return json;
  },

  get: (path) => api.request('GET', path),
  post: (path, data) => api.request('POST', path, data),
  put: (path, data) => api.request('PUT', path, data),
  patch: (path, data) => api.request('PATCH', path, data),
  delete: (path) => api.request('DELETE', path),

  async upload(path, formData) {
    const res = await fetch(API_BASE + path, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${getToken()}` },
      body: formData
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.message || 'Upload failed');
    return json;
  }
};

// Auth guards
function requireAuth() {
  if (!getToken()) window.location.href = '/index.html';
}
function requireGuest() {
  if (getToken()) {
    const user = getUser();
    window.location.href = user?.role === 'admin' ? '/pages/admin-dashboard.html' : '/pages/dashboard.html';
  }
}

function logout() {
  localStorage.removeItem('tf_token');
  localStorage.removeItem('tf_user');
  window.location.href = '/index.html';
}
