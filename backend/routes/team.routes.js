const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/team.controller');
const { verifyToken, isTaskManagerOrAdmin, isAdmin } = require('../middleware/auth.middleware');

router.get('/', verifyToken, ctrl.getAllTeams);
router.post('/', verifyToken, isTaskManagerOrAdmin, ctrl.createTeam);
router.get('/:id/members', verifyToken, ctrl.getTeamMembers);
router.post('/:id/members', verifyToken, isTaskManagerOrAdmin, ctrl.addTeamMember);
router.delete('/:id/members/:userId', verifyToken, isAdmin, ctrl.removeTeamMember);

module.exports = router;
