const router = require('express').Router();

router.use('/auth',      require('./modules/auth/auth.routes'));
router.use('/users',     require('./modules/users/users.routes'));
router.use('/records',   require('./modules/records/records.routes'));
router.use('/dashboard', require('./modules/dashboard/dashboard.routes'));
router.use('/audit',     require('./modules/audit/audit.routes'));

module.exports = router;
