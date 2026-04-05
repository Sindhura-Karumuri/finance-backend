const router = require('express').Router();
const { query } = require('express-validator');
const { authenticate, requireRole } = require('../../middleware/auth');
const validate = require('../../middleware/validate');
const { getLogsForRecord, getRecentLogs } = require('./audit.service');

router.use(authenticate, requireRole('ADMIN'));

// GET /api/audit?limit=20
router.get(
  '/',
  [query('limit').optional().isInt({ min: 1, max: 100 })],
  validate,
  async (req, res, next) => {
    try {
      const data = await getRecentLogs(Number(req.query.limit) || 20);
      res.json({ success: true, data });
    } catch (err) { next(err); }
  }
);

// GET /api/audit/records/:id
router.get('/records/:id', async (req, res, next) => {
  try {
    const data = await getLogsForRecord(req.params.id);
    res.json({ success: true, data });
  } catch (err) { next(err); }
});

module.exports = router;
