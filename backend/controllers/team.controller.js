const db = require('../config/db.config');

exports.createTeam = async (req, res) => {
  try {
    const { name, description, memberIds } = req.body;
    if (!name) return res.status(400).json({ message: 'Team name required' });
    const [result] = await db.query('INSERT INTO teams (name, description, created_by) VALUES (?,?,?)', [name, description, req.user.id]);
    const teamId = result.insertId;
    await db.query('INSERT INTO team_members (team_id, user_id) VALUES (?,?)', [teamId, req.user.id]);
    if (memberIds && memberIds.length > 0) {
      for (const uid of memberIds) {
        if (uid !== req.user.id) await db.query('INSERT IGNORE INTO team_members (team_id, user_id) VALUES (?,?)', [teamId, uid]);
      }
    }
    res.status(201).json({ message: 'Team created', teamId });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getAllTeams = async (req, res) => {
  try {
    const [teams] = await db.query(
      `SELECT t.*, u.name AS creator_name, COUNT(tm.user_id) AS member_count
       FROM teams t JOIN users u ON t.created_by = u.id
       LEFT JOIN team_members tm ON t.id = tm.team_id GROUP BY t.id ORDER BY t.created_at DESC`
    );
    res.json(teams);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getTeamMembers = async (req, res) => {
  try {
    const [members] = await db.query(
      'SELECT u.id, u.name, u.email, u.role, tm.joined_at FROM team_members tm JOIN users u ON tm.user_id = u.id WHERE tm.team_id = ?',
      [req.params.id]
    );
    res.json(members);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

exports.addTeamMember = async (req, res) => {
  try {
    const { user_id } = req.body;
    await db.query('INSERT IGNORE INTO team_members (team_id, user_id) VALUES (?,?)', [req.params.id, user_id]);
    res.json({ message: 'Member added' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

exports.removeTeamMember = async (req, res) => {
  try {
    await db.query('DELETE FROM team_members WHERE team_id = ? AND user_id = ?', [req.params.id, req.params.userId]);
    res.json({ message: 'Member removed' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};
