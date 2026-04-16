/* ============================================================
   TaskFlow Pro - API & Utilities
   ============================================================ */

const API_BASE = 'http://localhost:5000/api';

// ===== AUTH HELPERS =====
const Auth = {
  getToken: () => localStorage.getItem('tf_token'),
  getUser: () => {
    const u = localStorage.getItem('tf_user');
    return u ? JSON.parse(u) : null;
  },
  setAuth: (token, user) => {
    localStorage.setItem('tf_token', token);
    localStorage.setItem('tf_user', JSON.stringify(user));
  },
  clear: () => {
    localStorage.removeItem('tf_token');
    localStorage.removeItem('tf_user');
  },
  isLoggedIn: () => !!localStorage.getItem('tf_token'),
  isAdmin: () => {
    const u = Auth.getUser();
    return u && u.role === 'admin';
  },
  isManagerOrAdmin: () => {
    const u = Auth.getUser();
    return u && ['admin', 'manager'].includes(u.role);
  },
  redirectIfNotLoggedIn: () => {
    if (!Auth.isLoggedIn()) {
      window.location.href = '/frontend/index.html';
      return true;
    }
    return false;
  }
};

// ===== API CLIENT =====
const api = async (endpoint, options = {}) => {
  const token = Auth.getToken();
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  // Don't set Content-Type for FormData
  if (options.body instanceof FormData) delete headers['Content-Type'];

  try {
    const res = await fetch(`${API_BASE}${endpoint}`, { ...options, headers: { ...headers, ...(options.headers || {}) } });
    const data = await res.json();

    if (res.status === 401 || res.status === 403) {
      Auth.clear();
      window.location.href = '/frontend/index.html';
      return null;
    }

    return data;
  } catch (err) {
    console.error('API Error:', err);
    Toast.error('Network error. Please check your connection.');
    return null;
  }
};

// ===== TOAST NOTIFICATIONS =====
const Toast = {
  container: null,
  init() {
    this.container = document.getElementById('toast-container');
    if (!this.container) {
      this.container = document.createElement('div');
      this.container.id = 'toast-container';
      this.container.className = 'toast-container';
      document.body.appendChild(this.container);
    }
  },
  show(message, type = 'success', duration = 4000) {
    this.init();
    const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
    const toast = document.createElement('div');
    toast.className = `toast ${type !== 'success' ? type : ''}`;
    toast.innerHTML = `
      <span class="toast-icon">${icons[type]}</span>
      <span class="toast-msg">${message}</span>
      <button class="toast-close" onclick="this.parentElement.remove()">×</button>
    `;
    this.container.appendChild(toast);
    setTimeout(() => toast.remove(), duration);
  },
  success: (msg) => Toast.show(msg, 'success'),
  error: (msg) => Toast.show(msg, 'error'),
  warning: (msg) => Toast.show(msg, 'warning'),
  info: (msg) => Toast.show(msg, 'info')
};

// ===== DATE HELPERS =====
const DateUtils = {
  format: (date) => {
    if (!date) return 'No deadline';
    return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  },
  timeAgo: (date) => {
    const now = new Date();
    const d = new Date(date);
    const diff = now - d;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return DateUtils.format(date);
  },
  isOverdue: (date) => date && new Date(date) < new Date() && new Date(date).toDateString() !== new Date().toDateString(),
  isDueSoon: (date) => {
    if (!date) return false;
    const diff = new Date(date) - new Date();
    return diff > 0 && diff < 86400000 * 2;
  }
};

// ===== DOM HELPERS =====
const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => document.querySelectorAll(selector);

const el = (tag, attrs = {}, ...children) => {
  const e = document.createElement(tag);
  Object.entries(attrs).forEach(([k, v]) => {
    if (k === 'class') e.className = v;
    else if (k === 'html') e.innerHTML = v;
    else if (k.startsWith('on')) e[k] = v;
    else e.setAttribute(k, v);
  });
  children.forEach(c => typeof c === 'string' ? e.appendChild(document.createTextNode(c)) : c && e.appendChild(c));
  return e;
};

// ===== AVATAR INITIALS =====
const getInitials = (name) => {
  if (!name) return '?';
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
};

const getAvatarColor = (name) => {
  const colors = ['#1F4E79', '#2E75B6', '#27ae60', '#e67e22', '#8e44ad', '#e74c3c', '#16a085'];
  if (!name) return colors[0];
  const idx = name.charCodeAt(0) % colors.length;
  return colors[idx];
};

// ===== MODAL HELPERS =====
const Modal = {
  open: (id) => {
    const m = document.getElementById(id);
    if (m) { m.classList.add('active'); document.body.style.overflow = 'hidden'; }
  },
  close: (id) => {
    const m = document.getElementById(id);
    if (m) { m.classList.remove('active'); document.body.style.overflow = ''; }
  }
};

// Close modal on overlay click
document.addEventListener('click', (e) => {
  if (e.target.classList.contains('modal-overlay')) {
    e.target.classList.remove('active');
    document.body.style.overflow = '';
  }
});

// ===== SIDEBAR ACTIVE LINK =====
const setActiveNav = () => {
  const path = window.location.pathname;
  $$('.nav-link').forEach(link => {
    const href = link.getAttribute('href');
    if (href && path.includes(href.replace('.html', ''))) link.classList.add('active');
  });
};

// ===== POPULATE USER IN SIDEBAR =====
const populateSidebarUser = () => {
  const user = Auth.getUser();
  if (!user) return;
  const nameEl = document.getElementById('sidebar-user-name');
  const roleEl = document.getElementById('sidebar-user-role');
  const avatarEl = document.getElementById('sidebar-avatar');
  if (nameEl) nameEl.textContent = user.name;
  if (roleEl) roleEl.textContent = user.role;
  if (avatarEl) { avatarEl.textContent = getInitials(user.name); avatarEl.style.background = getAvatarColor(user.name); }
};

// ===== LOGOUT =====
const logout = () => {
  Auth.clear();
  window.location.href = '/frontend/index.html';
};

// ===== LOAD NOTIFICATION COUNT =====
const loadNotifCount = async () => {
  const badge = document.getElementById('notif-badge');
  if (!badge || !Auth.isLoggedIn()) return;
  const data = await api('/notifications');
  if (data && data.success) {
    badge.textContent = data.unread;
    badge.style.display = data.unread > 0 ? 'flex' : 'none';
  }
};

// Init on page load
document.addEventListener('DOMContentLoaded', () => {
  populateSidebarUser();
  setActiveNav();
  if (Auth.isLoggedIn()) loadNotifCount();
});
