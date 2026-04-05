const router    = require('express').Router();
const { body }  = require('express-validator');
const validate  = require('../../middleware/validate');
const { authenticate } = require('../../middleware/auth');
const { register, login } = require('./auth.service');

// POST /api/auth/register
router.post(
  '/register',
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('role').optional().isIn(['VIEWER', 'ANALYST', 'ADMIN']).withMessage('Invalid role'),
  ],
  validate,
  async (req, res, next) => {
    try {
      const user = await register(req.body);
      res.status(201).json({ success: true, data: user });
    } catch (err) { next(err); }
  }
);

// POST /api/auth/login
router.post(
  '/login',
  [
    body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  validate,
  async (req, res, next) => {
    try {
      const result = await login(req.body);
      res.json({ success: true, data: result });
    } catch (err) { next(err); }
  }
);

// GET /api/auth/me — any authenticated user
router.get('/me', authenticate, async (req, res, next) => {
  try {
    const user = await require('../../config/prisma').user.findUniqueOrThrow({
      where: { id: req.user.id },
      select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true },
    });
    res.json({ success: true, data: user });
  } catch (err) { next(err); }
});

module.exports = router;
