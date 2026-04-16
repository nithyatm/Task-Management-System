/* ============================================================
   TaskFlow Pro - Sidebar Component
   ============================================================ */

const Sidebar = {
  render(activePage = '') {
    const user = Auth.getUser();
    const isAdmin = user && user.role === 'admin';
    const isManager = user && ['admin', 'manager'].includes(user.role);

    return `
      <aside class="sidebar" id="sidebar">
        <div class="sidebar-brand">
          <div class="logo-icon">📋</div>
          <div class="brand-text">
            <h2>TaskFlow Pro</h2>
            <span>WORKSPACE</span>
          </div>
        </div>

        <nav class="sidebar-nav">
          <div class="nav-section-title">Main</div>

          ${isAdmin ? `
          <div class="nav-item">
            <a class="nav-link ${activePage === 'admin' ? 'active' : ''}" href="/frontend/pages/admin-dashboard.html">
              <span class="nav-icon">🏠</span> Admin Dashboard
            </a>
          </div>` : ''}

          <div class="nav-item">
            <a class="nav-link ${activePage === 'dashboard' ? 'active' : ''}" href="/frontend/pages/dashboard.html">
              <span class="nav-icon">📊</span> My Dashboard
            </a>
          </div>

          <div class="nav-item">
            <a class="nav-link ${activePage === 'kanban' ? 'active' : ''}" href="/frontend/pages/kanban.html">
              <span class="nav-icon">🗂️</span> Kanban Board
            </a>
          </div>

          <div class="nav-section-title">Tasks</div>

          <div class="nav-item">
            <a class="nav-link ${activePage === 'tasks' ? 'active' : ''}" href="/frontend/pages/tasks.html">
              <span class="nav-icon">✅</span> All Tasks
            </a>
          </div>

          ${isManager ? `
          <div class="nav-item">
            <a class="nav-link ${activePage === 'create-task' ? 'active' : ''}" href="/frontend/pages/create-task.html">
              <span class="nav-icon">➕</span> Create Task
            </a>
          </div>` : ''}

          <div class="nav-section-title">Collaboration</div>

          <div class="nav-item">
            <a class="nav-link ${activePage === 'teams' ? 'active' : ''}" href="/frontend/pages/teams.html">
              <span class="nav-icon">👥</span> Teams
            </a>
          </div>

          <div class="nav-item">
            <a class="nav-link ${activePage === 'activity' ? 'active' : ''}" href="/frontend/pages/activity.html">
              <span class="nav-icon">📜</span> Activity Log
            </a>
          </div>

          ${isAdmin ? `
          <div class="nav-section-title">Admin</div>
          <div class="nav-item">
            <a class="nav-link ${activePage === 'users' ? 'active' : ''}" href="/frontend/pages/users.html">
              <span class="nav-icon">👤</span> Manage Users
            </a>
          </div>` : ''}

          <div class="nav-section-title">Account</div>
          <div class="nav-item">
            <a class="nav-link ${activePage === 'profile' ? 'active' : ''}" href="/frontend/pages/profile.html">
              <span class="nav-icon">⚙️</span> Profile & Settings
            </a>
          </div>
        </nav>

        <div class="sidebar-user">
          <div class="user-avatar" id="sidebar-avatar" style="background:${user ? getAvatarColor(user.name) : '#2E75B6'}">
            ${user ? getInitials(user.name) : '?'}
          </div>
          <div class="user-info">
            <div class="user-name" id="sidebar-user-name">${user ? user.name : 'User'}</div>
            <div class="user-role" id="sidebar-user-role">${user ? user.role : ''}</div>
          </div>
          <button class="logout-btn" onclick="logout()" title="Logout">⎋</button>
        </div>
      </aside>
    `;
  },

  renderTopbar(title, subtitle = '') {
    return `
      <div class="topbar">
        <div>
          <div class="topbar-title">${title}</div>
          ${subtitle ? `<div class="topbar-subtitle">${subtitle}</div>` : ''}
        </div>
        <div class="topbar-actions">
          <div style="position:relative">
            <button class="topbar-btn" id="notif-btn" onclick="toggleNotifDropdown()" title="Notifications">
              🔔
              <span class="notif-badge" id="notif-badge" style="display:none">0</span>
            </button>
            <div class="notif-dropdown" id="notif-dropdown">
              <div class="notif-dropdown-header">
                <h4>Notifications</h4>
                <button onclick="markAllNotifRead()" style="background:none;border:none;color:var(--primary-light);font-size:12px;cursor:pointer;font-weight:600">Mark all read</button>
              </div>
              <div id="notif-list"><div style="padding:20px;text-align:center;color:#aaa">Loading...</div></div>
            </div>
          </div>
        </div>
      </div>
    `;
  },

  init(activePage, title, subtitle) {
    if (Auth.redirectIfNotLoggedIn()) return;
    const appWrapper = document.getElementById('app');
    if (!appWrapper) return;
    appWrapper.innerHTML = `
      ${this.render(activePage)}
      <div class="main-content" id="main-content">
        ${this.renderTopbar(title, subtitle)}
        <div class="page-body" id="page-body"></div>
      </div>
    `;
    loadNotifCount();
  }
};

// ===== NOTIFICATION DROPDOWN =====
const toggleNotifDropdown = async () => {
  const dd = document.getElementById('notif-dropdown');
  const isOpen = dd.classList.toggle('open');
  if (isOpen) await loadNotifications();
};

document.addEventListener('click', (e) => {
  const btn = document.getElementById('notif-btn');
  const dd = document.getElementById('notif-dropdown');
  if (dd && btn && !btn.contains(e.target) && !dd.contains(e.target)) dd.classList.remove('open');
});

const loadNotifications = async () => {
  const data = await api('/notifications');
  if (!data) return;
  const list = document.getElementById('notif-list');
  const badge = document.getElementById('notif-badge');

  if (badge) { badge.textContent = data.unread; badge.style.display = data.unread > 0 ? 'flex' : 'none'; }

  if (!data.notifications || data.notifications.length === 0) {
    list.innerHTML = '<div style="padding:20px;text-align:center;color:#aaa">No notifications</div>';
    return;
  }

  const typeIcons = { deadline: '⏰', assigned: '📋', updated: '✏️', completed: '✅', comment: '💬', general: 'ℹ️' };

  list.innerHTML = data.notifications.slice(0, 8).map(n => `
    <div class="notif-item ${n.is_read ? '' : 'unread'}" onclick="markNotifRead(${n.id})">
      <div class="notif-item-icon">${typeIcons[n.type] || 'ℹ️'}</div>
      <div class="notif-item-text">
        <div class="notif-title">${n.title}</div>
        <div class="notif-msg">${n.message}</div>
        <div class="notif-time">${DateUtils.timeAgo(n.created_at)}</div>
      </div>
    </div>
  `).join('');
};

const markNotifRead = async (id) => {
  await api(`/notifications/${id}/read`, { method: 'PUT' });
  await loadNotifications();
};

const markAllNotifRead = async () => {
  await api('/notifications/read-all', { method: 'PUT' });
  await loadNotifications();
};
