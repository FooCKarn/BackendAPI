const express = require('express');
const router = express.Router({ mergeParams: true });
const { protect, authorize } = require('../middleware/auth');
const { addComment } = require('../controllers/comments');

router.route('/').post(protect, authorize('user'), addComment);

module.exports = router;