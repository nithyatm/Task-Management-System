const db          = require('../config/db.config');
const { sendEmail } = require('../config/email.config');

// ── helpers ───────────────────────────────────────────────────────────────────
const logActivity = async (userId, taskId, action, description) => {
  await db.query(
    'INSERT INTO activity_logs (user_id, task_id, action, description) VALUES (?,?,?,?)',
    [userId, taskId, action, description]
  );
};

const createNotification = async (userId, taskId, message, type) => {
  await db.query(
    'INSERT INTO notifications (user_id, task_id, message, type) VALUES (?,?,?,?)',
    [userId, taskId, message, type]
  );
};

const getUserById = async (id) => {
  const [rows] = await db.query('SELECT id, name, email FROM users WHERE id = ?', [id]);
  return rows[0] || null;
};

/**
 * Send in-app notification + email when a task is assigned/reassigned.
 */
const notifyAssignment = async ({ assigneeId, assignerId, taskId, taskTitle, taskPriority, taskDueDate, isReassignment }) => {
  try {
    const [assignee, assigner] = await Promise.all([
      getUserById(assigneeId),
      getUserById(assignerId),
    ]);
    if (!assignee) return;

    const assignerName = assigner ? assigner.name : 'Someone';
    const verb    = isReassignment ? 'reassigned to' : 'assigned to';
    const message = `"${taskTitle}" has been ${verb} you by ${assignerName}.`;

    // In-app notification
    await createNotification(assigneeId, taskId, message, 'assigned');

    // Email (non-blocking)
    if (assignee.email) {
      const dueLine = taskDueDate
        ? `<p style="margin:0"><strong>Due:</strong> ${new Date(taskDueDate).toDateString()}</p>`
        : '';
      const prColors = { high:'#dc2626', medium:'#d97706', low:'#16a34a' };
      const prColor  = prColors[taskPriority] || prColors.medium;
      const appUrl   = process.env.APP_URL || 'http://localhost:5000';

      sendEmail({
        to: assignee.email,
        subject: `[TaskFlow Pro] ${isReassignment ? 'Reassigned' : 'New Task'}: "${taskTitle}"`,
        html: `<div style="font-family:'Segoe UI',Arial,sans-serif;max-width:560px;margin:0 auto;background:#f4f6f9;padding:24px;border-radius:12px">
          <div style="background:linear-gradient(135deg,#1F4E79,#2E75B6);border-radius:10px;padding:24px;text-align:center;margin-bottom:20px">
            <h1 style="color:white;margin:0;font-size:20px;font-weight:800">TaskFlow Pro</h1>
          </div>
          <div style="background:white;border-radius:10px;padding:28px;box-shadow:0 2px 12px rgba(0,0,0,.08)">
            <h2 style="margin:0 0 8px;color:#1a1a2e;font-size:17px">Hi ${assignee.name},</h2>
            <p style="color:#555;margin:0 0 20px"><strong>${assignerName}</strong> has ${verb} you a task:</p>
            <div style="background:#f8faff;border-left:4px solid #2E75B6;border-radius:6px;padding:14px 16px;margin-bottom:20px">
              <div style="font-size:16px;font-weight:700;color:#1a1a2e;margin-bottom:6px">${taskTitle}</div>
              <span style="background:${prColor}18;color:${prColor};border-radius:4px;padding:2px 8px;font-size:11px;font-weight:700;text-transform:uppercase">${taskPriority || 'medium'}</span>
              ${dueLine}
            </div>
            <a href="${appUrl}/pages/task-detail.html?id=${taskId}" style="display:inline-block;background:#1F4E79;color:white;text-decoration:none;padding:11px 24px;border-radius:8px;font-weight:700">View Task</a>
          </div>
          <p style="text-align:center;color:#aaa;font-size:11px;margin-top:14px">TaskFlow Pro notification</p>
        </div>`
      }).catch(err => console.error('Assignment email error:', err.message));
    }
  } catch (err) {
    console.error('notifyAssignment error:', err.message);
  }
};

