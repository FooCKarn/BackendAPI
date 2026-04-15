const express = require('express');
const router = express.Router({ mergeParams: true });
const { protect, authorize } = require('../middleware/auth');
const { addBlog } = require('../controllers/blogs');
const commentRouter = require('./comments')

router.use('/:id/comments/',commentRouter);
router.route('/').post(protect, authorize('user'), addBlog);

module.exports = router;