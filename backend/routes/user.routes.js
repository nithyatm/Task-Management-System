const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/user.controller');
const { verifyToken, isAdmin } = require('../middleware/auth.middleware');

router.get('/', verifyToken, isAdmin, ctrl.getAllUsers);
router.put('/:id', verifyToken, isAdmin, ctrl.updateUser);
router.delete('/:id', verifyToken, isAdmin, ctrl.deleteUser);
router.get('/notifications/all', verifyToken, ctrl.getNotifications);
router.patch('/notifications/:id/read', verifyToken, ctrl.markNotificationRead);
router.patch('/notifications/read-all', verifyToken, ctrl.markAllNotificationsRead);

module.exports = router;