// ── controllers ───────────────────────────────────────────────────────────────
exports.createTask = async (req, res) => {
  try {
    const { title, description, priority, due_date, assigned_to, team_id, tags } = req.body;
    if (!title) return res.status(400).json({ message: 'Title is required' });

    const [result] = await db.query(
      'INSERT INTO tasks (title, description, priority, due_date, assigned_to, team_id, tags, created_by) VALUES (?,?,?,?,?,?,?,?)',
      [title, description, priority || 'medium', due_date, assigned_to, team_id, tags, req.user.id]
    );
    await logActivity(req.user.id, result.insertId, 'created', `Task "${title}" was created`);

    if (assigned_to && Number(assigned_to) !== req.user.id) {
      await notifyAssignment({
        assigneeId:    Number(assigned_to),
        assignerId:    req.user.id,
        taskId:        result.insertId,
        taskTitle:     title,
        taskPriority:  priority || 'medium',
        taskDueDate:   due_date,
        isReassignment: false,
      });
    }

    res.status(201).json({ message: 'Task created', taskId: result.insertId });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

exports.getAllTasks = async (req, res) => {
  try {
    const { status, priority, assigned_to, search } = req.query;
    let query = `SELECT t.*, u1.name AS creator_name, u2.name AS assignee_name,
      (SELECT COUNT(*) FROM attachments WHERE task_id = t.id) AS attachment_count,
      (SELECT COUNT(*) FROM comments WHERE task_id = t.id) AS comment_count
      FROM tasks t
      LEFT JOIN users u1 ON t.created_by = u1.id
      LEFT JOIN users u2 ON t.assigned_to = u2.id WHERE 1=1`;
    const params = [];
    if (req.user.role === 'viewer') { query += ' AND (t.assigned_to = ? OR t.created_by = ?)'; params.push(req.user.id, req.user.id); }
    if (status)      { query += ' AND t.status = ?';                               params.push(status); }
    if (priority)    { query += ' AND t.priority = ?';                             params.push(priority); }
    if (assigned_to) { query += ' AND t.assigned_to = ?';                          params.push(assigned_to); }
    if (search)      { query += ' AND (t.title LIKE ? OR t.description LIKE ?)';   params.push(`%${search}%`, `%${search}%`); }
    query += ' ORDER BY t.created_at DESC';
    const [tasks] = await db.query(query, params);
    res.json(tasks);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

exports.getTaskById = async (req, res) => {
  try {
    const [tasks] = await db.query(
      `SELECT t.*, u1.name AS creator_name, u2.name AS assignee_name FROM tasks t
       LEFT JOIN users u1 ON t.created_by = u1.id
       LEFT JOIN users u2 ON t.assigned_to = u2.id WHERE t.id = ?`,
      [req.params.id]
    );
    if (tasks.length === 0) return res.status(404).json({ message: 'Task not found' });
    const [attachments] = await db.query('SELECT a.*, u.name AS uploader FROM attachments a JOIN users u ON a.uploaded_by = u.id WHERE a.task_id = ?', [req.params.id]);
    const [comments]    = await db.query('SELECT c.*, u.name AS author FROM comments c JOIN users u ON c.user_id = u.id WHERE c.task_id = ? ORDER BY c.created_at ASC', [req.params.id]);
    const [logs]        = await db.query('SELECT al.*, u.name AS user_name FROM activity_logs al JOIN users u ON al.user_id = u.id WHERE al.task_id = ? ORDER BY al.created_at DESC', [req.params.id]);
    res.json({ ...tasks[0], attachments, comments, activity_logs: logs });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

exports.updateTask = async (req, res) => {
  try {
    const { title, description, priority, status, due_date, assigned_to, team_id, tags } = req.body;
    const [existing] = await db.query('SELECT * FROM tasks WHERE id = ?', [req.params.id]);
    if (existing.length === 0) return res.status(404).json({ message: 'Task not found' });
    const task = existing[0];

    if (req.user.role !== 'admin' && task.created_by !== req.user.id && task.assigned_to !== req.user.id)
      return res.status(403).json({ message: 'Not authorized' });

    const newTitle      = title       || task.title;
    const newPriority   = priority    || task.priority;
    const newDueDate    = due_date    || task.due_date;
    const newAssignedTo = (assigned_to !== undefined) ? assigned_to : task.assigned_to;

    await db.query(
      'UPDATE tasks SET title=?, description=?, priority=?, status=?, due_date=?, assigned_to=?, team_id=?, tags=?, updated_at=NOW() WHERE id=?',
      [newTitle, description ?? task.description, newPriority, status || task.status,
       newDueDate, newAssignedTo, team_id ?? task.team_id, tags ?? task.tags, req.params.id]
    );
    await logActivity(req.user.id, req.params.id, 'updated', `Task "${newTitle}" was updated`);

    // Status change notifications
    if (status && status !== task.status) {
      await logActivity(req.user.id, req.params.id, 'status_changed', `Status changed to "${status}"`);
      if (task.assigned_to && task.assigned_to !== req.user.id) {
        const labels = { todo:'To Do', inprogress:'In Progress', done:'Done' };
        await createNotification(task.assigned_to, req.params.id,
          `"${task.title}" status changed to ${labels[status] || status}.`,
          status === 'done' ? 'completed' : 'updated');
      }
    }

    // Assignment change notifications
    const oldAssignee = Number(task.assigned_to) || null;
    const newAssignee = Number(newAssignedTo)     || null;

    if (newAssignee && newAssignee !== oldAssignee && newAssignee !== req.user.id) {
      await notifyAssignment({
        assigneeId:     newAssignee,
        assignerId:     req.user.id,
        taskId:         Number(req.params.id),
        taskTitle:      newTitle,
        taskPriority:   newPriority,
        taskDueDate:    newDueDate,
        isReassignment: !!oldAssignee,
      });
    }

    // Notify previous assignee if unassigned
    if (oldAssignee && oldAssignee !== newAssignee && oldAssignee !== req.user.id) {
      await createNotification(oldAssignee, req.params.id,
        `You have been unassigned from "${newTitle}".`, 'updated');
    }

    res.json({ message: 'Task updated' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

exports.deleteTask = async (req, res) => {
  try {
    const [existing] = await db.query('SELECT * FROM tasks WHERE id = ?', [req.params.id]);
    if (existing.length === 0) return res.status(404).json({ message: 'Task not found' });
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Only admins can delete tasks' });
    await db.query('DELETE FROM tasks WHERE id = ?', [req.params.id]);
    await logActivity(req.user.id, null, 'deleted', `Task "${existing[0].title}" was deleted`);
    res.json({ message: 'Task deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

exports.updateTaskStatus = async (req, res) => {
  try {
    const { status } = req.body;
    if (!['todo','inprogress','done'].includes(status))
      return res.status(400).json({ message: 'Invalid status' });
    const [existing] = await db.query('SELECT * FROM tasks WHERE id = ?', [req.params.id]);
    if (existing.length === 0) return res.status(404).json({ message: 'Task not found' });
    const task = existing[0];
    await db.query('UPDATE tasks SET status = ?, updated_at = NOW() WHERE id = ?', [status, req.params.id]);
    await logActivity(req.user.id, req.params.id, 'status_changed', `Status changed to "${status}"`);

    // Notify assignee of Kanban drag-drop status change
    if (task.assigned_to && task.assigned_to !== req.user.id) {
      const labels = { todo:'To Do', inprogress:'In Progress', done:'Done' };
      await createNotification(task.assigned_to, req.params.id,
        `"${task.title}" moved to ${labels[status]}.`,
        status === 'done' ? 'completed' : 'updated');
    }
    res.json({ message: 'Status updated' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

exports.addComment = async (req, res) => {
  try {
    const { comment_text } = req.body;
    if (!comment_text) return res.status(400).json({ message: 'Comment cannot be empty' });
    await db.query('INSERT INTO comments (task_id, user_id, comment_text) VALUES (?,?,?)',
      [req.params.id, req.user.id, comment_text]);
    await logActivity(req.user.id, req.params.id, 'commented', `Comment added by ${req.user.name}`);

    // Notify assignee + creator about new comment
    const [tasks] = await db.query('SELECT * FROM tasks WHERE id = ?', [req.params.id]);
    if (tasks.length) {
      const t       = tasks[0];
      const snippet = comment_text.length > 60 ? comment_text.slice(0, 60) + '…' : comment_text;
      const msg     = `${req.user.name} commented on "${t.title}": "${snippet}"`;
      const toNotify = new Set();
      if (t.assigned_to && t.assigned_to !== req.user.id) toNotify.add(t.assigned_to);
      if (t.created_by  && t.created_by  !== req.user.id && t.created_by !== t.assigned_to) toNotify.add(t.created_by);
      for (const uid of toNotify) {
        await createNotification(uid, req.params.id, msg, 'comment');
      }
    }
    res.status(201).json({ message: 'Comment added' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

exports.uploadAttachment = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
    await db.query(
      'INSERT INTO attachments (task_id, uploaded_by, file_name, file_path, file_type, file_size) VALUES (?,?,?,?,?,?)',
      [req.params.id, req.user.id, req.file.originalname, req.file.path, req.file.mimetype, req.file.size]
    );
    await logActivity(req.user.id, req.params.id, 'attachment_added', `File "${req.file.originalname}" attached`);
    res.status(201).json({ message: 'File uploaded', file: req.file });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getActivityLogs = async (req, res) => {
  try {
    let query = 'SELECT al.*, u.name AS user_name, t.title AS task_title FROM activity_logs al JOIN users u ON al.user_id = u.id LEFT JOIN tasks t ON al.task_id = t.id WHERE 1=1';
    const params = [];
    if (req.user.role !== 'admin') { query += ' AND al.user_id = ?'; params.push(req.user.id); }
    query += ' ORDER BY al.created_at DESC LIMIT 100';
    const [logs] = await db.query(query, params);
    res.json(logs);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};
