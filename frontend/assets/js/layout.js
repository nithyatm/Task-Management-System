// ============================================================
// TaskFlow Pro - Shared Layout  (requires icons.js loaded first)
// ============================================================

function renderLayout(pageTitle, pageSubtitle, activePage) {
  const user = getUser();
  if (!user) return;
  const isAdmin   = user.role === 'admin';

  const adminLinks = isAdmin ? `
    <div class="nav-section-title">Admin</div>
    <div class="nav-item ${activePage === 'users' ? 'active' : ''}" onclick="navigate('users')">
      <span class="nav-icon">${icon('users', 17)}</span><span class="nav-label">User Management</span>
    </div>
    <div class="nav-item ${activePage === 'teams' ? 'active' : ''}" onclick="navigate('teams')">
      <span class="nav-icon">${icon('building-2', 17)}</span><span class="nav-label">Teams</span>
    </div>` : '';

  document.getElementById('app-layout').innerHTML = `
    <aside class="sidebar" id="sidebar">
      <div class="sidebar-brand">
        <div class="brand-icon-wrap">${icon('clipboard-list', 20)}</div>
        <div>
          <h2>Task<span>Flow</span> Pro</h2>
          <p>Task Management</p>
        </div>
      </div>

      <div class="sidebar-user">
        <div class="sidebar-avatar">${user.name.charAt(0).toUpperCase()}</div>
        <div class="sidebar-user-info">
          <p>${user.name}</p>
          <span>${user.role.replace('_', ' ')}</span>
        </div>
      </div>

      <nav class="sidebar-nav">
        <div class="nav-section-title">Main</div>
        <div class="nav-item ${activePage === 'dashboard' ? 'active' : ''}" onclick="navigate('dashboard')">
          <span class="nav-icon">${icon('layout-dashboard', 17)}</span><span class="nav-label">Dashboard</span>
        </div>
        <div class="nav-item ${activePage === 'tasks' ? 'active' : ''}" onclick="navigate('tasks')">
          <span class="nav-icon">${icon('check-square', 17)}</span><span class="nav-label">All Tasks</span>
        </div>
        <div class="nav-item ${activePage === 'kanban' ? 'active' : ''}" onclick="navigate('kanban')">
          <span class="nav-icon">${icon('columns', 17)}</span><span class="nav-label">Kanban Board</span>
        </div>
        <div class="nav-item ${activePage === 'activity' ? 'active' : ''}" onclick="navigate('activity')">
          <span class="nav-icon">${icon('activity', 17)}</span><span class="nav-label">Activity Log</span>
        </div>
        ${adminLinks}
        <div class="nav-section-title">Account</div>
        <div class="nav-item ${activePage === 'profile' ? 'active' : ''}" onclick="navigate('profile')">
          <span class="nav-icon">${icon('settings', 17)}</span><span class="nav-label">Profile & Settings</span>
        </div>
      </nav>

      <div class="sidebar-footer">
        <button class="logout-btn" onclick="logout()">
          ${icon('log-out', 15)}<span>Logout</span>
        </button>
      </div>
    </aside>

    <div class="main-content">
      <header class="topbar">
        <div class="topbar-left">
          <h3>${pageTitle}</h3>
          <p>${pageSubtitle}</p>
        </div>
        <div class="topbar-right">
          <div style="position:relative">
            <button class="notif-btn" id="notifBtn" onclick="toggleNotifications()" title="Notifications">
              ${icon('bell', 19)}
              <span class="notif-badge" id="notifCount" style="display:none">0</span>
            </button>
            <div class="notif-dropdown" id="notifDropdown">
              <div class="notif-panel-header">
                <div class="notif-panel-title">
                  ${icon('bell', 15)}
                  <span>Notifications</span>
                  <span class="notif-count-pill" id="notifPill" style="display:none">0</span>
                </div>
                <button class="notif-mark-all" onclick="markAllRead()">
                  ${icon('check', 12)} Mark all read
                </button>
              </div>
              <div id="notifList">
                <div class="notif-skeleton">${icon('clock', 14)} Loading...</div>
              </div>
              <div class="notif-panel-footer">
                ${icon('refresh-cw', 11)} Refreshes every 30s
              </div>
            </div>
          </div>

          <button class="topbar-profile-btn" onclick="navigate('profile')">
            <div class="topbar-avatar">${user.name.charAt(0).toUpperCase()}</div>
            <span>${user.name.split(' ')[0]}</span>
          </button>
        </div>
      </header>
      <div class="page-content" id="page-content"></div>
    </div>`;

  loadNotifications();
  if (window._notifTimer) clearInterval(window._notifTimer);
  window._notifTimer = setInterval(refreshNotifBadge, 30000);
}

function navigate(page) {
  const routes = {
    dashboard: '/pages/dashboard.html',
    tasks:     '/pages/tasks.html',
    kanban:    '/pages/kanban.html',
    activity:  '/pages/activity.html',
    users:     '/pages/admin-dashboard.html',
    teams:     '/pages/teams.html',
    profile:   '/pages/profile.html',
  };
  if (routes[page]) window.location.href = routes[page];
}

