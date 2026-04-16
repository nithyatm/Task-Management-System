const express = require('express');
const router = express.Router();
const { getNotifications, markAllRead, markRead, getActivityLogs } = require('../controllers/notification.controller');
const { verifyToken } = require('../middleware/auth.middleware');

router.use(verifyToken);
router.get('/', getNotifications);
router.put('/read-all', markAllRead);
router.put('/:id/read', markRead);
router.get('/activity', getActivityLogs);

module.exports = router;
