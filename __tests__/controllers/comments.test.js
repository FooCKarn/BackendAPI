jest.mock('../../models/Comment');

const Comment = require('../../models/Comment');
const { addComment } = require('../../controllers/comments');

describe('Comments Controller', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      params: { id: 'blog123' },
      body: {},
      user: { id: 'user123' }
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
    next = jest.fn();
    jest.clearAllMocks();
  });

  describe('addComment', () => {
    it('should create a comment successfully', async () => {
      req.body = { text: 'Great post!' };
      const mockComment = { _id: 'c1', text: 'Great post!', blog: 'blog123', author: 'user123' };
      Comment.create.mockResolvedValue(mockComment);

      await addComment(req, res, next);

      expect(req.body.blog).toBe('blog123');
      expect(req.body.author).toBe('user123');
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({ success: true, data: mockComment });
    });

    it('should return 400 if blog param is undefined', async () => {
      req.params = {};
      req.body = { text: 'Test' };

      await addComment(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Please enter Blog and Author'
      });
    });

    it('should return 400 if text is undefined', async () => {
      req.body = {};

      await addComment(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Please enter text'
      });
    });

    it('should return 400 if text exceeds 100 characters', async () => {
      req.body = { text: 'a'.repeat(101) };

      await addComment(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Character limit exceeded'
      });
    });

    it('should return 500 on database error', async () => {
      req.body = { text: 'Test comment' };
      Comment.create.mockRejectedValue(new Error('DB error'));

      await addComment(req, res, next);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'DB error'
      });
    });
  });
});
