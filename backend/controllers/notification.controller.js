const db = require('../config/db.config');

// @GET /api/notifications
const getNotifications = async (req, res) => {
  try {
    const [notifications] = await db.query(
      'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50',
      [req.user.id]
    );
    const [unreadCount] = await db.query(
      'SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = 0',
      [req.user.id]
    );
    res.json({ success: true, notifications, unread: unreadCount[0].count });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @PUT /api/notifications/read-all
const markAllRead = async (req, res) => {
  try {
    await db.query('UPDATE notifications SET is_read = 1 WHERE user_id = ?', [req.user.id]);
    res.json({ success: true, message: 'All notifications marked as read' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @PUT /api/notifications/:id/read
const markRead = async (req, res) => {
  try {
    await db.query('UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @GET /api/activity-logs
const getActivityLogs = async (req, res) => {
  try {
    const { taskId, userId } = req.query;
    let query = `
      SELECT al.*, u.name as user_name, u.avatar as user_avatar, t.title as task_title
      FROM activity_logs al
      JOIN users u ON al.user_id = u.id
      LEFT JOIN tasks t ON al.task_id = t.id
    `;
    const conditions = [];
    const params = [];

    if (req.user.role === 'member') { conditions.push('al.user_id = ?'); params.push(req.user.id); }
    if (taskId) { conditions.push('al.task_id = ?'); params.push(taskId); }
    if (userId && req.user.role === 'admin') { conditions.push('al.user_id = ?'); params.push(userId); }

    if (conditions.length > 0) query += ' WHERE ' + conditions.join(' AND ');
    query += ' ORDER BY al.created_at DESC LIMIT 100';

    const [logs] = await db.query(query, params);
    res.json({ success: true, logs });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = { getNotifications, markAllRead, markRead, getActivityLogs };
