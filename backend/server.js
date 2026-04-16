const express = require('express');
const cors = require('cors');
const path = require('path');
const cron = require('node-cron');
const db = require('./config/db.config');
const { sendEmail } = require('./config/email.config');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static files
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
app.use(express.static(path.join(__dirname, '../frontend')));

// API Routes
app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/tasks', require('./routes/task.routes'));
app.use('/api/users', require('./routes/user.routes'));
app.use('/api/teams', require('./routes/team.routes'));

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'ok', time: new Date() }));

// Serve frontend for all non-API routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// Cron Job: Check deadlines every day at 8AM
cron.schedule('0 8 * * *', async () => {
  try {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateStr = tomorrow.toISOString().split('T')[0];
    const [tasks] = await db.query(
      `SELECT t.*, u.email, u.name FROM tasks t JOIN users u ON t.assigned_to = u.id
       WHERE t.due_date = ? AND t.status != 'done'`, [dateStr]
    );
    for (const task of tasks) {
      await sendEmail({
        to: task.email,
        subject: `⏰ Deadline Tomorrow: ${task.title}`,
        html: `<h2>Task Deadline Reminder</h2><p>Hi ${task.name},</p>
               <p>Your task <strong>"${task.title}"</strong> is due <strong>tomorrow (${dateStr})</strong>.</p>
               <p>Current Status: <strong>${task.status}</strong></p>
               <p>Login to TaskFlow Pro to update your task.</p>`
      });
      await db.query('INSERT INTO notifications (user_id, task_id, message, type) VALUES (?,?,?,?)',
        [task.assigned_to, task.id, `Task "${task.title}" is due tomorrow!`, 'deadline']);
    }
    console.log(`📅 Deadline check done. ${tasks.length} reminders sent.`);
  } catch (err) {
    console.error('Cron error:', err.message);
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 TaskFlow Pro running on http://localhost:${PORT}`);
});
