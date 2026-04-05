const router = require('express').Router();
const { body, query } = require('express-validator');
const { authenticate, requireRole } = require('../../middleware/auth');
const validate = require('../../middleware/validate');
const svc = require('./records.service');

router.use(authenticate);

const recordBodyRules = [
  body('amount').isFloat({ gt: 0 }).withMessage('Amount must be a positive number'),
  body('type').isIn(['INCOME', 'EXPENSE']).withMessage('Type must be INCOME or EXPENSE'),
  body('category').trim().notEmpty().withMessage('Category is required'),
  body('date').isISO8601().withMessage('Date must be a valid ISO 8601 date'),
  body('notes').optional().isString(),
];

// GET /api/records — VIEWERs scoped to own records; ANALYST/ADMIN see all
router.get(
  '/',
  [
    query('type').optional().isIn(['INCOME', 'EXPENSE']),
    query('category').optional().isString(),
    query('dateFrom').optional().isISO8601(),
    query('dateTo').optional().isISO8601(),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
  ],
  validate,
  async (req, res, next) => {
    try {
      const result = await svc.listRecords(req.query, req.user);
      res.json({ success: true, data: result });
    } catch (err) { next(err); }
  }
);

// GET /api/records/:id
router.get('/:id', async (req, res, next) => {
  try {
    res.json({ success: true, data: await svc.getRecord(req.params.id) });
  } catch (err) { next(err); }
});

// POST /api/records — ADMIN only, writes audit log
router.post('/', requireRole('ADMIN'), recordBodyRules, validate, async (req, res, next) => {
  try {
    const record = await svc.createRecord(req.body, req.user);
    res.status(201).json({ success: true, data: record });
  } catch (err) { next(err); }
});

// PATCH /api/records/:id — ADMIN only, writes diff audit log
router.patch(
  '/:id',
  requireRole('ADMIN'),
  [
    body('amount').optional().isFloat({ gt: 0 }),
    body('type').optional().isIn(['INCOME', 'EXPENSE']),
    body('category').optional().trim().notEmpty(),
    body('date').optional().isISO8601(),
    body('notes').optional().isString(),
  ],
  validate,
  async (req, res, next) => {
    try {
      const record = await svc.updateRecord(req.params.id, req.body, req.user);
      res.json({ success: true, data: record });
    } catch (err) { next(err); }
  }
);

// DELETE /api/records/:id — ADMIN only, soft delete + audit log
router.delete('/:id', requireRole('ADMIN'), async (req, res, next) => {
  try {
    await svc.deleteRecord(req.params.id, req.user);
    res.json({ success: true, message: 'Record deleted' });
  } catch (err) { next(err); }
});

module.exports = router;