async function refreshNotifBadge() {
  try {
    const notifs = await api.get('/users/notifications/all').catch(() => []);
    if (!Array.isArray(notifs)) return;
    _setBadge(notifs.filter(function(n){ return !n.is_read; }).length);
  } catch(_) {}
}

function _setBadge(count) {
  const label = count > 9 ? '9+' : String(count);
  const badge = document.getElementById('notifCount');
  const pill  = document.getElementById('notifPill');
  if (badge) { badge.textContent = label; badge.style.display = count > 0 ? 'flex' : 'none'; }
  if (pill)  { pill.textContent  = label; pill.style.display  = count > 0 ? 'inline-flex' : 'none'; }
}

async function loadNotifications() {
  const list = document.getElementById('notifList');
  try {
    const notifs = await api.get('/users/notifications/all').catch(() => []);
    if (!Array.isArray(notifs)) return;
    _setBadge(notifs.filter(function(n){ return !n.is_read; }).length);
    if (!list) return;

    if (notifs.length === 0) {
      list.innerHTML = '<div class="notif-empty">' + icon('inbox', 38) + '<p>All caught up!</p><span>No notifications yet</span></div>';
      return;
    }

    var cfgMap = {
      assigned:  { ico: 'user-check',    color: '#2563eb', label: 'Assignment' },
      deadline:  { ico: 'clock',         color: '#ea580c', label: 'Deadline'   },
      updated:   { ico: 'pencil',        color: '#7c3aed', label: 'Updated'    },
      completed: { ico: 'check-circle',  color: '#16a34a', label: 'Completed'  },
      comment:   { ico: 'message-circle',color: '#0891b2', label: 'Comment'    },
    };

    list.innerHTML = notifs.slice(0, 15).map(function(n) {
      var c = cfgMap[n.type] || { ico: 'bell', color: '#64748b', label: 'Info' };
      var dot = !n.is_read ? '<div class="notif-dot"></div>' : '';
      return '<div class="notif-item ' + (n.is_read ? '' : 'unread') + '" onclick="readNotif(' + n.id + ', this)">'
        + '<div class="notif-item-icon" style="background:' + c.color + '18;color:' + c.color + '">' + icon(c.ico, 15) + '</div>'
        + '<div class="notif-item-body">'
        + '<div class="notif-item-label">' + c.label + '</div>'
        + '<div class="notif-item-msg">' + n.message + '</div>'
        + '<div class="notif-item-time">' + icon('clock', 10) + ' ' + timeAgo(n.created_at) + '</div>'
        + '</div>' + dot + '</div>';
    }).join('');
  } catch(e) {
    if (list) list.innerHTML = '<div class="notif-empty"><p>Could not load</p></div>';
  }
}

async function readNotif(id, el) {
  await api.patch('/users/notifications/' + id + '/read').catch(function(){});
  el.classList.remove('unread');
  var dot = el.querySelector('.notif-dot');
  if (dot) dot.remove();
  refreshNotifBadge();
}

async function markAllRead() {
  await api.patch('/users/notifications/read-all').catch(function(){});
  loadNotifications();
}

function toggleNotifications() {
  var d = document.getElementById('notifDropdown');
  var opening = d.classList.toggle('open');
  if (opening) loadNotifications();
}

document.addEventListener('click', function(e) {
  if (!e.target.closest('#notifBtn') && !e.target.closest('#notifDropdown')) {
    var d = document.getElementById('notifDropdown');
    if (d) d.classList.remove('open');
  }
});

function timeAgo(dateStr) {
  var diff = Math.floor((Date.now() - new Date(dateStr)) / 1000);
  if (diff < 60)    return 'just now';
  if (diff < 3600)  return Math.floor(diff / 60) + 'm ago';
  if (diff < 86400) return Math.floor(diff / 3600) + 'h ago';
  return Math.floor(diff / 86400) + 'd ago';
}

function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function priorityBadge(p) {
  var map = {
    high:   ['badge-high',   'flame',             'High'],
    medium: ['badge-medium', 'minus-circle',      'Medium'],
    low:    ['badge-low',    'arrow-down-circle', 'Low'],
  };
  var arr = map[p] || map.medium;
  return '<span class="badge ' + arr[0] + '">' + icon(arr[1], 11) + ' ' + arr[2] + '</span>';
}

function statusBadge(s) {
  var map = {
    todo:       ['badge-todo',       'list',         'To Do'],
    inprogress: ['badge-inprogress', 'zap',          'In Progress'],
    done:       ['badge-done',       'check-circle', 'Done'],
  };
  var arr = map[s] || map.todo;
  return '<span class="badge ' + arr[0] + '">' + icon(arr[1], 11) + ' ' + arr[2] + '</span>';
}

function fileIcon(type) {
  type = type || '';
  if (type.includes('image'))                          return icon('image', 20);
  if (type.includes('pdf'))                            return icon('file-text', 20);
  if (type.includes('word') || type.includes('doc'))   return icon('file-text', 20);
  if (type.includes('sheet') || type.includes('xls'))  return icon('file', 20);
  if (type.includes('zip'))                            return icon('archive', 20);
  return icon('file', 20);
}
