const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/task.controller');
const { verifyToken, isTaskManagerOrAdmin, isAdmin } = require('../middleware/auth.middleware');
const upload = require('../middleware/upload.middleware');

router.get('/', verifyToken, ctrl.getAllTasks);
router.post('/', verifyToken, isTaskManagerOrAdmin, ctrl.createTask);
router.get('/logs', verifyToken, ctrl.getActivityLogs);
router.get('/:id', verifyToken, ctrl.getTaskById);
router.put('/:id', verifyToken, ctrl.updateTask);
router.delete('/:id', verifyToken, isAdmin, ctrl.deleteTask);
router.patch('/:id/status', verifyToken, ctrl.updateTaskStatus);
router.post('/:id/comments', verifyToken, ctrl.addComment);
router.post('/:id/attachments', verifyToken, upload.single('file'), ctrl.uploadAttachment);

module.exports = router;
