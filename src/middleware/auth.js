const jwt = require('jsonwebtoken');

const authenticate = (req, res, next) => {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Authentication required' });
  }
  try {
    req.user = jwt.verify(header.split(' ')[1], process.env.JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
};

// VIEWER=1, ANALYST=2, ADMIN=3 — requireRole('ANALYST') allows ANALYST + ADMIN
const ROLE_LEVEL = { VIEWER: 1, ANALYST: 2, ADMIN: 3 };

const requireRole = (...roles) => (req, res, next) => {
  const userLevel = ROLE_LEVEL[req.user?.role] ?? 0;
  const minRequired = Math.min(...roles.map((r) => ROLE_LEVEL[r]));
  if (userLevel < minRequired) {
    return res.status(403).json({ success: false, message: 'Insufficient permissions' });
  }
  next();
};

module.exports = { authenticate, requireRole };
