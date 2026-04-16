const db = require('../config/db.config');

exports.getAllUsers = async (req, res) => {
  try {
    const [users] = await db.query('SELECT id, name, email, role, is_active, created_at FROM users ORDER BY created_at DESC');
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

exports.updateUser = async (req, res) => {
  try {
    const { name, role, is_active } = req.body;
    await db.query('UPDATE users SET name=?, role=?, is_active=? WHERE id=?', [name, role, is_active, req.params.id]);
    res.json({ message: 'User updated' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

exports.deleteUser = async (req, res) => {
  try {
    if (req.params.id == req.user.id) return res.status(400).json({ message: 'Cannot delete yourself' });
    await db.query('DELETE FROM users WHERE id = ?', [req.params.id]);
    res.json({ message: 'User deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getNotifications = async (req, res) => {
  try {
    const [notifs] = await db.query(
      'SELECT n.*, t.title AS task_title FROM notifications n LEFT JOIN tasks t ON n.task_id = t.id WHERE n.user_id = ? ORDER BY n.created_at DESC LIMIT 50',
      [req.user.id]
    );
    res.json(notifs);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

exports.markNotificationRead = async (req, res) => {
  try {
    await db.query('UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
    res.json({ message: 'Marked as read' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

exports.markAllNotificationsRead = async (req, res) => {
  try {
    await db.query('UPDATE notifications SET is_read = 1 WHERE user_id = ?', [req.user.id]);
    res.json({ message: 'All notifications marked as read' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};
