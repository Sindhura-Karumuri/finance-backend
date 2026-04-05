const router = require('express').Router();
const { body } = require('express-validator');
const { authenticate, requireRole } = require('../../middleware/auth');
const validate = require('../../middleware/validate');
const { listUsers, getUser, updateUser, deleteUser } = require('./users.service');

router.use(authenticate, requireRole('ADMIN'));

router.get('/', async (req, res, next) => {
  try {
    res.json({ success: true, data: await listUsers() });
  } catch (err) { next(err); }
});

router.get('/:id', async (req, res, next) => {
  try {
    res.json({ success: true, data: await getUser(req.params.id) });
  } catch (err) { next(err); }
});

router.patch(
  '/:id',
  [
    body('role').optional().isIn(['VIEWER', 'ANALYST', 'ADMIN']).withMessage('Invalid role'),
    body('isActive').optional().isBoolean().withMessage('isActive must be boolean'),
    body('name').optional().trim().notEmpty().withMessage('Name cannot be empty'),
  ],
  validate,
  async (req, res, next) => {
    try {
      res.json({ success: true, data: await updateUser(req.params.id, req.body) });
    } catch (err) { next(err); }
  }
);

router.delete('/:id', async (req, res, next) => {
  try {
    const user = await deleteUser(req.params.id);
    res.json({ success: true, message: 'User deactivated', data: user });
  } catch (err) { next(err); }
});

module.exports = router;
