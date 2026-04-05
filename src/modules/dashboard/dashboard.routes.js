const router = require('express').Router();
const { query } = require('express-validator');
const { authenticate, requireRole } = require('../../middleware/auth');
const validate = require('../../middleware/validate');
const svc = require('./dashboard.service');

router.use(authenticate, requireRole('ANALYST'));

// GET /api/dashboard/summary?from=2024-01-01&to=2024-03-31
router.get(
  '/summary',
  [
    query('from').optional().isISO8601().withMessage('from must be a valid date'),
    query('to').optional().isISO8601().withMessage('to must be a valid date'),
  ],
  validate,
  async (req, res, next) => {
    try {
      const data = await svc.getSummary({ from: req.query.from, to: req.query.to });
      res.json({ success: true, data });
    } catch (err) { next(err); }
  }
);

// GET /api/dashboard/categories
router.get('/categories', async (req, res, next) => {
  try {
    const data = await svc.getCategoryBreakdown();
    res.json({ success: true, data });
  } catch (err) { next(err); }
});

// GET /api/dashboard/trends/monthly?months=6
router.get(
  '/trends/monthly',
  [query('months').optional().isInt({ min: 1, max: 24 })],
  validate,
  async (req, res, next) => {
    try {
      const data = await svc.getMonthlyTrends(req.query.months);
      res.json({ success: true, data });
    } catch (err) { next(err); }
  }
);

// GET /api/dashboard/trends/weekly?weeks=8
router.get(
  '/trends/weekly',
  [query('weeks').optional().isInt({ min: 1, max: 52 })],
  validate,
  async (req, res, next) => {
    try {
      const data = await svc.getWeeklyTrends(req.query.weeks);
      res.json({ success: true, data });
    } catch (err) { next(err); }
  }
);

// GET /api/dashboard/recent?limit=10
router.get(
  '/recent',
  [query('limit').optional().isInt({ min: 1, max: 50 })],
  validate,
  async (req, res, next) => {
    try {
      const data = await svc.getRecentActivity(Number(req.query.limit) || 10);
      res.json({ success: true, data });
    } catch (err) { next(err); }
  }
);

module.exports = router;
