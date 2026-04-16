const jwt = require('jsonwebtoken');
require('dotenv').config();

const verifyToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Access denied. No token provided.' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(403).json({ message: 'Invalid or expired token.' });
  }
};

const isAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Admin access required.' });
  next();
};

const isTaskManagerOrAdmin = (req, res, next) => {
  if (!['admin', 'task_manager'].includes(req.user.role))
    return res.status(403).json({ message: 'Task Manager or Admin access required.' });
  next();
};

module.exports = { verifyToken, isAdmin, isTaskManagerOrAdmin };
